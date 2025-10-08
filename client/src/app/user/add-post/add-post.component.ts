import {Component, OnInit} from '@angular/core';
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {Post} from '../../models/Post';
import {PostService} from '../../services/post.service';
import {ImageUploadService} from '../../services/image-upload.service';
import {NotificationService} from '../../services/notification.service';
import {ActivatedRoute, Router} from '@angular/router';
import {MatButton} from '@angular/material/button';
import {MatFormField, MatInput, MatLabel} from '@angular/material/input';
import {Subject, switchMap, takeUntil, tap, catchError, of} from 'rxjs'; // Добавляем tap, switchMap, catchError, of
import {TokenStorageService} from '../../services/token-storage.service';
import {MatDialogRef} from '@angular/material/dialog';
// Удалил неиспользуемые импорты ProfileComponent и UserPostsComponent для чистоты
// import {ProfileComponent} from '../profile/profile.component';
// import {UserPostsComponent} from '../user-posts/user-posts.component';

@Component({
  selector: 'app-add-post',
  imports: [
    ReactiveFormsModule,
    MatButton,
    MatFormField,
    MatLabel,
    MatInput // MatInput включен дважды, оставим один
  ],
  templateUrl: './add-post.component.html',
  styleUrl: './add-post.component.css',
  standalone: true // Добавлено, если компонент используется как standalone
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
      // Попробуй получить из токена или сервисов, если пользователь авторизован
      this.username = this.tokenService.getUsernameFromToken();
    }
    console.log(this.username);
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

    // 1. Создаем метаданные поста на сервере и получаем ID (PostService уже добавляет его в Subject)
    this.postService.createPost({
      title: this.postForm.value.title,
      caption: this.postForm.value.caption,
      location: this.postForm.value.location,
    } as Post) // Явно приводим к Post
      .pipe(
        // take(1) нужен, чтобы подписка выполнилась только один раз
        takeUntil(this.destroy$),

        // 2. switchMap: Заменяем поток "Создание поста" на поток "Загрузка изображения"
        switchMap((uiPost) => {
          const postId = uiPost.id as number;

          return this.imageUploadService.uploadImageToPost(this.selectedFile, postId).pipe(

            // 3. switchMap: Если загрузка изображения успешна, запускаем реактивное обновление URL в UI
            switchMap(() => {
              console.log('Файл изображения успешно загружен на сервер. Обновляем UI.');
              return this.postService.refreshPostImage(postId);
            }),

            // Обработка ошибки загрузки файла (на этом этапе пост уже существует, но без фото)
            catchError((uploadErr) => {
              console.error('Ошибка при загрузке файла, но пост создан.', uploadErr);
              // Возвращаем пустой Observable, чтобы основная цепочка продолжалась
              return of(null);
            })
          );
        }),
        // 4. tap: Выполняем действия после завершения всей цепочки (создание + загрузка + обновление)
        tap(() => {
          this.notificationService.showSnackBar('Post created successfully!');
          this.isPostCreated = true;
        }),
        // Обработка ошибки создания поста
        catchError((createErr) => {
          this.notificationService.showSnackBar('Ошибка при создании поста.');
          console.error('Ошибка при создании поста:', createErr);
          return of(null);
        })
      )
      .subscribe({
        next: () => {
          // Действия после полного успеха
          this.dialogRef.close();
          // Навигация должна произойти здесь, после закрытия диалога
          this.router.navigate(['/profile', this.username]);
        },
        error: () => {
          // Ошибка уже обработана в catchError, но этот блок можно оставить для финальной очистки
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
