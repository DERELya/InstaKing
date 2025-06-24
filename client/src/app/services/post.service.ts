import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Post } from '../models/Post';
import {BehaviorSubject, catchError, forkJoin, map, Observable, of, switchMap} from 'rxjs';
import { environment } from '../../environments/environment';
import {UserService} from './user.service';
import {ImageUploadService} from './image-upload.service';
import {CommentService} from './comment.service';
import {PostComment} from '../models/PostComment';


interface UiPost extends Post {
  isLiked: boolean;
  avatarUrl?: string;
  showAllComments?: boolean;
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
              private commentService: CommentService) {}

  /** Создать пост */
  createPost(post: Post): Observable<any> {
    return this.http.post(this.api + 'create', post);
  }

  /** Загрузить все посты (например, для ленты) и обновить поток */
  loadAllPosts(): void {
    this.http.get<UiPost[]>(this.api + 'all').subscribe(posts => {
      this.postsSubject.next(posts);
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

  /** Получить посты для текущего пользователя — если нужна отдельная подписка */
  getPostForCurrentUser(): Observable<Post[]> {
    return this.http.get<Post[]>(this.api + 'user/posts');
  }

  /** Получить посты для указанного пользователя — если нужна отдельная подписка */
  getPostForUser(username: string): Observable<Post[]> {
    return this.http.get<Post[]>(this.api + 'user/' + username);
  }

  /** Удалить пост */
  deletePost(id: number): Observable<any> {
    return this.http.post(this.api + id + '/delete', null);
  }

  /** Поставить лайк от имени пользователя */
  likePost(id: number, username: string): Observable<any> {
    return this.http.post(this.api + id + '/' + username + '/like', null);
  }

  /** Очистить кэшированные посты (например, при логауте) */
  clearPosts(): void {
    this.postsSubject.next([]);
  }

  loadProfilePosts(profileUsername: string) {
    this.userService.getUserByUsername(profileUsername).pipe(
      switchMap(user => {
        const meUsername = user.username;
        return this.getPostForUser(profileUsername).pipe(
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
                    avatar: this.imageService.getImageToUser(post.username!).pipe(
                      map(blob => URL.createObjectURL(blob)),
                      catchError(() => of('assets/blank-avatar.png'))
                    ),
                    comments: this.commentService.getCommentsToPost(post.id!).pipe(
                      catchError(() => of([]))
                    )
                  }).pipe(
                    map(({ postImg, avatar, comments }) => ({
                      ...post,
                      image: postImg,
                      avatarUrl: avatar,
                      comments: comments,
                      usersLiked: post.usersLiked ?? [],
                      isLiked: (post.usersLiked ?? []).includes(meUsername)
                    } as UiPost))
                  )
                )
              )
          )
        );
      })
    ).subscribe({
      next: uiPosts => {
        this.postsSubject.next(uiPosts);
      },
      error: () => {
        // обработка ошибок
      }
    });
  }
  getCommentsToPost(posts: Post[]): void {
    posts.forEach(p => {
      if (p.id !== undefined) {
        this.commentService.getCommentsToPost(p.id)
          .subscribe(data => {
            p.comments = data;
          })
      }
    });
  }

}
