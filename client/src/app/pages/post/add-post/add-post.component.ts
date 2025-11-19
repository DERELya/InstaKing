import {Component, OnInit} from '@angular/core';
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {Post} from '../../../models/Post';
import {PostService} from '../../../services/post.service';
import {ImageUploadService} from '../../../services/image-upload.service';
import {NotificationService} from '../../../services/notification.service';
import {ActivatedRoute, Router} from '@angular/router';
import {MatButton} from '@angular/material/button';
import {MatFormField, MatInput, MatLabel} from '@angular/material/input';
import {Subject, switchMap, takeUntil, tap, catchError, of} from 'rxjs';
import {TokenStorageService} from '../../../services/token-storage.service';
import {MatDialogRef} from '@angular/material/dialog';

@Component({
  selector: 'app-add-post',
  imports: [
    ReactiveFormsModule,
    MatButton,
    MatFormField,
    MatLabel,
    MatInput
  ],
  templateUrl: './add-post.component.html',
  styleUrl: './add-post.component.css',
  standalone: true
})
export class AddPostComponent implements OnInit {
  postForm!: FormGroup;
  selectedFile!: File;
  isPostCreated = false;
  createdPost!: Post;
  previewImgURL: any;
  private destroy$ = new Subject<void>();
  username: string | null | undefined = null;

  constructor(private postService: PostService,
              private imageUploadService: ImageUploadService,
              private notificationService: NotificationService,
              private router: Router,
              private fb: FormBuilder,
              private route: ActivatedRoute,
              private tokenService : TokenStorageService,
              private dialogRef: MatDialogRef<AddPostComponent>
  ) {
  }

  ngOnInit(): void {
    this.username = this.route.snapshot.paramMap.get('username') || '';
    if (!this.username) {
      this.username = this.tokenService.getUsernameFromToken();
    }
    this.postForm = this.createPostForm();
  }

  createPostForm(): FormGroup {
    return this.fb.group({
      title: ['', Validators.compose([Validators.required])],
      caption: ['', Validators.compose([Validators.required])],
      location: ['', Validators.compose([Validators.required])],
    });
  }

  submit(): void {
    if (!this.selectedFile) {
      this.notificationService.showSnackBar('Выберите файл изображения!');
      return;
    }

    this.postService.createPost({
      title: this.postForm.value.title,
      caption: this.postForm.value.caption,
      location: this.postForm.value.location,
    } as Post)
      .pipe(
        takeUntil(this.destroy$),

        switchMap((uiPost) => {
          const postId = uiPost.id as number;

          return this.imageUploadService.uploadImageToPost(this.selectedFile, postId).pipe(

            switchMap(() => {
              console.log('Файл изображения успешно загружен на сервер. Обновляем UI.');
              return this.postService.refreshPostImage(postId);
            }),


            catchError((uploadErr) => {
              console.error('Ошибка при загрузке файла, но пост создан.', uploadErr);
              return of(null);
            })
          );
        }),
        tap(() => {
          this.notificationService.showSnackBar('Post created successfully!');
          this.isPostCreated = true;
        }),

        catchError((createErr) => {
          this.notificationService.showSnackBar('Ошибка при создании поста.');
          console.error('Ошибка при создании поста:', createErr);
          return of(null);
        })
      )
      .subscribe({
        next: () => {
          this.dialogRef.close();
          this.router.navigate(['/profile', this.username]);
        },
        error: () => {
          console.log('Операция создания поста завершилась с ошибкой.');
        }
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

  clickOnMyPosts() {
    this.dialogRef.close();
    this.router.navigate(['/profile/', this.username]);
  }

}
