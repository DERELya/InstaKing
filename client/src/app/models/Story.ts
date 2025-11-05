import {StoryUser} from './StoryUser';

export interface Story {
  id: number;
  username: string;
  mediaUrl: string;
  views: number;
  createdAt: string;
  expiresAt: string;
  usersViewed: StoryUser[] | null;
  viewed?: boolean;
  avatarUrl?: string;
  blobUrl?: string;
  description?: string;
}




