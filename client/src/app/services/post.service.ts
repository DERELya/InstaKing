import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Post } from '../models/Post';
import {
  BehaviorSubject,
  catchError,
  forkJoin,
  map,
  Observable,
  of,
  switchMap,
  take,
  tap,
  throwError,
} from 'rxjs';
import { environment } from '../../environments/environment';
import { TokenStorageService } from './token-storage.service';
import { ImageUploadService } from './image-upload.service';
import { CommentService } from './comment.service';
import {LikedUser} from '../models/LikedUser';

export interface UiPost extends Post {
  isLiked: boolean;
  avatarUrl?: string;
  image?: string;
  commentCount?: number;
  favorited?: boolean;
}

interface PostPageResponse {
  posts: Post[];
  totalPages: number;
  pageNumber: number;
}

@Injectable({
  providedIn: 'root'
})
export class PostService {
  private http = inject(HttpClient);
  private imageService = inject(ImageUploadService);
  private commentService = inject(CommentService);
  private tokenService = inject(TokenStorageService);

  private readonly api = `${environment.apiHost}post/`;
  private postsSubject = new BehaviorSubject<UiPost[]>([]);
  public posts$ = this.postsSubject.asObservable();

  private totalPagesSubject = new BehaviorSubject<number>(0);
  public totalPages$ = this.totalPagesSubject.asObservable();

  private postCountChanged = new BehaviorSubject<void>(undefined as any);
  public postCountChanged$ = this.postCountChanged.asObservable();

  constructor() {}

  private processSinglePost(post: Post): Observable<UiPost> {
    const meUsername = this.tokenService.getUsernameFromToken?.() ?? '';

    const postImg$ = this.imageService.getImageToPost(post.id!).pipe(
      take(1),
      map(blob => URL.createObjectURL(blob)),
      catchError(() => of('assets/placeholder.jpg'))
    );

    const commentCount$ = this.commentService.getCountCommentsToPost(post.id!).pipe(
      take(1),
      catchError(() => of(0))
    );

    return forkJoin({
      imgUrl: postImg$,
      count: commentCount$
    }).pipe(
      map(({ imgUrl, count }) => {
        let safeLikes: LikedUser[] = [];

        // Проверяем, что usersLiked существует и это не массив (т.е. наш Map)
        if (post.usersLiked && typeof post.usersLiked === 'object' && !Array.isArray(post.usersLiked)) {
          // Используем type assertion (post.usersLiked as any), чтобы избежать ошибки TS7015
          const rawLikes = post.usersLiked as any;

          safeLikes = Object.keys(rawLikes).map(username => ({
            username: username,
            avatarUrl: 'assets/placeholder.jpg' // Твой выбор - всегда ставить заглушку
          }));
        } else if (Array.isArray(post.usersLiked)) {
          safeLikes = post.usersLiked;
        }

        return {
          ...post,
          image: imgUrl,
          commentCount: count,
          usersLiked: safeLikes,
          isLiked: meUsername ? safeLikes.some(u => u.username === meUsername) : false
        } as UiPost;
      })
    );
  }

  loadPostsByPage(page: number, size: number): Observable<{ posts: UiPost[]; totalPages: number; pageNumber: number }> {
    return this.http.get<PostPageResponse>(`${this.api}posts?page=${page}&size=${size}`).pipe(
      switchMap(resp => {
        const rawPosts = resp?.posts ?? [];
        if (rawPosts.length === 0) return of({ posts: [], totalPages: 0, pageNumber: 0 });

        return forkJoin(rawPosts.map(p => this.processSinglePost(p))).pipe(
          map(uiPosts => ({
            posts: uiPosts,
            totalPages: resp.totalPages,
            pageNumber: resp.pageNumber
          }))
        );
      }),
      catchError(err => {
        console.error('Критическая ошибка загрузки:', err);
        return throwError(() => err);
      })
    );
  }


  createPost(post: Post): Observable<UiPost> {
    return this.http.post<Post>(this.api + 'create', post).pipe(
      switchMap(created => this.processSinglePost(created)),
      tap((uiPost) => {
        const current = this.postsSubject.getValue();
        this.postsSubject.next([uiPost, ...current]);
        this.postCountChanged.next();
      })
    );
  }

