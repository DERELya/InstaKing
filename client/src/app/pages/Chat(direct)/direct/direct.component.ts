import { Component, OnDestroy, OnInit } from '@angular/core';
import { filter, Observable, Subscription } from 'rxjs';
import { ChatService } from '../../../services/chat.service';
import { ChatStateService } from '../../../services/chat-state.service';
import { MessageDTO } from '../../../models/MessageDTO';
import { ConversationDTO } from '../../../models/ConversationDTO';
import {ChatListComponent} from '../chat-list.component/chat-list.component';
import { MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {ChatWindowComponent} from '../chat-window.component/chat-window.component';
import {AsyncPipe, NgIf} from '@angular/common';

@Component({
  selector: 'app-direct',
  imports: [
    ChatListComponent,
    MatIconModule,
    MatButtonModule,
    ChatWindowComponent,
    AsyncPipe,
    NgIf
  ],
  templateUrl: './direct.component.html',
  styleUrl: './direct.component.css'
})
export class DirectComponent implements OnInit, OnDestroy {

  private subscriptions: Subscription = new Subscription();
  public activeConversation$: Observable<ConversationDTO | null>;

  constructor(
    private chatService: ChatService,
    private chatStateService: ChatStateService,
  ) {
    // Инициализация Observable в конструкторе
    this.activeConversation$ = this.chatStateService.activeConversation$;
  }

  ngOnInit(): void {
    // 1. Устанавливаем WebSocket-соединение
    this.chatService.connect();

    // 2. Слушаем новые сообщения и передаем их в StateService
    const newMessagesSub = this.chatService.newMessages$.pipe(
      // Используем filter для гарантии, что мы обрабатываем только MessageDTO
      filter((msg): msg is MessageDTO => !!msg)
    ).subscribe((msg: MessageDTO) => {
      this.chatStateService.addMessage(msg);
    });

    // 3. Слушаем уведомления о печати
    const typingSub = this.chatService.typingNotifications$.pipe(
      filter(typing => !!typing)
    ).subscribe(typing => {
      this.chatStateService.updateTypingStatus(typing);
    });

    this.subscriptions.add(newMessagesSub);
    this.subscriptions.add(typingSub);
  }

  /**
   * Обрабатывает событие выбора диалога из ChatListComponent.
   */
  onSelectConversation(conversation: ConversationDTO): void {
    this.chatStateService.setActiveConversation(conversation);
  }

  /**
   * Метод, который вызывается при нажатии "Начать чат" (из ChatListComponent)
   * или "Начать сообщение" (из блока no-chat-selected).
   * * Здесь должна быть логика открытия модального окна выбора пользователя.
   */
  openUserSelectionModal(): void {
    // 🔔 Реализация здесь
    console.log("-> Запрос: ОТКРЫТИЕ ОКНА ВЫБОРА ПОЛЬЗОВАТЕЛЯ.");
    // Например: this.modalService.open(UserSelectionComponent);
  }

  ngOnDestroy(): void {
    // Обязательная отписка
    this.subscriptions.unsubscribe();
    // Закрытие WebSocket-соединения
    this.chatService.disconnect();
  }
}
