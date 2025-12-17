import { ChangeDetectorRef, Component, inject, Inject, OnDestroy, OnInit } from '@angular/core';
import { Subject, takeUntil, switchMap, of } from 'rxjs';
import { MatIconButton } from "@angular/material/button";
import { CommonModule, NgForOf, NgIf } from "@angular/common";
import { MatIcon } from '@angular/material/icon';
import { User } from '../../../models/User';
import { UserService } from '../../../services/user.service';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { RouterLink } from '@angular/router';
import { ImageUploadService } from '../../../services/image-upload.service';
import { TokenStorageService } from '../../../services/token-storage.service';

@Component({
  selector: 'app-following.component',
  standalone: true,
  imports: [
    MatIcon,
    MatIconButton,
    NgForOf, // Можно заменить на @for в Angular 17+
    NgIf,
    RouterLink,
    CommonModule
  ],
  templateUrl: './following.component.html',
  styleUrl: './following.component.css'
})
export class FollowingComponent implements OnInit, OnDestroy {

  private dialogRef = inject(MatDialogRef<FollowingComponent>);
  private imageService = inject(ImageUploadService);
  private cd = inject(ChangeDetectorRef);
  private tokenService = inject(TokenStorageService);
  private userService = inject(UserService);

  // Используем обычный массив, чтобы избежать двойных запросов (async pipe + subscribe)
  users: User[] = [];

  isFollowingMap: { [username: string]: boolean } = {};
  meUsername!: string | null;
  private destroy$ = new Subject<void>();

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { followers: boolean, username: string },
  ) {}

  ngOnInit(): void {
    this.meUsername = this.tokenService.getUsernameFromToken();

    // 1. Выбираем, какой запрос делать
    const request$ = this.data.followers
      ? this.userService.getFollowers(this.data.username)
      : this.userService.getFollowing(this.data.username);

    request$
      .pipe(
        takeUntil(this.destroy$),
        switchMap(usersData => {
          this.users = usersData.map(u => ({
            ...u,
            avatarUrl: this.imageService.getProfileImageUrl(u.avatarUrl)
          }));

          const usernames = this.users.map(u => u.username);

          // 3. Если список пуст, возвращаем пустой объект, иначе запрашиваем подписки
          if (usernames.length === 0) {
            return of({});
          }
          return this.userService.isFollowingBatch(usernames);
        })
      )
      .subscribe(map => {
        this.isFollowingMap = map;
        this.cd.markForCheck();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  trackByUsername(index: number, user: User) {
    return user.username;
  }

  close(): void {
    this.dialogRef.close(true);
  }

  follow(username: string): void {
    this.userService.follow(username).subscribe(() => {
      this.isFollowingMap[username] = true;
      this.cd.markForCheck();
    });
  }

  unfollow(username: string): void {
    this.userService.unFollow(username).subscribe(() => {
      this.isFollowingMap[username] = false;
      this.cd.markForCheck();
    });
  }

}
