import {ChangeDetectorRef, Component, OnInit} from '@angular/core';
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
import {MatProgressSpinner} from '@angular/material/progress-spinner';
import {MatFormField, MatInput} from '@angular/material/input';
import {FormsModule} from '@angular/forms';
import {MatList, MatListItem} from '@angular/material/list';
import {MatFormFieldModule} from '@angular/material/form-field';

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
    MatInput
  ],
  templateUrl: './navigation.component.html',
  styleUrl: './navigation.component.css'
})
export class NavigationComponent implements OnInit {

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
      this.userService.getCurrentUser().subscribe(data => {
        this.user = data;
        this.isDataLoaded = true;
      });

      this.imageService.getProfileImage().subscribe({
        next: (blob) => {
          this.userProfileImage = URL.createObjectURL(blob);
          this.isDataLoaded=true;
          this.cd.markForCheck();
        },
        error: () => {
          this.userProfileImage = 'assets/placeholder.jpg';
        }
      });
      this.cd.markForCheck();
    }
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
    this.isLoading = true;
    this.error = null;
    setTimeout(() => {
      if (this.query.length < 2) {
        this.users = [];
        this.error = 'Введите минимум 2 символа';
      } else {
        this.users = [
          { username: 'john_doe', avatar: 'https://i.pravatar.cc/100?u=john' },
          { username: 'jane_smith', avatar: 'https://i.pravatar.cc/100?u=jane' },
          { username: 'alex_ivanov', avatar: 'https://i.pravatar.cc/100?u=alex' }
        ].filter(u => u.username.includes(this.query.toLowerCase()));
        if (this.users.length === 0) this.error = 'Нет пользователей';
      }
      this.isLoading = false;
    }, 600);
  }

  openSearch() {
    this.isOpen = true;
    setTimeout(() => {
      const input = document.querySelector<HTMLInputElement>('#user-search-input');
      if (input) input.focus();
    });
  }

  closeSearch() {
    this.isOpen = false;
    this.query = '';
    this.users = [];
    this.error = null;
  }

}
