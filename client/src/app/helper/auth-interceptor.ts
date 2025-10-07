import {Injectable} from '@angular/core';
import {HTTP_INTERCEPTORS, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest} from '@angular/common/http';
import {BehaviorSubject, catchError, filter, Observable, switchMap, take, throwError} from 'rxjs';
import {TokenStorageService} from '../services/token-storage.service';
import {AuthService} from '../services/auth.service';


const TOKEN_HEADER_KEY = 'Authorization';

@Injectable({
  providedIn: 'root'
})
export class AuthInterceptor implements HttpInterceptor {
  private isRefreshing = false;
  private refreshTokenSubject: BehaviorSubject<string | null> = new BehaviorSubject<string | null>(null);

  constructor(
    private tokenService: TokenStorageService,
    private authService: AuthService
  ) {  }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    let authRequest = req;
    const token = this.tokenService.getToken();

    if (token != null) {
      const raw = decodeURIComponent(token);
      const headerValue = raw.startsWith('Bearer ')
        ? raw
        : `Bearer ${raw}`;
      authRequest = req.clone({
        setHeaders: {
          [TOKEN_HEADER_KEY]: headerValue
        }
      });
    }


    return next.handle(authRequest).pipe(
      catchError(error => {
        if (error.status === 401) {
          return this.handle401Error(authRequest, next);
        }
        return throwError(() => error);
      })
    );
  }


  private handle401Error(request: HttpRequest<any>, next: HttpHandler) {
    if (!this.isRefreshing) {
      this.isRefreshing = true;
      this.refreshTokenSubject.next(null);

      const refreshToken = this.tokenService.getRefreshToken();
      if (refreshToken) {
        return this.authService.refreshToken(refreshToken).pipe(
          switchMap((data: any) => {
            this.isRefreshing = false;

            this.tokenService.saveToken(data.accessToken);
            this.tokenService.saveRefreshToken(data.refreshToken);

            this.refreshTokenSubject.next(data.accessToken);

            const token = data.accessToken.startsWith('Bearer ')
              ? data.accessToken.split(' ')[1]
              : data.accessToken;

            return next.handle(
              request.clone({setHeaders: {Authorization: `Bearer ${token}`}})
            );
          }),
          catchError(err => {
            this.isRefreshing = false;
            this.tokenService.clearTokens();
            return throwError(() => err);
          })
        );
      }
    }

    return this.refreshTokenSubject.pipe(
      filter(token => token !== null),
      take(1),
      switchMap(token =>
        next.handle(request.clone({setHeaders: {Authorization: `${token}`}}))
      )
    );
  }


}

export const authInterceptorProviders = [
  {provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true}
];
