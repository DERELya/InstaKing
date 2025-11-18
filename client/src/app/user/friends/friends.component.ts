import {ChangeDetectorRef, Component, Inject, OnDestroy, OnInit} from '@angular/core';
import {AsyncPipe, NgForOf, NgIf} from "@angular/common";
import {MatIconButton} from "@angular/material/button";
import {User} from '../../models/User';
import {Observable, of, Subject, switchMap, takeUntil} from 'rxjs';
import {UserService} from '../../services/user.service';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {ImageUploadService} from '../../services/image-upload.service';
import {TokenStorageService} from '../../services/token-storage.service';
import {MatIcon} from '@angular/material/icon';
import {RouterLink} from '@angular/router';
import {MatCheckbox} from '@angular/material/checkbox';

@Component({
  selector: 'app-friends.component',
  imports: [
    AsyncPipe,
    MatIcon,
    MatIconButton,
    NgForOf,
    NgIf,
    RouterLink,
    MatCheckbox
  ],
  templateUrl: './friends.component.html',
  styleUrl: './friends.component.css'
})
export class FriendsComponent implements OnInit, OnDestroy {
  users$: Observable<User[]> = of([]);
  userImages: { [key: string]: string } = {};
  isFollowingMap: { [username: string]: boolean } = {};
  meUsername!: string | null;
  private destroy$ = new Subject<void>();

  constructor(
    private userService: UserService,
    @Inject(MAT_DIALOG_DATA) public data: { username: string },
    private dialogRef: MatDialogRef<FriendsComponent>,
    private imageService: ImageUploadService,
    private cd: ChangeDetectorRef,
    private tokenService: TokenStorageService
  ) {}

  ngOnDestroy(): void {
        throw new Error("Method not implemented.");
    }

  ngOnInit(): void {
    this.users$ = this.userService.getFollowers(this.data.username);

    this.users$
      .pipe(
        takeUntil(this.destroy$),
        switchMap(users => {
          const usernames = users.map(u => u.username);
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
