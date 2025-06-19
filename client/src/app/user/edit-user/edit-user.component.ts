import {Component, Inject, OnInit} from '@angular/core';
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {NotificationService} from '../../services/notification.service';
import {MAT_DIALOG_DATA, MatDialogRef, MatDialogModule} from '@angular/material/dialog';
import {UserService} from '../../services/user.service';
import {User} from '../../models/User';
import {MatButton, MatButtonModule} from '@angular/material/button';
import {MatFormField, MatInput, MatInputModule, MatLabel} from '@angular/material/input';
import {MatFormFieldModule} from '@angular/material/form-field';

@Component({
  selector: 'app-edit-user',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule
  ],
  templateUrl: './edit-user.component.html',
  styleUrls: ['./edit-user.component.css']
})
export class EditUserComponent implements OnInit {

  public profileEditForm!: FormGroup;

  constructor(private dialogRef: MatDialogRef<EditUserComponent>,
              private fb: FormBuilder,
              private notificationService: NotificationService,
              @Inject(MAT_DIALOG_DATA) public data:{user:User},
              private userService: UserService
  ) {
  }

  ngOnInit(): void {
    this.profileEditForm = this.createProfileForm()
  }

  createProfileForm(): FormGroup {
    return this.fb.group({
      firstname: [
        this.data.user.firstname,
        Validators.compose([Validators.required])
      ],
      lastname: [
        this.data.user.lastname,
        Validators.compose([Validators.required])
      ],
      bio: [
        this.data.user.bio,
        Validators.compose([Validators.required])
      ]
    })
  }

  submit(): void {
    this.userService.updateUser(this.updateUser())
      .subscribe(() => {
        this.notificationService.showSnackBar('User udated success');
        this.dialogRef.close();
      })
  }

  private updateUser(): User {
    this.data.user.firstname = this.profileEditForm.value.firstname;
    this.data.user.lastname = this.profileEditForm.value.lastname;
    this.data.user.bio = this.profileEditForm.value.bio;
    return this.data.user;
  }

  closeDialog() {
    this.dialogRef.close();
  }
}
