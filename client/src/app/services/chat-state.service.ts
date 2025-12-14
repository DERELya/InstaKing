import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, combineLatest, catchError, EMPTY, timer } from 'rxjs';
import { tap, map, debounceTime, distinctUntilChanged, finalize } from 'rxjs/operators';
import { MessageDTO } from '../models/MessageDTO';
import { ConversationDTO } from '../models/ConversationDTO';
import { TypingDTO } from '../models/TypingDTO';
import { ReadReceiptDTO } from '../models/ReadReceiptDTO';
import { TokenStorageService } from './token-storage.service';

@Injectable({
  providedIn: 'root'
})
export class ChatStateService {
  private apiUrl = 'http://localhost:8080/api/chats';

  // --- Основные данные ---
  private conversationsListSubject = new BehaviorSubject<ConversationDTO[]>([]);
  public conversationsList$ = this.conversationsListSubject.asObservable();

  private activeConversationSubject = new BehaviorSubject<ConversationDTO | null>(null);
  public activeConversation$ = this.activeConversationSubject.asObservable();

  private messagesSubject = new BehaviorSubject<MessageDTO[]>([]);
  public messages$ = this.messagesSubject.asObservable();

  // --- UI Состояния ---
  private loadingSubject = new BehaviorSubject<boolean>(false);
  public loading$ = this.loadingSubject.asObservable();

  // Кто сейчас печатает: строка (username) или null
  private typingUserSubject = new BehaviorSubject<string | null>(null);
  public typingUser$ = this.typingUserSubject.asObservable();
  private typingTimeout: any; // Таймер для сброса статуса

  // Поиск
  private searchTermSubject = new BehaviorSubject<string>('');
  public filteredConversationsList$: Observable<ConversationDTO[]>;

  private http = inject(HttpClient);
  private tokenService = inject(TokenStorageService);
  private currentUserId: number = this.tokenService.getIdFromToken() || 0;

  constructor() {
    // Логика фильтрации списка чатов
    this.filteredConversationsList$ = combineLatest([
      this.conversationsList$,
      this.searchTermSubject.pipe(debounceTime(200), distinctUntilChanged())
    ]).pipe(
      map(([conversations, searchTerm]) => {
        const term = searchTerm.toLowerCase().trim();
        if (!term) return conversations;

        return conversations.filter(conv => {
          const name = this.getOtherParticipantName(conv).toLowerCase();
          const preview = (conv.previewMessage || '').toLowerCase();
          return name.includes(term) || preview.includes(term);
        });
      })
    );
  }

  // --- API Methods ---

  getConversations(): Observable<ConversationDTO[]> {
    this.loadingSubject.next(true);
    return this.http.get<ConversationDTO[]>(this.apiUrl).pipe(
      tap(list => this.conversationsListSubject.next(list)),
      finalize(() => this.loadingSubject.next(false))
    );
  }

  public setSearchTerm(term: string): void {
    this.searchTermSubject.next(term);
  }

  /**
   * Устанавливает активный чат.
   * ВАЖНО: Вызывай clearActiveConversation() при уходе со страницы!
   */
  setActiveConversation(conversation: ConversationDTO): void {
    const currentActive = this.activeConversationSubject.value;
    if (currentActive?.id !== conversation.id) {
      this.activeConversationSubject.next(conversation);
      this.messagesSubject.next([]); // Очистка старых сообщений
      this.loadMessageHistory(conversation.id);

      // Сразу помечаем как прочитанное
      this.markAsRead(conversation.id).subscribe(() => {
        this.updateUnreadCountInList(conversation.id, 0);
      });
    }
  }

  /** Сброс активного чата (вызывать в ngOnDestroy) */
  clearActiveConversation(): void {
    this.activeConversationSubject.next(null);
    this.messagesSubject.next([]);
    this.typingUserSubject.next(null);
  }

  loadMessageHistory(conversationId: number): void {
    this.http.get<MessageDTO[]>(`${this.apiUrl}/${conversationId}/messages`, {
      params: { page: '0', size: '50' }
    }).subscribe(history => {
      // Бэк возвращает от новых к старым, нам надо наоборот для отображения
      this.messagesSubject.next([...history].reverse());
    });
  }

  // --- Обработка событий из WebSocket ---

