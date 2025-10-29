import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable, of, shareReplay, tap} from 'rxjs'; // Добавлен tap
import { UserService } from './user.service'; // Импорт UserService

const IMAGE_API = 'http://localhost:8080/api/image/';

@Injectable({
  providedIn: 'root'
})
export class ImageUploadService {

  // Инжектируем UserService
  constructor(private http: HttpClient, private userService: UserService) {
  }

  private userImageCache: Map<string, Observable<Blob>> = new Map();
  private postImageCache: Map<number, Observable<Blob>> = new Map();


  uploadImageToUser(file: File): Observable<any> {
    const uploadData = new FormData();
    uploadData.append('file', file);
    this.clearUserImageCache();

    return this.http.post(IMAGE_API + 'upload', uploadData).pipe(
      tap(() => {
        this.userService.notifyAvatarUpdated();
      })
    );
  }

  uploadImageToPost(file: File, postId: number): Observable<any> {
    const uploadData = new FormData();
    uploadData.append('file', file);

    return this.http.post(IMAGE_API + postId + '/upload', uploadData);
  }

  getProfileImage(): Observable<Blob> {
    return this.http.get(IMAGE_API + 'profileImage', {responseType: 'blob'});
  }


  getImageToPost(postId: number): Observable<Blob> {
    const cached = this.postImageCache.get(postId);
    if (cached) {
      return cached;
    }
    const req = this.http.get(IMAGE_API + postId + '/image', {responseType: 'blob'}).pipe(shareReplay(1));
    this.postImageCache.set(postId, req);
    return req;
  }

  getImageToUser(username:string):Observable<Blob>{
    const cached = this.userImageCache.get(username);
    if (cached) {
      return cached;
    }
    const req = this.http.get(IMAGE_API+'profileImage/'+username,{responseType: 'blob'}).pipe(shareReplay(1));
    this.userImageCache.set(username, req);
    return req;
  }

  clearUserImageCache(username?: string) {
    if (username) {
      this.userImageCache.delete(username);
      return;
    }
    this.userImageCache.clear();
  }

  clearPostImageCache(postId?: number) {
    if (postId !== undefined) {
      this.postImageCache.delete(postId);
      return;
    }
    this.postImageCache.clear();
  }

}
