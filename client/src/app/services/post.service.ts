import { Injectable } from '@angular/core';
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
  tap,
  throwError,
} from 'rxjs';
import { environment } from '../../environments/environment';
import { UserService } from './user.service';
import { TokenStorageService } from './token-storage.service';
import { ImageUploadService } from './image-upload.service';
import { CommentService } from './comment.service';


interface UiPost extends Post {
  isLiked: boolean;
  avatarUrl?: string;
  showAllComments?: boolean;
  commentCount?: number;
}

/** Интерфейс ответа пагинации (возможные поля) */
interface PostPageResponse {
  comments: Post[]; // список постов находится в поле comments
  totalElements: number;
  totalPages: number;
  pageNumber: number;
  pageSize: number;
}

@Injectable({
  providedIn: 'root'
})
export class PostService {
  private readonly api = `${environment.apiHost}post/`;
  private postsSubject = new BehaviorSubject<UiPost[]>([]);
  public posts$ = this.postsSubject.asObservable();

  private totalPagesSubject = new BehaviorSubject<number>(0);
  public totalPages$ = this.totalPagesSubject.asObservable();

  private postCountChanged = new BehaviorSubject<void>(undefined as any);
  public postCountChanged$ = this.postCountChanged.asObservable();


  constructor(
    private http: HttpClient,
    private userService: UserService,
    private imageService: ImageUploadService,
    private commentService: CommentService,
    private tokenService: TokenStorageService
  ) {}

  private processSinglePost(post: Post): Observable<UiPost> {
    const meUsername = this.tokenService.getUsernameFromToken?.() ?? undefined;

    const avatar$ = this.imageService.getImageToUser(post.username!).pipe(
      map(blob => URL.createObjectURL(blob)),
      catchError(() => of('assets/blank-avatar.png'))
    );

    const postImg$ = this.imageService.getImageToPost(post.id!).pipe(
      map(blob => URL.createObjectURL(blob)),
      catchError(() => of('assets/placeholder.jpg'))
    );

    return forkJoin({
      postImg: postImg$,
      avatar: avatar$,
      commentCount: this.commentService.getCountCommentsToPost(post.id!).pipe(
        catchError(() => of(0))
      )
    }).pipe(
      map(({ postImg, avatar, commentCount }) => ({
        ...post,
        image: postImg,
        avatarUrl: avatar,
        usersLiked: post.usersLiked ?? [],
        isLiked: meUsername ? (post.usersLiked ?? []).includes(meUsername) : false,
        commentCount
      } as UiPost))
    );
  }

  private mergeAndEmit(newPosts: UiPost[], replace: boolean = false): void {
    if (replace) {
      const seen = new Set<number>();
      const deduped = newPosts.filter(p => {
        const id = p.id as number;
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      });
      this.postsSubject.next(deduped);
      return;
    }

    const current = this.postsSubject.getValue();
    const existingIds = new Set(current.map(p => p.id as number));
    const filtered = newPosts.filter(p => !existingIds.has(p.id as number));
    this.postsSubject.next([...current, ...filtered]);
  }

  createPost(post: Post): Observable<UiPost> {
    return this.http.post<Post>(this.api + 'create', post).pipe(
      switchMap(createdPost => this.processSinglePost(createdPost)),
      tap((uiPost: UiPost) => {
        this.postsSubject.next([uiPost, ...this.postsSubject.getValue()]);
        this.postCountChanged.next();
      }),
      catchError(err => {
        console.error('Ошибка при создании поста:', err);
        return throwError(() => err);
      })
    );
  }

  refreshPostImage(postId: number): Observable<UiPost> {
    const currentPosts = this.postsSubject.getValue();
    const postToRefresh = currentPosts.find(p => p.id === postId);

    if (!postToRefresh) {
      return throwError(() => new Error(`Пост с ID ${postId} не найден для обновления изображения.`));
    }

    const imageRefresh$ = this.imageService.getImageToPost(postId).pipe(
      map(blob => URL.createObjectURL(blob)),
      catchError(err => {
        console.warn(`Не удалось загрузить изображение после refresh для ID ${postId}.`, err);
        return of('assets/placeholder.jpg');
      })
    );

    return imageRefresh$.pipe(
      map(newImageUrl => {
        const updatedPost = { ...postToRefresh, image: newImageUrl } as UiPost;
        const newPosts = currentPosts.map(p => p.id === postId ? updatedPost : p);
        this.postsSubject.next(newPosts);
        return updatedPost;
      })
    );
  }

