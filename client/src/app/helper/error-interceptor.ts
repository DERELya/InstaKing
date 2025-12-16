import { inject, Injectable, Injector, PLATFORM_ID } from '@angular/core';
import { HTTP_INTERCEPTORS, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpErrorResponse } from '@angular/common/http';
import { TokenStorageService } from '../services/token-storage.service';
import { NotificationService } from '../services/notification.service';
import { catchError, Observable, throwError } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class ErrorInterceptor implements HttpInterceptor {

  private injector = inject(Injector);
  private tokenService = inject(TokenStorageService);
  private platformId = inject(PLATFORM_ID);

  constructor() {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(catchError((err: HttpErrorResponse) => {

      // 1. Логика выхода при 401
      if (err.status === 401) {
        this.tokenService.logOut();
        if (isPlatformBrowser(this.platformId)) {
          window.location.reload();
        }
      }

      // 2. Формирование сообщения об ошибке (Максимально подробное)
      let errorMessage = 'Неизвестная ошибка';

      // Проверка для браузера (Client-side error)
      if (isPlatformBrowser(this.platformId) && err.error instanceof ErrorEvent) {
        errorMessage = `Ошибка клиента: ${err.error.message}`;
      } else {
        // Ошибки сервера (или сети в Node.js)

        // Вариант А: Сервер прислал JSON с полем message { "message": "..." }
        if (err.error && typeof err.error === 'object' && err.error.message) {
          errorMessage = err.error.message;
        }
        // Вариант Б: Сервер прислал просто текст (String) вместо JSON
        else if (typeof err.error === 'string') {
          errorMessage = err.error;
        }
        // Вариант В: Есть статус-текст (например "Not Found")
        else if (err.statusText && err.statusText !== 'OK' && err.statusText !== 'Unknown Error') {
          errorMessage = err.statusText;
        }
        // Вариант Г: Ошибка соединения (status 0)
        else if (err.status === 0) {
          errorMessage = 'Сервер недоступен (Connection Refused)';
        }
        // Вариант Д: Стандартное сообщение JS ошибки (часто бывает в SSR)
        else if (err.message) {
          errorMessage = err.message;
        }
        // Фолбэк
        else {
          errorMessage = `Ошибка сервера: ${err.status}`;
        }
      }

      // 3. Показываем уведомление (Только в браузере)
      if (isPlatformBrowser(this.platformId)) {
        try {
          const notificationService = this.injector.get(NotificationService);
          notificationService.showSnackBar(errorMessage);
        } catch (e) {
          console.error('Не удалось показать уведомление:', e);
        }
      } else {
        // Логируем на сервере подробности, чтобы ты мог понять причину
        console.error('SSR API Error URL:', req.url);
        console.error('SSR API Error Details:', JSON.stringify(err, null, 2));
      }

      // Возвращаем ошибку дальше
      return throwError(() => new Error(errorMessage));
    }));
  }
}

export const authErrorInterceptorProvider = [
  { provide: HTTP_INTERCEPTORS, useClass: ErrorInterceptor, multi: true }
];
