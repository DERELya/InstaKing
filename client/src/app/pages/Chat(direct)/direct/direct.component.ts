import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { filter, Observable, Subscription } from 'rxjs';
import { ChatService } from '../../../services/chat.service';
import { ChatStateService } from '../../../services/chat-state.service';
import { MessageDTO } from '../../../models/MessageDTO';
import { ConversationDTO } from '../../../models/ConversationDTO';
import { ChatListComponent } from '../chat-list.component/chat-list.component';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ChatWindowComponent } from '../chat-window.component/chat-window.component';
import { AsyncPipe, NgIf } from '@angular/common';
import { UserSelection } from '../user-selection.component/user-selection.component';
import { MatDialog } from '@angular/material/dialog'; // ✅ Правильный импорт

@Component({
  selector: 'app-direct',
  // Убедись, что UserSelection импортирован, если DirectComponent standalone
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
  // ✅ Использование inject() для чистой инъекции
  private chatService = inject(ChatService);
  private chatStateService = inject(ChatStateService);
  private dialog = inject(MatDialog); // ✅ Инъекция MatDialog

  selectedChatUser: any = null;
  private subscriptions: Subscription = new Subscription();
  public activeConversation$: Observable<ConversationDTO | null>;

  // Инициализация Observable
  constructor() {
    this.activeConversation$ = this.chatStateService.activeConversation$;
  }

  ngOnInit(): void {
    this.chatService.connect();

    const newMessagesSub = this.chatService.newMessages$.pipe(
      filter((msg): msg is MessageDTO => !!msg)
    ).subscribe((msg: MessageDTO) => {
      this.chatStateService.addMessage(msg);
    });

    const typingSub = this.chatService.typingNotifications$.pipe(
      filter(typing => !!typing)
    ).subscribe(typing => {
      this.chatStateService.updateTypingStatus(typing);
    });

    this.subscriptions.add(newMessagesSub);
    this.subscriptions.add(typingSub);
  }

  onSelectConversation(conversation: ConversationDTO): void {
    this.chatStateService.setActiveConversation(conversation);
    // Очищаем selectedChatUser, так как активный чат теперь выбран из списка
    this.selectedChatUser = null;
  }

  openUserSelectionModal(): void {
    console.log("-> Запрос: ОТКРЫТИЕ ОКНА ВЫБОРА ПОЛЬЗОВАТЕЛЯ.");

    // Открываем модалку. Рекомендуется задать размеры для лучшего UX
    this.dialog.open(UserSelection, {
      width: '450px',
      maxHeight: '80vh',
    }).afterClosed().pipe(
      // ✅ Добавляем фильтр, чтобы обрабатывать только успешный выбор (не undefined)
      filter(user => !!user)
    ).subscribe(user => {
      // 'user' здесь — это объект User, который ты передал в dialogRef.close(user)
      this.startChatWith(user);
    });
  }

  startChatWith(user: any) {
    this.selectedChatUser = user;

    this.chatStateService.loadConversationByUserId(user.id);

    console.log(`Инициирован переход к чату с пользователем: ${user.username}`);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.chatService.disconnect();
  }
}
