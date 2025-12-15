import {NotificationType} from './NotificationType';

export interface NotificationDTO {
  id: number;
  content: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: string;
  senderId: number;
  senderUsername: string;
  senderAvatarUrl?: string;
}
