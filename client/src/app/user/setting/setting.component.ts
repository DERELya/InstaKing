import {Component, OnInit} from '@angular/core';
import {ThemeService} from '../../services/theme.service';
import {MatIcon} from '@angular/material/icon';
import {MatFabButton} from '@angular/material/button';
import {MatDialog, MatDialogConfig} from '@angular/material/dialog';
import {User} from '../../models/User';
import {TokenStorageService} from '../../services/token-storage.service';
import {UserService} from '../../services/user.service';
import {FriendsComponent} from '../friends/friends.component';
import {MatCheckbox} from '@angular/material/checkbox';

@Component({
  selector: 'app-setting.component',
  imports: [
    MatIcon,
    MatFabButton,
    MatCheckbox
  ],
  templateUrl: './setting.component.html',
  styleUrl: './setting.component.css'
})
export class SettingComponent implements OnInit {
  user?: User;
  meUsername!: string | null;

  constructor(
    public themeService: ThemeService,
    private tokenService: TokenStorageService,
    private dialog: MatDialog,
    protected userService: UserService) {
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
      }
    });
  }
}
