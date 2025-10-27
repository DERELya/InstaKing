import {PostComment} from './PostComment';
export interface Post{
  id?:number;
  title: string;
  location: string;
  caption: string;
  image?: string;
  likes?: number;
  usersLiked?: string[];
  comments?: PostComment [];
  username?: string;
  createdAt?: string;
  commentCount?: number;
  favorited?: boolean;
}
