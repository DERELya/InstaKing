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
    CommonModule
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

}
