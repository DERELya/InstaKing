
import {User} from './User';

export interface ConversationDTO {
  id: number;
  participants: User[];
  previewMessage: string;
  lastMessageAt: Date;
  unreadCount: number;
  title: string;
  avatarUrl?: string;
}
