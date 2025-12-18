import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef, inject,
  OnDestroy,
  OnInit,
  QueryList,
  ViewChildren
} from '@angular/core';
import { Post } from '../../models/Post';
import { User } from '../../models/User';
import { PostService } from '../../services/post.service';
import { UserService } from '../../services/user.service';
import { StoryService } from '../../services/story.service';
import { CommentService } from '../../services/comment.service';
import { ImageUploadService } from '../../services/image-upload.service';
import { MatCardImage, MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { CommonModule, NgClass } from '@angular/common';
import { MatButtonModule, MatIconButton } from '@angular/material/button';
import {Observable, Subject, takeUntil, tap} from 'rxjs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { RouterLink, RouterModule } from '@angular/router';
import { LikesPostComponent } from '../../pages/post/likes-post/likes-post.component';
import { MatDialog } from '@angular/material/dialog';
import { PostInfoComponent } from '../../pages/post/post-info/post-info.component';
import { StoryViewerComponent } from '../../pages/story/story-viewer/story-viewer.component';
import { Story } from '../../models/Story';
import { CreateStoryComponent } from '../../pages/story/create-story/create-story.component';
import { TokenStorageService } from '../../services/token-storage.service';
import { ChatService } from '../../services/chat.service';
import { NotificationService } from '../../services/notification.service';
import {SocketClientService} from '../../services/SocketClient.service';
import {UsersWithStory} from '../../models/UsersWithStory';

interface UiPost extends Post {
  isLiked: boolean;
  avatarUrl?: string; // Готовая ссылка
  showAllComments?: boolean;
  commentCount?: number;
  showHeart?: boolean;
}

@Component({
  selector: 'app-index',
  standalone: true,
  imports: [
    MatIconModule,
    MatCardModule,
    MatFormFieldModule,
    NgClass,
    MatInputModule,
    MatButtonModule,
    CommonModule,
    MatIconButton,
    RouterLink,
    RouterModule
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
  usersWithStories$!: Observable<UsersWithStory[]>;

  private destroy$ = new Subject<void>();
  currentPage = 0;
  pageSize = 2;
  isLoading = false;
  noMorePosts = false;
  groupedStories: { username: string; stories: Story[]; loaded?: boolean }[] = [];
  currentUserIndex = 0;
  currentStoryIndex = 0;

  usersWithStories: UsersWithStory[]=[];
  @ViewChildren('anchor') anchors!: QueryList<ElementRef<HTMLElement>>;
  private observer?: IntersectionObserver;

  private postService = inject(PostService);
  private userService = inject(UserService);
  private commentService = inject(CommentService);
  public imageService = inject(ImageUploadService);
  private cd = inject(ChangeDetectorRef);
  private dialog = inject(MatDialog);
  private storyService = inject(StoryService);
  private socketClient = inject(SocketClientService);
  private tokenService = inject(TokenStorageService);
  private chatService = inject(ChatService);
  private notifSocketService = inject(NotificationService);

  constructor() {}

  ngOnInit(): void {
    if (this.tokenService.getToken() != null) {
      this.socketClient.connect();
    }


    this.usersWithStories$ = this.storyService.getUsersWithActiveStories().pipe(
      tap(response => {
        this.groupedStories = response.map(user => ({
          username: user.username,
          stories: [],
          loaded: false
        }));
      }),
      takeUntil(this.destroy$)
    );

    this.postService.posts$
      .pipe(takeUntil(this.destroy$))
      .subscribe(posts => {
        this.posts = posts;
        this.isPostsLoaded = true;
        this.isLoading = false;
        this.cd.markForCheck();

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
  }

  private resetPaging(): void {
    this.currentPage = 0;
    this.noMorePosts = false;
    this.isLoading = false;
    this.postService.clearPosts?.();
  }

  loadPosts(): void {
    this.isLoading = true;
    this.postService.appendPostsPage(this.currentPage, this.pageSize)
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

  openStoryViewer(username: string, startStoryIndex: number = 0): void {
    const userGroup = this.groupedStories.find(g => g.username === username);
    if (!userGroup) return;

    const startUserIndex = this.groupedStories.indexOf(userGroup);

    const openDialog = () => {
      const dialogRef = this.dialog.open(StoryViewerComponent, {
        width: '400px',
        data: {
          groupedStories: this.groupedStories,
          startUserIndex,
          startStoryIndex
        }
      });

      this.preloadNeighborStories(startUserIndex);

      dialogRef.componentInstance.userChanged
        .pipe(takeUntil(this.destroy$))
        .subscribe((newIndex: number) => {
          this.preloadNeighborStories(newIndex);
        });
      dialogRef.afterClosed().subscribe(() => {
        this.storyService.getUsersWithActiveStories()
          .pipe(takeUntil(this.destroy$))
          .subscribe(response => {
            this.usersWithStories = response;
            this.cd.markForCheck();
          });
      });
    }

    if (!userGroup.loaded) {
      this.storyService.getActiveStoriesForUser(username)
        .pipe(takeUntil(this.destroy$))
        .subscribe(stories => {
          userGroup.stories = stories;
          userGroup.loaded = true;
          openDialog();
        });
    } else {
      openDialog();
    }
  }

  private preloadNeighborStories(index: number) {
    const neighbors = [index - 1, index + 1];
    for (const i of neighbors) {
      if (i < 0 || i >= this.groupedStories.length) continue;
      const group = this.groupedStories[i];
      if (!group.loaded) {
        this.storyService.getActiveStoriesForUser(group.username)
          .pipe(takeUntil(this.destroy$))
          .subscribe(stories => {
            group.stories = stories;
            group.loaded = true;
          });
      }
    }
  }

  trackByUsername(index: number, user: UsersWithStory): string {
    return user.username;
  }

  openCreateStoryDialog() {
    const dialogRef = this.dialog.open(CreateStoryComponent, {
      maxWidth: '95vw',
      maxHeight: '90vh'
    });
    dialogRef.afterClosed().subscribe(result => {
      if (this.user?.username) {
      }
    });
  }
}
