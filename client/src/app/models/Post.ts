import {Comment} from './Comment';
export interface Post{
  id?:number;
  title: string;
  location: string;
  caption: string;
  image?: File;
  userLiked?: string[];
  comments?: Comment [];
  username?: string;
}
