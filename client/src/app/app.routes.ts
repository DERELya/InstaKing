import {Routes} from '@angular/router';
import {LoginComponent} from './auth/login/login.component';
import {RegisterComponent} from './auth/register/register.component';
import {IndexComponent} from './layout/index/index.component';
import {AuthGuard} from './helper/auth-guard';
import {ProfileComponent} from './user/profile/profile.component';
import {UserPostsComponent} from './user/user-posts/user-posts.component';
import {AddPostComponent} from './user/add-post/add-post.component';

export const routes: Routes = [
  {path: 'login', component: LoginComponent},
  {path: 'register', component: RegisterComponent},
  {path: 'main', component: IndexComponent, canActivate: [AuthGuard]},
  {
    path: 'profile/:username',
    canActivate: [AuthGuard],
    component: ProfileComponent,
    children: [
      { path: '', component: UserPostsComponent }      // /profile/:username// /profile/:username/add
    ]
  },
  {path: '', redirectTo: 'main', pathMatch: 'full'}
];

