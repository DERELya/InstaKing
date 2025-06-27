import {ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit} from '@angular/core';
import {User} from '../../models/User';
import {TokenStorageService} from '../../services/token-storage.service';
import {PostService} from '../../services/post.service';
import {MatDialog, MatDialogConfig, MatDialogModule} from '@angular/material/dialog';
import {NotificationService} from '../../services/notification.service';
import {ImageUploadService} from '../../services/image-upload.service';
import {UserService} from '../../services/user.service';
import {EditUserComponent} from '../edit-user/edit-user.component';
import {ActivatedRoute, RouterOutlet} from '@angular/router';
import {MatButton} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {CommonModule, NgIf, NgSwitch, NgSwitchCase} from '@angular/common';
import {of, Subject, switchMap, takeUntil} from 'rxjs';
import {AddPostComponent} from '../add-post/add-post.component';
import {FollowersComponent} from '../followers/followers.component';
import {FollowingComponent} from '../following/following.component';

const USER_API = 'http://localhost:8080/api/user/';

@Component({
  selector: 'app-profile',
  imports: [
    MatDialogModule,
    RouterOutlet,
    MatIconModule,
    NgSwitch,
    MatButton,
    NgIf,
    NgSwitchCase,
    CommonModule
  ],
  changeDetection: ChangeDetectionStrategy.Default,
  standalone: true,
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {

  user!: User;
  isUserDataLoaded = false;
  selectedFile!: File;
  userProfileImage?: string;
  previewUrl?: string;
  activeTab: 'posts' | 'saved' | 'tagged' = 'posts';
  isCurrentUser: boolean = false;
  private destroy$ = new Subject<void>();
  postsCount: number =0;
  followersCount: number=0 ;
  followingCount: number=0;

  constructor(private tokenService: TokenStorageService,
              private postService: PostService,
              private dialog: MatDialog,
              private notificationService: NotificationService,
              private imageService: ImageUploadService,
              private userService: UserService,
              private cd: ChangeDetectorRef,
              private route: ActivatedRoute,
              private cdRef: ChangeDetectorRef) {
  }

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        takeUntil(this.destroy$),
        switchMap(params => {
          const profileUsername = params.get('username');
          if (!profileUsername) return of(null);
          this.postService.getPostForUser(profileUsername).subscribe(list => {
            this.postsCount = Array.isArray(list) ? list.length : 0;
          });
          return this.userService.getUserByUsername(profileUsername);
        }),
        switchMap(user => {
          if (!user) {
            this.setDefaultState();
            return of(null);
          }
          this.user = user;
          this.isCurrentUser = (user.username === this.tokenService.getUsernameFromToken());
          this.isUserDataLoaded = true;
          this.userService.getFollowers(this.user.username)
            .subscribe(users=>{
              console.log(users);
              this.followersCount=users.length;
            });
          this.userService.getFollowing(this.user.username)
            .subscribe(users=>{
              this.followingCount=users.length;
            });
          // грузим фотку только после того, как получили user
          return this.imageService.getImageToUser(user.username);
        })
      )
      .subscribe({
        next: blob => {
          if (blob) {
            if (this.userProfileImage) {
              URL.revokeObjectURL(this.userProfileImage);
            }
            this.userProfileImage = URL.createObjectURL(blob);
          } else {
            this.userProfileImage = 'assets/placeholder.jpg';
          }
          this.cd.markForCheck();

        },
        error: err => {
          console.warn('Image load failed', err);
          this.userProfileImage = 'assets/placeholder.jpg';
          this.cd.markForCheck();
        }
      });
    this.cdRef.detectChanges();
  }

  setDefaultState() {
    this.user = undefined!;
    this.userProfileImage = 'assets/placeholder.jpg';
    this.isUserDataLoaded = true;
    this.isCurrentUser = false;

    this.cd.markForCheck();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.userProfileImage) {
      URL.revokeObjectURL(this.userProfileImage);
    }
  }

  onFileSelected(evt: Event): void {
    const input = evt.target as HTMLInputElement;
    if (!input.files?.length) {
      return;
    }

    const file = input.files[0];
    this.selectedFile = file;
    /* создаём превью */
    this.previewUrl = URL.createObjectURL(file);
    console.log('test:' + this.previewUrl);
  }


  openEditDialog(): void {
    const dialogUserEditConfig = new MatDialogConfig();
    dialogUserEditConfig.width = '400px';
    dialogUserEditConfig.data = {
      user: this.user
    }
    const dialogRef = this.dialog.open(EditUserComponent, dialogUserEditConfig);

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Повторно загружаем пользователя после редактирования
        this.userService.getCurrentUser().subscribe(updatedUser => {
          this.user = updatedUser;
          this.userService.setCurrentUser(updatedUser);
          this.cd.markForCheck();
        });
      }
    });
  }

  openFollowersDialog(): void {
    const dialogUserFollowersConfig = new MatDialogConfig();
    dialogUserFollowersConfig.width = '400px';
    dialogUserFollowersConfig.data = {
      username: this.user.username
    }
    const dialogRef = this.dialog.open(FollowersComponent, dialogUserFollowersConfig);
  }
  openFollowingDialog(): void {
    const dialogUserFollowingConfig = new MatDialogConfig();
    dialogUserFollowingConfig.width = '400px';
    dialogUserFollowingConfig.data = {
      user: this.user
    }
    const dialogRef = this.dialog.open(FollowingComponent, dialogUserFollowingConfig);
  }


  selectTab(tab: 'posts' | 'saved' | 'tagged') {
    this.activeTab = tab;
  }

  pluralize(count: number, one: string, few: string, many: string): string {
    if (count % 10 === 1 && count % 100 !== 11) return one;
    if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) return few;
    return many;
  }


  onUpload(): void {
    if (!this.selectedFile) return;

    this.imageService.uploadImageToUser(this.selectedFile).subscribe({
      next: (relativeUrl: string) => {
        // очищаем старый Blob, если был
        if (this.previewUrl) {
          URL.revokeObjectURL(this.previewUrl);
        }
        // обнуляем preview + файл
        this.selectedFile = undefined!; // <--- СБРОС!
        // обновляем URL аватарки
        this.userProfileImage = `${USER_API}/${relativeUrl}`;
        this.notificationService.showSnackBar('Profile image updated successfully');
        this.cd.markForCheck(); // чтобы Angular обновил шаблон
      },
      error: () => {
        this.notificationService.showSnackBar('Upload failed');
      }
    });
  }

  openCreatePostDialog() {
    this.dialog.open(AddPostComponent, {
      width: '500px',
      maxWidth: '95vw',
      panelClass: 'custom-create-post-modal'
    });
  }


}
