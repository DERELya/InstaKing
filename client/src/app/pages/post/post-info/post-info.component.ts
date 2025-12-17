import { ChangeDetectorRef, Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule, DatePipe, NgForOf, NgIf } from '@angular/common';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatInput } from '@angular/material/input';
import { PostService } from '../../../services/post.service';
import { ImageUploadService } from '../../../services/image-upload.service'; // Обновленный сервис
import { NotificationService } from '../../../services/notification.service';
import { CommentService } from '../../../services/comment.service';
import { RouterLink } from '@angular/router';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Post } from '../../../models/Post';
import { MatIcon } from '@angular/material/icon';
import { LikesPostComponent } from '../likes-post/likes-post.component';
import { TokenStorageService } from '../../../services/token-storage.service';
import { Subject, takeUntil } from 'rxjs';
import { TimeAgoPipe } from '../../../helper/time-ago.pipe';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';

interface UiPost extends Post {
  isLiked: boolean;
  avatarUrl?: string; // Это уже полная ссылка (сделали в PostService)
  showAllComments?: boolean;
}

export interface PostComment {
  id: number;
  username: string;
  message: string;
  createdDate: string;
  userAvatarUrl?: string; // <-- ДОБАВИЛИ ЭТО ПОЛЕ (имя файла)
}

export interface CommentPageResponse {
  comments: PostComment[];
  totalElements: number;
  totalPages: number;
  pageNumber: number;
  pageSize: number;
}

@Component({
  selector: 'app-post-info',
  standalone: true,
  imports: [
    DatePipe, MatButton, MatIcon, MatIconButton, MatInput, NgForOf, NgIf,
    CommonModule, RouterLink, TimeAgoPipe, MatMenu, MatMenuTrigger, MatMenuItem
  ],
  templateUrl: './post-info.component.html',
  styleUrl: './post-info.component.css'
})
export class PostInfoComponent implements OnInit, OnDestroy {
  meUsername: string = '';
  menuOpen = false;

  // Удалили userImages (больше не нужно кэшировать Blob)

  MAX_VISIBLE_COMMENTS = 10;
  comments: PostComment[] = [];
  totalPages: number = 0;
  currentPage: number = 0;
  pageSize: number = 10;
  loadingComments = false;
  private destroy$ = new Subject<void>();

  constructor(
    public dialogRef: MatDialogRef<PostInfoComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { post: UiPost; index: number },
    private postService: PostService,
    private notify: NotificationService,
    private commentService: CommentService,

    // Делаем public, чтобы использовать в HTML
    public imageService: ImageUploadService,

    private dialog: MatDialog,
    private cd: ChangeDetectorRef,
    private tokenService: TokenStorageService,
  ) {
    this.meUsername = tokenService.getUsernameFromToken() || '';
  }

  ngOnInit(): void {
    this.data.post.isLiked = (this.data.post.usersLiked ?? []).includes(this.meUsername);
    this.loadComments(0);
  }

  ngOnDestroy(): void {
    if (this.data.post) {
      this.dialogRef.close(this.data.post);
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ... методы close, likePost, trackBy, postComment, deleteComment ...
  // (они не меняются, кроме того, что в postComment сервер должен вернуть коммент с аватаркой)

  close(): void {
    this.dialogRef.close(this.data.post);
  }

  likePost(): void {
    const post: UiPost = this.data.post;
    const liked = post.isLiked;
    const username = this.meUsername;

    post.isLiked = !liked;
    if (liked) {
      post.usersLiked = post.usersLiked?.filter(u => u !== username) ?? [];
    } else {
      post.usersLiked = [...(post.usersLiked ?? []), username];
    }
    this.cd.markForCheck();

    this.postService.likePost(post.id!, username).subscribe({
      error: () => {
        post.isLiked = liked;
        this.cd.markForCheck(); // Откат при ошибке
      }
    });
  }

  trackByCommentId(index: number, comment: PostComment) {
    return comment.id;
  }

  postComment(event: Event, message: string): void {
    event.preventDefault();
    const post = this.data.post;
    this.commentService.addToCommentToPost(post.id!, message)
      .subscribe(data => {
        this.comments = [data, ...this.comments];
        this.data.post.commentCount = (post.commentCount ?? 0) + 1;
        this.cd.markForCheck();
        (event.target as HTMLFormElement).reset();
      });
  }

  deleteComment(commentId: number): void {
    this.commentService.delete(commentId).subscribe({
      next: () => {
        this.notify.showSnackBar('Comment removed');
        this.comments = this.comments.filter(c => c.id !== commentId);
        this.data.post.commentCount = Math.max((this.data.post.commentCount ?? 1) - 1, 0);
        this.cd.markForCheck();
      },
      error: (err) => {
        this.notify.showSnackBar('Ошибка при удалении комментария');
      }
    });
  }

  onAvatarError(event: Event) {
    (event.target as HTMLImageElement).src = 'assets/placeholder.jpg';
  }

  loadComments(page: number = 0) {
    const postId = this.data.post.id!;
    this.loadingComments = true;

    this.commentService.getComments(postId, page, this.pageSize)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (page === 0) {
            this.comments = response.comments;
          } else {
            this.comments = [...this.comments, ...response.comments];
          }
          this.totalPages = response.totalPages;
          this.currentPage = response.pageNumber;
          this.loadingComments = false;
          this.cd.markForCheck();
        },
        error: () => {
          this.loadingComments = false;
        }
      });
  }

  loadNextPage() {
    if (this.currentPage + 1 >= this.totalPages || this.loadingComments) return;
    this.loadComments(this.currentPage + 1);
  }

  toggleMenu() { this.menuOpen = !this.menuOpen; }

  onMenuAction(action: string) {
    this.menuOpen = false;
    if (action === 'delete') {
      this.deleteCurrentPost();
    }
  }

  deleteCurrentPost() {
    const post = this.data.post;
    if (!post.id) return;
    if (!confirm('Вы действительно хотите удалить этот пост?')) return;

    this.postService.deletePost(post.id).subscribe({
      next: () => {
        this.notify.showSnackBar('Пост удалён');
        this.dialogRef.close({ deleted: true });
      },
      error: () => {
        this.notify.showSnackBar('Ошибка при удалении поста');
      }
    });
  }

  openLikesDialog(): void {
    if (!this.data.post.usersLiked || !this.data.post.usersLiked.length) return;
    this.dialog.open(LikesPostComponent, {
      data: this.data.post.usersLiked,
      width: '350px'
    });
  }

  toggleFavorite(postId: number): void {
    const post = this.data.post;
    if (!post) return;
    const prevState = post.favorited ?? false;
    post.favorited = !prevState;

    this.postService.toggleFavorite(postId).subscribe({
      next: (res) => {
        post.favorited = res === 'added';
        this.cd.markForCheck();
      },
      error: () => {
        post.favorited = prevState;
        this.cd.markForCheck();
      }
    });
  }
}
