import { Component, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { ApiService, Itinerary } from "../../services/api.service";
import { AuthService, User } from "../../services/auth.service";

@Component({
    selector: 'app-home',
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
    featuredItineraries: Itinerary[] = [];
    isLoading = true;
    currentUser: User | null = null;

    features = [
        {
            icon: 'map',
            title: 'Interactive Map',
            description: 'Explore thousands of tourist attractions across Romania with our interactive map'
        },
        {
            icon: 'route',
            title: 'Smart Route Planning',
            description: 'Our algorithm optimizes your route to visit maximum attractions efficiently'
        },
        {
            icon: 'share',
            title: 'Share & Discover',
            description: 'Create itineraries and share them with the community, or discover popular routes'
        },
        {
            icon: 'star',
            title: 'Rate & Review',
            description: 'Help others by rating itineraries and sharing your travel experiences'
        }
    ];

    constructor(
        private router: Router,
        private apiService: ApiService,
        private authService: AuthService
    ) { }

    ngOnInit() {
        this.authService.currentUser.subscribe(user => {
            this.currentUser = user;
        });
        this.loadFeaturedItineraries();
    }

    loadFeaturedItineraries() {
        this.apiService.getItineraries(undefined, 6).subscribe({
            next: (itineraries) => {
                this.featuredItineraries = itineraries;
                this.isLoading = false;
            },
            error: (err) => {
                console.error('Error loading itineraries:', err);
                this.isLoading = false;
            }
        });
    }

    goToMap() {
        this.router.navigate(['/map']);
    }

    goToItineraries() {
        this.router.navigate(['/itinerary-feed']);
    }

    viewItinerary(id: string) {
        this.router.navigate(['/itinerary-feed', id]);
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
    goToSurvey() {
        this.router.navigate(['/survey']);
    }
}