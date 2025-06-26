import {ApplicationConfig, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection} from '@angular/core';
import {provideRouter} from '@angular/router';

import {routes} from './app.routes';
import {provideClientHydration, withEventReplay} from '@angular/platform-browser';
import {authInterceptorProviders} from './helper/auth-interceptor';
import {authErrorInterceptorProvider} from './helper/error-interceptor';
import {provideHttpClient, withFetch, withInterceptorsFromDi} from '@angular/common/http';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes), provideClientHydration(withEventReplay()),
    provideHttpClient(withFetch(), withInterceptorsFromDi()),
    ...authInterceptorProviders,
    ...authErrorInterceptorProvider,
    provideRouter(routes)
  ]
};
