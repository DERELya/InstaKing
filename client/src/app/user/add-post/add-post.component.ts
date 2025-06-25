import {Component, OnInit} from '@angular/core';
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {Post} from '../../models/Post';
import {PostService} from '../../services/post.service';
import {ImageUploadService} from '../../services/image-upload.service';
import {NotificationService} from '../../services/notification.service';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import {MatButton} from '@angular/material/button';
import {MatFormField, MatInput, MatLabel} from '@angular/material/input';
import {Subject, switchMap, takeUntil} from 'rxjs';
import {TokenStorageService} from '../../services/token-storage.service';
import {MatDialogRef} from '@angular/material/dialog';
import {ProfileComponent} from '../profile/profile.component';
import {UserPostsComponent} from '../user-posts/user-posts.component';

@Component({
  selector: 'app-add-post',
  imports: [
    ReactiveFormsModule,
    MatButton,
    MatFormField,
    MatLabel,
    MatFormField,
    MatInput
  ],
  templateUrl: './add-post.component.html',
  styleUrl: './add-post.component.css'
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

    this.postService.createPost({
      title: this.postForm.value.title,
      caption: this.postForm.value.caption,
      location: this.postForm.value.location,
    }).subscribe(data => {
      this.createdPost = data;
      console.log(data);

      if (this.createdPost.id != null) {
        this.imageUploadService.uploadImageToPost(this.selectedFile, this.createdPost.id)
          .subscribe(() => {
            this.notificationService.showSnackBar('Post created successfully');
            this.isPostCreated = true;
            this.dialogRef.close();
            this.router.navigate(['/profile',this.username]);
          });
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
