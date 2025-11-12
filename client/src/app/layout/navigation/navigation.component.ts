import {ChangeDetectorRef, Component, OnDestroy, OnInit} from '@angular/core';
import {Subject, takeUntil, debounceTime, distinctUntilChanged, switchMap, of} from 'rxjs';
import {User} from '../../models/User';
import {TokenStorageService} from '../../services/token-storage.service';
import {UserService} from '../../services/user.service';
import {Router, RouterLink} from '@angular/router';
import {MatToolbar} from '@angular/material/toolbar';
import {MatMenu, MatMenuItem, MatMenuTrigger} from '@angular/material/menu';
import {MatIconButton} from '@angular/material/button';
import {MatIcon} from '@angular/material/icon';
import {MatTooltip} from '@angular/material/tooltip';
import {ImageUploadService} from '../../services/image-upload.service';
import {CommonModule} from '@angular/common';
import {ThemeService} from '../../services/theme.service';
import {MatFormField, MatInput} from '@angular/material/input';
import {FormsModule} from '@angular/forms';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatAutocomplete, MatAutocompleteTrigger, MatOption} from '@angular/material/autocomplete';

const USER_API = 'http://localhost:8080/api/user/';

@Component({
  selector: 'app-navigation',
  imports: [
    MatIcon,
    MatToolbar,
    RouterLink,
    MatTooltip,
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
    MatAutocompleteTrigger
  ],
  templateUrl: './navigation.component.html',
  styleUrl: './navigation.component.css'
})
export class NavigationComponent implements OnInit, OnDestroy {

  isLoggedIn = false;
  isDataLoaded = false;
  user!: User;
  userProfileImage?: string;
  previewUrl?: string;

  isOpen = false;
  query = '';
  users: any[] = [];
  isLoading = false;
  error: string | null = null;
  private destroy$ = new Subject<void>();
  private searchInput$ = new Subject<string>();

  constructor(
    private tokenService: TokenStorageService,
    private userService: UserService,
    protected router: Router,
    private imageService: ImageUploadService,
    private cd: ChangeDetectorRef,
    public themeService: ThemeService) {
  }


  ngOnInit(): void {
    this.isLoggedIn = !!this.tokenService.getToken();
    if (this.isLoggedIn) {
      this.userService.getCurrentUser().pipe(takeUntil(this.destroy$)).subscribe(data => {
        this.user = data;
        this.isDataLoaded = true;
        this.cd.markForCheck();
      });

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
    // Очистка старого BLOB URL
    if (this.userProfileImage && this.userProfileImage.startsWith('blob:')) {
      URL.revokeObjectURL(this.userProfileImage);
    }
  }

  // Новый метод для загрузки и обновления аватара
  loadProfileImage(): void {
    // 1. Очищаем старый URL, чтобы избежать утечки памяти
    if (this.userProfileImage && this.userProfileImage.startsWith('blob:')) {
      URL.revokeObjectURL(this.userProfileImage);
    }

    // 2. Запрашиваем новый аватар.
    // ImageUploadService гарантирует, что если аватар был обновлен,
    // его внутренний кэш сброшен, и будет сделан новый HTTP-запрос.
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

  toggleTheme() {
    this.themeService.toggleTheme();
  }

  isDarkTheme(): boolean {
    return this.themeService.isDarkTheme();
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
      console.log("gg");
      this.router.navigate(['/settings']);
  }
}
