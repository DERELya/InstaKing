import {Injectable} from '@angular/core';

const TOKEN_KEY = 'auth-token';
const USER_KEY = 'auth-user';

@Injectable({
  providedIn: 'root'
})
export class TokenStorageService {
  constructor() {
  }

  public saveToken(token: string): void {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('auth-token', encodeURIComponent(token));
      console.log(token);
    }
  }

  public getToken(): string | null {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('auth-token');
    }
    return null;
  }

  public saveUser(user: any): void {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('auth-user', JSON.stringify(user));
    }
  }

  public getUser(): any {
    if (typeof window !== 'undefined') {
      const data = sessionStorage.getItem('auth-user');
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
      console.log(payload);
      // Попробуй поля в таком порядке — зависит от того, что кладёт твой backend:
      return payload.username || payload.sub || null;
    } catch (e) {
      return null;
    }
  }
}

