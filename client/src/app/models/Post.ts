import {PostComment} from './PostComment';
import {LikedUser} from './LikedUser';
export interface Post{
  id?:number;
  title: string;
  location: string;
  caption: string;
  image?: string;
  likes?: number;
  usersLiked?: LikedUser[];
  comments?: PostComment [];
  username?: string;
  createdAt?: string;
  commentCount?: number;
  favorited?: boolean;
  addedAt?: string;
}

