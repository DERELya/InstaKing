import {inject, Injectable, PLATFORM_ID} from '@angular/core';
import {MatSnackBar} from '@angular/material/snack-bar';
import {BehaviorSubject, tap} from 'rxjs';
import {HttpClient} from '@angular/common/http';
import {NotificationDTO} from '../models/NotificationDTO';
import {isPlatformBrowser} from '@angular/common';
import {SocketClientService} from './SocketClient.service';
import {Message} from '@stomp/stompjs';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private apiUrl = 'http://localhost:8080/api/notifications';
  static readonly SOCKET_URL = 'http://localhost:8080/ws';
  private notificationsSubject = new BehaviorSubject<NotificationDTO[]>([]);
  public notifications$ = this.notificationsSubject.asObservable();

  private unreadCountSubject = new BehaviorSubject<number>(0);
  public unreadCount$ = this.unreadCountSubject.asObservable();

  private http = inject(HttpClient);
  private snackbar = inject(MatSnackBar);
  private platformId = inject(PLATFORM_ID);

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.fetchNotifications().subscribe();
    };
    this.initSubscriptions();
  }

  private socketClient = inject(SocketClientService);

  private initSubscriptions(): void {
    // Подписываемся только на уведомления
    this.socketClient.subscribe('/user/queue/notifications', (msg: Message) => {
      if (msg.body) {
        try {
          const payload: NotificationDTO = JSON.parse(msg.body);
          this.handleSocketNotification(payload);
        } catch (e) {
          console.error('Notification parse error', e);
        }
      }
    });
  }

  public showSnackBar(message: string): void {
    this.snackbar.open(message, '', {
      duration: 4000
    });
  }

  fetchNotifications() {
    if (!isPlatformBrowser(this.platformId)) {
      return new BehaviorSubject([]).asObservable(); // Возвращаем пустой поток заглушку
    }
    return this.http.get<NotificationDTO[]>(this.apiUrl).pipe(
      tap(list => {
        this.notificationsSubject.next(list);
        this.updateUnreadCount(list);
      })
    );
  }

  handleSocketNotification(notification: NotificationDTO) {
    const current = this.notificationsSubject.value;
    this.notificationsSubject.next([notification, ...current]);

    this.unreadCountSubject.next(this.unreadCountSubject.value + 1);
  }

  markAsRead(id: number) {
    const list = this.notificationsSubject.value.map(n =>
      n.id === id ? {...n, isRead: true} : n
    );
    this.notificationsSubject.next(list);
    this.updateUnreadCount(list);

    this.http.post(`${this.apiUrl}/${id}/read`, {}).subscribe();
  }


  private updateUnreadCount(list: NotificationDTO[]) {
    const count = list.filter(n => !n.isRead).length;
    this.unreadCountSubject.next(count);
  }

  markAllAsRead() {
    // 1. Оптимистично обновляем UI (все становятся прочитанными)
    const updated = this.notificationsSubject.value.map(n => ({...n, isRead: true}));
    this.notificationsSubject.next(updated);
    this.unreadCountSubject.next(0);

    this.http.post(`${this.apiUrl}/read-all`, {}).subscribe({
      error: err => console.error('Ошибка при чтении всех уведомлений', err)
    });
  }
}
