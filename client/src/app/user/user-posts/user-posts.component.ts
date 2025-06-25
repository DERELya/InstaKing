import { ChangeDetectionStrategy, ChangeDetectorRef, Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { PostService } from '../../services/post.service';
import { ImageUploadService } from '../../services/image-upload.service';
import { UserService } from '../../services/user.service';
import { NotificationService } from '../../services/notification.service';
import { CommentService } from '../../services/comment.service';
import { Post } from '../../models/Post';

import { CommonModule, DatePipe, NgClass, NgForOf, NgIf } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule, MatIconButton } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { RouterLink } from '@angular/router';
import {MatDialog, MatDialogConfig} from '@angular/material/dialog';
import {LikesPostComponent} from '../likes-post/likes-post.component';

interface UiPost extends Post {
  isLiked: boolean;
  avatarUrl?: string;
  showAllComments?: boolean;
}

@Component({
  selector: 'app-posts',
  templateUrl: './user-posts.component.html',
  styleUrls: ['./user-posts.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    DatePipe,
    MatCardModule,
    MatIconModule,
    NgClass,
    MatIconButton,
    NgIf,
    NgForOf,
    CommonModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    RouterLink
  ]
})
export class UserPostsComponent implements OnInit, OnDestroy {
  posts: UiPost[] = [];
  isUserPostsLoaded = false;
  meUsername!: string;
  openedPostIndex: number | null = null;
  userImages: { [key: string]: string } = {};
  menuOpen = false;
  MAX_VISIBLE_COMMENTS = 10;
  private destroy$ = new Subject<void>();

  constructor(
    private postService: PostService,
    private imageService: ImageUploadService,
    private userService: UserService,
    private notify: NotificationService,
    private commentService: CommentService,
    private cd: ChangeDetectorRef,
    private route: ActivatedRoute,
    private router: Router,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.route.paramMap
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        const username = params.get('username');
        if (username) {
          this.postService.loadProfilePosts(username);
          this.meUsername = username;
        }
      });

    this.postService.posts$
      .pipe(takeUntil(this.destroy$))
      .subscribe(posts => {
        this.posts = posts;
        this.isUserPostsLoaded = true;
        console.log('like');
        console.log(posts[0].usersLiked!);
        this.cd.markForCheck();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    // Можно добавить освобождение ресурсов createObjectURL, если нужно
  }

  openPostDetails(index: number) {
    this.openedPostIndex = index;
  }

  closePostDetails() {
    this.openedPostIndex = null;
  }

  toggleShowAllComments(index: number): void {
    const post = this.posts[index];
    post.showAllComments = !post.showAllComments;
    this.cd.markForCheck();
  }

  removePost(post: Post, index: number): void {
    if (confirm('Do you really want to delete this post?')) {
      this.postService.deletePost(post.id!)
        .subscribe(() => {
          this.posts.splice(index, 1);
          this.notify.showSnackBar('Post deleted');
          this.cd.markForCheck();
        });
    }
  }

  likePost(postId: number, i: number): void {
    const post = this.posts[i];
    const liked = post.isLiked;

    // Оптимистичное обновление UI
    this.patchPost(i, {
      isLiked: !liked,
      usersLiked: liked
        ? post.usersLiked!.filter(u => u !== this.meUsername)
        : [...(post.usersLiked ?? []), this.meUsername]
    });

    this.postService.likePost(postId, this.meUsername).subscribe({
      error: err => {
        // Откат при ошибке
        this.patchPost(i, { isLiked: liked });
      }
    });
  }

  private patchPost(index: number, patch: Partial<UiPost>): void {
    const updated = { ...this.posts[index], ...patch };
    this.posts = [
      ...this.posts.slice(0, index),
      updated,
      ...this.posts.slice(index + 1)
    ];
    this.cd.markForCheck();
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

  deleteComment(commentId: number, postIndex: number, commentIndex: number): void {
    const post = this.posts[postIndex];
    this.commentService.delete(commentId)
      .subscribe(() => {
        this.notify.showSnackBar('Comment removed');
        post.comments!.splice(commentIndex, 1);
        this.cd.markForCheck();
      });
  }

  getUserImage(username: string): string {
    if (this.userImages[username]) {
      return this.userImages[username];
    }
    this.imageService.getImageToUser(username)
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
    return 'assets/placeholder.jpg';
  }

  trackById(index: number, item: { id?: any }): any {
    return item && item.id !== undefined && item.id !== null ? item.id : index;
  }

  onAvatarError(event: Event) {
    (event.target as HTMLImageElement).src = 'assets/placeholder.jpg';
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.menu-wrapper')) {
      this.menuOpen = false;
    }
  }

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

  onMenuAction(action: string) {
    this.menuOpen = false;
    if (action === 'delete') {
      this.deleteCurrentPost();
    } else if (action === 'update') {
      // Добавь свою логику обновления поста
    }
  }

  deleteCurrentPost() {
    const indexToDelete = this.openedPostIndex;
    if (indexToDelete === null || indexToDelete === undefined) return;
    const postId = this.posts[indexToDelete].id;
    if (!postId) return;

    if (!confirm('Вы действительно хотите удалить этот пост?')) return;
    this.postService.deletePost(postId).subscribe({
      next: () => {
        this.posts.splice(indexToDelete, 1);
        this.notify.showSnackBar('Пост удалён');
        this.cd.markForCheck();
      },
      error: () => {
        this.notify.showSnackBar('Ошибка при удалении поста');
      }
    });
    this.closePostDetails();
  }

  openLikesDialog(): void {
    const dialogUserLikesConfig = new MatDialogConfig();
    dialogUserLikesConfig.width = '350px';
    dialogUserLikesConfig.data = this.posts[this.openedPostIndex!].usersLiked; {
    }
    const dialogRef = this.dialog.open(LikesPostComponent, dialogUserLikesConfig);

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
      }
    });
  }
}
