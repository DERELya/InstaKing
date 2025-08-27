import {Injectable} from '@angular/core';

const ACCESS_TOKEN='access-token'
const USER_KEY = 'auth-user';
const REFRESH_TOKEN='refresh-token'

@Injectable({
  providedIn: 'root'
})
export class TokenStorageService {
  constructor() {
  }

  public saveToken(token: string): void {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(ACCESS_TOKEN, encodeURIComponent(token));
    }
  }

  public getToken(): string | null {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem(ACCESS_TOKEN);
    }
    return null;
  }

  public saveUser(user: any): void {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(USER_KEY, JSON.stringify(user));
    }
  }
  public saveRefreshToken(token: string):void{
    if (typeof window!== 'undefined'){
      localStorage.setItem(REFRESH_TOKEN,encodeURIComponent(token));
    }
  }
  public getRefreshToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(REFRESH_TOKEN);
    }
    return null;
  }
  public clearTokens(): void {
    sessionStorage.removeItem('access-token');
    sessionStorage.removeItem('refresh-token');
  }

  public getUser(): any {
    if (typeof window !== 'undefined') {
      const data = sessionStorage.getItem(USER_KEY);
      return data ? JSON.parse(data) : null;
    }
    return null;
  }

  public logOut(): void {
    if (typeof window !== 'undefined') {
      sessionStorage.clear();
      window.location.reload();
    }
  }

  public getUsernameFromToken(): string | null {
    const token = this.getToken();
    if (!token) return null;

    try {
      const payload = JSON.parse(atob(decodeURIComponent(token).split('.')[1]));
      // Попробуй поля в таком порядке — зависит от того, что кладёт твой backend:
      return payload.username || payload.sub || null;
    } catch (e) {
      return null;
    }
  }
}

