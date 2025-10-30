import {ChangeDetectorRef, Component, Inject, OnDestroy, OnInit} from '@angular/core';
import {MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
import {Story} from '../../models/Story';
import {StoryService} from '../../services/story.service';
import {interval, of, Subject, Subscription, takeUntil, catchError, map} from 'rxjs';
import {ImageUploadService} from '../../services/image-upload.service';
import {AsyncPipe, JsonPipe, NgForOf, NgIf} from '@angular/common';

@Component({
  selector: 'app-story-viewer',
  templateUrl: './story-viewer.component.html',
  styleUrls: ['./story-viewer.component.css'],
  standalone: true,
  imports: [NgForOf, AsyncPipe, JsonPipe, NgIf]
})
export class StoryViewerComponent implements OnInit, OnDestroy {
  stories: Story[] = [];
  currentIndex = 0;
  progress = 0;
  intervalSub?: Subscription;
  storyDuration = 5000;
  userImages: { [key: string]: string } = {};

  private destroy$ = new Subject<void>();
  private contentCache = new Map<string, string>(); // mediaUrl → blobUrl

  constructor(
    private dialogRef: MatDialogRef<StoryViewerComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { stories: Story[], startIndex: number },
    private storyService: StoryService,
    private imageService: ImageUploadService,
    private cd: ChangeDetectorRef,
  ) {
    this.stories = data.stories;
    this.currentIndex = data.startIndex || 0;
  }

  ngOnInit(): void {
    this.loadCurrentStoryImage();
    this.markViewed();
    console.log('Stories loaded:', this.stories);
    this.startProgress();
    console.log(this.stories[this.currentIndex].usersViewed);
  }

  ngOnDestroy() {
    if (this.intervalSub) this.intervalSub.unsubscribe();
    this.destroy$.next();
    this.destroy$.complete();

    // Освобождаем blob URLs
    this.contentCache.forEach(url => URL.revokeObjectURL(url));
    this.contentCache.clear();
  }

  startProgress() {
    this.progress = 0;
    const step = 100 / (this.storyDuration / 100);
    this.intervalSub = interval(100).subscribe(() => {
      this.progress += step;
      if (this.progress >= 100) {
        this.nextStory();
      }
    });
  }

  resetProgress() {
    this.progress = 0;
    this.intervalSub?.unsubscribe();
    this.startProgress();
  }

  markViewed() {
    const story = this.stories[this.currentIndex];
    if (!story.viewed) {
      this.storyService.addView(story.id).subscribe();
      story.viewed = true;
    }
  }

  nextStory() {
    if (this.currentIndex < this.stories.length - 1) {
      this.currentIndex++;
      this.loadCurrentStoryImage();
      this.markViewed();
      this.resetProgress();
    } else {
      this.closeViewer();
    }
  }

  prevStory() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.loadCurrentStoryImage();
      this.resetProgress();
    }
  }

  closeViewer() {
    if (this.intervalSub) this.intervalSub.unsubscribe();
    this.dialogRef.close();
  }



  /** Загружает картинку только один раз и кэширует её */
  loadCurrentStoryImage() {
    const story = this.stories[this.currentIndex];

    // если blob уже есть, не загружаем снова
    if (story.blobUrl) return;

    // если mediaUrl уже blob, не нужно идти на сервер
    if (story.mediaUrl?.startsWith('blob:')) {
      story.blobUrl = story.mediaUrl;
      return;
    }

    this.storyService.getContentForStory(story.mediaUrl).subscribe({
      next: (blob) => {
        story.blobUrl = URL.createObjectURL(blob);
        this.cd.detectChanges();
      },
      error: () => {
        story.blobUrl = 'assets/placeholder.jpg';
        this.cd.detectChanges();
      }
    });
    console.log(story);
  }

  /** Загрузка аватарок пользователей */
  getUserImage(username?: string): string {
    if (!username) return 'assets/placeholder.jpg';
    if (this.userImages[username]) return this.userImages[username];

    this.userImages[username] = 'assets/placeholder.jpg';
    this.imageService.getImageToUser(username)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: blob => {
          const preview = URL.createObjectURL(blob);
          this.userImages[username] = preview;
          this.cd.markForCheck();
        },
        error: () => {
          this.userImages[username] = 'assets/placeholder.jpg';
          this.cd.markForCheck();
        }
      });

    return this.userImages[username];
  }

  getStoryUsersViewedDetailed(story: Story): { username: string; viewedAt: string }[] {
    if (!story.usersViewed) return [];
    return Object.entries(story.usersViewed).map(([username, viewedAt]) => ({
      username,
      viewedAt: typeof viewedAt === 'string' ? viewedAt : String(viewedAt)
    }));
  }


  openViewsList(story: Story) {
    const viewers = this.getStoryUsersViewedDetailed(story);

    if (viewers.length === 0) {
      alert('Пока никто не посмотрел эту сторис 👀');
      return;
    }

    const formatted = viewers
      .map(v => `${v.username} — ${new Date(v.viewedAt).toLocaleString()}`)
      .join('\n');

    alert(`Просмотрели:\n\n${formatted}`);
  }




  trackByUsername(index: number, username: string): string {
    return username;
  }
}
