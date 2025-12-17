import { ChangeDetectorRef, Component, inject, OnDestroy, OnInit } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { FormsModule } from '@angular/forms'; // Только FormsModule
import { ImageUploadService } from '../../../services/image-upload.service';
import { NotificationService } from '../../../services/notification.service';
import { Router } from '@angular/router';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { NgIf } from '@angular/common';
import { StoryService } from '../../../services/story.service';
import { catchError, of, Subject, takeUntil, tap } from 'rxjs';
import { MatSelect } from '@angular/material/select';
import { MatOption } from '@angular/material/autocomplete';
import { StoryVisibility } from '../../../models/StoryVisibility';
import { UserService } from '../../../services/user.service';
import { User } from '../../../models/User';

@Component({
  selector: 'app-create-story',
  standalone: true,
  imports: [
    MatButton,
    MatFormField,
    MatInput,
    MatLabel,
    MatIcon,
    NgIf,
    FormsModule, // Важно для [(ngModel)]
    MatDialogModule,
    MatSelect,
    MatOption
  ],
  templateUrl: './create-story.component.html',
  styleUrl: './create-story.component.css'
})
export class CreateStoryComponent implements OnInit, OnDestroy {
  // Инжекты
  private imageService = inject(ImageUploadService);
  private notificationService = inject(NotificationService);
  private storyService = inject(StoryService);
  private userService = inject(UserService);
  private dialogRef = inject(MatDialogRef<CreateStoryComponent>);
  private cd = inject(ChangeDetectorRef);

  // Данные формы
  description: string = '';
  visibility: StoryVisibility = StoryVisibility.PUBLIC;
  selectedFile?: File;

  // URL для превью (Локальный Blob)
  previewImgURL: string | null = null;

  // Данные пользователя
  currentUser?: User;
  userAvatarUrl: string = 'assets/placeholder.jpg'; // Ссылка на аватар

  private destroy$ = new Subject<void>();
  protected readonly StoryVisibility = StoryVisibility;

  constructor() {}

  ngOnInit(): void {
    // Загружаем текущего пользователя, чтобы отобразить его ник и аватарку
    this.userService.getCurrentUser()
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.currentUser = user;
        this.userAvatarUrl = this.imageService.getProfileImageUrl(user.avatarUrl);
        this.cd.markForCheck();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    // Очищаем память от локального превью файла
    if (this.previewImgURL) {
      URL.revokeObjectURL(this.previewImgURL);
    }
  }

  onFileSelected(evt: Event): void {
    const input = evt.target as HTMLInputElement;
    if (!input.files?.length) return;

    const file = input.files[0];
    this.selectedFile = file;

    if (this.previewImgURL) {
      URL.revokeObjectURL(this.previewImgURL);
    }

    // Создаем новое превью для выбранного файла (тут Blob оправдан, так как файл еще не на сервере)
    this.previewImgURL = URL.createObjectURL(file);
  }

  submit() {
    if (!this.selectedFile) {
      this.notificationService.showSnackBar('Выберите файл изображения!');
      return;
    }

    const formData = new FormData();
    formData.append('file', this.selectedFile);
    formData.append('description', this.description);
    formData.append('visibility', this.visibility);

    this.storyService.createStory(formData)
      .pipe(
        takeUntil(this.destroy$),
        tap(() => {
          this.notificationService.showSnackBar('История успешно создана!');
        }),
        catchError((err) => {
          console.error('Ошибка при создании истории:', err);
          this.notificationService.showSnackBar('Не удалось создать историю.');
          return of(null);
        })
      )
      .subscribe({
        next: (story) => {
          if (story) {
            this.dialogRef.close(true); // Закрываем и передаем успех
          }
        }
      });
  }

  close() {
    this.dialogRef.close();
  }
}
