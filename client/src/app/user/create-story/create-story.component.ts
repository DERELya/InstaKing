import {ChangeDetectorRef, Component, OnInit} from '@angular/core';
import {MatButton} from '@angular/material/button';
import {MatFormField, MatInput, MatLabel} from '@angular/material/input';
import {FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';
import {ImageUploadService} from '../../services/image-upload.service';
import {NotificationService} from '../../services/notification.service';
import {ActivatedRoute, Router} from '@angular/router';
import {TokenStorageService} from '../../services/token-storage.service';
import {MatDialogModule, MatDialogRef} from '@angular/material/dialog';
import {MatIcon} from '@angular/material/icon';
import {NgIf} from '@angular/common';
import {StoryService} from '../../services/story.service';
import {catchError, of, Subject, takeUntil, tap} from 'rxjs';

@Component({
  selector: 'app-create-story.component',
  standalone: true,
  imports: [
    MatButton,
    MatFormField,
    MatInput,
    MatLabel,
    ReactiveFormsModule,
    MatIcon,
    NgIf,
    FormsModule,
    MatDialogModule
  ],
  templateUrl: './create-story.component.html',
  styleUrl: './create-story.component.css'
})
export class CreateStoryComponent implements OnInit {
  storyForm!: FormGroup;
  userImages: { [key: string]: string } = {};
  selectedFile!: File;
  previewImgURL: any;
  username: string = ' ';
  description: string = '';
  private destroy$ = new Subject<void>();


  constructor(
    private imageService: ImageUploadService,
    private notificationService: NotificationService,
    private router: Router,
    private storyService: StoryService,
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private tokenService: TokenStorageService,
    private dialogRef: MatDialogRef<CreateStoryComponent>,
    private cd: ChangeDetectorRef
  ) {
  }

  ngOnInit(): void {
    this.username = this.route.snapshot.paramMap.get('username') || '';
    if (!this.username) {
      this.username = this.tokenService.getUsernameFromToken() || '';
    }
    console.log(this.username);
    this.storyForm = this.createStoryForm();
  }

  createStoryForm(): FormGroup {
    return this.fb.group({
      caption: ['', Validators.compose([Validators.required])],
    });
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

  submit() {
    if (!this.selectedFile) {
      this.notificationService.showSnackBar('Выберите файл изображения!');
      return;
    }
    const formData = new FormData();
    formData.append('file', this.selectedFile);
    formData.append('storyDTO', this.description);
    console.log(this.description);
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
            console.log('Создана история:', story);
            this.dialogRef.close(); // закрыть окно создания
          }
        }
      });

  }

  close() {
    this.dialogRef.close();
  }

  getUserImage(username: string): string {
    if (this.userImages[username]) {
      return this.userImages[username];
    }
    this.userImages[username] = 'assets/placeholder.jpg';
    this.imageService.getImageToUser(username)
      .subscribe({
        next: blob => {
          const preview = URL.createObjectURL(blob);
          this.userImages[username] = preview;
          this.cd.markForCheck();
        },
        error: () => {
          this.userImages[username] = 'assets/placeholder.jpg';
          this.cd.markForCheck();
        }
      });
    return this.userImages[username];
  }

}
