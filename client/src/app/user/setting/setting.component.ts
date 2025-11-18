import {ChangeDetectorRef, Component, OnInit} from '@angular/core';
import {ThemeService} from '../../services/theme.service';
import {MatIcon} from '@angular/material/icon';
import {MatSlideToggle} from '@angular/material/slide-toggle';
import {MatCard, MatCardTitle} from '@angular/material/card';
import {NgIf} from '@angular/common';
import {MatButton, MatFabButton} from '@angular/material/button';
import {MatDialog, MatDialogConfig} from '@angular/material/dialog';
import {FollowingComponent} from '../following/following.component';
import {User} from '../../models/User';
import {TokenStorageService} from '../../services/token-storage.service';
import {PostService} from '../../services/post.service';
import {NotificationService} from '../../services/notification.service';
import {ImageUploadService} from '../../services/image-upload.service';
import {UserService} from '../../services/user.service';
import {ActivatedRoute, Router} from '@angular/router';
import {StoryService} from '../../services/story.service';
import {FriendsComponent} from '../friends/friends.component';
@Component({
  selector: 'app-setting.component',
  imports: [
    MatIcon,
    MatSlideToggle,
    MatCardTitle,
    MatCard,
    NgIf,
    MatButton,
    MatFabButton
  ],
  templateUrl: './setting.component.html',
  styleUrl: './setting.component.css'
})
export class SettingComponent implements OnInit{
  user?: User;
  meUsername!: string | null;
  constructor(
    public themeService: ThemeService,
    private tokenService: TokenStorageService,
    private postService: PostService,
    private dialog: MatDialog,
    private notificationService: NotificationService,
    private imageService: ImageUploadService,
    protected userService: UserService,
    private cd: ChangeDetectorRef,
    private route: ActivatedRoute,
    private router: Router,
    private storyService:StoryService) {
  }

  ngOnInit(): void {
    this.meUsername = this.tokenService.getUsernameFromToken();
    }

  toggleTheme() {
    this.themeService.toggleTheme();
  }

  isDarkTheme(): boolean {
    return this.themeService.isDarkTheme();
  }

  openFollowingDialog(): void {
    const dialogUserFollowingConfig = new MatDialogConfig();
    dialogUserFollowingConfig.width = '400px';
    dialogUserFollowingConfig.data = {
      username: this.meUsername
    };
    const dialogRef = this.dialog.open(FriendsComponent, dialogUserFollowingConfig);
    dialogRef.afterClosed().subscribe(result => {
      if (result && this.user?.username) {
        // Перезагружаем профиль после редактирования
      }
    });
  }
}
