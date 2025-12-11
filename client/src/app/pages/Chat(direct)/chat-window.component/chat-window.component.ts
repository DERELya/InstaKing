import { Component, Input, OnInit, OnDestroy, ViewChild, ElementRef, inject } from '@angular/core';
import { ChatStateService } from '../../../services/chat-state.service';
import { ChatService } from '../../../services/chat.service';
import { TokenStorageService } from '../../../services/token-storage.service';
import { Observable, Subscription } from 'rxjs';
import {MatIconButton} from '@angular/material/button';
import {AsyncPipe, DatePipe, NgForOf, NgIf} from '@angular/common';
import {MatIconModule} from '@angular/material/icon';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInput, MatInputModule, MatSuffix} from '@angular/material/input';
import {ConversationDTO} from '../../../models/ConversationDTO';
import {MessageDTO} from '../../../models/MessageDTO';
import {TypingDTO} from '../../../models/TypingDTO';
import {User} from '../../../models/User';
import {FormsModule} from '@angular/forms';

@Component({
  selector: 'app-chat-window',
  templateUrl: './chat-window.component.html',
  imports: [
    MatIconModule,
    MatFormFieldModule,
    MatIconButton,
    MatSuffix,
    MatIconModule,
    NgIf,
    NgForOf,
    AsyncPipe,
    DatePipe,
    FormsModule,
    MatInputModule
  ],
  styleUrls: ['./chat-window.component.css']
})
export class ChatWindowComponent implements OnInit, OnDestroy {

  @Input() conversation!: ConversationDTO;

  @ViewChild('messageContainer') private messageContainer!: ElementRef;

  private chatStateService = inject(ChatStateService);
  private chatService = inject(ChatService);
  private tokenService = inject(TokenStorageService);

  // Observable для отображения сообщений и статуса печати
  public messages$: Observable<MessageDTO[]> = this.chatStateService.messages$;
  public typingStatus$: Observable<TypingDTO | null> = this.chatStateService.typingStatus$;

  public messageInput: string = '';
  private subscriptions: Subscription = new Subscription();

  // Идентификация текущего пользователя
  public currentUserId: number ;
  public currentUsername: string;

  // Логика для уведомления о печати
  private isTyping: boolean = false;
  private typingTimeout: any;

  constructor() {
    // Получаем данные пользователя при создании компонента
    this.currentUserId = this.tokenService.getIdFromToken();
    this.currentUsername = this.tokenService.getUsernameFromToken();
  }

  ngOnInit(): void {
    this.subscriptions.add(
      this.messages$.subscribe(() => {
        setTimeout(() => this.scrollToBottom(), 0);
      })
    );
  }

  getConversationTitle(conversation: ConversationDTO): string {
    if (!conversation.participants || conversation.participants.length < 2) {
      return `Чат #${conversation.id}`;
    }

    const otherParticipant = conversation.participants.find(
      (p: User) => p.id !== this.currentUserId
    );

    return otherParticipant ? otherParticipant.username : 'Групповой чат';
  }

  sendMessage(): void {
    if (!this.messageInput.trim() || !this.conversation.id) {
      return;
    }

    const messageDto: MessageDTO = {
      content: this.messageInput,
      conversationId: this.conversation.id,
      senderId: this.currentUserId, // Отправляем ID отправителя
      createdAt: new Date(),
      status: 'SENT' as any
    };

    this.chatService.sendMessage(messageDto);
    this.messageInput = ''; // Очистка поля ввода
    this.sendTypingStatus(false); // Сброс статуса "печатает"
  }

  onInputChange(): void {
    if (!this.isTyping) {
      this.isTyping = true;
      this.sendTypingStatus(true);
    }

    clearTimeout(this.typingTimeout);

    // Если в течение 1.5 сек нет ввода, сбросить статус
    this.typingTimeout = setTimeout(() => {
      this.isTyping = false;
      this.sendTypingStatus(false);
    }, 1500);
  }

  private sendTypingStatus(isTyping: boolean): void {
    const typingDto: TypingDTO = {
      conversationId: this.conversation.id,
      username: this.currentUsername,
      isTyping: isTyping
    };
    this.chatService.sendTypingNotification(typingDto);
  }

  private scrollToBottom(): void {
    if (this.messageContainer) {
      const element = this.messageContainer.nativeElement;
      element.scrollTop = element.scrollHeight;
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    // Очищаем таймер при уничтожении компонента
    clearTimeout(this.typingTimeout);
  }
}
