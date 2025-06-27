import {Component, Inject, OnInit} from '@angular/core';
import {MatButton, MatIconButton} from "@angular/material/button";
import {NgForOf, NgIf} from "@angular/common";
import {MatIcon} from '@angular/material/icon';
import {User} from '../../models/User';
import {UserService} from '../../services/user.service';
import {MAT_DIALOG_DATA, MatDialog, MatDialogRef} from '@angular/material/dialog';
import {RouterLink} from '@angular/router';

@Component({
  selector: 'app-following.component',
  imports: [
    MatButton,
    MatIcon,
    MatIconButton,
    NgForOf,
    NgIf,
    RouterLink
  ],
  templateUrl: './following.component.html',
  styleUrl: './following.component.css'
})
export class FollowingComponent implements OnInit {
  users: User[] = [];

  constructor(private userService: UserService,
              @Inject(MAT_DIALOG_DATA) public username: string,
              private dialogRef: MatDialogRef<FollowingComponent>) {
  }

  ngOnInit(): void {
    this.userService.getFollowing(this.username)

    this.userService.getFollowing(this.username).subscribe((users) => {
      this.users = users;
      console.log("user"+this.username);
      console.log(users);
    });
  }

  close() {
    this.dialogRef.close();
  }


}
