import {Comment} from './Comment';
export interface Post{
  id?:number;
  title: string;
  location: string;
  caption: string;
  image?: string;
  usersLiked?: string[];
  comments?: Comment [];
  username?: string;
}
