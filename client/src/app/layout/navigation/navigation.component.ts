import {ChangeDetectorRef, Component, inject, OnDestroy, OnInit} from '@angular/core';
import {debounceTime, distinctUntilChanged, Observable, of, Subject, switchMap, take, takeUntil, tap} from 'rxjs';
import {User} from '../../models/User';
import {TokenStorageService} from '../../services/token-storage.service';
import {UserService} from '../../services/user.service';
import {Router, RouterLink} from '@angular/router';
import {MatToolbar} from '@angular/material/toolbar';
import {MatMenu, MatMenuItem, MatMenuTrigger} from '@angular/material/menu';
import {MatIconButton} from '@angular/material/button';
import {MatIcon} from '@angular/material/icon';
import {ImageUploadService} from '../../services/image-upload.service';
import {CommonModule} from '@angular/common';
import {ThemeService} from '../../services/theme.service';
import {MatFormField, MatInput} from '@angular/material/input';
import {FormsModule} from '@angular/forms';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatAutocomplete, MatAutocompleteTrigger, MatOption} from '@angular/material/autocomplete';
import {ChatStateService} from '../../services/chat-state.service';
import {MatBadgeModule} from '@angular/material/badge';
import {NotificationService} from '../../services/notification.service';
import {NotificationDTO} from '../../models/NotificationDTO';


@Component({
  selector: 'app-navigation',
  imports: [
    MatIcon,
    MatToolbar,
    RouterLink,
    MatMenu,
    MatMenuItem,
    MatIconButton,
    MatMenuTrigger,
    CommonModule,
    MatFormField,
    FormsModule,
    MatFormFieldModule,
    MatInput,
    MatAutocomplete,
    MatOption,
    MatAutocompleteTrigger,
    MatBadgeModule
  ],
  templateUrl: './navigation.component.html',
  styleUrl: './navigation.component.css'
})
export class NavigationComponent implements OnInit, OnDestroy {
  private chatService = inject(ChatStateService);
  unreadCount$: Observable<number> = this.chatService.totalUnreadCount$;
  isLoggedIn = false;
  isDataLoaded = false;
  user!: User;
  userProfileImage?: string;
  previewUrl?: string;

  query = '';
  users: any[] = [];
  error: string | null = null;
  private destroy$ = new Subject<void>();
  private searchInput$ = new Subject<string>();
  private tokenService = inject(TokenStorageService);
  private userService = inject(UserService);
  public router = inject(Router);
  private imageService = inject(ImageUploadService);
  private cd = inject(ChangeDetectorRef);
  private themeService = inject(ThemeService);
  private notificationService = inject(NotificationService);
  notifications$ = this.notificationService.notifications$;
  unreadCountNot$ = this.notificationService.unreadCount$;

  constructor() {
    this.notifications$ = this.notificationService.notifications$.pipe(
      tap(list => {
        // При получении списка запускаем загрузку аватарок для каждого уведомления
        list.forEach(item => this.loadNotificationAvatar(item));
      })
    );
  }


  ngOnInit(): void {
    this.isLoggedIn = !!this.tokenService.getToken();
    if (this.isLoggedIn) {
      this.userService.getCurrentUser().pipe(takeUntil(this.destroy$)).subscribe(data => {
        this.user = data;
        this.isDataLoaded = true;
        this.cd.markForCheck();
      });
      this.chatService.getConversations().subscribe();
      this.loadProfileImage();
      this.userService.avatarUpdated$
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => {
          // Вызываем повторную загрузку аватара
          this.loadProfileImage();
        });

      this.cd.markForCheck();
    }

    this.searchInput$
      .pipe(
        takeUntil(this.destroy$),
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(q => q.trim() ? this.userService.search(q) : of([]))
      )
      .subscribe({
        next: (users) => {
          this.users = users;
          this.users.forEach(user => this.loadAvatar(user));
        },
        error: () => {
          this.users = [];
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.userProfileImage && this.userProfileImage.startsWith('blob:')) {
      URL.revokeObjectURL(this.userProfileImage);
    }
  }
  loadNotificationAvatar(item: NotificationDTO) {
    if (item.senderAvatarUrl || !item.senderUsername) return;

    this.imageService.getImageToUser(item.senderUsername).subscribe({
      next: (blob) => {
        item.senderAvatarUrl = URL.createObjectURL(blob);
        this.cd.markForCheck();
      },
      error: () => {
        // Ошибка загрузки — останется заглушка
        this.cd.markForCheck();
      }
    });
  }

  loadProfileImage(): void {
    if (this.userProfileImage && this.userProfileImage.startsWith('blob:')) {
      URL.revokeObjectURL(this.userProfileImage);
    }
    this.imageService.getProfileImage().pipe(takeUntil(this.destroy$)).subscribe({
      next: (blob) => {
        this.userProfileImage = URL.createObjectURL(blob);
        this.isDataLoaded = true;
        this.cd.markForCheck();
      },
      error: () => {
        this.userProfileImage = 'assets/placeholder.jpg';
        this.isDataLoaded = true;
        this.cd.markForCheck();
      }
    });
  }

  logout(): void {
    this.tokenService.logOut();
    this.router.navigate(['/login']);
  }

  searchUsers() {
    this.searchInput$.next(this.query);
  }

  clearSearch() {
    this.query = '';
    this.users = [];
  }


  loadAvatar(user: User) {
    this.imageService.getImageToUser(user.username).pipe(takeUntil(this.destroy$)).subscribe({
      next: blob => {
        const preview = URL.createObjectURL(blob);
        user.avatarUrl = preview;
        this.cd.markForCheck();
      },
      error: () => {
        user.avatarUrl = 'assets/placeholder.jpg';
        this.cd.markForCheck();
      }
    });
  }

  goToProfile(event: any, username: string) {
    if (event.isUserInput) {
      this.router.navigate(['/profile', username]);
    }
  }

  openSetting() {
    this.router.navigate(['/settings']);
  }

  openChat() {
    this.router.navigate(['/direct']);
  }

  handleNotificationClick(notification: NotificationDTO) {
    // 1. Если оно не прочитано, помечаем
    if (!notification.isRead) {
      this.notificationService.markAsRead(notification.id);
    }
    console.log(notification);
    // 2. Логика перехода в зависимости от типа
    switch (notification.type) {
      case 'LIKE':
      case 'COMMENT':
        // Переходим к посту (предполагаем, что в content или отдельном поле есть ID поста)
        // Но пока можно просто перейти в профиль отправителя
        this.router.navigate(['/profile', notification.senderUsername]);
        break;

      case 'FOLLOW':
        this.router.navigate(['/profile', notification.senderUsername]);
        break;

      default:
        console.log('Клик по уведомлению:', notification);
    }
  }

  /**
   * Кнопка "Прочитать все"
   */
  markAllRead() {
    this.notificationService.markAllAsRead();
  }

  onMenuOpened() {
    this.unreadCountNot$.pipe(take(1)).subscribe(count => {
      if (count > 0) {
        setTimeout(() => {
          this.notificationService.markAllAsRead();
        }, 2000);
      }
    });
  }

  getAvatarColor(username: string): string {
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    return '#' + (hash & 0x00FFFFFF).toString(16).padStart(6, '0').toUpperCase();
  }
}
