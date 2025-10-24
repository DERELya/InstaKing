import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Post} from '../models/Post';
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
  Subject // <- ИМПОРТ Subject
} from 'rxjs';
import {environment} from '../../environments/environment';
import {UserService} from './user.service';
import {TokenStorageService} from './token-storage.service';
import {ImageUploadService} from './image-upload.service';
import {CommentService} from './comment.service';


interface UiPost extends Post {
  isLiked: boolean;
  avatarUrl?: string;
  showAllComments?: boolean;
  commentCount?: number;
}

// Отвечает форме ответа пагинации бэкенда /api/post/posts
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

  // 1. Объявление реактивного сигнала для счетчика
  private postCountChanged = new Subject<void>();
  public postCountChanged$ = this.postCountChanged.asObservable();


  constructor(private http: HttpClient,
              private userService: UserService,
              private imageService: ImageUploadService,
              private commentService: CommentService,
              private tokenService: TokenStorageService) {
  }

  /**
   * Вспомогательный метод для обработки одного поста (добавление image, avatarUrl, isLiked, commentCount).
   */
  private processSinglePost(post: Post): Observable<UiPost> {
    const meUsername = this.tokenService.getUsernameFromToken?.() ?? undefined;

    // Загрузка аватара пользователя, который создал пост
    const avatar$ = this.imageService.getImageToUser(post.username!).pipe(
      map(blob => URL.createObjectURL(blob)),
      catchError(() => of('assets/blank-avatar.png'))
    );

    // ВАЖНО: При загрузке только что созданного поста, картинки может не быть, поэтому catchError вернет заглушку.
    // Это будет исправлено вызовом refreshPostImage из компонента после загрузки файла.
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
      map(({postImg, avatar, commentCount}) => ({
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
      // Замена всего списка с дедупликацией
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

    // Добавление новых постов к существующим
    const current = this.postsSubject.getValue();
    const existingIds = new Set(current.map(p => p.id as number));
    const filtered = newPosts.filter(p => !existingIds.has(p.id as number));
    this.postsSubject.next([...current, ...filtered]);
  }


  /**
   * Создать пост. После успешного создания обновляет postsSubject.
   * Возвращает Observable<UiPost> для использования в switchMap.
   */
  createPost(post: Post): Observable<UiPost> {
    // 1. HTTP-запрос на создание. Предполагаем, что API возвращает созданный объект Post.
    return this.http.post<Post>(this.api + 'create', post).pipe(
      // 2. Обрабатываем полученный пост для UI (с временным URL фото)
      switchMap(createdPost => this.processSinglePost(createdPost)),

      // 3. Используем tap для добавления нового поста в начало реактивного потока
      tap((uiPost: UiPost) => {
        // Добавляем в начало, чтобы пользователь сразу увидел новый пост
        this.postsSubject.next([uiPost, ...this.postsSubject.getValue()]);
        // 2. Сигнализируем об изменении общего количества постов (Добавлено)
        this.postCountChanged.next();
        console.log('Пост успешно создан и добавлен в поток postsSubject.');
      }),
      catchError(err => {
        console.error('Ошибка при создании поста:', err);
        return throwError(() => err);
      })
    );
  }

  /**
   * Обновляет URL изображения для конкретного поста и обновляет postsSubject.
   * Используется компонентом после успешной загрузки файла изображения.
   */
  refreshPostImage(postId: number): Observable<UiPost> {
    const currentPosts = this.postsSubject.getValue();
    const postToRefresh = currentPosts.find(p => p.id === postId);

    if (!postToRefresh) {
      // Возвращаем Observable ошибки
      return throwError(() => new Error(`Пост с ID ${postId} не найден для обновления изображения.`));
    }

    // Создаем Observable, который обновляет URL изображения
    const imageRefresh$ = this.imageService.getImageToPost(postId).pipe(
      map(blob => URL.createObjectURL(blob)),
      catchError(err => {
        console.warn(`Не удалось загрузить изображение после refresh для ID ${postId}.`, err);
        return of('assets/placeholder.jpg'); // Возвращаем заглушку в случае сбоя
      })
    );

    return imageRefresh$.pipe(
      map(newImageUrl => {
        // Обновляем только URL изображения в найденном посте
        const updatedPost = { ...postToRefresh, image: newImageUrl } as UiPost;

        // Реактивно обновляем Subject
        const newPosts = currentPosts.map(p => p.id === postId ? updatedPost : p);
        this.postsSubject.next(newPosts);

        console.log(`Изображение для поста ID ${postId} успешно обновлено.`);
        return updatedPost; // Возвращаем обновленный пост
      })
    );
  }


  loadPostsByPage(page: number, size: number, currentUsername?: string): Observable<UiPost[]> {
    return this.http.get<PostPageResponse>(`${this.api}posts?page=${page}&size=${size}`).pipe(
      switchMap(resp => {
        const posts = resp?.comments ?? [];
        return posts.length === 0
          ? of([])
          : forkJoin(posts.map(post => this.processSinglePost(post)));
      })
    );
  }

  /** Append a page of posts into the posts$ stream with dedupe */
  appendPostsPage(page: number, size: number, currentUsername?: string): void {
    this.loadPostsByPage(page, size, currentUsername).subscribe({
      next: uiPosts => this.mergeAndEmit(uiPosts, false),
      error: () => {}
    });
  }

  /** Получить посты для указанного пользователя — если нужна отдельная подписка */
  getPostForUser(username: string): Observable<Post[]> {
    return this.http.get<Post[]>(this.api + 'user/' + username);
  }

  getFavoritePostForUser(): Observable<Post[]> {
    return this.http.get<Post[]>(this.api + 'favorite');
  }
  toggleFavorite(postId: number): Observable<string> {
    return this.http.post(this.api + postId, {}, { responseType: 'text' });
  }

  /**
   * Удалить пост. После успешного удаления обновляет postsSubject.
   */
  deletePost(id: number): Observable<any> {
    // 1. HTTP-запрос на удаление
    return this.http.post(this.api + id + '/delete', null).pipe(
      // 2. Используем tap для немедленного удаления поста из локального списка Subject
      tap(() => {
        const updatedPosts = this.postsSubject.getValue().filter(p => p.id !== id);
        this.postsSubject.next(updatedPosts);
        // 3. Сигнализируем об изменении общего количества постов (Добавлено)
        this.postCountChanged.next();
        console.log(`Пост ID ${id} успешно удален из Subject.`);
      }),
      catchError(err => {
        console.error(`Ошибка при удалении поста ID ${id}:`, err);
        return throwError(() => err);
      })
    );
  }

  /**
   * Поставить лайк от имени пользователя и обновить Subject.
   */
  likePost(id: number, username: string): Observable<any> {
    return this.http.post(this.api + id + '/' + username + '/like', null).pipe(
      tap(() => {
        // Находим пост и инвертируем статус лайка/обновляем список пользователей
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

            return {
              ...post,
              usersLiked: newUsersLiked,
              isLiked: newIsLiked // Обновляем UI флаг
            } as UiPost;
          }
          return post;
        });
        this.postsSubject.next(updatedPosts);
        console.log(`Статус лайка для поста ID ${id} обновлен в Subject.`);
      })
    );
  }

  loadProfilePosts(profileUsername: string) {
    this.getPostForUser(profileUsername).pipe(
      switchMap((posts: Post[]) =>
        posts.length === 0
          ? of([])
          : forkJoin(
            posts.map(post => this.processSinglePost(post))
          )
      )
    ).subscribe({
      next: uiPosts => {
        this.mergeAndEmit(uiPosts, true);
      },
      error: () => {
        // обработка ошибок
      }
    });
  }

  loadProfileFavoritePosts() {
    this.getFavoritePostForUser().pipe(
      switchMap((posts: Post[]) =>
        posts.length === 0
          ? of([])
          : forkJoin(
            posts.map(post => this.processSinglePost(post))
          )
      )
    ).subscribe({
      next: uiPosts => {
        this.mergeAndEmit(uiPosts, true);
      },
      error: () => {
        // обработка ошибок
      }
    });
  }
}
