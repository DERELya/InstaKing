import {ChangeDetectorRef, Component, Inject, OnDestroy, OnInit} from '@angular/core';
import {Subject, takeUntil, switchMap, of} from 'rxjs';
import {MatIconButton} from "@angular/material/button";
import {CommonModule, NgForOf, NgIf} from "@angular/common";
import {MatIcon} from '@angular/material/icon';
import {User} from '../../../models/User';
import {UserService} from '../../../services/user.service';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {RouterLink} from '@angular/router';
import {Observable} from 'rxjs';
import {ImageUploadService} from '../../../services/image-upload.service';
import {TokenStorageService} from '../../../services/token-storage.service';

@Component({
  selector: 'app-following.component',
  standalone: true,
  imports: [
    MatIcon,
    MatIconButton,
    NgForOf,
    NgIf,
    RouterLink,
    CommonModule
  ],
  templateUrl: './following.component.html',
  styleUrl: './following.component.css'
})
export class FollowingComponent implements OnInit, OnDestroy {
  users$: Observable<User[]> = of([]);
  userImages: { [key: string]: string } = {};
  isFollowingMap: { [username: string]: boolean } = {};
  meUsername!: string | null;
  private destroy$ = new Subject<void>();

  constructor(
    private userService: UserService,
    @Inject(MAT_DIALOG_DATA) public data: { followers: boolean, username: string },
    private dialogRef: MatDialogRef<FollowingComponent>,
    private imageService: ImageUploadService,
    private cd: ChangeDetectorRef,
    private tokenService: TokenStorageService
  ) {}

  ngOnInit(): void {
    this.meUsername = this.tokenService.getUsernameFromToken();

    this.users$ = this.data.followers
      ? this.userService.getFollowers(this.data.username)
      : this.userService.getFollowing(this.data.username);

    // Загружаем пользователей и состояние подписок
    this.users$
      .pipe(
        takeUntil(this.destroy$),
        switchMap(users => {
          const usernames = users.map(u => u.username);
          // Сначала загружаем аватары
          users.forEach(u => this.loadUserImage(u.username));
          // Потом проверяем подписку
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

  private loadUserImage(username: string): void {
    if (this.userImages[username]) return;
    this.userImages[username] = 'assets/placeholder.jpg';
    this.imageService.getImageToUser(username).subscribe({
      next: blob => {
        this.userImages[username] = URL.createObjectURL(blob);
        this.cd.markForCheck();
      },
      error: () => {
        this.userImages[username] = 'assets/placeholder.jpg';
        this.cd.markForCheck();
      }
    });
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
