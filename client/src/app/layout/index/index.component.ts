import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  QueryList,
  ViewChildren
} from '@angular/core';
import {Post} from '../../models/Post';
import {User} from '../../models/User';
import {PostService} from '../../services/post.service';
import {UserService} from '../../services/user.service';
import {CommentService} from '../../services/comment.service';
import {ImageUploadService} from '../../services/image-upload.service';
import {MatCardImage, MatCardModule} from '@angular/material/card';
import {MatIconModule} from '@angular/material/icon';
import {MatInputModule} from '@angular/material/input';
import {CommonModule, NgClass} from '@angular/common';
import {MatButtonModule, MatIconButton} from '@angular/material/button';
import {catchError, Subject, takeUntil, throwError} from 'rxjs';
import {MatFormFieldModule} from '@angular/material/form-field';
import {RouterLink} from '@angular/router';
import {LikesPostComponent} from '../../user/likes-post/likes-post.component';
import {MatDialog} from '@angular/material/dialog';
import {PostInfoComponent} from '../../user/post-info/post-info.component';

interface UiPost extends Post {
  isLiked: boolean;
  avatarUrl?: string;
  showAllComments?: boolean;
  commentCount?: number;
}

@Component({
  selector: 'app-index',
  standalone: true,
  imports: [
    MatIconModule,
    MatCardImage,
    MatCardModule,
    MatFormFieldModule,
    NgClass,
    MatInputModule,
    MatButtonModule,
    CommonModule,
    MatIconButton,
    RouterLink
  ],
  changeDetection: ChangeDetectionStrategy.Default,
  templateUrl: './index.component.html',
  styleUrls: ['./index.component.css']
})
export class IndexComponent implements OnInit, AfterViewInit, OnDestroy {

  posts: UiPost[] = [];
  user!: User;
  isPostsLoaded = false;
  isUserDataLoaded = false;
  userImages: { [key: string]: string } = {};
  private destroy$ = new Subject<void>();
  currentPage = 0;       // 0-based page index
  pageSize = 2;
  isLoading = false;
  noMorePosts = false;
  showHeart = false;

  @ViewChildren('anchor') anchors!: QueryList<ElementRef<HTMLElement>>;
  private observer?: IntersectionObserver;

  constructor(
    private postService: PostService,
    private userService: UserService,
    protected commentService: CommentService,
    private imageService: ImageUploadService,
    private cd: ChangeDetectorRef,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    // Подписка на поток постов (источник истины)
    this.postService.posts$
      .pipe(takeUntil(this.destroy$))
      .subscribe(posts => {
        this.posts = posts;
        this.isPostsLoaded = true;
        // isLoading будет сброшен в завершении конкретного запроса, но на всякий случай:
        this.isLoading = false;
        this.cd.markForCheck();
      });

    // Подписка на totalPages — корректируем флаг noMorePosts
    this.postService.totalPages$
      .pipe(takeUntil(this.destroy$))
      .subscribe(totalPages => {
        if (typeof totalPages === 'number' && totalPages > 0) {
          // totalPages — количество страниц; последний индекс = totalPages - 1
          this.noMorePosts = this.currentPage >= (totalPages - 1);
        } else {
          // если сервер не дал метаданные — не меняем ничего здесь
          // (компонент использует длину ответа как fallback)
        }
        this.cd.markForCheck();
      });

    // Загрузка текущего пользователя и первой страницы
    this.userService.getCurrentUser().pipe(takeUntil(this.destroy$)).subscribe(user => {
      this.user = user;
      this.isUserDataLoaded = true;
      this.resetPaging();
      this.loadPosts(); // первая загрузка (page = 0)
    });
  }

  // Сброс пагинации (вызывать при смене пользователя или явном refresh)
  private resetPaging(): void {
    this.currentPage = 0;
    this.noMorePosts = false;
    this.isLoading = false;
    this.postService.clearPosts?.(); // если реализовано в сервисе
  }

