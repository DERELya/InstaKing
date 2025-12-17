import {ChangeDetectorRef, Component, inject, Inject, OnDestroy, OnInit} from '@angular/core';
import { AsyncPipe, NgForOf, NgIf } from "@angular/common";
import { MatIconButton } from "@angular/material/button";
import { User } from '../../../models/User';
import { forkJoin, map, Observable, of, Subject, switchMap, takeUntil } from 'rxjs';
import { UserService } from '../../../services/user.service';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ImageUploadService } from '../../../services/image-upload.service';
import { TokenStorageService } from '../../../services/token-storage.service';
import { MatIcon } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { MatCheckbox, MatCheckboxChange } from '@angular/material/checkbox';
import { FriendsService } from '../../../services/friends.service';

interface UiUser extends User {
  isCloseFriend?: boolean;
  // Поле avatarUrl уже есть в User, но мы перезапишем его полной ссылкой
}

@Component({
  selector: 'app-friends.component',
  standalone: true, // Добавил standalone, так как есть imports
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
  private dialogRef=inject(MatDialogRef<FriendsComponent>);
  private imageService=inject(ImageUploadService);
  private cd=inject( ChangeDetectorRef);
  private tokenService=inject (TokenStorageService);
  private friendsService= inject(FriendsService);
  private userService=inject(UserService);

  users$: Observable<UiUser[]> = of([]);

  // Удален userImages (кэш блобов не нужен)

  isFollowingMap: { [username: string]: boolean } = {};
  meUsername!: string | null;
  private destroy$ = new Subject<void>();

  constructor(

    @Inject(MAT_DIALOG_DATA) public data: { username: string },

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
          // Возвращаем структуру, совместимую с forkJoin
          return of({ users: [], isFollowingMap: {}, allFriendUsernames: [] });
        }

        const usernames = users.map(u => u.username);

        // Удалили вызов loadUserImage (это теперь делается синхронно ниже)

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
        this.isFollowingMap = isFollowingMap || {};
        const friendSet = new Set(allFriendUsernames || []);

        // Маппим пользователей в UI-модель
        const usersWithStatus = users.map(user => ({
          ...user,
          // ВАЖНО: Превращаем имя файла в полный URL прямо здесь
          avatarUrl: this.imageService.getProfileImageUrl(user.avatarUrl),
          isCloseFriend: friendSet.has(user.username)
        } as UiUser));

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
        user.isCloseFriend = !isChecked; // Откат галочки при ошибке
        this.cd.markForCheck();
        console.error(`Ошибка при изменении статуса для ${friendUsername}`, err);
      }
    });
  }
}
