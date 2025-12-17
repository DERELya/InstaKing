import { ChangeDetectorRef, Component, inject, OnDestroy, OnInit } from '@angular/core';
import { debounceTime, distinctUntilChanged, Observable, of, Subject, switchMap, take, takeUntil } from 'rxjs';
import { User } from '../../models/User';
import { TokenStorageService } from '../../services/token-storage.service';
import { UserService } from '../../services/user.service';
import { Router, RouterLink } from '@angular/router';
import { MatToolbar } from '@angular/material/toolbar';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { ImageUploadService } from '../../services/image-upload.service';
import { CommonModule } from '@angular/common';
import { ThemeService } from '../../services/theme.service';
import { MatFormField, MatInput } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatAutocomplete, MatAutocompleteTrigger, MatOption } from '@angular/material/autocomplete';
import { ChatStateService } from '../../services/chat-state.service';
import { MatBadgeModule } from '@angular/material/badge';
import { NotificationService } from '../../services/notification.service';
import { NotificationDTO } from '../../models/NotificationDTO';

@Component({
  selector: 'app-navigation',
  standalone: true,
  imports: [
    MatIcon, MatToolbar, RouterLink, MatMenu, MatMenuItem, MatIconButton, MatMenuTrigger,
    CommonModule, MatFormField, FormsModule, MatFormFieldModule, MatInput,
    MatAutocomplete, MatOption, MatAutocompleteTrigger, MatBadgeModule
  ],
  templateUrl: './navigation.component.html',
  styleUrl: './navigation.component.css'
})
export class NavigationComponent implements OnInit, OnDestroy {
  // Инжекты
  private chatService = inject(ChatStateService);
  private tokenService = inject(TokenStorageService);
  private userService = inject(UserService);
  public router = inject(Router);
  public imageService = inject(ImageUploadService); // Оставляем public, если нужно где-то еще
  private cd = inject(ChangeDetectorRef);
  private themeService = inject(ThemeService);
  private notificationService = inject(NotificationService);

  // Потоки
  unreadCount$: Observable<number> = this.chatService.totalUnreadCount$;
  notifications$ = this.notificationService.notifications$;
  unreadCountNot$ = this.notificationService.unreadCount$;

  // Состояние
  isLoggedIn = false;
  isDataLoaded = false;
  user!: User;
  userProfileImage: string = 'assets/placeholder.jpg';

  query = '';
  users: any[] = [];

  private destroy$ = new Subject<void>();
  private searchInput$ = new Subject<string>();

  constructor() {}

  ngOnInit(): void {
    this.isLoggedIn = !!this.tokenService.getToken();

    if (this.isLoggedIn) {
      this.userService.getCurrentUser()
        .pipe(takeUntil(this.destroy$))
        .subscribe(data => {
          this.user = data;
          this.updateProfileImageUrl(); // Просто берет ссылку из user
          this.isDataLoaded = true;
          this.cd.markForCheck();
        });

      this.chatService.getConversations().subscribe();

      this.userService.avatarUpdated$
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => {
          this.updateProfileImageUrl(true);
          this.cd.markForCheck();
        });
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
          this.cd.markForCheck();
        },
        error: () => {
          this.users = [];
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // --- УПРОЩЕННАЯ ЛОГИКА ---
  updateProfileImageUrl(bustCache: boolean = false): void {
    if (this.user?.avatarUrl) {
      // 1. Берем ссылку напрямую с бэка
      this.userProfileImage = this.user.avatarUrl;

      // 2. Если нужно сбросить кэш (при загрузке новой фотки), добавляем timestamp
      if (bustCache) {
        const separator = this.userProfileImage.includes('?') ? '&' : '?';
        this.userProfileImage += `${separator}t=${new Date().getTime()}`;
      }
    } else {
      this.userProfileImage = 'assets/placeholder.jpg';
    }
  }

  // --- Остальные методы (logout, searchUsers, notifications) без изменений ---
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
    if (!notification.isRead) {
      this.notificationService.markAsRead(notification.id);
    }
    // ... switch ...
    switch (notification.type) {
      case 'LIKE':
      case 'COMMENT':
      case 'FOLLOW':
        this.router.navigate(['/profile', notification.senderUsername]);
        break;
    }
  }

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
