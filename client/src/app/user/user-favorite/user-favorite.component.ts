import {ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit} from '@angular/core';
import {MatCardModule} from '@angular/material/card';
import {MatIconModule} from '@angular/material/icon';
import {CommonModule, NgForOf, NgIf} from '@angular/common';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatButtonModule} from '@angular/material/button';
import {Subject, takeUntil} from 'rxjs';
import {PostService} from '../../services/post.service';
import {ActivatedRoute} from '@angular/router';
import {MatDialog} from '@angular/material/dialog';
import {Post} from '../../models/Post';
import {PostInfoComponent} from '../post-info/post-info.component';

interface UiPost extends Post {
  isLiked: boolean;
  avatarUrl?: string;
  showAllComments?: boolean;
}

@Component({
  selector: 'app-user-favorite',
  templateUrl: './user-favorite.component.html',
  styleUrl: './user-favorite.component.css',
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
export class UserFavoriteComponent implements OnInit,OnDestroy{
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
          this.postService.loadProfileFavoritePosts();
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
    this.posts=[];
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
}
