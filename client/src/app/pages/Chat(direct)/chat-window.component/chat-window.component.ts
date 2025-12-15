import {Component, Input, OnInit, OnDestroy, ViewChild, ElementRef, inject, ChangeDetectorRef} from '@angular/core';
import { ChatStateService } from '../../../services/chat-state.service';
import { ChatService } from '../../../services/chat.service';
import { TokenStorageService } from '../../../services/token-storage.service';
import { Observable, Subscription } from 'rxjs';
import { MatIconButton } from '@angular/material/button';
import { AsyncPipe, DatePipe, NgForOf, NgIf, NgClass } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ConversationDTO } from '../../../models/ConversationDTO';
import { MessageDTO } from '../../../models/MessageDTO';
import { FormsModule } from '@angular/forms';
import { TextFieldModule } from '@angular/cdk/text-field'
import {User} from '../../../models/User';
import {ImageUploadService} from '../../../services/image-upload.service';

@Component({
  selector: 'app-chat-window',
  standalone: true,
  templateUrl: './chat-window.component.html',
  styleUrls: ['./chat-window.component.css'],
  imports: [
    MatIconModule,
    MatFormFieldModule,
    MatIconButton,
    NgIf,
    NgForOf,
    NgClass,
    AsyncPipe,
    DatePipe,
    FormsModule,
    MatInputModule,
    TextFieldModule
  ]
})
export class ChatWindowComponent implements OnInit, OnDestroy {
  @Input() conversation!: ConversationDTO;
  @ViewChild('messageContainer') private messageContainer!: ElementRef;
  private imageService=inject(ImageUploadService);
  protected avatarUrl: string='';
  private chatStateService = inject(ChatStateService);
  private chatService = inject(ChatService);
  private tokenService = inject(TokenStorageService);

  public messages$: Observable<MessageDTO[]> = this.chatStateService.messages$;
  public typingUser$ = this.chatStateService.typingUser$; // Стрим "печатает"

  public messageInput: string = '';
  public currentUserId: number;
  private subscriptions: Subscription = new Subscription();
  private lastTypingSent = 0;
  private cdr=inject(ChangeDetectorRef)
  constructor() {
    this.currentUserId = this.tokenService.getIdFromToken() || 0;
  }

  ngOnInit(): void {
    this.subscriptions.add(
      this.messages$.subscribe(() => {
        setTimeout(() => this.scrollToBottom(), 50);
        this.loadAvatar(this.getConversationTitle());
        this.cdr.detectChanges();
      })
    );
  }
  ngAfterViewInit() {
    this.scrollToBottom();
  }



  sendMessage(): void {
    if (!this.messageInput.trim() || !this.conversation.id) {
      return;
    }

    const messageDto: MessageDTO = {
      content: this.messageInput.trim(), // Убираем пробелы по краям
      conversationId: this.conversation.id,
      senderId: this.currentUserId,
      createdAt: new Date(),
      status: 'SENT' as any
    };

    this.chatService.sendMessage(messageDto);
    this.messageInput = '';
  }

  // Обработка ввода (Shift+Enter - новая строка, Enter - отправка)
  onEnter(event: Event): void {
    const e = event as KeyboardEvent;
    if (!e.shiftKey) {
      e.preventDefault();
      this.sendMessage();
    }
  }

  // Отправка статуса "печатает"
  onTyping(): void {
    const now = Date.now();
    // Шлем событие не чаще раза в 3 секунды
    if (now - this.lastTypingSent > 3000 && this.conversation.id) {
      this.lastTypingSent = now;
      this.chatService.sendTyping({
        conversationId: this.conversation.id,
        username: ''
      });
    }
  }

  getConversationTitle(): string {
    const other = this.conversation.participants?.find(p => p.id !== this.currentUserId);
    return other ? other.username : (this.conversation.title || 'Чат');
  }

  private scrollToBottom(): void {
    try {
      this.messageContainer.nativeElement.scrollTop = this.messageContainer.nativeElement.scrollHeight;
    } catch(err) { }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    // Очищаем активный чат при закрытии окна
    this.chatStateService.clearActiveConversation();
  }

  trackByMessageId(index: number, message: MessageDTO): number | string {
    return message.id || index; // Используем ID, если его нет (пока летит) — индекс
  }

  loadAvatar(username: string) {
    this.imageService.getImageToUser(username).subscribe({
      next: blob => {
        const preview = URL.createObjectURL(blob);
        this.avatarUrl = preview;
        this.cdr.markForCheck();
      },
      error: () => {
        this.avatarUrl = 'assets/placeholder.jpg';
        this.cdr.markForCheck();
      }
    });
  }
}
