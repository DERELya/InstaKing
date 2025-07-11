import {ChangeDetectionStrategy, ChangeDetectorRef, Component, HostListener, OnDestroy, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {Subject, takeUntil} from 'rxjs';
import {PostService} from '../../services/post.service';
import {ImageUploadService} from '../../services/image-upload.service';
import {UserService} from '../../services/user.service';
import {NotificationService} from '../../services/notification.service';
import {CommentService} from '../../services/comment.service';
import {Post} from '../../models/Post';

import {CommonModule, NgForOf, NgIf} from '@angular/common';
import {MatCardModule} from '@angular/material/card';
import {MatIconModule} from '@angular/material/icon';
import {MatButtonModule} from '@angular/material/button';
import {MatInputModule} from '@angular/material/input';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatDialog} from '@angular/material/dialog';
import {PostInfoComponent} from '../post-info/post-info.component';

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
    MatCardModule,
    MatIconModule,
    NgIf,
    NgForOf,
    CommonModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule
  ]
})
export class UserPostsComponent implements OnInit, OnDestroy {
  posts: UiPost[] = [];
  isUserPostsLoaded = false;
  meUsername!: string;
  menuOpen = false;
  private destroy$ = new Subject<void>();

  constructor(
    private postService: PostService,
    private cd: ChangeDetectorRef,
    private route: ActivatedRoute,
    private dialog: MatDialog
  ) {
  }

  ngOnInit(): void {
    this.route.paramMap
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        const username = params.get('username');
        if (username) {
          this.posts = [];
          this.postService.loadProfilePosts(username);
          this.meUsername = username;
          this.cd.markForCheck();
        }
      });

    this.postService.posts$
      .pipe(takeUntil(this.destroy$))
      .subscribe(posts => {
        this.posts = posts;
        this.isUserPostsLoaded = true;
        this.cd.markForCheck();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  openPostDetails(index: number) {
    const dialogRef = this.dialog.open(PostInfoComponent, {
      data: {post: this.posts[index], index}
    });

    dialogRef.afterClosed().subscribe(() => {
      // Можно обновить что-то, если нужно
    });
  }


  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.menu-wrapper')) {
      this.menuOpen = false;
    }
  }

}
