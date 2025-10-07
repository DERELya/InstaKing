import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Post} from '../models/Post';
import {BehaviorSubject, catchError, forkJoin, map, Observable, of, switchMap} from 'rxjs';
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

@Injectable({
  providedIn: 'root'
})
export class PostService {
  private readonly api = `${environment.apiHost}post/`;
  private postsSubject = new BehaviorSubject<UiPost[]>([]);
  public posts$ = this.postsSubject.asObservable();

  constructor(private http: HttpClient,
              private userService: UserService,
              private imageService: ImageUploadService,
              private commentService: CommentService,
              private tokenService: TokenStorageService) {
  }

  private mergeAndEmit(newPosts: UiPost[], replace: boolean = false): void {
    if (replace) {
      // Replace entire list but ensure dedupe by id just in case
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

  /** Создать пост */
  createPost(post: Post): Observable<any> {
    return this.http.post(this.api + 'create', post);
  }

  /** Загрузить все посты (например, для ленты) и обновить поток */
  loadAllPosts(): void {
    const meUsername = this.tokenService.getUsernameFromToken?.() ?? undefined;
    this.http.get<Post[]>(this.api + 'all').pipe(
      switchMap(posts =>
        posts.length === 0
          ? of([])
          : forkJoin(
            posts.map(post =>
              forkJoin({
                postImg: this.imageService.getImageToPost(post.id!).pipe(
                  map(blob => URL.createObjectURL(blob)),
                  catchError(() => of('assets/placeholder.jpg'))
                ),
                avatar: this.imageService.getImageToUser(post.username!).pipe(
                  map(blob => URL.createObjectURL(blob)),
                  catchError(() => of('assets/blank-avatar.png'))
                ),
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
              )
            )
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


  /** Загрузить посты текущего пользователя и обновить поток */
  loadCurrentUserPosts(): void {
    this.http.get<UiPost[]>(this.api + 'user/posts').subscribe(posts => {
      this.postsSubject.next(posts);
    });
  }

  /** Загрузить посты конкретного пользователя и обновить поток */
  loadPostsForUser(username: string): void {
    this.http.get<UiPost[]>(this.api + 'user/' + username).subscribe(posts => {
      this.postsSubject.next(posts);
    });
  }

  loadPostsByPage(page: number, size: number, currentUsername?: string): Observable<UiPost[]> {
    return this.http.get<Post[]>(`${this.api}posts?page=${page}&size=${size}`).pipe(
      switchMap(posts => posts.length === 0
        ? of([])
        : forkJoin(
          posts.map(post =>
            forkJoin({
              postImg: this.imageService.getImageToPost(post.id!).pipe(
                map(blob => URL.createObjectURL(blob)),
                catchError(() => of('assets/placeholder.jpg'))
              ),
              avatar: this.imageService.getImageToUser(post.username!).pipe(
                map(blob => URL.createObjectURL(blob)),
                catchError(() => of('assets/blank-avatar.png'))
              ),
              commentCount: this.commentService.getCountCommentsToPost(post.id!).pipe(
                catchError(() => of(0))
              )
            }).pipe(
              map(({postImg, avatar, commentCount}) => ({
                ...post,
                image: postImg,
                avatarUrl: avatar,
                usersLiked: post.usersLiked ?? [],
                isLiked: currentUsername ? (post.usersLiked ?? []).includes(currentUsername) : false,
                commentCount
              } as UiPost))
            )
          )
        )
      )
    );
  }

  /** Append a page of posts into the posts$ stream with dedupe */
  appendPostsPage(page: number, size: number, currentUsername?: string): void {
    this.loadPostsByPage(page, size, currentUsername).subscribe({
      next: uiPosts => this.mergeAndEmit(uiPosts, false),
      error: () => {}
    });
  }


  /** Получить посты для текущего пользователя — если нужна отдельная подписка */
  getPostForCurrentUser(): Observable<Post[]> {
    return this.http.get<Post[]>(this.api + 'user/posts');
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
  /** Удалить пост */
  deletePost(id: number): Observable<any> {

    return this.http.post(this.api + id + '/delete', null);
  }

  /** Поставить лайк от имени пользователя */
  likePost(id: number, username: string): Observable<any> {
    return this.http.post(this.api + id + '/' + username + '/like', null);
  }

  loadProfilePosts(profileUsername: string) {
    const meUsername = this.tokenService.getUsernameFromToken?.() ?? undefined;
    this.getPostForUser(profileUsername).pipe(
      switchMap((posts: Post[]) =>
        posts.length === 0
          ? of([])
          : forkJoin(
            posts.map(post =>
              forkJoin({
                postImg: this.imageService.getImageToPost(post.id!).pipe(
                  map(blob => URL.createObjectURL(blob)),
                  catchError(() => of('assets/placeholder.jpg'))
                ),
                commentCount: this.commentService.getCountCommentsToPost(post.id!).pipe(
                  catchError(() => of(0))
                )
              }).pipe(
                map(({postImg, commentCount}) => ({
                  ...post,
                  image: postImg,
                  usersLiked: post.usersLiked ?? [],
                  isLiked: meUsername ? (post.usersLiked ?? []).includes(meUsername) : false,
                  commentCount
                } as UiPost))
              )
            )
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
    const meUsername = this.tokenService.getUsernameFromToken?.() ?? undefined;
    this.getFavoritePostForUser().pipe(
      switchMap((posts: Post[]) =>
        posts.length === 0
          ? of([])
          : forkJoin(
            posts.map(post =>
              forkJoin({
                postImg: this.imageService.getImageToPost(post.id!).pipe(
                  map(blob => URL.createObjectURL(blob)),
                  catchError(() => of('assets/placeholder.jpg'))
                ),
                commentCount: this.commentService.getCountCommentsToPost(post.id!).pipe(
                  catchError(() => of(0))
                )
              }).pipe(
                map(({postImg, commentCount}) => ({
                  ...post,
                  image: postImg,
                  usersLiked: post.usersLiked ?? [],
                  isLiked: meUsername ? (post.usersLiked ?? []).includes(meUsername) : false,
                  commentCount
                } as UiPost))
              )
            )
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
