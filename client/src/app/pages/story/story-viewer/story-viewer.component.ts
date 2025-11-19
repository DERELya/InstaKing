import {ChangeDetectorRef, Component, Inject, NgZone, OnDestroy, OnInit} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {Story} from '../../../models/Story';
import {StoryService} from '../../../services/story.service';
import {ImageUploadService} from '../../../services/image-upload.service';
import {Subject, takeUntil} from 'rxjs';
import {DatePipe, NgForOf, NgIf} from '@angular/common';
import {Router, RouterLink,RouterModule} from '@angular/router';
import {MatProgressBar} from '@angular/material/progress-bar';
import {UserService} from '../../../services/user.service';
import {User} from '../../../models/User';
import { EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-story-viewer',
  templateUrl: './story-viewer.component.html',
  styleUrls: ['./story-viewer.component.css'],
  standalone: true,
  imports: [NgForOf, NgIf, DatePipe, RouterLink, MatProgressBar],
})
export class StoryViewerComponent implements OnInit, OnDestroy {
  @Output() userChanged = new EventEmitter<number>();

  groupedStories: { username: string; stories: Story[] }[] = [];
  currentUserIndex = 0;
  currentStoryIndex = 0;

  progress = 0;
  private storyPaused = false;
  private progressStartTime = 0;
  private rafId: number | null = null;
  private elapsedBeforePause = 0;
  userImages: { [key: string]: string } = {};
  private destroy$ = new Subject<void>();
  private user! : User;

  showViewsModal = false;
  constructor(
    private dialogRef: MatDialogRef<StoryViewerComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { groupedStories: { username: string; stories: Story[] }[] },
    private storyService: StoryService,
    private imageService: ImageUploadService,
    private cd: ChangeDetectorRef,
    private zone: NgZone,
    private router: Router,
    private userService: UserService,
  ) {
  }

  ngOnInit(): void {
    this.userService.getCurrentUser().pipe(takeUntil(this.destroy$)).subscribe(data => {
      this.user = data;
      this.cd.markForCheck();
    });
    this.progress = 0;
    this.elapsedBeforePause = 0;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.storyPaused = false;

    const data = this.data as {
      groupedStories: { username: string; stories: Story[] }[],
      startUserIndex?: number,
      startStoryIndex?: number
    };

    if (!data.groupedStories?.length) return;

    this.groupedStories = data.groupedStories;
    this.currentUserIndex = data.startUserIndex || 0;
    this.currentStoryIndex = data.startStoryIndex || 0;

    this.loadCurrentStoryImage();
    this.markViewed();
    this.startProgress();
  }

  ngOnDestroy(): void {
    if (this.rafId) cancelAnimationFrame(this.rafId);
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
    const group = this.groupedStories[this.currentUserIndex];
    if (!group) return;

    if (this.currentStoryIndex < group.stories.length - 1) {
      this.currentStoryIndex++;
    } else if (this.currentUserIndex < this.groupedStories.length - 1) {
      this.currentUserIndex++;
      this.currentStoryIndex = 0;
      this.userChanged.emit(this.currentUserIndex); // вот это добавляем
    } else {
      this.closeViewer();
      return;
    }

    this.loadCurrentStoryImage();
    this.markViewed();
    this.resetProgress();
  }

  prevStory(): void {
    if (this.currentStoryIndex > 0) {
      this.currentStoryIndex--;
    } else if (this.currentUserIndex > 0) {
      this.currentUserIndex--;
      const prevGroup = this.groupedStories[this.currentUserIndex];
      this.currentStoryIndex = prevGroup.stories.length - 1;
      this.userChanged.emit(this.currentUserIndex); // и это тоже
    }
    this.loadCurrentStoryImage();
    this.resetProgress();
  }


  closeViewer(): void {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.dialogRef.close();
  }

  loadCurrentStoryImage(): void {
    const story = this.currentStory;
    if (!story) return;
    if (story.blobUrl) return;
    if (story.mediaUrl?.startsWith('blob:')) {
      story.blobUrl = story.mediaUrl;
      return;
    }

    this.storyService.getContentForStory(story.mediaUrl).subscribe({
      next: blob => {
        story.blobUrl = URL.createObjectURL(blob);
        this.cd.detectChanges();
      },
      error: () => {
        story.blobUrl = 'assets/placeholder.jpg';
        this.cd.detectChanges();
      },
    });
  }

  markViewed(): void {
    const story = this.currentStory;
    if (!story) return;

    if (!story.viewed) {
      this.storyService.addView(story.id).subscribe({
        next: () => {
          story.viewed = true;

          if (!story.usersViewed) story.usersViewed = [];
          story.usersViewed.push({
            id: Date.now(),
            username: this.user.username,
            viewedAt: new Date().toISOString()
          });

          this.cd.markForCheck();
        },
        error: (err) => console.error('Ошибка при добавлении просмотра', err)
      });
    }
  }


  getUserImage(username?: string): string {
    if (!username) return 'assets/placeholder.jpg';
    if (this.userImages[username]) return this.userImages[username];

    this.userImages[username] = 'assets/placeholder.jpg';
    this.imageService.getImageToUser(username)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: blob => {
          this.userImages[username] = URL.createObjectURL(blob);
          this.cd.markForCheck();
        },
        error: () => {
          this.userImages[username] = 'assets/placeholder.jpg';
          this.cd.markForCheck();
        },
      });

    return this.userImages[username];
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
