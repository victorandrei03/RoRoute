import { Component, OnInit } from '@angular/core';
import { NavigationEnd, Event, Router } from '@angular/router';
import { AuthService, User } from './services/auth.service';

interface ITab {
  name: string;
  link: string;
  authRequired?: boolean;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})

export class AppComponent implements OnInit {

  allTabs: ITab[] = [
    {
      name: 'Home',
      link: '/home'
    },
    {
      name: 'Map',
      link: '/map'
    },
    {
      name: 'My itineraries',
      link: '/my-itineraries',
      authRequired: true
    },
    {
      name: 'Feed',
      link: '/feed',
      authRequired: true
    }
  ];

  tabs: ITab[] = [];
  activeTab = this.allTabs[0].link;
  currentUser: User | null = null;
  showUserMenu = false;

  constructor(
    private router: Router,
    private authService: AuthService
  ) {
    this.router.events.subscribe((event: Event) => {
      if (event instanceof NavigationEnd) {
        this.activeTab = event.url;
        console.log(event);
      }
    });
  }

  ngOnInit() {
    // Subscribe to user changes
    this.authService.currentUser.subscribe(user => {
      this.currentUser = user;
      this.updateTabs();
    });
  }

  updateTabs() {
    const isAuthenticated = !!this.currentUser;
    this.tabs = this.allTabs.filter(tab => !tab.authRequired || isAuthenticated);
  }

  logout() {
    this.authService.logout().subscribe({
      next: () => {
        this.router.navigate(['/login']);
      },
      error: (err) => {
        console.error('Logout error:', err);
        this.router.navigate(['/login']);
      }
    });
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }

  goToSignup() {
    this.router.navigate(['/signup']);
  }

  toggleUserMenu() {
    this.showUserMenu = !this.showUserMenu;
  }

  // See app.component.html
  mapLoadedEvent(status: boolean) {
    console.log('The map loaded: ' + status);
  }
}
