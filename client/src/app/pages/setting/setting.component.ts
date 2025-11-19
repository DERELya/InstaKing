import {Component, OnInit} from '@angular/core';
import {ThemeService} from '../../services/theme.service';
import {MatIcon} from '@angular/material/icon';
import {MatFabButton} from '@angular/material/button';
import {MatDialog, MatDialogConfig} from '@angular/material/dialog';
import {User} from '../../models/User';
import {TokenStorageService} from '../../services/token-storage.service';
import {UserService} from '../../services/user.service';
import {FriendsComponent} from '../user/friends/friends.component';
import {MatCheckbox} from '@angular/material/checkbox';
import {ArchiveStoryComponent} from '../story/archive-story/archive-story.component';

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

  openFriendsWindow(): void {
    const friendsWindow = new MatDialogConfig();
    friendsWindow.width = '400px';
    friendsWindow.data = {
      username: this.meUsername
    };
    const dialogRef = this.dialog.open(FriendsComponent, friendsWindow);
    dialogRef.afterClosed().subscribe(result => {
      if (result && this.user?.username) {
      }
    });
  }

  protected openArchiveStory() {
    const ArchiveStory = new MatDialogConfig();
    ArchiveStory.width = '400px';
    ArchiveStory.data = {
      username: this.meUsername
    };
    const dialogRef = this.dialog.open(ArchiveStoryComponent, ArchiveStory);
    dialogRef.afterClosed().subscribe(result => {
      if (result && this.user?.username) {
      }
    });
  }
}
