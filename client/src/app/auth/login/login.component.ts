import {AfterViewInit, ChangeDetectorRef, Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {AuthService} from '../../services/auth.service';
import {TokenStorageService} from '../../services/token-storage.service';
import {NotificationService} from '../../services/notification.service';
import {Router, RouterLink} from '@angular/router';
import {MatFormField, MatInput, MatLabel} from '@angular/material/input';
import {MatButton} from '@angular/material/button';
import {HttpClientModule} from '@angular/common/http';

@Component({
  selector: 'app-login',
  imports: [
    ReactiveFormsModule,
    MatLabel,
    MatFormField,
    MatLabel,
    MatFormField,
    MatInput,
    MatLabel,
    MatFormField,
    MatButton,
    RouterLink,
    HttpClientModule
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit{

  public loginForm!: FormGroup;

  constructor(
    private authService: AuthService,
    private tokenStorage: TokenStorageService,
    private notificationService: NotificationService,
    private router: Router,
    private fb: FormBuilder,
  ) {
    if (this.tokenStorage.getUser()) {
      this.router.navigate(['main'])
    }
  }

  ngOnInit(): void {
    this.loginForm = this.createLoginForm();
  }


  onInputChange() {
    this.loginForm.updateValueAndValidity();
  }


  createLoginForm(): FormGroup {
    return this.fb.group({
      email: ['', Validators.compose([Validators.required, Validators.email])],
      password: ['', Validators.required],
    })
  }

  submit(): void {
    this.authService.login({
      email: this.loginForm.value.email,
      password: this.loginForm.value.password
    }).subscribe(data => {
      this.tokenStorage.saveToken(data.accessToken);
      this.tokenStorage.saveUser(data);
      this.tokenStorage.saveRefreshToken(data.refreshToken);

      this.notificationService.showSnackBar('Successfully logged in');
      this.router.navigate(['/main'], { state: { justLoggedIn: true } });
      window.location.reload();

    }, error => {
      this.notificationService.showSnackBar(error.message)
    })

  }

  removeSelection(event: FocusEvent) {
    const input = event.target as HTMLInputElement;
    setTimeout(() => input.setSelectionRange(input.value.length, input.value.length), 0);
  }

}
