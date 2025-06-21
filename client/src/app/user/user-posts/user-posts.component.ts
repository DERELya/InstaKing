/* user-posts.component.ts */
import {ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit} from '@angular/core';
import {catchError, forkJoin, map, of, switchMap, throwError} from 'rxjs';
import {PostService} from '../../services/post.service';
import {ImageUploadService} from '../../services/image-upload.service';
import {UserService} from '../../services/user.service';
import {NotificationService} from '../../services/notification.service'; // см. пункт 2
import {Post} from '../../models/Post';
import {CommentService} from '../../services/comment.service';
import {CommonModule, DatePipe, NgClass, NgForOf, NgIf} from '@angular/common';
import {MatCardModule} from '@angular/material/card';
import {MatIconModule} from '@angular/material/icon';
import {MatButtonModule, MatIconButton} from '@angular/material/button';
import {MatInputModule, MatLabel} from '@angular/material/input';
import {MatFormFieldModule} from '@angular/material/form-field';

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
    MatLabel,
    MatButtonModule
  ]
})
export class UserPostsComponent implements OnInit {
  posts: UiPost[] = [];
  isUserPostsLoaded = false;
  meUsername!: string;
  openedPostIndex: number | null = null;
  userProfileImage?: string;
  previewUrl?: string;
  userImages: { [key: string]: string } = {};

  constructor(
    private postService: PostService,
    private imageService: ImageUploadService,
    private userService: UserService,
    private notify: NotificationService,
    private commentService: CommentService,
    private cd: ChangeDetectorRef
  ) {
  }

  ngOnInit(): void {
    /* 1. узнаём текущего пользователя */

    this.userService.getCurrentUser().pipe(
      switchMap(me => {
        this.meUsername = me.username;
        /* 2. загружаем его же посты */
        return this.postService.getPostForCurrentUser();
      }),
      /* 3. на каждый пост параллельно тянем: фото поста + аватар автора */
      switchMap((posts: Post[]) =>
        forkJoin(
          posts.map(p =>
            forkJoin({
              postImg: this.imageService.getImageToPost(p.id!).pipe(
                map(blob => URL.createObjectURL(blob)),
                catchError(() => of('assets/placeholder.jpg'))
              ),
              avatar: this.imageService.getImageToUser(p.username!).pipe(
                map(blob => URL.createObjectURL(blob)),
                catchError(() => of('assets/blank-avatar.png'))  // ✅ строка
              )
            }).pipe(
              map(({postImg, avatar}) => ({
                ...p,
                usersLiked: p.usersLiked ?? [],
                image: postImg,
                avatarUrl: avatar,
                isLiked: (p.usersLiked ?? []).includes(this.meUsername)
              }))
            )
          )
        )
      )
    ).subscribe({
      next: uiPosts => {
        this.posts = uiPosts;
        this.isUserPostsLoaded = true;
        this.getCommentsToPost(this.posts);
        console.log(this.posts);
        this.cd.markForCheck();
      },
      error: () => this.notify.showSnackBar('Cannot load feed')
    });

  }

  openPostDetails(index: number) {
    this.openedPostIndex = index;
  }

  closePostDetails() {
    this.openedPostIndex = null;
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

  MAX_VISIBLE_COMMENTS = 10;

  toggleShowAllComments(index: number): void {
    const post = this.posts[index];
    post.showAllComments = !post.showAllComments;
    this.cd.markForCheck();
  }

  removePost(post: Post, index: number): void {
    console.log(post);
    const result = confirm('Do you really want to delete this post?');
    if (result) {
      this.postService.deletePost(post.id!)
        .subscribe(() => {
          this.posts.splice(index, 1);
          this.notify.showSnackBar('Post deleted');
        });
    }
  }

  likePost(postId: number, i: number): void {
    const post = this.posts[i];
    const liked = post.isLiked;

    /* оптимистичное обновление UI */
    this.patchPost(i, {
      isLiked: !liked,
      usersLiked: liked
        ? post.usersLiked!.filter(u => u !== this.meUsername)
        : [...(post.usersLiked ?? []), this.meUsername]
    });

    this.postService.likePost(postId, this.meUsername).pipe(
      catchError(err => {
        /* откат при ошибке */
        this.patchPost(i, {isLiked: liked});
        return throwError(() => err);
      })
    ).subscribe();
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


  deleteComment(commentId: number, postIndex: number, commentIndex: number): void {
    const post = this.posts[postIndex];

    this.commentService.delete(commentId)
      .subscribe(() => {
        this.notify.showSnackBar('Comment removed');
        post.comments!.splice(commentIndex, 1);
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
  trackById(index: number, item: { id?: any }): any {
    return item && item.id !== undefined && item.id !== null ? item.id : index;
  }

  onAvatarError(event: Event) {
    (event.target as HTMLImageElement).src = 'assets/placeholder.jpg';
  }
}
