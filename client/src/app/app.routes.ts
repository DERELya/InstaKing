import {Routes} from '@angular/router';
import {LoginComponent} from './auth/login/login.component';
import {RegisterComponent} from './auth/register/register.component';
import {IndexComponent} from './layout/index/index.component';
import {AuthGuard} from './helper/auth-guard';
import {ProfileComponent} from './user/profile/profile.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'main', component: IndexComponent, canActivate: [AuthGuard] },
  {
    path: 'profile/:username',
    canActivate: [AuthGuard],
    component: ProfileComponent,
    children: [
      // По умолчанию открываем 'posts'
      { path: '', redirectTo: 'posts', pathMatch: 'full' },

      { path: 'posts', loadComponent: () => import('./user/user-posts/user-posts.component').then(m => m.UserPostsComponent) },
      { path: 'saved', loadComponent: () => import('./user/user-favorite/user-favorite.component').then(m => m.UserFavoriteComponent) }
    ]
  },
  { path: '', redirectTo: 'main', pathMatch: 'full' }
];


