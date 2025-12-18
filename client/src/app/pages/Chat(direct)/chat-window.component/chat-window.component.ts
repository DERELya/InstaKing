import {Component, Input, OnInit, OnDestroy, ViewChild, ElementRef, inject, ChangeDetectorRef} from '@angular/core';
import { ChatStateService } from '../../../services/chat-state.service';
import { ChatService } from '../../../services/chat.service';
import { TokenStorageService } from '../../../services/token-storage.service';
import { Observable, Subscription } from 'rxjs';
import { MatIconButton } from '@angular/material/button';
import {AsyncPipe, DatePipe, NgForOf, NgIf, NgClass, NgStyle} from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ConversationDTO } from '../../../models/ConversationDTO';
import { MessageDTO } from '../../../models/MessageDTO';
import { FormsModule } from '@angular/forms';
import { TextFieldModule } from '@angular/cdk/text-field'
import {ImageUploadService} from '../../../services/image-upload.service';
import {MatMenuItem, MatMenuModule, MatMenuTrigger} from '@angular/material/menu';

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
    TextFieldModule,
    MatMenuModule,
    MatMenuTrigger,
    MatMenuItem,
    NgStyle
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
  public typingUser$ = this.chatStateService.typingUser$;

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
        this.imageService.getProfileImageUrl(this.getConversationTitle());
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
      content: this.messageInput.trim(),
      conversationId: this.conversation.id,
      senderId: this.currentUserId,
      createdAt: new Date(),
      status: 'SENT' as any
    };

    this.chatService.sendMessage(messageDto);
    this.messageInput = '';
  }

  onEnter(event: Event): void {
    const e = event as KeyboardEvent;
    if (!e.shiftKey) {
      e.preventDefault();
      this.sendMessage();
    }
  }


  onTyping(): void {
    const now = Date.now();
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
    this.chatStateService.clearActiveConversation();
  }

  trackByMessageId(index: number, message: MessageDTO): number | string {
    return message.id || index;
  }


  deleteMessage(messageId: number) {
    if(confirm('Удалить сообщение?')) {
      this.chatStateService.deleteMessage(messageId).subscribe({
        error: (err) => console.error('Ошибка удаления', err)
      });
    }
  }

  getAvatarColor(): string {
    const name = this.getConversationTitle();
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    return '#' + '00000'.substring(0, 6 - c.length) + c;
  }

  getAvatarInitials(): string {
    const title = this.getConversationTitle();
    return title ? title.slice(0, 2).toUpperCase() : '??';
  }
}
