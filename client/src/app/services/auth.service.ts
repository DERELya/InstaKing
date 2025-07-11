import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';

const AUTH_API = 'http://localhost:8080/api/auth/';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  constructor(private http: HttpClient) {
  }

  public login(user: { email: any; password: any; }): Observable<any> {
    return this.http.post(AUTH_API + 'signin', {
      email: user.email,
      password: user.password
    });
  }

  public register(user: {
    email: any;
    username: any;
    firstname: any;
    lastname: any;
    password: any;
    confirmPassword: any;
  }): Observable<any> {
    return this.http.post(AUTH_API + 'signup', {
      email: user.email,
      username: user.username,
      firstname: user.firstname,
      lastname: user.lastname,
      password: user.password,
      confirmPassword: user.confirmPassword
    })
  }

}
