import { inject, Injectable } from '@angular/core';
import { Message } from '@stomp/stompjs';
import { ChatStateService } from './chat-state.service';
import { MessageDTO } from '../models/MessageDTO';
import { ConversationDTO } from '../models/ConversationDTO';
import { TypingDTO } from '../models/TypingDTO';
import { ReadReceiptDTO } from '../models/ReadReceiptDTO';
import {SocketClientService} from './SocketClient.service';
import {DeleteMessageDTO} from '../models/DeleteMEssageDTO';
import {Observable} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private socketClient = inject(SocketClientService);
  private chatState = inject(ChatStateService);

  constructor() {
    // Инициализируем подписки сразу при создании сервиса
    this.initSubscriptions();
  }

  private initSubscriptions(): void {
    // 1. Сообщения
    this.socketClient.subscribe('/user/queue/messages', (msg: Message) => {
      this.safeParse(msg, (payload: MessageDTO) => this.chatState.addMessage(payload));
    });

    // 2. Новые чаты
    this.socketClient.subscribe('/user/queue/new-chats', (msg: Message) => {
      this.safeParse(msg, (payload: ConversationDTO) => this.chatState.handleNewConversationFromSocket(payload));
    });

    // 3. Тайпинг
    this.socketClient.subscribe('/user/queue/typing', (msg: Message) => {
      this.safeParse(msg, (payload: TypingDTO) => this.chatState.handleTyping(payload));
    });

    // 4. Прочтение
    this.socketClient.subscribe('/user/queue/read-receipt', (msg: Message) => {
      this.safeParse(msg, (payload: ReadReceiptDTO) => this.chatState.handleReadReceipt(payload));
    });

    this.socketClient.subscribe('/user/queue/delete-message', (msg: Message) => {
      this.safeParse(msg, (payload: DeleteMessageDTO) => this.chatState.handleDeleteMessage(payload));
    });
  }

  // Методы отправки
  public sendMessage(dto: MessageDTO): void {
    this.socketClient.send('/app/chat/sendMessage', dto);
  }

  public sendTyping(dto: TypingDTO): void {
    this.socketClient.send('/app/chat/typing', dto);
  }

  private safeParse<T>(message: Message, action: (data: T) => void) {
    try {
      if (message.body) action(JSON.parse(message.body));
    } catch (e) { console.error('Parse error', e); }
  }

}
