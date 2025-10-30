
export interface Story {
  id: number;
  username: string;
  mediaUrl: string;
  views: number;
  createdAt: string;
  expiresAt: string;
  usersViewed?: { username: string, viewedAt: string }[] | null;
  viewed?: boolean;
  avatarUrl?: string;
  blobUrl?: string;
}




