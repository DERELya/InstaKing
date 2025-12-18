import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, combineLatest, catchError, EMPTY, timer } from 'rxjs';
import { tap, map, debounceTime, distinctUntilChanged, finalize } from 'rxjs/operators';
import { MessageDTO } from '../models/MessageDTO';
import { ConversationDTO } from '../models/ConversationDTO';
import { TypingDTO } from '../models/TypingDTO';
import { ReadReceiptDTO } from '../models/ReadReceiptDTO';
import { TokenStorageService } from './token-storage.service';
import {DeleteMessageDTO} from '../models/DeleteMEssageDTO';

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


  public totalUnreadCount$ = this.conversationsList$.pipe(
    map(conversations => {
      return conversations.reduce((sum, chat) => sum + (chat.unreadCount || 0), 0);
    })
  );

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

  setActiveConversation(conversation: ConversationDTO): void {
    const currentActive = this.activeConversationSubject.value;
    if (currentActive?.id !== conversation.id) {
      this.activeConversationSubject.next(conversation);
      this.messagesSubject.next([]); // Очистка старых сообщений
      this.loadMessageHistory(conversation.id);

      this.markAsRead(conversation.id).subscribe(() => {
        this.updateUnreadCountInList(conversation.id, 0);
      });
    }
  }

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


  addMessage(message: MessageDTO): void {
    const activeConv = this.activeConversationSubject.value;
    if (activeConv && activeConv.id == message.conversationId) {

      const currentMsgs = this.messagesSubject.value;

      const isDuplicate = currentMsgs.some(m => {
        if (m.id && message.id) {
          return m.id === message.id;
        }
        return m.createdAt === message.createdAt && m.content === message.content;
      });

      if (!isDuplicate) {
        this.messagesSubject.next([...currentMsgs, message]);

        if (message.senderId !== this.currentUserId) {
          this.markAsRead(message.conversationId).subscribe();
        }
      } else {
        console.warn('Дубликат сообщения отфильтрован:', message.id, message.content);
      }

      this.typingUserSubject.next(null);
    }

    this.updateConversationListOnNewMessage(message);
  }

  handleNewConversationFromSocket(newConv: ConversationDTO): void {
    const list = [...this.conversationsListSubject.value];
    const exists = list.find(c => c.id === newConv.id);
    if (!exists) {
      list.unshift(newConv);
      this.conversationsListSubject.next(list);
    }
  }


  handleTyping(dto: TypingDTO): void {

    const activeConv = this.activeConversationSubject.value;


    if (activeConv && activeConv.id === dto.conversationId) {

      this.typingUserSubject.next(dto.username);

      if (this.typingTimeout) clearTimeout(this.typingTimeout);

      this.typingTimeout = setTimeout(() => {
        this.typingUserSubject.next(null);
      }, 3000);
    }
  }

  handleReadReceipt(dto: ReadReceiptDTO): void {
    const activeConv = this.activeConversationSubject.value;

    if (activeConv && activeConv.id === dto.conversationId) {
      // В реальном приложении здесь можно менять статус сообщений (например, поле isRead = true)
      // Для простоты пока оставим как есть или добавим логику смены иконок
    }
  }


  private updateConversationListOnNewMessage(message: MessageDTO): void {
    let list = [...this.conversationsListSubject.value];
    const index = list.findIndex(c => c.id === message.conversationId);


    if (index === -1) {
      return;
    }

    const conv = { ...list[index] };
    conv.previewMessage = message.content;
    conv.lastMessageAt = message.createdAt;

    if (this.activeConversationSubject.value?.id !== message.conversationId && message.senderId !== this.currentUserId) {
      conv.unreadCount = (conv.unreadCount || 0) + 1;
    }

    list.splice(index, 1);
    list.unshift(conv);
    this.conversationsListSubject.next(list);
  }


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

  public handleDeleteMessage(dto: DeleteMessageDTO): void {
    const activeConv = this.activeConversationSubject.value;

    if (activeConv && activeConv.id === dto.conversationId) {
      const currentMessages = this.messagesSubject.value;

      const updatedMessages = currentMessages.filter(m => m.id !== dto.messageId);

      this.messagesSubject.next(updatedMessages);
    }
  }

  public deleteMessage(messageId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/messages/${messageId}`);
  }
}
