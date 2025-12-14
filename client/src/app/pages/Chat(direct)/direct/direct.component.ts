import {Component, OnDestroy, OnInit, inject, Inject, Renderer2, DOCUMENT} from '@angular/core';
import { Observable, Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { ChatService } from '../../../services/chat.service';
import { ChatStateService } from '../../../services/chat-state.service';
import { ConversationDTO } from '../../../models/ConversationDTO';
import { ChatListComponent } from '../chat-list.component/chat-list.component';
import { ChatWindowComponent } from '../chat-window.component/chat-window.component';
import { MatDialog } from '@angular/material/dialog';
import { UserSelection } from '../user-selection.component/user-selection.component'; // Убедись, что путь верный
import { AsyncPipe, NgIf } from '@angular/common';

@Component({
  selector: 'app-direct',
  standalone: true,
  imports: [
    ChatListComponent,
    ChatWindowComponent,
    AsyncPipe,
    NgIf
  ],
  templateUrl: './direct.component.html',
  styleUrl: './direct.component.css'
})
export class DirectComponent implements OnInit, OnDestroy {
  private chatService = inject(ChatService);
  private chatStateService = inject(ChatStateService);
  private dialog = inject(MatDialog);

  private subs = new Subscription();
  constructor(
    private renderer: Renderer2,
    @Inject(DOCUMENT) private document: Document
  ) {

  }
  // Поток активного чата: если null, показываем заглушку "Выберите чат"
  public activeConversation$: Observable<ConversationDTO | null> = this.chatStateService.activeConversation$;

  ngOnInit(): void {
    // 1. Подключаем WebSocket
    this.chatService.connect();
    this.renderer.addClass(this.document.body, 'chat-mode-locked');
    this.renderer.addClass(this.document.documentElement, 'chat-mode-locked'); // html
    // 2. Загружаем список чатов (чтобы сайдбар не был пустым)
    this.subs.add(this.chatStateService.getConversations().subscribe());
  }

  /**
   * Открытие модалки для выбора пользователя и создание нового чата
   */
  openUserSelectionModal(): void {
    const dialogRef = this.dialog.open(UserSelection, {
      width: '400px',
      maxHeight: '80vh',
      panelClass: 'user-selection-modal' // Можно стилизовать модалку
    });

    this.subs.add(
      dialogRef.afterClosed().pipe(
        filter(user => !!user) // Продолжаем, только если юзер был выбран
      ).subscribe(user => {
        // Сервис сам создаст чат (или найдет старый) и сделает его активным
        this.chatStateService.loadConversationByUserId(user.id);
      })
    );
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();

    this.chatService.disconnect();


    this.chatStateService.clearActiveConversation();
    this.renderer.removeClass(this.document.body, 'chat-mode-locked');
    this.renderer.removeClass(this.document.documentElement, 'chat-mode-locked');

  }
}
