import {Component, Inject, OnInit} from '@angular/core';
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {NotificationService} from '../../services/notification.service';
import {MAT_DIALOG_DATA, MatDialogModule, MatDialogRef} from '@angular/material/dialog';
import {UserService} from '../../services/user.service';
import {User} from '../../models/User';
import {MatButtonModule} from '@angular/material/button';
import {MatInputModule} from '@angular/material/input';
import {MatFormFieldModule} from '@angular/material/form-field';

@Component({
  selector: 'app-edit-user',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatDialogModule
  ],
  templateUrl: './edit-user.component.html',
  styleUrls: ['./edit-user.component.css']
})
export class EditUserComponent implements OnInit {

  profileEditForm!: FormGroup;

  constructor(private dialogRef: MatDialogRef<EditUserComponent>,
              private fb: FormBuilder,
              private notificationService: NotificationService,
              @Inject(MAT_DIALOG_DATA) public data: { user: User },
              private userService: UserService
  ) {
  }

  ngOnInit(): void {
    this.profileEditForm = this.buildProfileForm()
  }

  buildProfileForm(): FormGroup {
    return this.fb.group({
      firstname: [this.data.user.firstname, Validators.compose([Validators.required])],
      lastname: [this.data.user.lastname, Validators.compose([Validators.required])],
      bio: [this.data.user.bio, Validators.compose([Validators.required])]
    })
  }

  submit(): void {
    if (this.profileEditForm.invalid) {
      this.profileEditForm.markAllAsTouched();
      return;
    }
    const dto = this.formToUser();
    this.userService.updateUser(dto).subscribe({
      next: () => {
        this.notificationService.showSnackBar('User updated');
        this.dialogRef.close(dto);          // вернём новые данные
      },
      error: () => this.notificationService.showSnackBar('Update failed')
    });
  }

  private formToUser(): User {
    const {firstname, lastname, bio} = this.profileEditForm.value;
    return {...this.data.user, firstname, lastname, bio};
  }

  closeDialog() {
    this.dialogRef.close();
  }
}
