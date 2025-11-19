import {Routes} from '@angular/router';
import {LoginComponent} from './auth/login/login.component';
import {RegisterComponent} from './auth/register/register.component';
import {IndexComponent} from './layout/index/index.component';
import {AuthGuard} from './helper/auth-guard';
import {ProfileComponent} from './pages/user/profile/profile.component';
import {UserPostsComponent} from './pages/user/user-posts/user-posts.component';
import {UserFavoriteComponent} from './pages/user/user-favorite/user-favorite.component';
import {SettingComponent} from './pages/setting/setting.component';
import {ArchiveStoryComponent} from './pages/story/archive-story/archive-story.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'main', component: IndexComponent, canActivate: [AuthGuard] },
  {
    path: 'profile/:username',
    canActivate: [AuthGuard],
    component: ProfileComponent,
    children: [
      { path: '', redirectTo: 'posts', pathMatch: 'full' },
      { path: 'posts', component: UserPostsComponent },
      { path: 'saved', component: UserFavoriteComponent},
      { path: 'archive', component: ArchiveStoryComponent}
    ]
  },
  {path:'settings',canActivate: [AuthGuard], component: SettingComponent},
  { path: '', redirectTo: 'main', pathMatch: 'full' }
];


