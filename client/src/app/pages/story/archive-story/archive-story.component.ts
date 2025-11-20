import {ChangeDetectorRef, Component, Inject, OnInit} from '@angular/core';
import {StoryService} from '../../../services/story.service';
import {MAT_DIALOG_DATA, MatDialog, MatDialogRef} from '@angular/material/dialog';
import {Story} from '../../../models/Story';
import {catchError, Observable, of, tap} from 'rxjs';
import {AsyncPipe, DatePipe, NgForOf, NgIf} from '@angular/common';
import {MatCard} from '@angular/material/card';
import {MatProgressSpinner} from '@angular/material/progress-spinner';
import {MatIcon} from '@angular/material/icon';
import {StoryViewerComponent} from '../story-viewer/story-viewer.component';

@Component({
  selector: 'app-archive-story',
  imports: [
    AsyncPipe,
    MatCard,
    NgForOf,
    NgIf,
    MatProgressSpinner,
    MatIcon,
    DatePipe
  ],
  templateUrl: './archive-story.component.html',
  styleUrl: './archive-story.component.css'
})
export class ArchiveStoryComponent implements OnInit {
  public isUserStoryLoaded: boolean = false;
  public story$: Observable<Story[]> | null = null;
  public stories: Story[] = [];
  groupedStories: { username: string; stories: Story[]; loaded?: boolean }[] = [];
  constructor(
    private cd: ChangeDetectorRef,
    private storyService: StoryService,
    private dialogRef: MatDialogRef<ArchiveStoryComponent>,
    private dialog: MatDialog,
    @Inject(MAT_DIALOG_DATA) public data: { username: string },

  ) {
  }

  ngOnInit(): void {
    console.log(this.data.username);
    this.loadStory();
  }

  private loadStory(): void {
    this.isUserStoryLoaded = false;

    this.story$ = this.storyService.getStoriesForUser(this.data.username).pipe(
      tap((stories) => {
        this.stories = stories;
        this.isUserStoryLoaded = true;
        stories.forEach(story => {
          this.loadCurrentStoryImage(story);
        });
      }),
      catchError(err => {
        console.error('Ошибка:', err);
        this.isUserStoryLoaded = true;
        return of([]);
      })
    );
  }
  loadCurrentStoryImage(story: Story): void {
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

  closeDialog(): void {
    this.dialogRef.close();
  }

  openFullStory(clickedStory: Story): void {
    const startStoryIndex = this.stories.findIndex(s => s.id === clickedStory.id);

    if (startStoryIndex === -1) {
      console.error("Кликнутая история не найдена в списке.");
      return;
    }


    const groupedStoriesForViewer = [
      {
        username: this.data.username,
        stories: this.stories
      }
    ];


    const startUserIndex = 0;


    const dialogRef = this.dialog.open(StoryViewerComponent, {
      width: '400px',
      data: {
        groupedStories: groupedStoriesForViewer,
        startUserIndex: startUserIndex,
        startStoryIndex: startStoryIndex
      }
    });

  }
}