  loadPostsByPage(
    page: number,
    size: number,
    currentUsername?: string
  ): Observable<{ posts: UiPost[]; totalPages: number; pageNumber: number }> {
    return this.http
      .get<PostPageResponse>(`${this.api}posts?page=${page}&size=${size}`)
      .pipe(
        switchMap((resp) => {
          const posts = resp?.comments ?? [];

          return (posts.length === 0
              ? of([] as UiPost[])
              : forkJoin(posts.map((post) => this.processSinglePost(post)))
          ).pipe(
            map((uiPosts) => ({
              posts: uiPosts,
              totalPages: resp.totalPages,
              pageNumber: resp.pageNumber
            }))
          );
        })
      );
  }

  appendPostsPage(
    page: number,
    size: number,
    currentUsername?: string
  ): Observable<UiPost[]> {
    return this.loadPostsByPage(page, size, currentUsername).pipe(
      tap(({ posts, totalPages }) => {
        this.mergeAndEmit(posts, false);
        this.totalPagesSubject.next(totalPages);
      }),
      map(({ posts }) => posts)
    );
  }


  clearPosts(): void {
    this.postsSubject.next([]);
    this.totalPagesSubject.next(0);
  }

  getPostForUser(username: string): Observable<Post[]> {
    return this.http.get<Post[]>(this.api + 'user/' + username);
  }


  deletePost(id: number): Observable<any> {
    return this.http.post(this.api + id + '/delete', null).pipe(
      tap(() => {
        const updatedPosts = this.postsSubject.getValue().filter(p => p.id !== id);
        this.postsSubject.next(updatedPosts);
        this.postCountChanged.next();
      }),
      catchError(err => {
        console.error(`Ошибка при удалении поста ID ${id}:`, err);
        return throwError(() => err);
      })
    );
  }

  likePost(id: number, username: string): Observable<any> {
    return this.http.post(this.api + id + '/' + username + '/like', null).pipe(
      tap(() => {
        const currentPosts = this.postsSubject.getValue();
        const updatedPosts = currentPosts.map(post => {
          if (post.id === id) {
            const isCurrentlyLiked = (post.usersLiked || []).includes(username);
            let newUsersLiked = post.usersLiked ? [...post.usersLiked] : [];
            let newIsLiked = !isCurrentlyLiked;

            if (newIsLiked) {
              newUsersLiked.push(username);
            } else {
              newUsersLiked = newUsersLiked.filter(u => u !== username);
            }

            return { ...post, usersLiked: newUsersLiked, isLiked: newIsLiked } as UiPost;
          }
          return post;
        });

        this.postsSubject.next(updatedPosts);
      })
    );
  }
  updatePostInCache(updatedPost: UiPost): void {
    const current = this.postsSubject.getValue();
    const index = current.findIndex(p => p.id === updatedPost.id);
    if (index !== -1) {
      current[index] = { ...current[index], ...updatedPost };
      this.postsSubject.next([...current]);
    }
  }



  loadProfilePosts(profileUsername: string) {
    this.getPostForUser(profileUsername).pipe(
      switchMap((posts: Post[]) =>
        posts.length === 0
          ? of([])
          : forkJoin(posts.map(post => this.processSinglePost(post)))
      )
    ).subscribe({
      next: uiPosts => {
        this.mergeAndEmit(uiPosts, true);
      },
      error: () => {}
    });
  }

  loadProfileFavoritePosts() {
    this.getFavorites().pipe(
      switchMap((posts: Post[]) =>
        posts.length === 0
          ? of([])
          : forkJoin(posts.map(post => this.processSinglePost(post)))
      )
    ).subscribe({
      next: uiPosts => {
        this.mergeAndEmit(uiPosts, true);
      },
      error: () => {}
    });
  }


  getFavorites(): Observable<Post[]> {
    return this.http.get<Post[]>(`${environment.apiHost}favorite`);
  }

  /** Добавить / удалить пост из избранного */
  toggleFavorite(postId: number): Observable<string> {
    return this.http.post(`${environment.apiHost}favorite/${postId}`, {}, { responseType: 'text' });
  }

}
