import {MessageStatus} from './MessageStatus';

export interface MessageDTO {
  id?: number; // Если ID генерируется на бэке
  content: string;
  senderId: number;
  conversationId: number;
  createdAt: Date;
  status: MessageStatus;
}

