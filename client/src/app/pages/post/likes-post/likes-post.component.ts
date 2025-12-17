import {ChangeDetectorRef, Component, inject, Inject, OnInit} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialog, MatDialogRef} from '@angular/material/dialog';
import {CommonModule, NgForOf, NgIf} from '@angular/common';
import {MatIconModule} from '@angular/material/icon';
import {UserService} from '../../../services/user.service';
import {User} from '../../../models/User';
import {MatButtonModule} from '@angular/material/button';
import {forkJoin} from 'rxjs';
import {ImageUploadService} from '../../../services/image-upload.service';
import {Router, RouterLink} from '@angular/router';
import {TokenStorageService} from '../../../services/token-storage.service';

@Component({
  selector: 'app-likes-post',
  standalone: true,
  imports: [
    MatIconModule,
    NgForOf,
    NgIf,
    CommonModule,
    MatButtonModule,
    RouterLink
  ],
  templateUrl: './likes-post.component.html',
  styleUrls: ['./likes-post.component.css']
})
export class LikesPostComponent implements OnInit {
  private tokenService=inject(TokenStorageService);
  private dialogRef=inject(MatDialogRef<LikesPostComponent>);
  protected userService= inject(UserService);
  private cd=inject(ChangeDetectorRef);
  private imageService=inject(ImageUploadService);
  private dialog=inject(MatDialog);
  private router=inject(Router);
  users: User[] = [];
  isFollowingMap: { [username: string]: boolean } = {};
  meUsername!: string | null;

  constructor(
    @Inject(MAT_DIALOG_DATA) public usernames: string[],
    ) {
  }

  ngOnInit(): void {

    this.loadAllUsers()
  }

  loadAllUsers() {
    const requests = this.usernames.map(username => this.userService.getUserByUsername(username));
    forkJoin(requests).subscribe(users => {
      Promise.resolve().then(() => {
        this.users = users;
        this.cd.markForCheck();

        this.users.forEach(user => this.imageService.getProfileImageUrl(user.avatarUrl));
        this.meUsername = this.tokenService.getUsernameFromToken();
      });
    });
    this.userService.isFollowingBatch(this.usernames).subscribe(map => {
      this.isFollowingMap = map;
      console.log(this.isFollowingMap);
    });

  }



  close() {
    this.dialogRef.close(true);
  }

  follow(username: string) {
    this.userService.follow(username).subscribe(() => {
      this.cd.markForCheck();
      // Можно добавить уведомление или обновить данные
    });
  }

  unfollow(username: string) {
    this.userService.unFollow(username).subscribe(() => {
      this.cd.markForCheck();
      // Можно добавить уведомление или обновить данные
    });
  }

  closePostDetails(username: string) {
    this.dialog.closeAll();
    setTimeout(() => {
      this.router.navigate(['/profile', username]);
    });
  }
}
