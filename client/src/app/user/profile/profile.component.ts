import {ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit} from '@angular/core';
import {User} from '../../models/User';
import {TokenStorageService} from '../../services/token-storage.service';
import {PostService} from '../../services/post.service';
import {MatDialog, MatDialogConfig, MatDialogModule} from '@angular/material/dialog';
import {NotificationService} from '../../services/notification.service';
import {ImageUploadService} from '../../services/image-upload.service';
import {UserService} from '../../services/user.service';
import {EditUserComponent} from '../edit-user/edit-user.component';
import {RouterOutlet} from '@angular/router';
import {MatDivider} from '@angular/material/divider';
import {MatButton} from '@angular/material/button';

@Component({
  selector: 'app-profile',
  imports: [
    MatDialogModule,
    RouterOutlet,
    MatDivider,
    MatButton
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
  previewImageURL: any;

  constructor(private tokenService: TokenStorageService,
              private postService: PostService,
              private dialog: MatDialog,
              private notificationService: NotificationService,
              private imageService: ImageUploadService,
              private userService: UserService,
              private cd: ChangeDetectorRef) {
  }

  ngOnInit(): void {
    this.userService.getCurrentUser()
      .subscribe(data => {
        this.user = data;
        this.isUserDataLoaded = true;
      })

    this.imageService.getProfileImage()
      .subscribe({
        next: blob => {
          console.log('Blob size', blob.size);        // ← должно быть > 0
          this.userProfileImage = URL.createObjectURL(blob);
          this.cd.markForCheck();
        },
        error: err => {
          console.warn('Image load failed', err);
          /* fallback */
          this.userProfileImage = 'assets/placeholder.jpg';
        }
      })
  }


  onFileSelected(event: any): void {
    this.selectedFile = event.target.file[0];
    const reader = new FileReader();
    reader.readAsDataURL(this.selectedFile);
    reader.onload = () => {
      this.previewImageURL = reader.result;
    };
  }

  openEditDialog(): void {
    const dialogUserEditConfig = new MatDialogConfig();
    dialogUserEditConfig.width = '400px';
    dialogUserEditConfig.data = {
      user: this.user
    }
    this.dialog.open(EditUserComponent, dialogUserEditConfig);
  }


  onUpload(): void {
    if (this.selectedFile != null) {
    }
    this.imageService.uploadImageToUser(this.selectedFile)
      .subscribe(data => {
        this.notificationService.showSnackBar('Profile image updated successfully')
      })
  }
}
