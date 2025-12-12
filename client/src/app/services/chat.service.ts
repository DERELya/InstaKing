import {inject, Injectable} from '@angular/core';
import {Client, Message, ActivationState, StompHeaders} from '@stomp/stompjs';
import { BehaviorSubject, Observable } from 'rxjs';
import {MessageDTO} from '../models/MessageDTO';
import {TypingDTO} from '../models/TypingDTO';
import {TokenStorageService} from './token-storage.service';
import SockJS from 'sockjs-client';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private stompClient!: Client;
  static readonly SOCKET_URL = 'http://localhost:8080/ws';

  private newMessagesSubject = new BehaviorSubject<MessageDTO | null>(null);
  public newMessages$: Observable<MessageDTO | null> = this.newMessagesSubject.asObservable();

  private typingNotificationSubject = new BehaviorSubject<TypingDTO | null>(null);
  public typingNotifications$: Observable<TypingDTO | null> = this.typingNotificationSubject.asObservable();

  private isConnectedSubject = new BehaviorSubject<boolean>(false);
  public isConnected$: Observable<boolean> = this.isConnectedSubject.asObservable();

  private tokenService = inject(TokenStorageService);

  constructor() {
  }
  private getAuthHeaders(): StompHeaders {
    const fullJwtToken = this.tokenService.getToken();

    if (fullJwtToken) {
      // Убедимся, что токен чистый, и добавим его в заголовок
      const trimmedToken = fullJwtToken.trim();

        return { 'Authorization': trimmedToken } as StompHeaders;
    }
    return {} as StompHeaders;
  }

  public connect(): void {
    if (this.stompClient && this.stompClient.state === ActivationState.ACTIVE) {
      console.log('WebSocket уже активен.');
      return;
    }

    const headers = this.getAuthHeaders(); // Получаем заголовки

    // Проверка, что токен не null перед созданием клиента
    if (Object.keys(headers).length === 0) {
      console.error("JWT токен отсутствует. Невозможно подключиться к WebSocket.");
      return;
    }

    this.stompClient = new Client({
      webSocketFactory: () => {
        // ✅ URL без токена
        return new SockJS(ChatService.SOCKET_URL);
      },

      // ✅ Передаем заголовки при подключении
      connectHeaders: headers,


      onConnect: (frame) => {
        console.log('WebSocket Connected: ' + frame);
        this.isConnectedSubject.next(true);
        this.subscribeToQueues();
      },

      onDisconnect: () => {
        this.isConnectedSubject.next(false);
        console.warn('WebSocket Disconnected');
      },

      onStompError: (frame) => {
        console.error('Broker reported error: ' + frame.headers['message']);
        console.error('Additional details: ' + frame.body);
      }
    });

    this.stompClient.debug = (str) => {
      if (str.includes('STOMP: ERROR')) console.error(str);
    };

    this.stompClient.activate();
  }

  public disconnect(): void {
    if (this.stompClient) {
      this.stompClient.deactivate();
    }
  }

  // --- 2. Подписки ---
  private subscribeToQueues(): void {
    const username = this.getCurrentUsername();

    if (!username) {
      console.error("Username is required for subscription. Disconnecting...");
      this.disconnect();
      return;
    }

    if (!this.stompClient.active) {
      console.warn("STOMP client не активен, не могу подписаться на очереди.");
      return;
    }


    // Подписка на личные сообщения
    this.stompClient.subscribe(
      '/user/queue/messages',
      (message: Message) => {
        const receivedMessage: MessageDTO = JSON.parse(message.body);
        this.newMessagesSubject.next(receivedMessage);
      }
    );

    // Подписка на уведомления о печати
  }

  // --- 3. Отправка Сообщений ---
  public sendMessage(messageDto: MessageDTO): void {
    if (this.stompClient?.active) {
      this.stompClient.publish({
        destination: '/app/chat/sendMessage',
        body: JSON.stringify(messageDto)
      });
    } else {
      console.warn('WebSocket is not active. Message failed to send.');
    }
  }

  public sendTypingNotification(typingDto: TypingDTO): void {
    if (this.stompClient?.active) {
      this.stompClient.publish({
        destination: '/app/chat/typing',
        body: JSON.stringify(typingDto)
      });
    }
  }

  private getCurrentUsername(): string | null {
    return this.tokenService.getUsernameFromToken();
  }
}
