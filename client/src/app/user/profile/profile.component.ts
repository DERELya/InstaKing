import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { User } from '../../models/User';
import { TokenStorageService } from '../../services/token-storage.service';
import { PostService } from '../../services/post.service';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { NotificationService } from '../../services/notification.service';
import { ImageUploadService } from '../../services/image-upload.service';
import { UserService } from '../../services/user.service';
import { EditUserComponent } from '../edit-user/edit-user.component';
import {ActivatedRoute, NavigationEnd, Router, RouterOutlet} from '@angular/router';
import { AddPostComponent } from '../add-post/add-post.component';
import { FollowingComponent } from '../following/following.component';
import {filter, forkJoin, of, Subject, switchMap, takeUntil} from 'rxjs';
import {MatIconModule} from '@angular/material/icon';
import {CommonModule, NgIf, NgSwitch, NgSwitchCase} from '@angular/common';

@Component({
  selector: 'app-profile',
  changeDetection: ChangeDetectionStrategy.Default,
  standalone: true,
  templateUrl: './profile.component.html',
  imports: [
    MatIconModule,
    NgSwitch,
    RouterOutlet,
    NgIf,
    NgSwitchCase,
    CommonModule
  ],
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit, OnDestroy {
  user?: User;
  isUserDataLoaded = false;
  selectedFile?: File;
  userProfileImage?: string;
  previewUrl?: string;
  activeTab: 'posts' | 'saved' | 'tagged' = 'posts';
  isCurrentUser: boolean = false;
  private destroy$ = new Subject<void>();
  postsCount: number = 0;
  followersCount: number = 0;
  followingCount: number = 0;
  isFollow: boolean = false;
  profileUsername!: string | null;

  constructor(
    private tokenService: TokenStorageService,
    private postService: PostService,
    private dialog: MatDialog,
    private notificationService: NotificationService,
    private imageService: ImageUploadService,
    protected userService: UserService,
    private cd: ChangeDetectorRef,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Слежение за параметрами маршрута
    this.route.paramMap
      .pipe(
        takeUntil(this.destroy$),
        switchMap(params => {
          this.profileUsername = params.get('username');
          if (!this.profileUsername) {
            this.setDefaultState();
            return of(null);
          }
          return this.loadProfile(this.profileUsername);
        })
      )
      .subscribe(result => {
        if (!result) return;
        this.updateProfileData(result);
        this.cd.markForCheck();
      });

    // Следим за изменением маршрута для синхронизации activeTab
    this.router.events
      .pipe(takeUntil(this.destroy$), filter(e => e instanceof NavigationEnd))
      .subscribe(() => {
        const child = this.route.firstChild?.snapshot.url[0]?.path;
        if (child === 'saved' || child === 'tagged') {
          this.activeTab = child;
        } else {
          this.activeTab = 'posts';
        }
      });

    // Подписка на изменения постов
    this.postService.postCountChanged$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.user?.username) this.refreshProfileData();
      });

    // Подписка на обновление аватара
    this.userService.avatarUpdated$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.user?.username && this.isCurrentUser) this.refreshProfileData();
      });
  }

  // Создаем отдельный метод для обновления данных профиля, чтобы избежать дублирования кода.
  private refreshProfileData(): void {
    if (this.user?.username) {
      this.loadProfile(this.user.username).subscribe(profileResult => {
        if (profileResult) {
          this.updateProfileData(profileResult);
          this.cd.markForCheck();
        }
      });
    }
  }

  private loadProfile(profileUsername: string) {
    return this.userService.getUserByUsername(profileUsername).pipe(
      switchMap(user => {
        if (!user) {
          this.setDefaultState();
          return of(null);
        }
        this.user = user;
        this.isCurrentUser = (user.username === this.tokenService.getUsernameFromToken());
        this.isUserDataLoaded = true;
        return forkJoin({
          avatar: this.imageService.getImageToUser(user.username),
          followers: this.userService.getFollowers(user.username),
          following: this.userService.getFollowing(user.username),
          posts: this.postService.getPostForUser(user.username),
          isFollow: this.userService.isFollow(user.username)
        });
      })
    );
  }

  private updateProfileData(data: any) {
    if (data.avatar) {
      if (this.userProfileImage) URL.revokeObjectURL(this.userProfileImage);
      this.userProfileImage = URL.createObjectURL(data.avatar);
    } else {
      this.userProfileImage = 'assets/placeholder.jpg';
    }
    this.followersCount = data.followers?.length ?? 0;
    this.followingCount = data.following?.length ?? 0;
    this.postsCount = Array.isArray(data.posts) ? data.posts.length : 0;
    this.isFollow = data.isFollow ?? false;
  }

  setDefaultState() {
    this.user = undefined;
    this.userProfileImage = 'assets/placeholder.jpg';
    this.isUserDataLoaded = true;
    this.isCurrentUser = false;
    this.postsCount = 0;
    this.followersCount = 0;
    this.followingCount = 0;
    this.isFollow = false;
    this.cd.markForCheck();
  }


  onFileSelected(evt: Event): void {
    const input = evt.target as HTMLInputElement;
    if (!input.files?.length) {
      return;
    }
    const file = input.files[0];
    this.selectedFile = file;
    if (this.previewUrl) {
      URL.revokeObjectURL(this.previewUrl);
    }
    this.previewUrl = URL.createObjectURL(file);
  }

  onUpload(): void {
    if (!this.selectedFile) return;

    this.imageService.uploadImageToUser(this.selectedFile).subscribe({
      next: () => {
        if (this.previewUrl) {
          URL.revokeObjectURL(this.previewUrl);
          this.previewUrl = undefined;
        }
        this.selectedFile = undefined;
        this.notificationService.showSnackBar('Profile image updated successfully');
      },
      error: () => {
        this.notificationService.showSnackBar('Upload failed');
      }
    });
  }

  openEditDialog(): void {
    const dialogUserEditConfig = new MatDialogConfig();
    dialogUserEditConfig.width = '400px';
    dialogUserEditConfig.data = { user: this.user };
    const dialogRef = this.dialog.open(EditUserComponent, dialogUserEditConfig);

    dialogRef.afterClosed().subscribe(result => {
      if (this.user?.username) {
        // Перезагружаем профиль после редактирования
        this.refreshProfileData();
      }
    });
  }

  openFollowingDialog(followers: boolean): void {
    const dialogUserFollowingConfig = new MatDialogConfig();
    dialogUserFollowingConfig.width = '400px';
    dialogUserFollowingConfig.data = {
      followers: followers,
      username: this.user?.username
    };
    const dialogRef=this.dialog.open(FollowingComponent, dialogUserFollowingConfig);
    dialogRef.afterClosed().subscribe(result => {
      if (result && this.user?.username) {
        // Перезагружаем профиль после редактирования
        this.refreshProfileData();
      }
    });
  }


  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.userProfileImage?.startsWith('blob:')) URL.revokeObjectURL(this.userProfileImage);
    if (this.previewUrl) URL.revokeObjectURL(this.previewUrl);
  }

  selectTab(tab: 'posts' | 'saved' | 'tagged') {
    this.router.navigate([tab], { relativeTo: this.route });
  }

  pluralize(count: number, one: string, few: string, many: string): string {
    if (count % 10 === 1 && count % 100 !== 11) return one;
    if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) return few;
    return many;
  }

  openCreatePostDialog() {
    const dialogRef=this.dialog.open(AddPostComponent, {
      width: '500px',
      maxWidth: '95vw',
      panelClass: 'custom-create-post-modal'
    });
    dialogRef.afterClosed().subscribe(result => {
      if ( this.user?.username) {
        // Обновление счетчика постов происходит через подписку на postCountChanged$ в ngOnInit.
      }
    });
  }

  follow(username: string) {
    this.userService.follow(username).subscribe(() => {
      if (this.user?.username) {
        this.refreshProfileData();
      }
    });
  }

  unfollow(username: string) {
    this.userService.unFollow(username).subscribe(() => {
      if (this.user?.username) {
        this.refreshProfileData();
      }
    });
  }

}
