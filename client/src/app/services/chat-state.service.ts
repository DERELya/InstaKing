import { inject, Injectable } from '@angular/core';
import { TypingDTO } from '../models/TypingDTO';
import { MessageDTO } from '../models/MessageDTO';
// ✅ Добавлены catchError, EMPTY для обработки ошибок в Observable
import { BehaviorSubject, Observable, combineLatest, catchError, EMPTY } from 'rxjs';
import { ConversationDTO } from '../models/ConversationDTO';
import { HttpClient } from '@angular/common/http';
// Импорты операторов RxJS из 'rxjs/operators'
import { tap, map, debounceTime, distinctUntilChanged, finalize } from 'rxjs/operators';
import { TokenStorageService } from './token-storage.service';

@Injectable({
  providedIn: 'root'
})
export class ChatStateService {
  // Убедитесь, что этот URL корректен для вашего Spring Boot
  private apiUrl = 'http://localhost:8080/api/chats';

  // --- Состояния ---
  private conversationsListSubject = new BehaviorSubject<ConversationDTO[]>([]);
  public conversationsList$ = this.conversationsListSubject.asObservable();

  private activeConversationSubject = new BehaviorSubject<ConversationDTO | null>(null);
  public activeConversation$ = this.activeConversationSubject.asObservable();

  private messagesSubject = new BehaviorSubject<MessageDTO[]>([]);
  public messages$ = this.messagesSubject.asObservable();

  private typingStatusSubject = new BehaviorSubject<TypingDTO | null>(null);
  public typingStatus$ = this.typingStatusSubject.asObservable();

  private loadingSubject = new BehaviorSubject<boolean>(false);
  public loading$ = this.loadingSubject.asObservable();

  // --- Поиск ---
  private searchTermSubject = new BehaviorSubject<string>('');
  public filteredConversationsList$: Observable<ConversationDTO[]>;

  // --- Инъекции и Инициализация ---
  private http = inject(HttpClient);
  private tokenService = inject(TokenStorageService);

  private currentUserId: number = this.tokenService.getIdFromToken() || 0;

  constructor() {
    this.filteredConversationsList$ = combineLatest([
      this.conversationsList$,
      this.searchTermSubject.pipe(debounceTime(200), distinctUntilChanged())
    ]).pipe(
      map(([conversations, searchTerm]) => {
        const term = searchTerm.toLowerCase().trim();
        if (!term) {
          return conversations;
        }

        return conversations.filter(conversation => {
          const participantName = this.getOtherParticipantName(conversation);
          const preview = conversation.previewMessage || '';

          return participantName.toLowerCase().includes(term) || preview.toLowerCase().includes(term);
        });
      })
    );
  }

  /**
   * Загружает все диалоги пользователя.
   */
  getConversations(): Observable<ConversationDTO[]> {
    this.loadingSubject.next(true);
    return this.http.get<ConversationDTO[]>(this.apiUrl).pipe(
      tap(conversations => this.conversationsListSubject.next(conversations)),
      finalize(() => this.loadingSubject.next(false))
    );
  }

  /**
   * Устанавливает новое поисковое слово.
   */
  public setSearchTerm(term: string): void {
    this.searchTermSubject.next(term);
  }

  /**
   * Вспомогательный метод для получения имени собеседника.
   */
  private getOtherParticipantName(conversation: ConversationDTO): string {
    if (!conversation.participants) return conversation.title || 'Чат';

    const other = conversation.participants.find(
      p => p.id !== this.currentUserId
    );
    // ✅ Убедитесь, что participants имеет поле username, как в вашем DTO.
    return other ? other.username : conversation.title || 'Чат';
  }

  /**
   * Устанавливает активный диалог и загружает его историю.
   */
  setActiveConversation(conversation: ConversationDTO): void {
    if (this.activeConversationSubject.value?.id !== conversation.id) {
      this.activeConversationSubject.next(conversation);
      this.messagesSubject.next([]); // Очистка старых сообщений
      this.loadMessageHistory(conversation.id);

      this.markAsRead(conversation.id).subscribe(() => {
        this.updateUnreadCountInList(conversation.id, 0)
      });
    }
  }

