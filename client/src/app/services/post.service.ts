import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Post} from '../models/Post';
import {Observable} from 'rxjs';
import {environment} from '../../environments/environment';




@Injectable({
  providedIn: 'root'
})
export class PostService {
  private readonly api = `${environment.apiHost}post/`;
  constructor(private http: HttpClient) {
  }

  createPost(post: Post): Observable<any> {
    return this.http.post(this.api + 'create', post);
  }

  getAllPosts(): Observable<any> {
    return this.http.get(this.api + 'all');
  }

  getPostForCurrentUser(): Observable<any> {
    return this.http.get(this.api + 'user/posts');
  }

  deletePost(id: number): Observable<any> {
    return this.http.post(this.api + id + 'delete', null);
  }

  likePost(id: number, username: string): Observable<any> {
    return this.http.post(this.api + id + '/' + username + '/like', null);
  }

  toggleLike(postId: number): Observable<boolean> {
    return this.http.post<boolean>(`${this.api}${postId}/like`, null);
  }

}
