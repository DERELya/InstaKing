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
    if (this.query.trim()) {
      this.userService.search(this.query).subscribe({
        next: (users) => {
          this.users = users;
          this.users.forEach(user => this.loadAvatar(user));
        },
        error: (err) => {
          console.error('Ошибка при поиске:', err);
          this.users = [];
        }
      });

    } else {
      this.users = [];
    }
  }

  clearSearch() {
    this.query = '';
    this.users = [];
  }

  selectUser(user: User) {
    this.query = user.username; // например вставляем username
    this.users = [];
  }

  loadAvatar(user: User) {
    this.imageService.getImageToUser(user.username).subscribe({
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

}
