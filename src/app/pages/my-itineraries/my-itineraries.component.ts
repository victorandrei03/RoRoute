import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService, Itinerary } from '../../services/api.service';
import { AuthService, User } from '../../services/auth.service';

@Component({
  selector: 'app-my-itineraries',
  templateUrl: './my-itineraries.component.html',
  styleUrls: ['./my-itineraries.component.scss']
})
export class MyItinerariesComponent implements OnInit {
  itineraries: Itinerary[] = [];
  isLoading = true;
  errorMessage = '';
  currentUser: User | null = null;
  deletingId: string | null = null;
  postingId: string | null = null;

  constructor(
    private apiService: ApiService,
    private authService: AuthService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.authService.currentUser.subscribe(user => {
      this.currentUser = user;
      if (user) {
        this.loadItineraries(user.user_id);
      } else {
        this.isLoading = false;
      }
    });
  }

  loadItineraries(userId: string): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.apiService.getItineraries(userId).subscribe({
      next: (itineraries) => {
        this.itineraries = itineraries;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading itineraries:', err);
        this.errorMessage = 'Could not load your itineraries.';
        this.isLoading = false;
      }
    });
  }

  goToMap(): void {
    this.router.navigate(['/map']);
  }

  openItineraryOnMap(itinerary: Itinerary): void {
    if (!itinerary.id) {
      this.router.navigate(['/map']);
      return;
    }
    this.router.navigate(['/map'], { queryParams: { itineraryId: itinerary.id } });
  }

  deleteItinerary(itinerary: Itinerary): void {
    if (!itinerary.id || this.deletingId) {
      return;
    }

    const confirmed = confirm(`Delete "${itinerary.title}"? This cannot be undone.`);
    if (!confirmed) {
      return;
    }

    this.deletingId = itinerary.id;
    this.apiService.deleteItinerary(itinerary.id).subscribe({
      next: () => {
        this.itineraries = this.itineraries.filter(item => item.id !== itinerary.id);
        this.deletingId = null;
      },
      error: (err) => {
        console.error('Error deleting itinerary:', err);
        this.errorMessage = 'Could not delete itinerary.';
        this.deletingId = null;
      }
    });
  }

  postItinerary(itinerary: Itinerary): void {
    if (!itinerary.id || this.postingId || itinerary.posted) {
      return;
    }

    this.postingId = itinerary.id;
    const payload = {
      posted: true,
      postedAt: new Date().toISOString()
    };

    this.apiService.updateItinerary(itinerary.id, payload).subscribe({
      next: () => {
        itinerary.posted = true;
        itinerary.postedAt = payload.postedAt;
        this.postingId = null;
      },
      error: (err) => {
        console.error('Error posting itinerary:', err);
        this.errorMessage = 'Could not post itinerary.';
        this.postingId = null;
      }
    });
  }
}
