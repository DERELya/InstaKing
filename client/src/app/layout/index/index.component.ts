import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  QueryList, TrackByFunction,
  ViewChildren
} from '@angular/core';
import { Post } from '../../models/Post';
import { User } from '../../models/User';
import { PostService } from '../../services/post.service';
import { UserService } from '../../services/user.service';
import { StoryService, Story } from '../../services/story.service';
import { CommentService } from '../../services/comment.service';
import { ImageUploadService } from '../../services/image-upload.service';
import { MatCardImage, MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { CommonModule, NgClass } from '@angular/common';
import { MatButtonModule, MatIconButton } from '@angular/material/button';
import { Subject, takeUntil } from 'rxjs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { RouterLink } from '@angular/router';
import { LikesPostComponent } from '../../user/likes-post/likes-post.component';
import {MatDialog, MatDialogConfig} from '@angular/material/dialog';
import { PostInfoComponent } from '../../user/post-info/post-info.component';
import {StoryViewerComponent} from '../../user/story-viewer/story-viewer.component';
import {EditUserComponent} from '../../user/edit-user/edit-user.component';

interface UiPost extends Post {
  isLiked: boolean;
  avatarUrl?: string;
  showAllComments?: boolean;
  commentCount?: number;
  showHeart?: boolean;
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
  stories: Story[] = [];
  posts: UiPost[] = [];
  user!: User;
  isPostsLoaded = false;
  isUserDataLoaded = false;
  userImages: { [key: string]: string } = {};
  private destroy$ = new Subject<void>();
  currentPage = 0;
  pageSize = 2;
  isLoading = false;
  noMorePosts = false;

  @ViewChildren('anchor') anchors!: QueryList<ElementRef<HTMLElement>>;
  private observer?: IntersectionObserver;

  constructor(
    private postService: PostService,
    private userService: UserService,
    protected commentService: CommentService,
    private imageService: ImageUploadService,
    private cd: ChangeDetectorRef,
    private dialog: MatDialog,
    private storyService: StoryService
  ) {}

  ngOnInit(): void {
    this.postService.posts$
      .pipe(takeUntil(this.destroy$))
      .subscribe(posts => {
        this.posts = posts;
        this.isPostsLoaded = true;
        this.isLoading = false;
        this.cd.markForCheck();

        // Подгружаем избранные после получения постов
        this.postService.getFavorites().subscribe(favorites => {
          const favoriteIds = new Set(favorites.map(p => p.id));
          this.posts = this.posts.map(post => ({
            ...post,
            favorited: favoriteIds.has(post.id)
          }));
          this.cd.markForCheck();
        });
      });

    this.postService.totalPages$
      .pipe(takeUntil(this.destroy$))
      .subscribe(totalPages => {
        if (typeof totalPages === 'number' && totalPages > 0) {
          this.noMorePosts = this.currentPage >= (totalPages - 1);
        }
        this.cd.markForCheck();
      });

    this.userService.getCurrentUser().pipe(takeUntil(this.destroy$)).subscribe(user => {
      this.user = user;
      this.isUserDataLoaded = true;
      this.resetPaging();
      this.loadPosts();
    });
    this.storyService.loadFollowingStories().subscribe(stories => {
      this.stories = stories.map(s => ({
        id: s.id,
        username: s.username,
        imageUrl: s.mediaUrl,       // мапим с mediaUrl
        views: s.views,
        createdAt: s.createdAt,
        expiresAt: s.expiresAt,
        usersViewed: s.viewed,
        viewed: false,              // пока никто не смотрел на фронте
        avatarUrl: undefined        // будет загружено через getUserImage
      }));

      // Загружаем аватарки пользователей
      this.stories.forEach(story => {
        story.mediaUrl = this.getUserImage(story.username);
      });

      console.log(this.stories);
      this.cd.markForCheck();
    });

  }

  private resetPaging(): void {
    this.currentPage = 0;
    this.noMorePosts = false;
    this.isLoading = false;
    this.postService.clearPosts?.();
  }

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
    this.currentPage++;
    this.loadPosts();
  }

  openPostDetails(index: number) {
    const dialogRef = this.dialog.open(PostInfoComponent, {
      data: { post: this.posts[index], index },
      width: '700px',
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (!result) return;

      if (result.deleted) {
        this.posts.splice(index, 1);
        this.cd.markForCheck();
        return;
      }

      if (result && result.id === this.posts[index].id) {
        this.posts[index] = { ...this.posts[index], ...result };
        this.cd.markForCheck();
      }
    });
  }

  ngAfterViewInit() {
    this.anchors.changes.subscribe(() => this.observeLastAnchor());
    this.observeLastAnchor();
  }

  private observeLastAnchor(): void {
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

  likePost(postId: number, i: number): void {
    const post = this.posts[i];
    if (!post) return;

    this.postService.likePost(postId, this.user.username).subscribe();

    post.showHeart = true;
    setTimeout(() => {
      post.showHeart = false;
      this.cd.markForCheck();
    }, 800);
  }

  openLikesDialog(postIndex: number): void {
    const post = this.posts[postIndex];
    if (!post || !post.usersLiked || !post.usersLiked.length) return;
    this.dialog.open(LikesPostComponent, {
      data: post.usersLiked,
      width: '350px'
    });
  }

  getUserImage(username?: string): string {
    if (!username) return 'assets/placeholder.jpg';

    if (this.userImages[username]) {
      return this.userImages[username];
    }

    this.userImages[username] = 'assets/placeholder.jpg';
    this.imageService.getImageToUser(username)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: blob => {
          const preview = URL.createObjectURL(blob);
          this.userImages[username!] = preview;
          this.cd.markForCheck();
        },
        error: () => {
          this.userImages[username!] = 'assets/placeholder.jpg';
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
        post.commentCount = (post.commentCount || 0) + 1;
        this.cd.markForCheck();
        (event.target as HTMLFormElement).reset();
      });
  }

  toggleFavorite(postId: number, i: number): void {
    const post = this.posts[i];
    if (!post) return;

    const prevState = post.favorited;
    post.favorited = !prevState;

    this.postService.toggleFavorite(postId).subscribe({
      next: res => {
        post.favorited = res === 'added';
        this.cd.markForCheck();
      },
      error: () => {
        post.favorited = prevState;
        this.cd.markForCheck();
      }
    });
  }
  trackByStoryId(index: number, story: Story): number {
    return story.id!;
  }

  openStoryViewer(startIndex: number = 0): void {
    if (!this.stories || this.stories.length === 0) return;

    const dialogStoryViewerConfig = new MatDialogConfig();
    dialogStoryViewerConfig.width = '400px';
    dialogStoryViewerConfig.data = { stories: this.stories };
    const dialogRef = this.dialog.open(StoryViewerComponent, dialogStoryViewerConfig);

    dialogRef.afterClosed().subscribe(result => {
    });
  }


}