  // Запрашивает текущую страницу (this.currentPage). Использует appendPostsPage, который должен возвращать Observable.
  loadPosts(): void {
    this.isLoading = true;
    this.postService.appendPostsPage(this.currentPage, this.pageSize, this.user.username)
      .subscribe({
        next: (page) => {
          if (!page || page.length === 0) {
            this.noMorePosts = true;
          }
        },
        error: () => {},
        complete: () => {
          this.isLoading = false;
          this.cd.markForCheck();
        }
      });
  }

  loadNextPage(): void {
    if (this.noMorePosts || this.isLoading) return;
    this.currentPage++; // инкрементируем индекс страницы (0-based)
    this.loadPosts();
  }

  openPostDetails(index: number) {
    const dialogRef = this.dialog.open(PostInfoComponent, {
      data: {post: this.posts[index], index}
    });

    dialogRef.afterClosed().subscribe(() => {});
  }

  ngAfterViewInit() {
    // пересоздаём observer, когда список anchor'ов обновляется
    this.anchors.changes.subscribe(() => this.observeLastAnchor());
    this.observeLastAnchor();
  }

  private observeLastAnchor(): void {
    // отключаем старый observer
    if (this.observer) {
      this.observer.disconnect();
      this.observer = undefined;
    }

    const last = this.anchors && this.anchors.length ? this.anchors.last : null;
    if (!last) return;

    this.observer = new IntersectionObserver(entries => {
      const entry = entries[0];
      if (entry.isIntersecting && !this.noMorePosts && !this.isLoading) {
        this.loadNextPage();
      }
    }, { root: null, threshold: 0.1 });

    this.observer.observe(last.nativeElement);
  }

  ngOnDestroy() {
    if (this.observer) this.observer.disconnect();
    this.destroy$.next();
    this.destroy$.complete();
  }

  private patchPost(index: number, patch: Partial<UiPost>): void {
    const updated = {...this.posts[index], ...patch};
    this.posts = [
      ...this.posts.slice(0, index),
      updated,
      ...this.posts.slice(index + 1)
    ];
    this.cd.markForCheck();
  }

  likePost(postId: number, i: number): void {
    const post = this.posts[i];
    const liked = post.isLiked;

    this.patchPost(i, {
      isLiked: !liked,
      usersLiked: liked
        ? post.usersLiked!.filter(u => u !== this.user.username)
        : [...(post.usersLiked ?? []), this.user.username]
    });

    this.postService.likePost(postId, this.user.username).pipe(
      catchError(err => {
        this.patchPost(i, {isLiked: liked});
        return throwError(() => err);
      })
    ).subscribe();

    if(!post.isLiked) this.animateHeart();
  }

  openLikesDialog(postIndex: number): void {
    const post = this.posts[postIndex];
    if (!post || !post.usersLiked || !post.usersLiked.length) return;
    this.dialog.open(LikesPostComponent, {
      data: post.usersLiked,
      width: '350px'
    });
  }

  animateHeart() {
    this.showHeart = true;
    setTimeout(() => this.showHeart = false, 800);
  }

  getUserImage(username: string): string {
    if (this.userImages[username]) {
      return this.userImages[username];
    }
    this.userImages[username] = 'assets/placeholder.jpg';
    this.imageService.getImageToUser(username)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: blob => {
          const preview = URL.createObjectURL(blob);
          this.userImages[username] = preview;
          this.cd.markForCheck();
        },
        error: () => {
          this.userImages[username] = 'assets/placeholder.jpg';
          this.cd.markForCheck();
        }
      });
    return this.userImages[username];
  }

  trackByUsername(index: number, username: string): string {
    return username;
  }

  postComment(event: Event, message: string, postId: number, postIndex: number): void {
    event.preventDefault();
    const post = this.posts[postIndex];
    this.commentService.addToCommentToPost(postId, message)
      .subscribe(data => {
        post.comments?.push(data);
        this.cd.markForCheck();
        (event.target as HTMLFormElement).reset();
      });
  }
}
