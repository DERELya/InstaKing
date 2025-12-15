import {Component, inject} from '@angular/core';
import {CommonModule} from '@angular/common';
import {MatMenuModule} from '@angular/material/menu';
import {MatIconModule} from '@angular/material/icon';
import {MatButtonModule} from '@angular/material/button';
import {MatBadgeModule} from '@angular/material/badge';
import {NotificationService} from '../../services/notification.service';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, MatMenuModule, MatIconModule, MatButtonModule, MatBadgeModule],
  templateUrl: './notification.component.html',
  styleUrls: ['./notification.component.css']
})
export class NotificationsComponent {
  private notificationService = inject(NotificationService);

  notifications$ = this.notificationService.notifications$;
  unreadCount$ = this.notificationService.unreadCount$;

  onNotificationClick(notification: any) {
    if (!notification.isRead) {
      this.notificationService.markAsRead(notification.id);
    }
    // Логика перехода (например, router.navigate(['/profile', notification.senderUsername]))
  }
}
