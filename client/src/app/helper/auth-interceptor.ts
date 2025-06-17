import { Injectable } from '@angular/core';
import {HTTP_INTERCEPTORS, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest} from '@angular/common/http';
import {Observable} from 'rxjs';
import {TokenStorageService} from '../services/token-storage.service';


const TOKEN_HEADER_KEY='Authorization';
@Injectable({
  providedIn: 'root'
})
export class AuthInterceptor implements HttpInterceptor {

  constructor(private tokenService: TokenStorageService) {
  }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        let authRequest= req;
        const token =this.tokenService.getToken();

    if (token != null) {
      authRequest = req.clone({
        setHeaders: {
          [TOKEN_HEADER_KEY]: ' ' + decodeURIComponent(token)
        }
      });
    }


    return next.handle(authRequest);
    }


}

export const authInterceptorProviders= [
  {provide: HTTP_INTERCEPTORS,useClass:AuthInterceptor,multi:true}
];
