import { ChangeDetectorRef, Component, inject, Inject, NgZone, OnDestroy, OnInit, EventEmitter, Output } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Story } from '../../../models/Story';
import { StoryService } from '../../../services/story.service';
import { ImageUploadService } from '../../../services/image-upload.service';
import { Subject, takeUntil } from 'rxjs';
import { DatePipe, NgForOf, NgIf } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatProgressBar } from '@angular/material/progress-bar';
import { UserService } from '../../../services/user.service';
import { User } from '../../../models/User';

@Component({
  selector: 'app-story-viewer',
  templateUrl: './story-viewer.component.html',
  styleUrls: ['./story-viewer.component.css'],
  standalone: true,
  imports: [NgForOf, NgIf, DatePipe, RouterLink, MatProgressBar],
})
export class StoryViewerComponent implements OnInit, OnDestroy {
  @Output() userChanged = new EventEmitter<number>();

  private storyService = inject(StoryService);
  public imageService = inject(ImageUploadService); // Для аватарок (статика)

  private cd = inject(ChangeDetectorRef);
  private zone = inject(NgZone);
  private router = inject(Router);
  private userService = inject(UserService);
  private dialogRef = inject(MatDialogRef<StoryViewerComponent>);

  groupedStories: { username: string; stories: Story[] }[] = [];
  currentUserIndex = 0;
  currentStoryIndex = 0;

  progress = 0;
  private storyPaused = false;
  private progressStartTime = 0;
  private rafId: number | null = null;
  private elapsedBeforePause = 0;

  // ВЕРНУЛИ: Переменная для хранения Blob URL текущей истории
  currentStoryBlobUrl: string | null = null;

