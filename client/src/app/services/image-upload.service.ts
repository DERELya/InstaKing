import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ImageUploadService {

  private http = inject(HttpClient);

  private readonly API_URL = 'http://localhost:8080/api/image/';
  private readonly STATIC_IMAGES_URL = 'http://localhost:8080/images/';

  constructor() {}

  uploadImageToUser(file: File): Observable<any> {
    const uploadData = new FormData();
    uploadData.append('file', file);
    return this.http.post(this.API_URL + 'upload', uploadData);
  }

  uploadImageToPost(file: File, postId: number): Observable<any> {
    const uploadData = new FormData();
    uploadData.append('file', file);
    return this.http.post(this.API_URL + postId + '/upload', uploadData);
  }
  getProfileImageUrl(fileName: string | null | undefined): string {
    if (!fileName) {
      return 'assets/placeholder.jpg';
    }
    if (fileName.startsWith('http')) {
      return fileName;
    }

    return this.STATIC_IMAGES_URL + fileName;
  }
  getImageToPost(postId: number): Observable<Blob> {
    return this.http.get(this.API_URL + postId + '/image', { responseType: 'blob' })
      .pipe(shareReplay(1));
  }
}
