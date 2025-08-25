import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {CommentPageResponse} from '../user/post-info/post-info.component';

const COMMENT_API = 'http://localhost:8080/api/comment/';

@Injectable({
  providedIn: 'root'
})
export class CommentService {

  constructor(private http: HttpClient) {
  }

  addToCommentToPost(postId: number, message: string): Observable<any> {
    return this.http.post(COMMENT_API + postId + '/create', {
      message: message
    });
  }

  getCommentsToPost(postId: number): Observable<any> {
    return this.http.get(COMMENT_API + postId + '/all');
  }

  getCountCommentsToPost(postId: number): Observable<number>{
    return this.http.get<number>(COMMENT_API+postId+'/countComment');
  }

  delete(commentId: number): Observable<any> {
    return this.http.post(COMMENT_API + commentId + '/delete', null);
  }
  getComments(postId: number, page: number, size: number): Observable<CommentPageResponse> {
    return this.http.get<CommentPageResponse>(
      `${COMMENT_API}${postId}/comments?page=${page}&size=${size}`
    );
  }

}

