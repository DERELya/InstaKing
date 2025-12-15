import {inject, Injectable} from '@angular/core';
import {MatSnackBar} from '@angular/material/snack-bar';
import {BehaviorSubject, tap} from 'rxjs';
import {HttpClient} from '@angular/common/http';
import {NotificationDTO} from '../models/NotificationDTO';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private apiUrl = 'http://localhost:8080/api/notifications';

  private notificationsSubject = new BehaviorSubject<NotificationDTO[]>([]);
  public notifications$ = this.notificationsSubject.asObservable();

  // Счетчик непрочитанных
  private unreadCountSubject = new BehaviorSubject<number>(0);
  public unreadCount$ = this.unreadCountSubject.asObservable();

  private http = inject(HttpClient);
  private snackbar = inject(MatSnackBar);

  constructor() {
    this.fetchNotifications().subscribe();
  }

  public showSnackBar(message: string): void {
    this.snackbar.open(message, '', {
      duration: 4000
    });
  }

  // Загрузка с бэка
  fetchNotifications() {
    return this.http.get<NotificationDTO[]>(this.apiUrl).pipe(
      tap(list => {
        this.notificationsSubject.next(list);
        this.updateUnreadCount(list);
      })
    );
  }

  handleSocketNotification(notification: NotificationDTO) {
    const current = this.notificationsSubject.value;
    // Добавляем новое уведомление в начало списка
    this.notificationsSubject.next([notification, ...current]);

    // Увеличиваем счетчик
    this.unreadCountSubject.next(this.unreadCountSubject.value + 1);
  }

  markAsRead(id: number) {
    // Оптимистичное обновление UI
    const list = this.notificationsSubject.value.map(n =>
      n.id === id ? {...n, isRead: true} : n
    );
    this.notificationsSubject.next(list);
    this.updateUnreadCount(list);

    // Запрос на бэк
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

    // 2. Шлем запрос на бэк (нужен endpoint на бэке)
    this.http.post(`${this.apiUrl}/read-all`, {}).subscribe({
      error: err => console.error('Ошибка при чтении всех уведомлений', err)
    });
  }
}
