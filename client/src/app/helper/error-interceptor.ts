import { inject, Injectable, Injector, PLATFORM_ID } from '@angular/core';
import { HTTP_INTERCEPTORS, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { TokenStorageService } from '../services/token-storage.service';
import { NotificationService } from '../services/notification.service';
import { catchError, Observable, throwError } from 'rxjs';
import { isPlatformBrowser } from '@angular/common'; // <--- ВАЖНЫЙ ИМПОРТ

@Injectable({
  providedIn: 'root'
})
export class ErrorInterceptor implements HttpInterceptor {

  private injector = inject(Injector);
  private tokenService = inject(TokenStorageService);
  private platformId = inject(PLATFORM_ID); // <--- Инжектим ID платформы

  constructor() {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(catchError(err => {

      if (err.status === 401) {
        this.tokenService.logOut();

        // ПРОВЕРКА: Выполняем reload ТОЛЬКО если мы в браузере
        if (isPlatformBrowser(this.platformId)) {
          window.location.reload();
        }
      }

      const error = err.error.message || err.statusText;

      // Ленивая загрузка NotificationService (чтобы избежать Circular Dependency)
      const notificationService = this.injector.get(NotificationService);
      notificationService.showSnackBar(error);

      return throwError(() => error);
    }));
  }
}

export const authErrorInterceptorProvider = [
  { provide: HTTP_INTERCEPTORS, useClass: ErrorInterceptor, multi: true }
];
