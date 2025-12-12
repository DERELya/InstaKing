import {ChangeDetectorRef, Component, inject, OnDestroy, OnInit} from '@angular/core';
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

  query = '';
  users: any[] = [];
  error: string | null = null;
  private destroy$ = new Subject<void>();
  private searchInput$ = new Subject<string>();
  private tokenService=inject(TokenStorageService);
  private userService=inject(UserService);
  public router=inject(Router);
  private imageService=inject(ImageUploadService);
  private cd=inject(ChangeDetectorRef);
  private themeService=inject(ThemeService);

  constructor(
    ) {
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
}
