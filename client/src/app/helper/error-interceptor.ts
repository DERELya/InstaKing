import { Injectable } from '@angular/core';
import {HTTP_INTERCEPTORS, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest} from '@angular/common/http';
import {TokenStorageService} from '../services/token-storage.service';
import {NotificationService} from '../services/notification.service';
import {catchError, Observable, throwError} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ErrorInterceptor implements HttpInterceptor {

  constructor(private tokenService: TokenStorageService,
              private notificationService: NotificationService) {
  }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(catchError(err => {
      if (err.status === 401){
        this.tokenService.logOut();
        window.location.reload();
      }

      const error=err.error.message || err.statusText;
      this.notificationService.showSnackBar(error);
      return throwError(error);
    }))
    }
}

export const authErrorInterceptorProvider=[
  {provide: HTTP_INTERCEPTORS,useClass: ErrorInterceptor,multi:true}
]
