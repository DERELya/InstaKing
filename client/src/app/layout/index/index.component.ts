import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef, OnDestroy,
  OnInit, QueryList,
  ViewChild,
  ViewChildren
} from '@angular/core';
import {Post} from '../../models/Post';
import {User} from '../../models/User';
import {PostService} from '../../services/post.service';
import {UserService} from '../../services/user.service';
import {CommentService} from '../../services/comment.service';
import {NotificationService} from '../../services/notification.service';
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

interface UiPost extends Post {
  isLiked: boolean;
  avatarUrl?: string;
  showAllComments?: boolean;
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
export class IndexComponent implements OnInit,AfterViewInit, OnDestroy {

  posts!: UiPost[];
  user!: User;
  isPostsLoaded = false;
  isUserDataLoaded = false;
  userImages: { [key: string]: string } = {};
  MAX_VISIBLE_COMMENTS = 1;
  private destroy$ = new Subject<void>();
  currentPage = 0;
  pageSize = 2;
  isLoading = false;
  noMorePosts = false;


  constructor(
    private postService: PostService,
    private userService: UserService,
    private commentService: CommentService,
    private notificationService: NotificationService,
    private imageService: ImageUploadService,
    private cd: ChangeDetectorRef,
    private dialog: MatDialog
  ) {
  }


  ngOnInit(): void {
    this.posts = [];
    this.isPostsLoaded = false;
    this.isUserDataLoaded = false;

    this.userService.getCurrentUser().subscribe(user => {
      this.user = user;
      this.isUserDataLoaded = true;
      this.currentPage = 0;
      this.noMorePosts = false;
      this.loadPosts();
      //this.postService.loadAllPosts();
      this.postService.posts$
        .pipe(takeUntil(this.destroy$))
        .subscribe(posts => {
          // корректно выставляем isLiked для каждого поста
          this.posts = posts.map(post => ({
            ...post,
            isLiked: (post.usersLiked ?? []).includes(this.user.username)
          }));
          this.isPostsLoaded = true;
          this.cd.markForCheck();
        });
    });
  }

  loadPosts(): void {
    this.isLoading = true;
    this.postService.loadPostsByPage(this.currentPage, this.pageSize).subscribe((uiPosts: UiPost[]) => {
      // Проставляем лайки для текущего пользователя
      uiPosts = uiPosts.map(post => ({
        ...post,
        isLiked: (post.usersLiked ?? []).includes(this.user.username)
      }));
      if (uiPosts.length === 0) {
        this.noMorePosts = true;
      }
      if (uiPosts.length < this.pageSize) {
        this.noMorePosts = true;
      }
      this.posts = [...this.posts, ...uiPosts];
      this.isLoading = false;
      this.cd.markForCheck();
    });
  }
  loadNextPage(): void {
    if (this.noMorePosts || this.isLoading) return;
    this.currentPage++;
    this.loadPosts();
  }

  @ViewChildren('anchor') anchors!: QueryList<ElementRef<HTMLElement>>;
  observers: IntersectionObserver[] = [];

  ngAfterViewInit() {
    this.anchors.changes.subscribe(() => this.setUpObservers());
    this.setUpObservers();
  }

  setUpObservers() {
    // Отключаем старые observers
    this.observers.forEach(obs => obs.disconnect());
    this.observers = [];

    this.anchors.forEach(anchor => {
      const observer = new IntersectionObserver(entries => {
        if (
          entries[0].isIntersecting &&
          !this.noMorePosts &&
          !this.isLoading
        ) {
          console.log('Anchor seen after every 2 posts, loading...');
          this.loadNextPage();
        }
      }, { root: null, threshold: 0 });
      observer.observe(anchor.nativeElement);
      this.observers.push(observer);
    });
  }

  ngOnDestroy() {
    this.observers.forEach(obs => obs.disconnect());
  }

  loaduser() {
    this.userService.getCurrentUser().subscribe(user => {
      this.user = user;
      this.isUserDataLoaded = true;
    });
  }


  getImagesToPosts(posts: UiPost[]): void {
    posts.forEach(p => {
      this.imageService.getImageToPost(p.id!).subscribe({
        next: blob => {
          console.log('Blob size', blob.size);        // ← должно быть > 0
          p.image = URL.createObjectURL(blob);
          showAllComments: typeof p.showAllComments === 'boolean' ? p.showAllComments : false
          this.cd.markForCheck();
        },
        error: err => {
          console.warn('Image load failed', err);
          /* fallback */
          p.image = 'assets/placeholder.jpg';
        }
      });
    });
  }


  getCommentsToPost(posts: Post[]): void {

    posts.forEach(p => {
      if (p.id !== undefined) {
        this.commentService.getCommentsToPost(p.id)
          .subscribe(data => {
            p.comments = data;
            this.cd.markForCheck();
          })
      }
    });
  }


  toggleShowAllComments(index: number): void {
    const post = this.posts[index];
    if (!post) return;
    if (typeof post.showAllComments === 'undefined') post.showAllComments = false;
    post.showAllComments = !post.showAllComments;
    this.cd.markForCheck();
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

    /* оптимистичное обновление UI */
    this.patchPost(i, {
      isLiked: !liked,
      usersLiked: liked
        ? post.usersLiked!.filter(u => u !== this.user.username)
        : [...(post.usersLiked ?? []), this.user.username]
    });

    this.postService.likePost(postId, this.user.username).pipe(
      catchError(err => {
        /* откат при ошибке */
        this.patchPost(i, {isLiked: liked});
        return throwError(() => err);
      })
    ).subscribe();
  }
  openLikesDialog(postIndex: number): void {
    const post = this.posts[postIndex];
    if (!post || !post.usersLiked || !post.usersLiked.length) return;
    this.dialog.open(LikesPostComponent, {
      data: post.usersLiked,
      width: '350px'
    });
  }

  getUserImage(username: string): string {
    // Если уже загрузили, возвращаем сразу
    if (this.userImages[username]) {
      return this.userImages[username];
    }
    // Загружаем новый и сохраняем
    this.imageService.getImageToUser(username)
      .subscribe({
        next: blob => {
          const preview = URL.createObjectURL(blob);
          this.userImages[username] = preview;
          this.cd.markForCheck();
        },
        error: err => {
          console.warn('Image load failed', err);
          this.userImages[username] = 'assets/placeholder.jpg';
          this.cd.markForCheck();
        }
      });
    // Пока грузится — можно возвращать плейсхолдер
    return 'assets/placeholder.jpg';
  }

  postComment(event: Event, message: string, postId: number, postIndex: number): void {
    event.preventDefault();
    const post = this.posts[postIndex];
    console.log(post);
    this.commentService.addToCommentToPost(postId, message)
      .subscribe(data => {
        post.comments?.push(data);
        this.cd.markForCheck();
        (event.target as HTMLFormElement).reset();
      })
  }
}
