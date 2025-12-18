import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { Client, Message, StompHeaders } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { BehaviorSubject, filter, first } from 'rxjs';
import { TokenStorageService } from './token-storage.service';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class SocketClientService {
  private stompClient!: Client;
  private readonly SOCKET_URL = 'http://localhost:8080/ws';

  // Поток состояния подключения
  private isConnectedSubject = new BehaviorSubject<boolean>(false);
  public isConnected$ = this.isConnectedSubject.asObservable();

  private tokenService = inject(TokenStorageService);
  private platformId = inject(PLATFORM_ID);

  constructor() {}

  public connect(): void {
    // В SSR (на сервере) не подключаемся
    if (!isPlatformBrowser(this.platformId)) return;

    if (this.stompClient && this.stompClient.active) return;

    const token = this.tokenService.getToken();
    const headers: StompHeaders = token ? { 'Authorization': token } : {};

    this.stompClient = new Client({
      webSocketFactory: () => new SockJS(this.SOCKET_URL),
      connectHeaders: headers,
      reconnectDelay: 5000,
      onConnect: () => {
        this.isConnectedSubject.next(true);
      },
      onDisconnect: () => {
        this.isConnectedSubject.next(false);
      },
      onStompError: (frame) => {
        console.error('Broker error: ' + frame.headers['message']);
      }
    });

    this.stompClient.activate();
  }

  public disconnect(): void {
    if (this.stompClient) {
      this.stompClient.deactivate();
      this.isConnectedSubject.next(false);
    }
  }

  public subscribe(topic: string, callback: (message: Message) => void) {
    // Ждем, пока соединение установится, и только потом подписываемся
    this.isConnected$.pipe(
      filter(connected => connected), // Пропускаем только true
      first() // Подписываемся один раз при подключении
    ).subscribe(() => {
      this.stompClient.subscribe(topic, callback);
    });
  }

  // Универсальный метод отправки
  public send(destination: string, body: any): void {
    if (this.stompClient && this.stompClient.active) {
      this.stompClient.publish({
        destination: destination,
        body: JSON.stringify(body)
      });
    } else {
      console.warn('Cannot send message: Socket disconnected');
    }
  }
}
