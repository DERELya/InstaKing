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
  getUserByUsername(username: string | null): Observable<User> {
    // Предположим, что у тебя эндпоинт типа /api/users/by-username/{username}
    return this.http.get<User>(USER_API+'getUser/'+username);
  }

  getFollowers(username: string | null): Observable<User[]> {
    // Предположим, что у тебя эндпоинт типа /api/users/by-username/{username}
    return this.http.get<User[]>(USER_API+username+'/followers');
  }
  getFollowing(username: string | null): Observable<User[]> {
    // Предположим, что у тебя эндпоинт типа /api/users/by-username/{username}
    return this.http.get<User[]>(USER_API+username+'/following');
  }

  search(username: string | null): Observable<User[]> {
    return this.http.get<User[]>(USER_API+'search/'+username);
  }
  isFollow(username:string|null): Observable<boolean>{
    return this.http.get<boolean>(USER_API+username+'/isFollow');
  }
  follow(username:string|null): Observable<any>{
    return this.http.post(USER_API+'follow/'+username,username);
  }

  unFollow(username:string| null):Observable<any>{
    return this.http.post(USER_API+'unfollow/'+username,username);
  }
  isFollowingBatch(usernames: string[]): Observable<{ [username: string]: boolean }> {
    return this.http.post<{ [username: string]: boolean }>(USER_API+
      'isFollowingBatch',usernames);
  }
}
