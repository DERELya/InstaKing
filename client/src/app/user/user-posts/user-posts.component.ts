import {ChangeDetectionStrategy, ChangeDetectorRef, Component} from '@angular/core';
import {
  MatCard,
  MatCardActions,
  MatCardContent,
  MatCardHeader,
  MatCardSubtitle,
  MatCardTitle
} from '@angular/material/card';
import {MatIcon} from '@angular/material/icon';
import {Post} from '../../models/Post';
import {PostService} from '../../services/post.service';
import {CommentService} from '../../services/comment.service';
import {NotificationService} from '../../services/notification.service';
import {ImageUploadService} from '../../services/image-upload.service';
import {CommonModule} from '@angular/common';
import {MatButton} from '@angular/material/button';

@Component({
  selector: 'app-posts',
  imports: [
    MatCardActions,
    MatIcon,
    MatCardSubtitle,
    MatCardContent,
    MatCardTitle,
    MatCardHeader,
    MatCard,
    CommonModule,
    MatButton
  ],
  changeDetection: ChangeDetectionStrategy.Default,
  standalone:true,
  templateUrl: './user-posts.component.html',
  styleUrls: ['./user-posts.component.css']
})
export class UserPostsComponent {
  isUserPostsLoaded = false;
  posts!: Post [];

  constructor(private postService: PostService,
              private imageService: ImageUploadService,
              private commentService: CommentService,
              private notificationService: NotificationService,
              private cd: ChangeDetectorRef) {
  }

  ngOnInit(): void {
    this.postService.getPostForCurrentUser()
      .subscribe(data => {
        this.posts = data;
        this.getImagesToPosts(this.posts);
        this.getCommentsToPost(this.posts);
        this.isUserPostsLoaded = true;
      });
  }

  getImagesToPosts(posts: Post[]): void {
    posts.forEach(p => {
      this.imageService.getImageToPost(p.id!).subscribe({
        next: blob => {
          p.image = URL.createObjectURL(blob);
          this.cd.markForCheck();
        },
        error: err => {
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

  removePost(post: Post, index: number): void {
    console.log(post);
    const result = confirm('Do you really want to delete this post?');
    if (result) {
      this.postService.deletePost(post.id!)
        .subscribe(() => {
          this.posts.splice(index, 1);
          this.notificationService.showSnackBar('Post deleted');
        });
    }
  }


  deleteComment(commentId: number, postIndex: number, commentIndex: number): void {
    const post = this.posts[postIndex];

    this.commentService.delete(commentId)
      .subscribe(() => {
        this.notificationService.showSnackBar('Comment removed');
        post.comments!.splice(commentIndex, 1);
      });
  }

}
