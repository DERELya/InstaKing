import {ChangeDetectorRef, Component, Inject, OnDestroy, OnInit} from '@angular/core';
import {AsyncPipe, NgForOf, NgIf} from "@angular/common";
import {MatIconButton} from "@angular/material/button";
import {User} from '../../models/User';
import {forkJoin, map, Observable, of, Subject, switchMap, takeUntil} from 'rxjs';
import {UserService} from '../../services/user.service';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {ImageUploadService} from '../../services/image-upload.service';
import {TokenStorageService} from '../../services/token-storage.service';
import {MatIcon} from '@angular/material/icon';
import {RouterLink} from '@angular/router';
import {MatCheckbox, MatCheckboxChange} from '@angular/material/checkbox';
import {FriendsService} from '../../services/friends.service';

interface UiUser extends User {
  isCloseFriend?: boolean;
}
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
  users$: Observable<UiUser[]> = of([]);
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
    private tokenService: TokenStorageService,
    private friendsService: FriendsService
  ) {}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngOnInit(): void {
    this.users$ = this.userService.getFollowers(this.data.username).pipe(
      takeUntil(this.destroy$),

      switchMap(users => {
        if (users.length === 0) {
          return of({ users: [], isFollowingMap: {}, allFriendUsernames: [] });
        }

        const usernames = users.map(u => u.username);

        users.forEach(u => this.loadUserImage(u.username));

        const followingBatch$ = this.userService.isFollowingBatch(usernames);

        const allFriendsUsernames$ = this.friendsService.getFriends().pipe(

          map(result => (Array.isArray(result) ? result : []) as string[])
        );

        return forkJoin({
          users: of(users),
          isFollowingMap: followingBatch$,
          allFriendUsernames: allFriendsUsernames$
        });
      }),

      map(({ users, isFollowingMap, allFriendUsernames }) => {

        this.isFollowingMap = isFollowingMap;

        const friendSet = new Set(allFriendUsernames);

        const usersWithStatus = users.map(user => ({
          ...user,

          isCloseFriend: friendSet.has(user.username)
        } as UiUser));

        this.cd.markForCheck();
        return usersWithStatus;
      })
    );
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

  addFriend(friendUsername: string): Observable<any> {
    return this.friendsService.addToFriend(friendUsername);
  }

  removeFriend(friendUsername: string): Observable<any> {
    return this.friendsService.removeFriend(friendUsername);
  }

  onCheckboxChange(user: UiUser, event: MatCheckboxChange): void {
    const isChecked = event.checked;
    const friendUsername = user.username;

    const operation$ = isChecked
      ? this.friendsService.addToFriend(friendUsername)
      : this.friendsService.removeFriend(friendUsername);

    operation$.subscribe({
      next: () => {
        user.isCloseFriend = isChecked;
        this.cd.markForCheck();
        console.log(`Статус для ${friendUsername} успешно изменен на ${isChecked}`);
      },
      error: (err) => {
        user.isCloseFriend = !isChecked;
        this.cd.markForCheck(); // Принудительное обновление для отката
        console.error(`Ошибка при изменении статуса для ${friendUsername}. Статус откачен.`, err);
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
