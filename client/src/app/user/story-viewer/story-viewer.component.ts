import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Story } from '../../models/Story';
import { StoryService } from '../../services/story.service';
import { interval, Subscription } from 'rxjs';

@Component({
  selector: 'app-story-viewer',
  templateUrl: './story-viewer.component.html',
  styleUrls: ['./story-viewer.component.css'],
  standalone: true,
})
export class StoryViewerComponent implements OnInit {
  stories: Story[] = [];
  currentIndex = 0;
  progress = 0;
  intervalSub?: Subscription;
  storyDuration = 5000; // 5 секунд на одну историю

  constructor(
    private dialogRef: MatDialogRef<StoryViewerComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { stories: Story[], startIndex: number },
    private storyService: StoryService
  ) {
    this.stories = data.stories;
    this.currentIndex = data.startIndex || 0;
  }

  ngOnInit(): void {
    this.markViewed();
    this.startProgress();
  }

  startProgress() {
    this.progress = 0;
    const step = 100 / (this.storyDuration / 100); // обновление каждые 100ms
    this.intervalSub = interval(100).subscribe(() => {
      this.progress += step;
      if (this.progress >= 100) {
        this.nextStory();
      }
    });
  }

  resetProgress() {
    this.progress = 0;
    if (this.intervalSub) {
      this.intervalSub.unsubscribe();
    }
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
      this.markViewed();
      this.resetProgress();
    } else {
      this.closeViewer();
    }
  }

  prevStory() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.resetProgress();
    }
  }

  closeViewer() {
    if (this.intervalSub) this.intervalSub.unsubscribe();
    this.dialogRef.close();
  }
}
