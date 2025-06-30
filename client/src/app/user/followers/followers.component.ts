import {Component, OnInit} from '@angular/core';
import {AsyncPipe, NgForOf, NgIf} from '@angular/common';
import {MatButton, MatIconButton} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {Observable, of} from 'rxjs';
import {User} from '../../models/User';

@Component({
  selector: 'app-followers.component',
  imports: [
    AsyncPipe,
    MatButton,
    MatIconModule,
    MatIconButton,
    NgForOf,
    NgIf
  ],
  templateUrl: './followers.component.html',
  styleUrl: './followers.component.css'
})
export class FollowersComponent implements OnInit{

  users$: Observable<User[]> = of([]);
  userImages: { [key: string]: string } = {};

  constructor() {
  }
  ngOnInit(): void {
  }

}
