import {Component, OnInit} from '@angular/core';
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
import {NgClass} from '@angular/common';
import {MatButton} from '@angular/material/button';

@Component({
  selector: 'app-index.component',
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
    MatButton
  ],
  templateUrl: './index.component.html',
  styleUrl: './index.component.css'
})
export class IndexComponent implements OnInit{

  posts!: Post[];
  user!: User;
  isPostsLoaded =false ;
  isUserDataLoaded = false;


  constructor(
    private postService: PostService,
    private userService: UserService,
    private commentService: CommentService,
    private notificationService: NotificationService,
    private imageService: ImageUploadService
  ) {  }


    ngOnInit(): void {
    this.postService.getAllPosts()
      .subscribe(data=>{
        try {
          console.log('[POSTS]', data);
          this.posts = data;
          this.getImagesToPosts(this.posts);
          this.getCommentsToPost(this.posts);
          this.isPostsLoaded = true;
          console.log(this.isPostsLoaded)
          console.log(this.isUserDataLoaded)
          console.log(this.posts.length)
          console.log(this.posts[1].image)
        } catch (e) {
          console.error('Ошибка при загрузке постов:', e);
        }
      });

    this.userService.getCurrentUser()
      .subscribe(data=>{
        this.user=data;
        this.isUserDataLoaded=true;
      })
    }

  getImagesToPosts(posts: Post[]): void {
    posts.forEach(p => {
      if (p.id !== undefined) {
        this.imageService.getImageToPost(p.id)
          .subscribe(blob => {
            const imageUrl = URL.createObjectURL(blob);
            p.image = imageUrl;
          });
      }
    });
  }


  getCommentsToPost(posts: Post[]): void{

    posts.forEach(p=>{
      if (p.id !==undefined){
        this.commentService.getCommentsToPost(p.id)
          .subscribe(data=>{
            p.comments=data;
          })
      }
    });
    }


    likePost(postId:number,postIndex:number):void{
    const post=this.posts[postIndex];
    console.log(post);

    if(!post.usersLiked?.includes(this.user.username)){
      this.postService.likePost(postId,this.user.username)
        .subscribe(()=>{
          if (post.usersLiked){
            post.usersLiked.push(this.user.username);
            this.notificationService.showSnackBar('Liked!');}
        });
     }else {
      this.postService.likePost(postId,this.user.username)
        .subscribe(()=>{
          if (post.usersLiked) {
             const index = post.usersLiked.indexOf(this.user.username, 0);
            if (index>-1){
              post.usersLiked?.splice(index,1);}
          }
        });
     }
    }

    postComment(message: string,postId:  number,postIndex:number):void{
      const post=this.posts[postIndex];

      console.log(post);

      this.commentService.addToCommentToPost(postId,message)
        .subscribe(data=>{
          post.comments?.push(data);
        })
    }
}
