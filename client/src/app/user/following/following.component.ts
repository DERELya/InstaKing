import {ChangeDetectorRef, Component, Inject, OnDestroy, OnInit} from '@angular/core';
import {Subject, takeUntil} from 'rxjs';
import {MatIconButton} from "@angular/material/button";
import {CommonModule, NgForOf, NgIf} from "@angular/common";
import {MatIcon} from '@angular/material/icon';
import {User} from '../../models/User';
import {UserService} from '../../services/user.service';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {RouterLink} from '@angular/router';
import {Observable, of} from 'rxjs';
import {ImageUploadService} from '../../services/image-upload.service';
import {TokenStorageService} from '../../services/token-storage.service';

@Component({
  selector: 'app-following.component',
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
  usernames!: string[] | null;
  meUsername!: string | null;
  private destroy$ = new Subject<void>();

  constructor(private userService: UserService,
              @Inject(MAT_DIALOG_DATA) public data: { followers: boolean, username: string },
              private dialogRef: MatDialogRef<FollowingComponent>,
              private imageService: ImageUploadService,
              private cd: ChangeDetectorRef,
              private tokenService: TokenStorageService,) {
  }

  ngOnInit(): void {
    if (this.data.followers) {
      this.users$ = this.userService.getFollowers(this.data.username);
    } else {
      this.users$ = this.userService.getFollowing(this.data.username);
    }
    this.users$.pipe(takeUntil(this.destroy$)).subscribe(users => {
      this.usernames = users.map(user => user.username);

      // Загружаем "isFollowingMap" для всех username
      this.userService.isFollowingBatch(this.usernames).pipe(takeUntil(this.destroy$)).subscribe(map => {
        this.isFollowingMap = map;
      });
      users.forEach(user => this.imageService.getImageToUser(user.username).pipe(takeUntil(this.destroy$)).subscribe());
    });
    this.meUsername=this.tokenService.getUsernameFromToken();

  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  close() {
    this.dialogRef.close(true);
  }

  getUserImage(username: string): string {
    if (this.userImages[username]) {
      return this.userImages[username];
    }

    // Ставим временный плейсхолдер, чтобы следующий вызов не делал новый запрос
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

  follow(username: string) {
    this.userService.follow(username).subscribe(() => {
      this.cd.markForCheck();
      // Можно добавить уведомление или обновить данные
    });
  }

  unfollow(username: string) {
    this.userService.unFollow(username).subscribe(() => {
      this.cd.markForCheck();
      // Можно добавить уведомление или обновить данные
    });
  }

}
