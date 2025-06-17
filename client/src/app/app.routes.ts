import { Routes } from '@angular/router';
import {LoginComponent} from './auth/login/login.component';
import {RegisterComponent} from './auth/register/register.component';
import {App} from './app';
import {IndexComponent} from './layout/index/index.component';
import {AuthGuard} from './helper/auth-guard';

export const routes: Routes = [
  {path: 'login',component:LoginComponent},
  {path: 'register',component:RegisterComponent},
  {path: 'main',component: IndexComponent,canActivate: [AuthGuard]},
  {path: '',redirectTo: 'main' ,pathMatch:'full'}
];
