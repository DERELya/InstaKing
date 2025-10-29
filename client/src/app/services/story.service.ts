import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, switchMap, map, catchError, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { ImageUploadService } from './image-upload.service';
import { TokenStorageService } from './token-storage.service';

export interface Story {
  id?: number;
  mediaUrl?: string;
  createdAt?: string;
  expiresAt?: string;
  username?: string;
  views?: number;
  viewed?: boolean;
}

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

  loadFollowingStories(): Observable<Story[]> {
    return this.http.get<Story[]>(this.api + 'storiesOfFollowing').pipe(
      tap((stories) => this.storiesSubject.next(stories)),
      catchError((err) => {
        console.error('Ошибка при получении сторис:', err);
        return of([]);
      })
    );
  }

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
}
