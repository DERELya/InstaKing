import {ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, OnInit} from '@angular/core';
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {NotificationService} from '../../../services/notification.service';
import {MAT_DIALOG_DATA, MatDialogModule, MatDialogRef} from '@angular/material/dialog';
import {UserService} from '../../../services/user.service';
import {User} from '../../../models/User';
import {MatButtonModule} from '@angular/material/button';
import {MatInputModule} from '@angular/material/input';
import {MatFormFieldModule} from '@angular/material/form-field';
import {ImageUploadService} from '../../../services/image-upload.service';
import {NgIf} from '@angular/common';

@Component({
  selector: 'app-edit-user',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatDialogModule,
    NgIf,

  ],
  changeDetection: ChangeDetectionStrategy.Default,
  templateUrl: './edit-user.component.html',
  styleUrls: ['./edit-user.component.css']
})
export class EditUserComponent implements OnInit {

  profileEditForm!: FormGroup;
  previewImgURL: any;
  selectedFile?: File;
  userProfileImage?: string;

  constructor(private dialogRef: MatDialogRef<EditUserComponent>,
              private fb: FormBuilder,
              private notificationService: NotificationService,
              @Inject(MAT_DIALOG_DATA) public data: { user: User },
              private userService: UserService,
              protected imageService: ImageUploadService,
              private cd: ChangeDetectorRef
  ) {
  }

  ngOnInit(): void {
    this.profileEditForm = this.buildProfileForm()
  }

  buildProfileForm(): FormGroup {
    return this.fb.group({
      firstname: [this.data.user.firstname, Validators.compose([Validators.required])],
      lastname: [this.data.user.lastname, Validators.compose([Validators.required])],
      bio: [this.data.user.bio, Validators.compose([Validators.required])]
    })
  }

  submit(): void {
    if (this.profileEditForm.invalid) {
      this.profileEditForm.markAllAsTouched();
      return;
    }
    if (this.selectedFile){
      this.imageService.uploadImageToUser(this.selectedFile).subscribe({
        next: () => {
          if (this.previewImgURL) {
            URL.revokeObjectURL(this.previewImgURL);
            this.previewImgURL = undefined;
          }
          this.selectedFile = undefined;
          this.notificationService.showSnackBar('Profile image updated successfully');
        },
        error: () => {
          this.notificationService.showSnackBar('Upload failed');
        }
      });
    }

    const dto = this.formToUser();
    this.userService.updateUser(dto).subscribe({
      next: () => {
        this.notificationService.showSnackBar('User updated');
        this.cd.markForCheck();
        this.dialogRef.close(dto);
        // вернём новые данные
      },
      error: () => this.notificationService.showSnackBar('Update failed')
    });
  }

  private formToUser(): User {
    const {firstname, lastname, bio} = this.profileEditForm.value;
    this.cd.markForCheck();
    return {...this.data.user, firstname, lastname, bio};
  }
  onFileSelected(evt: Event): void {
    const input = evt.target as HTMLInputElement;
    if (!input.files?.length) {
      return;
    }

    const file = input.files[0];
    this.selectedFile = file;
    /* создаём превью */
    this.previewImgURL = URL.createObjectURL(file);
    console.log('test:' + this.previewImgURL);
  }

  onUpload(): void {
    if (!this.selectedFile) return;
  }

  getUserImage(username: string): string {

    this.userProfileImage = 'assets/placeholder.jpg';
    this.imageService.getImageToUser(username)
      .subscribe({
        next: blob => {
          const preview = URL.createObjectURL(blob);
          this.userProfileImage = preview;
          this.cd.markForCheck();
        },
        error: () => {
          this.userProfileImage = 'assets/placeholder.jpg';
          this.cd.markForCheck();
        }
      });
    return this.userProfileImage;
  }

  closeDialog() {
    this.dialogRef.close();
  }
}
