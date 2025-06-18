import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import {authInterceptorProviders} from './app/helper/auth-interceptor';
import {provideRouter} from '@angular/router';
import {routes} from './app/app.routes';
import {provideZoneChangeDetection} from '@angular/core';
import {noop} from 'rxjs';
import {provideHttpClient} from '@angular/common/http';

bootstrapApplication(App,{...appConfig,
providers: [
  ...appConfig.providers,
  provideRouter(routes),
  provideHttpClient(),
  authInterceptorProviders
]
})
  .catch((err) => console.error(err));
