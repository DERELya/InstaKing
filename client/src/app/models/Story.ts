
export interface Story {
  id: number;
  username: string;
  imageUrl: string;        // мапим с mediaUrl
  views: number;
  createdAt: string;
  expiresAt: string;
  usersViewed: { username: string, viewedAt: string }[] | null;
  viewed?: boolean;
  avatarUrl?: string;
}




