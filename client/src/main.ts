import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import {authInterceptorProviders} from './app/helper/auth-interceptor';

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
