import {ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit} from '@angular/core';
import {Post} from '../../models/Post';
import {User} from '../../models/User';
import {PostService} from '../../services/post.service';
import {UserService} from '../../services/user.service';
import {CommentService} from '../../services/comment.service';
import {NotificationService} from '../../services/notification.service';
import {ImageUploadService} from '../../services/image-upload.service';
import {
  MatCard,
  MatCardActions,
  MatCardContent,
  MatCardHeader,
  MatCardImage,
  MatCardSubtitle,
  MatCardTitle
} from '@angular/material/card';
import {MatIcon} from '@angular/material/icon';
import {MatFormField, MatHint, MatInput, MatLabel} from '@angular/material/input';
import {CommonModule, NgClass} from '@angular/common';
import {MatButton} from '@angular/material/button';
import {catchError, forkJoin, of, throwError} from 'rxjs';


interface UiPost extends Post {
  isLiked: boolean;          // ← добавили
}

@Component({
  selector: 'app-index',
  standalone: true,
  imports: [
    MatCardContent,
    MatCardSubtitle,
    MatCardTitle,
    MatCardHeader,
    MatCardActions,
    MatIcon,
    MatCardImage,
    MatCard,
    MatFormField,
    MatLabel,
    NgClass,
    MatHint,
    MatInput,
    MatButton,
    CommonModule
  ],
  changeDetection: ChangeDetectionStrategy.Default,
  templateUrl: './index.component.html',
  styleUrls: ['./index.component.css']
})
export class IndexComponent implements OnInit {

  posts!: UiPost[];
  user!: User;
  isPostsLoaded = false;
  isUserDataLoaded = false;


  constructor(
    private postService: PostService,
    private userService: UserService,
    private commentService: CommentService,
    private notificationService: NotificationService,
    private imageService: ImageUploadService,
    private cd: ChangeDetectorRef
  ) {
  }


  ngOnInit(): void {

    forkJoin({
      posts: this.postService.getAllPosts(),
      user: this.userService.getCurrentUser().pipe(
        catchError(() => of(null))        // если не залогинен
      )
    }).subscribe(({posts, user}) => {

      /* 1) пересчитываем флаг isLiked */
      this.posts = posts.map((p: { usersLiked: any; }) => ({
        ...p,
        isLiked: (p.usersLiked ?? []).includes(user?.username ?? '')
      }));

      /* 2) сохраняем пользователя */
      this.user = user as User;

      /* 3) подгружаем изображения и комментарии, если нужно */
      this.getImagesToPosts(this.posts);
      this.getCommentsToPost(this.posts);
      this.isPostsLoaded = true;
      this.isUserDataLoaded = !!user;
      /* 4) триггерим OnPush, чтобы иконки окрасились сразу */
      this.cd.markForCheck();
    });
  }


  getImagesToPosts(posts: Post[]): void {
    posts.forEach(p => {
      this.imageService.getImageToPost(p.id!).subscribe({
        next: blob => {
          console.log('Blob size', blob.size);        // ← должно быть > 0
          p.image = URL.createObjectURL(blob);
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


  postComment(message: string, postId: number, postIndex: number): void {
    const post = this.posts[postIndex];

    console.log(post);

    this.commentService.addToCommentToPost(postId, message)
      .subscribe(data => {
        post.comments?.push(data);
      })
  }
}
