import { Injectable } from '@angular/core';
import { OverlayContainer } from '@angular/cdk/overlay';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  constructor(private overlayContainer: OverlayContainer) {}

  setDarkTheme(): void {
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      document.body.classList.add('dark-theme');
      this.overlayContainer.getContainerElement().classList.add('dark-theme');
      window.localStorage.setItem('theme', 'dark');
    }
  }

  setLightTheme(): void {
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      document.body.classList.remove('dark-theme');
      this.overlayContainer.getContainerElement().classList.remove('dark-theme');
      window.localStorage.setItem('theme', 'light');
    }
  }

  toggleTheme(): void {
    if (this.isDarkTheme()) this.setLightTheme();
    else this.setDarkTheme();
  }

  isDarkTheme(): boolean {
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      return document.body.classList.contains('dark-theme');
    }
    return false;
  }

  loadThemeFromStorage(): void {
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      const theme = window.localStorage.getItem('theme');
      if (theme === 'dark') this.setDarkTheme();
      else this.setLightTheme();
    }
  }
}