  refreshPostImage(postId: number): Observable<UiPost> {
    const currentPosts = this.postsSubject.getValue();
    const postToRefresh = currentPosts.find(p => p.id === postId);

    if (!postToRefresh) return throwError(() => new Error(`Пост ${postId} не найден`));

    return this.imageService.getImageToPost(postId).pipe(
      take(1),
      map(blob => {
        const newUrl = URL.createObjectURL(blob);
        const updated = { ...postToRefresh, image: newUrl };
        const newPosts = currentPosts.map(p => p.id === postId ? updated : p);
        this.postsSubject.next(newPosts);
        return updated;
      }),
      catchError(() => of(postToRefresh))
    );
  }

  private mergeAndEmit(newPosts: UiPost[], replace: boolean = false): void {
    if (replace) {
      this.postsSubject.next(newPosts);
      return;
    }
    const current = this.postsSubject.getValue();
    const existingIds = new Set(current.map(p => p.id));
    const uniqueNew = newPosts.filter(p => !existingIds.has(p.id));
    this.postsSubject.next([...current, ...uniqueNew]);
  }

  clearPosts(): void {
    this.postsSubject.next([]);
    this.totalPagesSubject.next(0);
  }

  getPostForUser(username: string): Observable<Post[]> {
    return this.http.get<Post[]>(this.api + 'user/' + username);
  }

  loadProfilePosts(profileUsername: string) {
    this.getPostForUser(profileUsername).pipe(
      switchMap(posts => posts.length ? forkJoin(posts.map(p => this.processSinglePost(p))) : of([])),
      take(1)
    ).subscribe(uiPosts => this.mergeAndEmit(uiPosts, true));
  }

  getFavorites(): Observable<Post[]> {
    return this.http.get<Post[]>(`${environment.apiHost}favorite`);
  }

  loadProfileFavoritePosts() {
    this.getFavorites().pipe(
      switchMap(posts => posts.length ? forkJoin(posts.map(p => this.processSinglePost(p))) : of([])),
      take(1)
    ).subscribe(uiPosts => this.mergeAndEmit(uiPosts, true));
  }

  toggleFavorite(postId: number): Observable<string> {
    return this.http.post(`${environment.apiHost}favorite/${postId}`, {}, { responseType: 'text' });
  }

  deletePost(id: number): Observable<any> {
    return this.http.post(`${this.api}${id}/delete`, null).pipe(
      tap(() => {
        const filtered = this.postsSubject.getValue().filter(p => p.id !== id);
        this.postsSubject.next(filtered);
        this.postCountChanged.next();
      })
    );
  }

  likePost(id: number, username: string): Observable<Post> {
    return this.http.post<Post>(`${this.api}${id}/${username}/like`, null).pipe(
      tap((updatedPostFromServer) => {
        const currentPosts = this.postsSubject.getValue();
        const updatedPosts = currentPosts.map(post => {
          if (post.id === id) {
            // Берем массив лайков из ответа сервера
            const newLikes: LikedUser[] = Array.isArray(updatedPostFromServer.usersLiked)
              ? updatedPostFromServer.usersLiked
              : [];

            return {
              ...post,
              ...updatedPostFromServer,
              usersLiked: newLikes,
              isLiked: newLikes.some(u => u.username === username)
            } as UiPost;
          }
          return post;
        });
        this.postsSubject.next(updatedPosts);
      })
    );
  }

  // --- Остальные методы (appendPostsPage, mergeAndEmit и т.д.) ---
  // Скопируй их из предыдущего кода, они используют mergeAndEmit и не зависят от структуры лайков напрямую

  appendPostsPage(page: number, size: number): Observable<UiPost[]> {
    return this.loadPostsByPage(page, size).pipe(
      tap(({ posts, totalPages }) => {
        this.mergeAndEmit(posts, false);
        this.totalPagesSubject.next(totalPages);
      }),
      map(({ posts }) => posts)
    );
  }

  updatePostInCache(updatedPost: UiPost): void {
    const current = this.postsSubject.getValue();
    const index = current.findIndex(p => p.id === updatedPost.id);
    if (index !== -1) {
      const newPosts = [...current];
      newPosts[index] = { ...newPosts[index], ...updatedPost };
      this.postsSubject.next(newPosts);
    }
  }
}
