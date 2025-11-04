export interface User{
  id:number;
  email: string;
  username: string;
  firstname: string;
  lastname: string;
  bio?: string| undefined;
  avatarUrl?: string;
}
