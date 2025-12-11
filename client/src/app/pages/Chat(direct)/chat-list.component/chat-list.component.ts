import {Component, EventEmitter, inject, OnDestroy, Output} from '@angular/core';
import {ConversationDTO} from '../../../models/ConversationDTO';
import {map, Observable, Subscription} from 'rxjs';
import {ChatStateService} from '../../../services/chat-state.service';
import {TokenStorageService} from '../../../services/token-storage.service';
import {User} from '../../../models/User';
import {AsyncPipe, DatePipe, NgForOf, NgIf, NgClass} from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms'; // Для [(ngModel)]
import { MatInputModule } from '@angular/material/input'; // Для matInput
import { MatFormFieldModule } from '@angular/material/form-field'; // Для mat-form-field
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'; // Для спиннера загрузки

@Component({
  selector: 'app-chat-list',
  standalone: true, // Предполагаем Standalone Component для удобства импортов
  imports: [
    MatIconModule,
    DatePipe,
    MatButtonModule,
    NgIf,
    NgForOf,
    NgClass, // Добавлен для подсветки активного чата
    AsyncPipe,
    FormsModule, // Для двустороннего связывания [(ngModel)]
    MatInputModule,
    MatFormFieldModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './chat-list.component.html',
  styleUrl: './chat-list.component.css'
})
export class ChatListComponent implements OnDestroy{
  @Output() conversationSelected = new EventEmitter<ConversationDTO>();
  @Output() newChatRequested = new EventEmitter<void>();
  // ✅ 1. Потоки данных для отображения (используют сервис)
  public conversations$: Observable<ConversationDTO[]>; // ФИЛЬТРОВАННЫЙ список
  public isLoading$: Observable<boolean>; // Флаг загрузки
  public activeConversation$: Observable<ConversationDTO | null>; // Активный чат

  // ✅ 2. Свойство для поля ввода поиска
  public searchInput: string = '';

  private currentUserId: number;
  private subscriptions: Subscription = new Subscription();
  private chatStateService = inject(ChatStateService);
  private tokenService = inject(TokenStorageService);

  constructor() {
    // Получаем ID текущего пользователя (гарантируем, что это number)
    this.currentUserId = this.tokenService.getIdFromToken() || 0;

    // ✅ Инициализация потоков из сервиса
    this.conversations$ = this.chatStateService.filteredConversationsList$;
    this.isLoading$ = this.chatStateService.loading$;
    this.activeConversation$ = this.chatStateService.activeConversation$;

    // Запускаем загрузку данных при инициализации компонента
    // и добавляем подписку в коллекцию для корректного отписывания
    this.subscriptions.add(
      this.chatStateService.getConversations().subscribe()
    );
  }

  /**
   * Метод, вызываемый при изменении значения в поле поиска.
   */
  onSearchChange(): void {
    // Передаем значение в сервис для фильтрации
    this.chatStateService.setSearchTerm(this.searchInput);
  }

  /**
   * Определяет заголовок (имя собеседника) для чата 1-на-1
   */
  getConversationTitle(conversation: ConversationDTO): string {
    if (!conversation.participants || conversation.participants.length < 2) {
      return `Чат #${conversation.id}`;
    }

    // Находим участника, который НЕ является текущим пользователем
    const otherParticipant = conversation.participants.find(
      (p: User) => p.id !== this.currentUserId
    );

    return otherParticipant ? otherParticipant.username : conversation.title || 'Групповой чат';
  }

  /**
   * Обрабатывает клик по элементу списка
   */
  selectConversation(conversation: ConversationDTO): void {
    // 1. Уведомляем родителя (DirectComponent)
    this.conversationSelected.emit(conversation);

    // 2. Устанавливаем активный чат и запускаем загрузку истории через сервис
    this.chatStateService.setActiveConversation(conversation);
  }
  startNewChat(): void {
    console.log("gg");
    this.newChatRequested.emit();
  }

  ngOnDestroy(): void {
    // Обязательная отписка от всех подписок, сделанных вручную
    this.subscriptions.unsubscribe();
  }
}
