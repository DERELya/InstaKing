import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {BehaviorSubject, Observable} from 'rxjs';
import {User} from '../models/User';

const USER_API = 'http://localhost:8080/api/user/';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);

  constructor(private http: HttpClient) {
  }

  getUserById(id: number): Observable<any> {
    return this.http.get(USER_API + id)
  }

  getCurrentUser(): Observable<any> {
    return this.http.get(USER_API)
  }

  updateUser(user: any): Observable<any> {
    return this.http.post(USER_API + 'update', user)
  }
  setCurrentUser(user: User) {
    this.currentUserSubject.next(user);
  }
  getCurrentUserValue(): User | null {
    return this.currentUserSubject.value;
  }
  getCurrentUserObservable(): Observable<User | null> {
    return this.currentUserSubject.asObservable();
  }
}
