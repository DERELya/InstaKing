import {inject, Injectable} from '@angular/core';
import { Client, StompHeaders,Message } from '@stomp/stompjs';
import { BehaviorSubject, Observable } from 'rxjs';
import {MessageDTO} from '../models/MessageDTO';
import {TypingDTO} from '../models/TypingDTO';
import {TokenStorageService} from './token-storage.service';
import SockJS from 'sockjs-client';
@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private stompClient: Client;
  static readonly SOCKET_URL = 'http://localhost:8080/ws';
  private newMessagesSubject = new BehaviorSubject<MessageDTO | null>(null);
  public newMessages$: Observable<MessageDTO | null> = this.newMessagesSubject.asObservable();

  private typingNotificationSubject = new BehaviorSubject<TypingDTO | null>(null);
  public typingNotifications$: Observable<TypingDTO | null> = this.typingNotificationSubject.asObservable();

  // Флаг состояния подключения
  private isConnectedSubject = new BehaviorSubject<boolean>(false);
  public isConnected$: Observable<boolean> = this.isConnectedSubject.asObservable();
  private tokenService = inject(TokenStorageService);

  constructor() {
    this.stompClient = new Client({
      webSocketFactory: () => {
        return new SockJS(ChatService.SOCKET_URL);
      },

      onConnect: (frame) => {
        console.log('WebSocket Connected: ' + frame);
        this.isConnectedSubject.next(true);

        // Важный шаг: после onConnect мы подписываемся на нужные очереди/топики
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
  }

  // --- 1. Управление Подключением ---
  private getAuthHeaders(): StompHeaders {
    // 1. Получаем токен из хранилища (localStorage, sessionStorage и т.д.)
    const jwtToken = localStorage.getItem('accessToken');

    if (jwtToken) {
      return {
        'Authorization': `Bearer ${jwtToken}`
      } as StompHeaders;
    }

    return {} as StompHeaders;
  }
  public connect(): void {
    // В production не забудьте добавить логику, чтобы не подключаться, если уже подключены
    this.stompClient.activate();
  }

  public disconnect(): void {
    this.stompClient.deactivate();
  }
  private subscribeToQueues(): void {
    const username = this.getCurrentUsername();

    if (!username) {
      console.error("Username is required for subscription.");
      return;
    }

    this.stompClient.subscribe(
      '/user/queue/messages',
      (message: Message) => {
        const receivedMessage: MessageDTO = JSON.parse(message.body);
        this.newMessagesSubject.next(receivedMessage);
      },
      {} as StompHeaders
    );


    this.stompClient.subscribe(
      '/user/queue/typing',
      (notification: Message) => {
        const typingNotification: TypingDTO = JSON.parse(notification.body);
        this.typingNotificationSubject.next(typingNotification);
      }
    );
  }

  public sendMessage(messageDto: MessageDTO): void {
    if (this.stompClient.active) {
      this.stompClient.publish({
        destination: '/app/chat/sendMessage',
        body: JSON.stringify(messageDto)
      });
    } else {
      console.warn('WebSocket is not active. Message failed to send.');
    }
  }

  public sendTypingNotification(typingDto: TypingDTO): void {
    if (this.stompClient.active) {
      this.stompClient.publish({
        destination: '/app/chat/typing', // Эндпоинт вашего @MessageMapping
        body: JSON.stringify(typingDto)
      });
    }
  }

  private getCurrentUsername(): string | null {
    return this.tokenService.getUsernameFromToken();
  }
}
