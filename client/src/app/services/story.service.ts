import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {BehaviorSubject, catchError, forkJoin, map, Observable, of, shareReplay, switchMap, tap} from 'rxjs';
import {environment} from '../../environments/environment';
import {ImageUploadService} from './image-upload.service';
import {TokenStorageService} from './token-storage.service';
import {Story} from '../models/Story';

@Injectable({
  providedIn: 'root',
})
export class StoryService {
  private readonly api = `${environment.apiHost}story/`;

  private storiesSubject = new BehaviorSubject<Story[]>([]);
  public stories$ = this.storiesSubject.asObservable();

  constructor(
    private http: HttpClient,
    private imageService: ImageUploadService,
    private tokenService: TokenStorageService
  ) {}

  getStoryById(id: number): Observable<Story> {
    return this.http.get<Story>(this.api + id);
  }



  addView(storyId: number): Observable<void> {
    return this.http.post<void>(`${this.api}${storyId}/view`, null).pipe(
      tap(() => {
        const stories = this.storiesSubject.getValue();
        const updated = stories.map((s) =>
          s.id === storyId ? { ...s, views: (s.views ?? 0) + 1, viewed: true } : s
        );
        this.storiesSubject.next(updated);
      }),
      catchError((err) => {
        console.error(`Ошибка при отметке просмотра сторис ID ${storyId}:`, err);
        return of();
      })
    );
  }


  createStory(formData: FormData): Observable<Story> {
    return this.http.post<Story>(this.api + 'create', formData).pipe(
      tap((story) => {
        const current = this.storiesSubject.getValue();
        this.storiesSubject.next([story, ...current]);
      }),
      catchError((err) => {
        console.error('Ошибка при создании сторис:', err);
        throw err;
      })
    );
  }

  /** Удаление своей сторис */
  deleteStory(id: number): Observable<void> {
    return this.http.post<void>(`${this.api}${id}/delete`, null).pipe(
      tap(() => {
        const updated = this.storiesSubject.getValue().filter((s) => s.id !== id);
        this.storiesSubject.next(updated);
      }),
      catchError((err) => {
        console.error('Ошибка при удалении сторис:', err);
        throw err;
      })
    );
  }

  loadFollowingStories(): Observable<Story[]> {
    return this.http.get<Story[]>(`${this.api}storiesOfFollowing`).pipe(
      switchMap((stories) => {
        if (!stories || stories.length === 0) return of([]);

        // Подгружаем аватарки и контент (blob)
        const withDetails$ = stories.map((story) =>
          forkJoin({
            avatarUrl: this.getUserImage(story.username!),
            //blobUrl: this.getStoryBlobUrl(story.mediaUrl!),
          }).pipe(
            map((extra) => ({
              ...story,
              avatarUrl: extra.avatarUrl,
             // blobUrl: extra.blobUrl,
            }))
          )
        );

        return forkJoin(withDetails$);
      }),
      tap((stories) => this.storiesSubject.next(stories)),
      catchError((err) => {
        console.error('Ошибка при получении сторис:', err);
        return of([]);
      })
    );
  }

  /** 🔹 Получить контент (blob URL) для сторис */
  private getStoryBlobUrl(mediaUrl: string): Observable<string> {
    if (!mediaUrl) return of('');

    return this.getContentForStory(mediaUrl).pipe(
      map((blob) => URL.createObjectURL(blob)),
      catchError((err) => {
        console.error('Ошибка загрузки содержимого сторис:', err);
        return of('');
      })
    );
  }

  /** 🔹 Получить изображение пользователя (аватар) */
  private getUserImage(username: string): Observable<string> {
    return this.imageService.getImageToUser(username).pipe(
      map((blob) => URL.createObjectURL(blob)), // преобразуем Blob в URL
      catchError(() => of('assets/placeholder.jpg'))
    );
  }


  /** 🔹 Загрузить бинарные данные сторис (blob) */
  getContentForStory(url: string): Observable<Blob> {
    return this.http
      .get(`${this.api}content/${url}`, { responseType: 'blob' })
      .pipe(shareReplay(1));
  }

}
