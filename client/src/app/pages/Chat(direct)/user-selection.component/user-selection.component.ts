import { ChangeDetectorRef, Component, inject, OnInit, OnDestroy } from '@angular/core';
import { debounceTime, distinctUntilChanged, of, Subject, switchMap, takeUntil, tap } from 'rxjs';
import { UserService } from '../../../services/user.service';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgForOf, NgIf } from '@angular/common';
import { User } from '../../../models/User';
import { ImageUploadService } from '../../../services/image-upload.service';
import { MatInput, MatPrefix, MatSuffix } from '@angular/material/input';
import { MatIconButton } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDialogRef } from '@angular/material/dialog'; // Добавлено

@Component({
  selector: 'app-user-selection',
  standalone: true, // Убедись, что это standalone, если используешь imports
  imports: [
    ReactiveFormsModule, NgForOf, NgIf, MatInput, MatFormFieldModule,
    MatIconModule, MatIconButton, MatPrefix, MatSuffix, FormsModule
  ],
  templateUrl: './user-selection.component.html',
  styleUrl: './user-selection.component.css'
})
export class UserSelection implements OnInit, OnDestroy {
  // Инжекты
  private userService = inject(UserService);
  private imageService = inject(ImageUploadService);
  private cd = inject(ChangeDetectorRef);
  private dialogRef = inject(MatDialogRef<UserSelection>); // Для закрытия окна

  searchControl = new FormControl('');
  users: User[] = [];
  isLoading = false;

  private destroy$ = new Subject<void>();
  private avatarUrls: string[] = []; // Для очистки памяти

  ngOnInit() {
    this.searchControl.valueChanges.pipe(
      takeUntil(this.destroy$),
      tap(() => this.isLoading = true),
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(query => {
        if (!query?.trim()) {
          this.isLoading = false;
          return of([]);
        }
        return this.userService.search(query);
      })
    ).subscribe({
      next: (users) => {
        this.users = users;
        this.users.forEach(user => this.loadAvatar(user));
        this.isLoading = false;
        this.cd.markForCheck();
      },
      error: () => {
        this.users = [];
        this.isLoading = false;
      }
    });
  }

  // Изменил аргумент на объект User целиком
  onWrite(user: User) {
    console.log("Выбран пользователь для чата:", user.username);
    this.dialogRef.close(user);
  }

  loadAvatar(user: User) {
    this.imageService.getProfileImageUrl(user.avatarUrl);
  }

  clearSearch() {
    this.searchControl.setValue('');
    this.users = [];
  }

  ngOnDestroy() {
    // 1. Отписываемся от всех потоков
    this.destroy$.next();
    this.destroy$.complete();

    // 2. Очищаем ссылки на картинки в памяти браузера
    this.avatarUrls.forEach(url => URL.revokeObjectURL(url));
  }
}
