import {Component, OnInit} from '@angular/core';
import {MatButton} from "@angular/material/button";
import {MatFormField, MatInput, MatLabel} from "@angular/material/input";
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from "@angular/forms";
import {RouterLink} from "@angular/router";
import {AuthService} from '../../services/auth.service';
import {TokenStorageService} from '../../services/token-storage.service';
import {NotificationService} from '../../services/notification.service';

@Component({
  selector: 'app-register',
    imports: [
        MatButton,
        MatFormField,
        MatInput,
        MatLabel,
        ReactiveFormsModule,
        RouterLink
    ],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent implements OnInit{

  public registerForm!:FormGroup;

  constructor(
    private authService: AuthService,
    private tokenStorage: TokenStorageService,
    private notificationService: NotificationService,
    private fb:FormBuilder) {  }

  ngOnInit(): void {
        this.registerForm=this.createRegisterForm();
    }

    createRegisterForm():FormGroup{
        return this.fb.group({
          email:['',Validators.compose([Validators.required,Validators.email])],
          username: ['',Validators.compose([Validators.required])],
          firstname: ['',Validators.compose([Validators.required])],
          lastname: ['',Validators.compose([Validators.required])],
          password: ['',Validators.compose([Validators.required])],
          confirmPassword: ['',Validators.compose([Validators.required])],
        });
    }

    submit(): void{
    console.log(this.registerForm.value);

    this.authService.register({
      email: this.registerForm.value.email,
      username: this.registerForm.value.username,
      firstname: this.registerForm.value.firstname,
      lastname: this.registerForm.value.lastname,
      password: this.registerForm.value.password,
      confirmPassword: this.registerForm.value.confirmPassword,
    }).subscribe(data =>{
      console.log(data);
      this.notificationService.showSnackBar('Successfully registered!');
    },error => {
      this.notificationService.showSnackBar('Something went  wrong during registration');
    });
    }

}
