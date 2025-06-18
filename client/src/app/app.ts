import { Component } from '@angular/core';
import {provideRouter, RouterOutlet} from '@angular/router';
import {routes} from './app.routes';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet
  ],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class App {
  protected title = 'client';
}

