import { Component, OnDestroy, OnInit, inject, Renderer2, Inject } from '@angular/core';
import { DOCUMENT, AsyncPipe, NgIf } from '@angular/common';
import { Observable, Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

// Сервисы
import { ChatStateService } from '../../../services/chat-state.service';
// ChatService здесь нужен, если ты используешь какие-то его методы внутри (кроме connect),
// но если нет - можно убрать. Оставим на всякий случай.
import { ChatService } from '../../../services/chat.service';

// Компоненты
import { ConversationDTO } from '../../../models/ConversationDTO';
import { ChatListComponent } from '../chat-list.component/chat-list.component';
import { ChatWindowComponent } from '../chat-window.component/chat-window.component';
import { MatDialog } from '@angular/material/dialog';
import { UserSelection } from '../user-selection.component/user-selection.component';

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
  // Инжектим сервисы
  private chatService = inject(ChatService);
  private chatStateService = inject(ChatStateService);
  private dialog = inject(MatDialog);
  private renderer = inject(Renderer2);
  private document = inject(DOCUMENT);

  private subs = new Subscription();

  // Поток активного чата
  public activeConversation$: Observable<ConversationDTO | null> = this.chatStateService.activeConversation$;

  constructor() {}

  ngOnInit(): void {
    this.renderer.addClass(this.document.body, 'chat-mode-locked');
    this.renderer.addClass(this.document.documentElement, 'chat-mode-locked');

    this.subs.add(this.chatStateService.getConversations().subscribe());
  }

  openUserSelectionModal(): void {
    const dialogRef = this.dialog.open(UserSelection, {
      width: '400px',
      maxHeight: '80vh',
      panelClass: 'user-selection-modal'
    });

    this.subs.add(
      dialogRef.afterClosed().pipe(
        filter(user => !!user)
      ).subscribe(user => {
        this.chatStateService.loadConversationByUserId(user.id);
      })
    );
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();

    this.chatStateService.clearActiveConversation();

    this.renderer.removeClass(this.document.body, 'chat-mode-locked');
    this.renderer.removeClass(this.document.documentElement, 'chat-mode-locked');
  }
}