  private destroy$ = new Subject<void>();
  private user!: User;
  showViewsModal = false;
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { groupedStories: { username: string; stories: Story[] }[] },
  ) {}

  ngOnInit(): void {
    this.userService.getCurrentUser().pipe(takeUntil(this.destroy$)).subscribe(data => {
      this.user = data;
      this.cd.markForCheck();
    });
    // ... сброс прогресса ...
    const data = this.data as any;
    if (!data.groupedStories?.length) return;

    this.groupedStories = data.groupedStories;
    this.currentUserIndex = data.startUserIndex || 0;
    this.currentStoryIndex = data.startStoryIndex || 0;

    // Загружаем контент истории (Blob)
    this.loadCurrentStoryContent();

    this.markViewed();
    this.startProgress();
  }

  ngOnDestroy(): void {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    // ВАЖНО: Чистим память от Blob
    if (this.currentStoryBlobUrl) {
      URL.revokeObjectURL(this.currentStoryBlobUrl);
    }
    this.destroy$.next();
    this.destroy$.complete();
  }


  get currentUserStories(): Story[] {
    const group = this.groupedStories[this.currentUserIndex];
    return group?.stories || [];
  }

  get currentStory(): Story | null {
    const userGroup = this.groupedStories[this.currentUserIndex];
    if (!userGroup?.stories?.length) return null;
    return userGroup.stories[this.currentStoryIndex];
  }
  loadCurrentStoryContent(): void {
    const story = this.currentStory;
    if (!story || !story.mediaUrl) return;

    // Очищаем старый URL перед загрузкой нового
    if (this.currentStoryBlobUrl) {
      URL.revokeObjectURL(this.currentStoryBlobUrl);
      this.currentStoryBlobUrl = null;
    }

    // Если мы уже кэшировали этот Blob внутри объекта story (опционально)
    if (story.blobUrl) {
      this.currentStoryBlobUrl = story.blobUrl;
      return;
    }

    this.storyService.getContentForStory(story.mediaUrl)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob) => {
          const objectUrl = URL.createObjectURL(blob);
          this.currentStoryBlobUrl = objectUrl;

          // Сохраняем в объект, чтобы не грузить повторно при перелистывании назад
          story.blobUrl = objectUrl;

          this.cd.markForCheck();
        },
        error: (err) => {
          console.error('Ошибка загрузки сторис', err);
          this.currentStoryBlobUrl = 'assets/placeholder.jpg'; // Фолбэк
          this.cd.markForCheck();
        }
      });
  }

  startProgress(): void {
    if (this.rafId) cancelAnimationFrame(this.rafId);

    this.progressStartTime = performance.now() - this.elapsedBeforePause;
    const duration = 7000;

    const step = (time: number) => {
      const elapsed = time - this.progressStartTime;
      const newProgress = Math.min((elapsed / duration) * 100, 100);

      this.zone.run(() => {
        this.progress = newProgress;
        this.cd.markForCheck();
      });

      if (newProgress >= 100) {
        this.elapsedBeforePause = 0;
        this.nextStory();
        return;
      }

      if (!this.storyPaused) {
        this.rafId = requestAnimationFrame(step);
      } else {
        this.elapsedBeforePause = elapsed;
      }
    };

    this.zone.runOutsideAngular(() => this.rafId = requestAnimationFrame(step));
  }

  pauseStory() {
    this.storyPaused = true;
  }

  resumeStory() {
    this.storyPaused = false;
    this.startProgress();
  }

  resetProgress() {
    this.progress = 0;
    this.elapsedBeforePause = 0;
    this.startProgress();
  }

  nextStory(): void {
    // ... логика переключения индексов ...
    const group = this.groupedStories[this.currentUserIndex];
    if (this.currentStoryIndex < group.stories.length - 1) {
      this.currentStoryIndex++;
    } else if (this.currentUserIndex < this.groupedStories.length - 1) {
      this.currentUserIndex++;
      this.currentStoryIndex = 0;
      this.userChanged.emit(this.currentUserIndex);
    } else {
      this.closeViewer();
      return;
    }

    // ВАЖНО: Загружаем новый контент
    this.loadCurrentStoryContent();
    this.markViewed();
    this.resetProgress();
  }

  prevStory(): void {
    // ... логика индексов ...
    if (this.currentStoryIndex > 0) {
      this.currentStoryIndex--;
    } else if (this.currentUserIndex > 0) {
      this.currentUserIndex--;
      const prevGroup = this.groupedStories[this.currentUserIndex];
      this.currentStoryIndex = prevGroup.stories.length - 1;
      this.userChanged.emit(this.currentUserIndex);
    }

    // ВАЖНО: Загружаем новый контент
    this.loadCurrentStoryContent();
    this.resetProgress();
  }

  closeViewer(): void {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.dialogRef.close();
  }

  markViewed(): void {
    const story = this.currentStory;
    if (!story || !this.user) return; // Ждем пока user загрузится

    if (!story.viewed) {
      this.storyService.addView(story.id).subscribe({
        next: () => {
          story.viewed = true;

          // Добавляем себя в список просмотров (локально)
          if (!story.usersViewed) story.usersViewed = [];

          story.usersViewed.push({
            id: this.user.id,
            username: this.user.username,
            viewedAt: new Date().toISOString(),
            avatarUrl: this.user.avatarUrl?? null
          });

          this.cd.markForCheck();
        },
        error: (err) => console.error('Ошибка при добавлении просмотра', err)
      });
    }
  }


  getAuthorAvatarUrl(): string {
    return this.imageService.getProfileImageUrl(this.currentStory?.userAvatarUrl);
  }

  getViewerAvatarUrl(filename: string | null | undefined): string {
    return this.imageService.getProfileImageUrl(filename);
  }

  openViewsList(): void {
    if (!this.currentStory?.usersViewed?.length) return;
    this.pauseStory();
    this.showViewsModal = true;
  }

  closeViewsList(): void {
    this.showViewsModal = false;
    this.resumeStory();
  }

  get isFirstStory(): boolean {
    return this.currentUserIndex === 0 && this.currentStoryIndex === 0;
  }

  get isLastStory(): boolean {
    const userGroup = this.groupedStories[this.currentUserIndex];
    const lastStoryIndex = userGroup.stories.length - 1;
    const lastUserIndex = this.groupedStories.length - 1;
    return this.currentUserIndex === lastUserIndex && this.currentStoryIndex === lastStoryIndex;
  }

  goToProfile() {
    this.closeViewer();
    this.closeViewsList();
  }
}
