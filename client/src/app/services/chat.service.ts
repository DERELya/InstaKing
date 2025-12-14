import { inject, Injectable } from '@angular/core';
import { Client, Message, StompHeaders } from '@stomp/stompjs';
import { BehaviorSubject } from 'rxjs';
import { MessageDTO } from '../models/MessageDTO';
import { TokenStorageService } from './token-storage.service';
import { ChatStateService } from './chat-state.service';
import SockJS from 'sockjs-client';
import { ConversationDTO } from '../models/ConversationDTO';
import { TypingDTO } from '../models/TypingDTO';
import { ReadReceiptDTO } from '../models/ReadReceiptDTO';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private stompClient!: Client;
  // Убедись, что URL совпадает с бэкендом
  static readonly SOCKET_URL = 'http://localhost:8080/ws';

  private isConnectedSubject = new BehaviorSubject<boolean>(false);
  public isConnected$ = this.isConnectedSubject.asObservable();

  private tokenService = inject(TokenStorageService);
  private chatStateService = inject(ChatStateService);

  private getAuthHeaders(): StompHeaders {
    const token = this.tokenService.getToken() || '';
    return token ? { 'Authorization': token } : {};
  }

  public connect(): void {
    if (this.stompClient && this.stompClient.active) {
      return;
    }

    const headers = this.getAuthHeaders();

    this.stompClient = new Client({
      webSocketFactory: () => new SockJS(ChatService.SOCKET_URL),
      connectHeaders: headers,
      reconnectDelay: 5000, // Авто-реконнект через 5 сек
      onConnect: (frame) => {
        console.log('STOMP Connected');
        this.isConnectedSubject.next(true);
        this.subscribeToQueues();
      },
      onDisconnect: () => {
        this.isConnectedSubject.next(false);
        console.warn('STOMP Disconnected');
      },
      onStompError: (frame) => {
        console.error('Broker Error: ' + frame.headers['message']);
      }
    });

    this.stompClient.activate();
  }

  private subscribeToQueues(): void {
    if (!this.stompClient.active) return;

    // 1. Личные сообщения
    this.stompClient.subscribe('/user/queue/messages', (message: Message) => {
      this.safeParseAndHandle(message, (payload: MessageDTO) => {
        this.chatStateService.addMessage(payload);
      });
    });

    // 2. Новые чаты (когда кто-то создал с нами диалог)
    this.stompClient.subscribe('/user/queue/new-chats', (message: Message) => {
      this.safeParseAndHandle(message, (payload: ConversationDTO) => {
        this.chatStateService.handleNewConversationFromSocket(payload);
      });
    });

    // 3. Статус "Печатает..."
    this.stompClient.subscribe('/user/queue/typing', (message: Message) => {
      this.safeParseAndHandle(message, (payload: TypingDTO) => {
        this.chatStateService.handleTyping(payload);
      });
    });

    // 4. Уведомление о прочтении (галочки)
    this.stompClient.subscribe('/user/queue/read-receipt', (message: Message) => {
      this.safeParseAndHandle(message, (payload: ReadReceiptDTO) => {
        this.chatStateService.handleReadReceipt(payload);
      });
    });
  }

  // Вспомогательный метод для безопасного парсинга JSON
  private safeParseAndHandle<T>(message: Message, handler: (payload: T) => void): void {
    try {
      if (!message.body) return;
      const payload: T = JSON.parse(message.body);
      handler(payload);
    } catch (e) {
      console.error('Error parsing WebSocket message:', e, message.body);
    }
  }

  // --- Отправка данных ---

  public sendMessage(messageDto: MessageDTO): void {
    this.sendToSocket('/app/chat/sendMessage', messageDto);
  }

  public sendTyping(typingDto: TypingDTO): void {
    this.sendToSocket('/app/chat/typing', typingDto);
  }

  private sendToSocket(destination: string, body: any): void {
    if (this.stompClient?.active) {
      this.stompClient.publish({
        destination: destination,
        body: JSON.stringify(body)
      });
    } else {
      console.warn('Socket not connected. Message lost.');
    }
  }

  public disconnect(): void {
    if (this.stompClient) {
      this.stompClient.deactivate();
    }
  }
}
