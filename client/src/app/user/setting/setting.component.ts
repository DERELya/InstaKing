import { Component } from '@angular/core';
import {ThemeService} from '../../services/theme.service';
import {MatIcon} from '@angular/material/icon';
import {MatSlideToggle} from '@angular/material/slide-toggle';
import {MatCard, MatCardTitle} from '@angular/material/card';
import {NgIf} from '@angular/common';
@Component({
  selector: 'app-setting.component',
  imports: [
    MatIcon,
    MatSlideToggle,
    MatCardTitle,
    MatCard,
    NgIf
  ],
  templateUrl: './setting.component.html',
  styleUrl: './setting.component.css'
})
export class SettingComponent {


  constructor(
    public themeService: ThemeService) {
  }
  toggleTheme() {
    this.themeService.toggleTheme();
  }

  isDarkTheme(): boolean {
    return this.themeService.isDarkTheme();
  }

}
