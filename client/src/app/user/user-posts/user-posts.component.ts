import {Component} from '@angular/core';
import {
  MatCard,
  MatCardActions,
  MatCardContent,
  MatCardHeader,
  MatCardSubtitle,
  MatCardTitle
} from '@angular/material/card';
import {MatIcon} from '@angular/material/icon';

@Component({
  selector: 'app-posts',
  imports: [
    MatCardActions,
    MatIcon,
    MatCardSubtitle,
    MatCardContent,
    MatCardTitle,
    MatCardHeader,
    MatCard
  ],
  templateUrl: './user-posts.component.html',
  styleUrl: './user-posts.component.css'
})
export class UserPostsComponent {
  posts!: string;

  deleteComment(id, i, c) {

  }

  removePost(post, i) {

  }
}
