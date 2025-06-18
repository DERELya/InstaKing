import {Component} from '@angular/core';
import {RouterOutlet} from '@angular/router';
import {NavigationComponent} from './layout/navigation/navigation.component';

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
export class App {
  protected title = 'client';
}

