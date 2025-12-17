import { Component, EventEmitter, inject, OnDestroy, Output, ChangeDetectorRef } from '@angular/core'; // Добавлен ChangeDetectorRef
import { ConversationDTO } from '../../../models/ConversationDTO';
import { Observable, Subscription, tap } from 'rxjs';
import { ChatStateService } from '../../../services/chat-state.service';
import { TokenStorageService } from '../../../services/token-storage.service';
import { User } from '../../../models/User';
import { AsyncPipe, DatePipe, NgForOf, NgIf, NgClass, NgStyle } from '@angular/common'; // Добавлен NgStyle
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ImageUploadService } from '../../../services/image-upload.service';
import { DomSanitizer } from '@angular/platform-browser'; // Для безопасности URL картинок

@Component({
  selector: 'app-chat-list',
  standalone: true,
  imports: [
    MatIconModule,
    DatePipe,
    MatButtonModule,
    NgIf,
    NgForOf,
    NgClass,
    AsyncPipe,
    FormsModule,
    MatInputModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    NgStyle
  ],
  templateUrl: './chat-list.component.html',
  styleUrl: './chat-list.component.css'
})
export class ChatListComponent implements OnDestroy {
  @Output() conversationSelected = new EventEmitter<ConversationDTO>();
  @Output() newChatRequested = new EventEmitter<void>();

  public conversations$: Observable<ConversationDTO[]>;
  public isLoading$: Observable<boolean>;
  public activeConversation$: Observable<ConversationDTO | null>;
  public typingUser$: Observable<string | null>;
  public searchInput: string = '';

  private currentUserId: number;
  private subscriptions: Subscription = new Subscription();

  // Инъекции
  private chatStateService = inject(ChatStateService);
  private tokenService = inject(TokenStorageService);
  private imageService = inject(ImageUploadService);
  private cdr = inject(ChangeDetectorRef); // Нужно для ручного обновления view
  private sanitizer = inject(DomSanitizer); // Нужно для blob-ссылок

  constructor() {
    this.currentUserId = this.tokenService.getIdFromToken() || 0;
    this.isLoading$ = this.chatStateService.loading$;
    this.activeConversation$ = this.chatStateService.activeConversation$;
    this.typingUser$ = this.chatStateService.typingUser$;

    // Подписываемся на список чатов и при получении данных ЗАПУСКАЕМ загрузку аватарок
    this.conversations$ = this.chatStateService.filteredConversationsList$.pipe(
      tap(list => {
        // Проходим по каждому чату и грузим аватар, если его еще нет
        list.forEach(conv => this.loadAvatarForConversation(conv));
      })
    );

    this.subscriptions.add(
      this.chatStateService.getConversations().subscribe()
    );
  }

  onSearchChange(): void {
    this.chatStateService.setSearchTerm(this.searchInput);
  }

  // Получаем собеседника (вынес в отдельный метод, пригодится)
  private getOtherParticipant(conversation: ConversationDTO): User | undefined {
    if (!conversation.participants || conversation.participants.length < 2) return undefined;
    return conversation.participants.find((p: User) => p.id !== this.currentUserId);
  }

  getConversationTitle(conversation: ConversationDTO): string {
    const other = this.getOtherParticipant(conversation);
    return other ? other.username : conversation.title || 'Групповой чат';
  }

  selectConversation(conversation: ConversationDTO): void {
    this.conversationSelected.emit(conversation);
    this.chatStateService.setActiveConversation(conversation);
  }

  startNewChat(): void {
    this.newChatRequested.emit();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  // --- Логика аватарок ---

  /**
   * Загружает аватар для конкретного чата.
   * Вызывается из pipe(tap) в конструкторе, а не из шаблона!
   */
  loadAvatarForConversation(conversation: ConversationDTO): void {
    // Если аватар уже загружен или в процессе — не грузим повторно
    if (conversation.avatarUrl) return;

    const otherUser = this.getOtherParticipant(conversation);
    // Если это групповой чат или юзер не найден - выходим (будет дефолтная иконка)
    if (!otherUser) return;

    // Ставим заглушку, чтобы не пытаться грузить снова пока идет запрос
    // conversation.avatarUrl = 'loading'; // Можно раскомментировать, если нужно

    this.imageService.getProfileImageUrl(otherUser.avatarUrl);
  }

  // Для генерации цвета заглушки (если нет фото)
  getAvatarColor(conversation: ConversationDTO): string {
    const name = this.getConversationTitle(conversation);
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    return '#' + '00000'.substring(0, 6 - c.length) + c;
  }

  // Инициалы для заглушки
  getAvatarInitials(conversation: ConversationDTO): string {
    const title = this.getConversationTitle(conversation);
    return title ? title.slice(0, 2).toUpperCase() : '??';
  }
}
