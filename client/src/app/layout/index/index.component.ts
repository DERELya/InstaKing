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
import { Post } from '../../models/Post';
import { User } from '../../models/User';
import { PostService } from '../../services/post.service';
import { UserService } from '../../services/user.service';
import { StoryService} from '../../services/story.service';
import { CommentService } from '../../services/comment.service';
import { ImageUploadService } from '../../services/image-upload.service';
import { MatCardImage, MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { CommonModule, NgClass } from '@angular/common';
import { MatButtonModule, MatIconButton } from '@angular/material/button';
import { Subject, takeUntil } from 'rxjs';
import { MatFormFieldModule } from '@angular/material/form-field';
import {RouterLink, RouterModule} from '@angular/router';
import { LikesPostComponent } from '../../user/likes-post/likes-post.component';
import {MatDialog, MatDialogConfig} from '@angular/material/dialog';
import { PostInfoComponent } from '../../user/post-info/post-info.component';
import {StoryViewerComponent} from '../../user/story-viewer/story-viewer.component';
import {Story} from '../../models/Story';
import {CreateStoryComponent} from '../../user/create-story/create-story.component';

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
  userImages: { [key: string]: string } = {};
  private destroy$ = new Subject<void>();
  currentPage = 0;
  pageSize = 2;
  isLoading = false;
  noMorePosts = false;
  groupedStories: { username: string; stories: Story[]; loaded?: boolean }[] = [];
  currentUserIndex = 0;
  currentStoryIndex = 0;

  usersWithStories: Record<string, boolean> = {};
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
    this.storyService.getUsersWithActiveStories()
      .pipe(takeUntil(this.destroy$))
      .subscribe((response: Record<string, boolean>) => {
        this.usersWithStories = response;
        console.log(response);
        this.groupedStories = Object.keys(response).map(u => ({
          username: u,
          stories: [],
          loaded: false
        }));
        this.cd.markForCheck();
      });

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


  trackByUsernamePost(index: number, username: string): string {
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

      // Подгружаем соседние сторис для плавного пролистывания
      this.preloadNeighborStories(startUserIndex);

      // Подписка на смену пользователя
      dialogRef.componentInstance.userChanged
        .pipe(takeUntil(this.destroy$))
        .subscribe((newIndex: number) => {
          this.preloadNeighborStories(newIndex);
        });

      // После закрытия диалога обновляем статус просмотра
      dialogRef.afterClosed().subscribe(() => {
        this.storyService.getUsersWithActiveStories()
          .pipe(takeUntil(this.destroy$))
          .subscribe(response => {
            this.usersWithStories = response; // теперь Record<string, boolean>
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

  private openViewer(startUserIndex: number, startStoryIndex: number) {
    const dialogConfig = new MatDialogConfig();
    dialogConfig.width = '400px';
    dialogConfig.data = {
      groupedStories: this.groupedStories,
      startUserIndex,
      startStoryIndex
    };

    const dialogRef = this.dialog.open(StoryViewerComponent, dialogConfig);

    // Подгружаем соседние пользователи заранее
    this.preloadNeighborStories(startUserIndex);

  }


  getStoriesView(username:string):boolean{
    const userGroup = this.groupedStories.find(g => g.username === username)
    if (!userGroup) return true;
    return userGroup.stories.every(story => story.viewed);
  }

  trackByUsername(index: number, entry: { key: string; value: boolean }): string {
    return entry.key;
  }

  keepOrder = () => 0;
  trackByUsernameStory(index: number, entry: any): string {
    return entry.key;
  }


  openCreateStoryDialog() {
      const dialogRef=this.dialog.open(CreateStoryComponent, {
        maxWidth: '95vw',
        maxHeight: '90vh'
      });
      dialogRef.afterClosed().subscribe(result => {
        if ( this.user?.username) {
          // Обновление счетчика постов происходит через подписку на postCountChanged$ в ngOnInit.
        }
      });
  }
}
