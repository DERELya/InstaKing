import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, Inject, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NotificationService } from '../../../services/notification.service';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { UserService } from '../../../services/user.service';
import { User } from '../../../models/User';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { ImageUploadService } from '../../../services/image-upload.service';
import { NgIf } from '@angular/common';
import { of, switchMap, tap } from 'rxjs';

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
export class EditUserComponent implements OnInit, OnDestroy {

  profileEditForm!: FormGroup;

  displayAvatarUrl: string = 'assets/placeholder.jpg';

  private localPreviewUrl: string | null = null;

  selectedFile?: File;

  private dialogRef = inject(MatDialogRef<EditUserComponent>);
  private fb = inject(FormBuilder);
  private notificationService = inject(NotificationService);
  private userService = inject(UserService);
  protected imageService = inject(ImageUploadService); // public/protected для HTML
  private cd = inject(ChangeDetectorRef);

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { user: User }
  ) {}

  ngOnInit(): void {
    this.profileEditForm = this.buildProfileForm();

    // Инициализируем текущую аватарку (Статическая ссылка)
    this.initCurrentAvatar();
  }

  ngOnDestroy(): void {
    // Очищаем память, если было создано локальное превью
    if (this.localPreviewUrl) {
      URL.revokeObjectURL(this.localPreviewUrl);
    }
  }

  private initCurrentAvatar(): void {
    if (this.data.user.avatarUrl) {
      this.displayAvatarUrl = this.imageService.getProfileImageUrl(this.data.user.avatarUrl);
    }
  }

  buildProfileForm(): FormGroup {
    return this.fb.group({
      firstname: [this.data.user.firstname, Validators.required],
      lastname: [this.data.user.lastname, Validators.required],
      bio: [this.data.user.bio] // Bio может быть необязательным
    });
  }

  onFileSelected(evt: Event): void {
    const input = evt.target as HTMLInputElement;
    if (!input.files?.length) return;

    const file = input.files[0];
    this.selectedFile = file;

    // Очищаем старое превью если было
    if (this.localPreviewUrl) {
      URL.revokeObjectURL(this.localPreviewUrl);
    }

    // Создаем локальное превью для выбранного файла
    this.localPreviewUrl = URL.createObjectURL(file);
    this.displayAvatarUrl = this.localPreviewUrl; // Показываем сразу
  }

  submit(): void {
    if (this.profileEditForm.invalid) {
      this.profileEditForm.markAllAsTouched();
      return;
    }

    const updatedUserDto = this.formToUser();

    // 1. Сначала обновляем текстовые данные
    this.userService.updateUser(updatedUserDto).pipe(
      // 2. Если успешно, проверяем, есть ли файл для загрузки
      switchMap((updatedUser) => {
        if (this.selectedFile) {
          // Если файл есть - грузим его
          return this.imageService.uploadImageToUser(this.selectedFile).pipe(
            tap(() => {
              // Уведомляем другие компоненты, что аватарка сменилась
              this.userService.notifyAvatarUpdated();
            })
          );
        } else {
          // Если файла нет - возвращаем Observable с null (пропускаем шаг)
          return of(null);
        }
      })
    ).subscribe({
      next: () => {
        this.notificationService.showSnackBar('Профиль успешно обновлен');
        this.dialogRef.close(updatedUserDto);
      },
      error: (err) => {
        console.error(err);
        this.notificationService.showSnackBar('Ошибка при обновлении профиля');
      }
    });
  }

  private formToUser(): User {
    const { firstname, lastname, bio } = this.profileEditForm.value;
    return { ...this.data.user, firstname, lastname, bio };
  }

  closeDialog() {
    this.dialogRef.close();
  }
}
