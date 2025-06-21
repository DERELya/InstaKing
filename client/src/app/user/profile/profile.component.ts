import {ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit} from '@angular/core';
import {User} from '../../models/User';
import {TokenStorageService} from '../../services/token-storage.service';
import {PostService} from '../../services/post.service';
import {MatDialog, MatDialogConfig, MatDialogModule} from '@angular/material/dialog';
import {NotificationService} from '../../services/notification.service';
import {ImageUploadService} from '../../services/image-upload.service';
import {UserService} from '../../services/user.service';
import {EditUserComponent} from '../edit-user/edit-user.component';
import {ActivatedRoute, RouterLink, RouterOutlet} from '@angular/router';
import {MatDivider} from '@angular/material/divider';
import {MatButton} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {CommonModule, NgIf, NgSwitch, NgSwitchCase} from '@angular/common';

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

  constructor(private tokenService: TokenStorageService,
              private postService: PostService,
              private dialog: MatDialog,
              private notificationService: NotificationService,
              private imageService: ImageUploadService,
              private userService: UserService,
              private cd: ChangeDetectorRef,
              private route: ActivatedRoute) {
  }

  ngOnInit(): void {
    this.userService.getCurrentUser().subscribe(data => {
      // ⚠️ если avatarUrl относительный — преобразуем в абсолютный
      if (data.avatarUrl && !data.avatarUrl.startsWith('http')) {
        data.avatarUrl = `${USER_API}/${data.avatarUrl}`;
      }
      this.user = data;
      this.userProfileImage = data.avatarUrl;   // ← это и будет src после F5
      this.isUserDataLoaded = true;
      const profileUsername = this.route.snapshot.paramMap.get('username');
      this.isCurrentUser = !profileUsername || profileUsername === data.username;
      console.log(this.isCurrentUser);
    });

    this.imageService.getProfileImage().subscribe({
      next: blob => {
        const preview = URL.createObjectURL(blob);
        this.userProfileImage = preview;
        this.cd.markForCheck();
      },
      error: err => {
        console.warn('Image load failed', err);
        this.userProfileImage = 'assets/placeholder.jpg';
      }

    });
    this.cd.markForCheck();
  }



  onFileSelected(evt: Event): void {
    const input = evt.target as HTMLInputElement;
    if (!input.files?.length) { return; }

    const file = input.files[0];
    this.selectedFile = file;
    /* создаём превью */
    this.previewUrl = URL.createObjectURL(file);
    console.log('test:'+this.previewUrl);
  }


  openEditDialog(): void {
    const dialogUserEditConfig = new MatDialogConfig();
    dialogUserEditConfig.width = '400px';
    dialogUserEditConfig.data = {
      user: this.user
    }
    this.dialog.open(EditUserComponent, dialogUserEditConfig);
  }



  selectTab(tab: 'posts' | 'saved' | 'tagged') {
    this.activeTab = tab;
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
        this.previewUrl = undefined;
        this.selectedFile = undefined!;

        // обновляем URL аватарки
        this.userProfileImage = `${USER_API}/${relativeUrl}`;


        this.notificationService.showSnackBar('Profile image updated successfully');
      },
      error: () => {
        this.notificationService.showSnackBar('Upload failed');
      }
    });
  }

}
