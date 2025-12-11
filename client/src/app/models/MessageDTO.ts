import {MessageStatus} from './MessageStatus';

export interface MessageDTO {
  id?: number;
  content: string;
  senderId: number;
  createdAt: Date;
  conversationId: number;
  status: MessageStatus;
}