  /** 1. Пришло новое сообщение */
  addMessage(message: MessageDTO): void {
    const activeConv = this.activeConversationSubject.value;

    // Если сообщение относится к текущему открытому чату
    if (activeConv?.id === message.conversationId) {
      const currentMsgs = this.messagesSubject.value;

      // Защита от дублей (по ID или дате)
      const isDuplicate = currentMsgs.some(m =>
        (m.id && m.id === message.id) ||
        (m.createdAt === message.createdAt && m.content === message.content)
      );

      if (!isDuplicate) {
        this.messagesSubject.next([...currentMsgs, message]);

        // Если отправитель не я — сразу помечаем как прочитанное
        if (message.senderId !== this.currentUserId) {
          this.markAsRead(message.conversationId).subscribe();
        }
      }
      // Сбрасываем статус "печатает", так как сообщение уже пришло
      this.typingUserSubject.next(null);
    }

    // Обновляем список чатов слева (превью, время)
    this.updateConversationListOnNewMessage(message);
  }

  /** 2. Пришел новый диалог (создан другим юзером) */
  handleNewConversationFromSocket(newConv: ConversationDTO): void {
    const list = [...this.conversationsListSubject.value];
    // Проверяем, нет ли его уже
    const exists = list.find(c => c.id === newConv.id);
    if (!exists) {
      // Добавляем в начало
      list.unshift(newConv);
      this.conversationsListSubject.next(list);
    }
  }

  /** 3. Пришел статус "Печатает..." */
  handleTyping(dto: TypingDTO): void {
    const activeConv = this.activeConversationSubject.value;

    // Показываем, только если это происходит в открытом чате
    if (activeConv && activeConv.id === dto.conversationId) {
      this.typingUserSubject.next(dto.username);

      // Сбрасываем таймер, если он был
      if (this.typingTimeout) clearTimeout(this.typingTimeout);

      // Убираем надпись через 3 секунды тишины
      this.typingTimeout = setTimeout(() => {
        this.typingUserSubject.next(null);
      }, 3000);
    }
  }

  /** 4. Пришло уведомление о прочтении (Read Receipt) */
  handleReadReceipt(dto: ReadReceiptDTO): void {
    const activeConv = this.activeConversationSubject.value;

    if (activeConv && activeConv.id === dto.conversationId) {
      // В реальном приложении здесь можно менять статус сообщений (например, поле isRead = true)
      // Для простоты пока оставим как есть или добавим логику смены иконок
      console.log(`Пользователь ${dto.readerId} прочитал сообщения в чате ${dto.conversationId}`);
    }
  }


  private updateConversationListOnNewMessage(message: MessageDTO): void {
    let list = [...this.conversationsListSubject.value];
    const index = list.findIndex(c => c.id === message.conversationId);

    // Если чата нет в списке (редкий кейс, если handleNewConversation сработал позже), можно запросить его
    if (index === -1) {
      // Можно вызвать this.getConversations().subscribe(), чтобы обновить весь список
      return;
    }

    const conv = { ...list[index] };
    conv.previewMessage = message.content;
    conv.lastMessageAt = message.createdAt;

    // Увеличиваем счетчик непрочитанных, если:
    // 1. Чат не открыт сейчас у меня
    // 2. Отправитель — не я
    if (this.activeConversationSubject.value?.id !== message.conversationId && message.senderId !== this.currentUserId) {
      conv.unreadCount = (conv.unreadCount || 0) + 1;
    }

    // Перемещаем чат наверх
    list.splice(index, 1);
    list.unshift(conv);
    this.conversationsListSubject.next(list);
  }

  // --- Создание чата ---

  loadConversationByUserId(userId: number): void {
    this.loadingSubject.next(true);
    this.http.post<ConversationDTO>(`${this.apiUrl}/start`, { recipientId: userId })
      .pipe(
        tap(conv => {
          this.setActiveConversation(conv);
          this.handleNewConversationFromSocket(conv); // Используем ту же логику для добавления в список
        }),
        finalize(() => this.loadingSubject.next(false)),
        catchError(err => {
          console.error("Ошибка при старте чата:", err);
          return EMPTY;
        })
      ).subscribe();
  }

  private updateUnreadCountInList(conversationId: number, count: number): void {
    const list = this.conversationsListSubject.value.map(c =>
      c.id === conversationId ? { ...c, unreadCount: count } : c
    );
    this.conversationsListSubject.next(list);
  }

  private markAsRead(conversationId: number): Observable<void> {
    // Убедись, что на бэкенде в DialogController есть метод @PostMapping("/{id}/read")
    return this.http.post<void>(`${this.apiUrl}/${conversationId}/read`, {}).pipe(
      catchError(e => {
        console.error("Failed to mark as read", e);
        return EMPTY;
      })
    );
  }

  private getOtherParticipantName(conversation: ConversationDTO): string {
    const other = conversation.participants?.find(p => p.id !== this.currentUserId);
    return other ? other.username : (conversation.title || 'Чат');
  }
}
