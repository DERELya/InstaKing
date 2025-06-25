import {ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, OnInit} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialog, MatDialogRef} from '@angular/material/dialog';
import {CommonModule, NgForOf, NgIf} from '@angular/common';
import {MatIconModule} from '@angular/material/icon';
import {UserService} from '../../services/user.service';
import {User} from '../../models/User';
import {MatButtonModule} from '@angular/material/button';
import {forkJoin} from 'rxjs';
import {ImageUploadService} from '../../services/image-upload.service';
import {Router, RouterLink} from '@angular/router';

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
  users: User[] = [];

  constructor(private dialogRef: MatDialogRef<LikesPostComponent>,
              private userService: UserService,
              @Inject(MAT_DIALOG_DATA) public usernames: string[],
              private cd: ChangeDetectorRef,
              private imageService: ImageUploadService,
              private dialog: MatDialog,
              private router:Router) {
  }

  ngOnInit(): void {
    this.loadAllUsers()
    console.log(this.usernames);
  }

  loadAllUsers() {
    const requests = this.usernames.map(username => this.userService.getUserByUsername(username));
    forkJoin(requests).subscribe(users => {
      Promise.resolve().then(() => {
        this.users = users;
        this.cd.markForCheck();
        this.users.forEach(user => this.loadAvatar(user));

      });
    });
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

  close() {
    this.dialogRef.close();
  }

  closePostDetails(username: string) {
    this.dialog.closeAll();
    setTimeout(() => {
      this.router.navigate(['/profile', username]);
    });
  }
}
