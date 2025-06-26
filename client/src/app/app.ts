import {Component, OnInit} from '@angular/core';
import {RouterOutlet} from '@angular/router';
import {NavigationComponent} from './layout/navigation/navigation.component';
import {ThemeService} from './services/theme.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    NavigationComponent
  ],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class App implements OnInit {


  ngOnInit(): void {
    this.themeService.loadThemeFromStorage();
  }

  constructor(private themeService: ThemeService) {
  }

  protected title = 'client';
}

