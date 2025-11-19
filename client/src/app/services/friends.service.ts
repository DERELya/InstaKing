import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {environment} from '../../environments/environment';
import {User} from '../models/User';

const FRIENDS_API = 'http://localhost:8080/api/friends/';

@Injectable({
  providedIn: 'root'
})
export class FriendsService {
  private readonly api = `${environment.apiHost}friends/`;

  constructor(private http: HttpClient) {
  }

  addToFriend(friendUsername: string): Observable<any> {
    return this.http.post(FRIENDS_API + 'add/'+friendUsername, {
      friendUsername: friendUsername
    });
  }

  removeFriend(friendUsername: string): Observable<any> {
    return this.http.post(FRIENDS_API+'remove/' + friendUsername,{
      friendUsername:friendUsername
    });
  }

  getFriends(): Observable<string[]>{
    return this.http.get<string[]>(`${environment.apiHost}friends`);
  }

  getUserContain(friendUsername: string): Observable<Boolean> {
    return this.http.get<boolean>(`${this.api}userContain/${friendUsername}`);
  }

}

