import {Component, OnInit} from '@angular/core';
import {User} from '../../models/User';
import {TokenStorageService} from '../../services/token-storage.service';
import {UserService} from '../../services/user.service';
import {Router, RouterLink} from '@angular/router';
import {MatToolbar} from '@angular/material/toolbar';
import {MatMenu, MatMenuItem, MatMenuTrigger} from '@angular/material/menu';
import {MatIconButton} from '@angular/material/button';
import {MatIcon} from '@angular/material/icon';
import {MatTooltip} from '@angular/material/tooltip';

@Component({
  selector: 'app-navigation',
  imports: [
    MatIcon,
    MatToolbar,
    RouterLink,
    MatTooltip,
    MatMenu,
    MatMenuItem,
    MatIconButton,
    MatMenuTrigger,
  ],
  templateUrl: './navigation.component.html',
  styleUrl: './navigation.component.css'
})
export class NavigationComponent implements OnInit {

  isLoggedIn = false;
  isDataLoaded = false;
  user!: User;

  constructor(
    private tokenService: TokenStorageService,
    private userService: UserService,
    private router: Router) {
  }


  ngOnInit(): void {

    this.isLoggedIn = !!this.tokenService.getToken();
    if (this.isLoggedIn) {
      this.userService.getCurrentUser()
        .subscribe(data => {
          this.user = data;
          this.isDataLoaded = true;
        });
    }
  }

  logout(): void {
    this.tokenService.logOut();
    this.router.navigate(['/login']);
  }

}
