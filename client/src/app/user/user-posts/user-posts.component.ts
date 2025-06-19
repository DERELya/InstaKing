/* user-posts.component.ts */
import {ChangeDetectionStrategy, Component, ChangeDetectorRef, OnInit} from '@angular/core';
import {catchError, forkJoin, map, of, switchMap} from 'rxjs';
import { PostService } from '../../services/post.service';
import { ImageUploadService } from '../../services/image-upload.service';
import { UserService } from '../../services/user.service';
import { NotificationService } from '../../services/notification.service'; // см. пункт 2
import { Post } from '../../models/Post';
import {CommentService} from '../../services/comment.service';
import {CommonModule, DatePipe, NgClass, NgForOf, NgIf} from '@angular/common';
import { MatCardModule} from '@angular/material/card';
import {MatIconModule} from '@angular/material/icon';
import {MatIconButton} from '@angular/material/button';

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
    CommonModule
  ]
})
export class UserPostsComponent implements OnInit{
  posts: UiPost[] = [];
  isUserPostsLoaded = false;
  meUsername!: string;
  openedPostIndex: number | null = null;

  constructor(
    private postService: PostService,
    private imageService: ImageUploadService,
    private userService: UserService,
    private notify: NotificationService,
    private commentService: CommentService,
    private cd: ChangeDetectorRef
  ) {}

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
              map(({ postImg, avatar }) => ({
                ...p,
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

  /* ❤️ / 💔 */
  toggleLike(post: UiPost, idx: number): void {
    this.postService.toggleLike(post.id!).subscribe({
      next: added => {
        const likes = added ? (post.likes! + 1) : (post.likes! - 1);
        const isLiked = added;
        this.posts = this.posts.map((p, i) =>
          i === idx ? { ...p, likes, isLiked } : p
        );
        this.cd.markForCheck();
      }
    });
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


  deleteComment(commentId: number, postIndex: number, commentIndex: number): void {
    const post = this.posts[postIndex];

    this.commentService.delete(commentId)
      .subscribe(() => {
        this.notify.showSnackBar('Comment removed');
        post.comments!.splice(commentIndex, 1);
      });
  }

  /* удаление поста / комментария — оставляем как было */
}