  /**
   * Загружает историю сообщений с пагинацией.
   */
  loadMessageHistory(conversationId: number, page: number = 0, size: number = 50, prepend: boolean = false): void {
    this.http.get<MessageDTO[]>(`${this.apiUrl}/${conversationId}/messages`, {
      params: { page: page.toString(), size: size.toString() }
    }).subscribe(history => {

      const newMessages = history.reverse();

      if (prepend) {
        const currentMessages = this.messagesSubject.value;
        this.messagesSubject.next([...newMessages, ...currentMessages]);
      } else {
        this.messagesSubject.next(newMessages);
      }
    });
  }

  markAsRead(conversationId: number): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${conversationId}/read`, {});
  }

  /**
   * Добавляет новое сообщение в текущий список И обновляет список диалогов.
   */
  addMessage(message: MessageDTO): void {
    const isMessageFromActiveChat = this.activeConversationSubject.value?.id === message.conversationId;

    if (isMessageFromActiveChat) {
      const currentMessages = this.messagesSubject.value;
      this.messagesSubject.next([...currentMessages, message]);

      if (message.senderId !== this.currentUserId) {
        this.markAsRead(message.conversationId).subscribe(() => {
          this.updateUnreadCountInList(message.conversationId, 0);
        });
      }
    }

    this.updateConversationListOnNewMessage(message);
  }

  private updateConversationListOnNewMessage(message: MessageDTO): void {
    const list = [...this.conversationsListSubject.value];
    const index = list.findIndex(c => c.id === message.conversationId);

    if (index !== -1) {
      const conv = list[index];

      // createdAt теперь должно быть доступно в MessageDTO
      conv.previewMessage = message.content;
      conv.lastMessageAt = message.createdAt;

      if (this.activeConversationSubject.value?.id !== message.conversationId && message.senderId !== this.currentUserId) {
        conv.unreadCount = (conv.unreadCount || 0) + 1;
      }

      const updatedConv = list.splice(index, 1)[0];
      list.unshift(updatedConv);
      this.conversationsListSubject.next(list);
    }
  }

  /**
   * Обновляет счетчик непрочитанных сообщений в списке чатов (например, после прочтения).
   */
  private updateUnreadCountInList(conversationId: number, count: number): void {
    const list = this.conversationsListSubject.value;
    const index = list.findIndex(c => c.id === conversationId);
    if (index !== -1) {
      const updatedList = list.map((conv, i) => {
        if (i === index) {
          return { ...conv, unreadCount: count };
        }
        return conv;
      });
      this.conversationsListSubject.next(updatedList);
    }
  }

  updateTypingStatus(notification: TypingDTO): void {
    if (this.activeConversationSubject.value?.id === notification.conversationId) {
      this.typingStatusSubject.next(notification);
    }
  }

  /**
   * Запрашивает существующий диалог с пользователем по его ID или создает новый (REST API).
   * Обновляет активную беседу и список чатов.
   */
  loadConversationByUserId(userId: string): void {
    const startChatDto = {
      recipientId: userId
    };

    if (this.loadingSubject.value) return;
    this.loadingSubject.next(true);

    this.http.post<ConversationDTO>(`${this.apiUrl}/start`, startChatDto)
      .pipe(
        tap((conversation: ConversationDTO) => {
          // 1. Устанавливаем активный чат
          this.activeConversationSubject.next(conversation);

          // 2. Инициируем отдельный запрос для истории сообщений (Правильная логика для ваших DTO)
          this.messagesSubject.next([]);
          this.loadMessageHistory(conversation.id);

          // 3. Обновляем список
          this.updateConversationListOnNewConversation(conversation);
        }),
        finalize(() => {
          this.loadingSubject.next(false);
        }),
        catchError((error) => {
          console.error("Ошибка REST API при загрузке/создании беседы:", error);
          this.loadingSubject.next(false);
          return EMPTY;
        })
      )
      .subscribe(); // Запуск HTTP-запроса
  }

  /**
   * Вспомогательный метод для обновления списка после создания нового чата.
   */
  private updateConversationListOnNewConversation(newConversation: ConversationDTO): void {
    const list = [...this.conversationsListSubject.value];
    const index = list.findIndex(c => c.id === newConversation.id);

    if (index !== -1) {
      list.splice(index, 1);
    }

    list.unshift(newConversation);
    this.conversationsListSubject.next(list);
  }
}
