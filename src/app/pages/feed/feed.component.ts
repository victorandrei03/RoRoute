import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService, Itinerary, RatingSummary, Review } from '../../services/api.service';
import { AuthService, User } from '../../services/auth.service';

@Component({
  selector: 'app-feed',
  templateUrl: './feed.component.html',
  styleUrls: ['./feed.component.scss']
})
export class FeedComponent implements OnInit {
  itineraries: Itinerary[] = [];
  isLoading = true;
  errorMessage = '';
  currentUser: User | null = null;
  reviewPanels: { [key: string]: boolean } = {};
  reviewsByItinerary: { [key: string]: Review[] } = {};
  ratingsByItinerary: { [key: string]: RatingSummary } = {};
  reviewForms: {
    [key: string]: {
      rating: number;
      comment: string;
      submitting: boolean;
      error: string;
    };
  } = {};

  constructor(
    private apiService: ApiService,
    private authService: AuthService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.authService.currentUser.subscribe(user => {
      this.currentUser = user;
    });
    this.loadFeed();
  }

  loadFeed(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.apiService.getItineraries(undefined, 50, true).subscribe({
      next: (itineraries) => {
        this.itineraries = itineraries;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading feed with posted filter:', err);
        this.loadFeedFallback();
      }
    });
  }

  private loadFeedFallback(): void {
    this.apiService.getItineraries(undefined, 50).subscribe({
      next: (itineraries) => {
        this.itineraries = itineraries.filter(item => item.posted);
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading feed fallback:', err);
        this.errorMessage = 'Could not load feed.';
        this.isLoading = false;
      }
    });
  }

  openItineraryOnMap(itinerary: Itinerary): void {
    if (!itinerary.id) {
      this.router.navigate(['/map']);
      return;
    }
    this.router.navigate(['/map'], { queryParams: { itineraryId: itinerary.id } });
  }

  toggleReviews(itinerary: Itinerary): void {
    if (!itinerary.id) {
      return;
    }

    const isOpen = this.reviewPanels[itinerary.id];
    this.reviewPanels[itinerary.id] = !isOpen;

    if (!isOpen && !this.reviewsByItinerary[itinerary.id]) {
      this.loadReviews(itinerary.id);
    }
  }

  loadReviews(itineraryId: string): void {
    this.apiService.getItineraryRating(itineraryId).subscribe({
      next: (summary) => {
        this.ratingsByItinerary[itineraryId] = summary;
      },
      error: (err) => {
        console.error('Failed to load itinerary rating', err);
      }
    });

    this.apiService.getItineraryReviews(itineraryId).subscribe({
      next: (reviews) => {
        this.reviewsByItinerary[itineraryId] = reviews.sort(
          (a, b) => new Date(b.created || 0).getTime() - new Date(a.created || 0).getTime()
        );
      },
      error: (err) => {
        console.error('Failed to load itinerary reviews', err);
      }
    });
  }

  getRatingSummary(itinerary: Itinerary): RatingSummary {
    if (itinerary.id && this.ratingsByItinerary[itinerary.id]) {
      return this.ratingsByItinerary[itinerary.id];
    }
    return {
      average: itinerary.ratingAverage || 0,
      count: itinerary.ratingCount || 0
    };
  }

  getReviewForm(itineraryId: string) {
    if (!this.reviewForms[itineraryId]) {
      this.reviewForms[itineraryId] = {
        rating: 5,
        comment: '',
        submitting: false,
        error: ''
      };
    }
    return this.reviewForms[itineraryId];
  }

  getStarArray(): number[] {
    return [1, 2, 3, 4, 5];
  }

  setRating(itineraryId: string, rating: number): void {
    const form = this.getReviewForm(itineraryId);
    form.rating = rating;
  }

  submitReview(itinerary: Itinerary): void {
    if (!itinerary.id || !this.currentUser) {
      return;
    }

    const form = this.getReviewForm(itinerary.id);
    form.error = '';

    if (form.rating < 1 || form.rating > 5) {
      form.error = 'Please select a valid rating between 1 and 5.';
      return;
    }

    if (!form.comment || form.comment.trim().length < 5) {
      form.error = 'Please provide a comment of at least 5 characters.';
      return;
    }

    form.submitting = true;
    const payload: Review = {
      user_id: this.currentUser.user_id,
      itinerary_id: itinerary.id,
      rating: form.rating,
      comment: form.comment.trim()
    };

    this.apiService.submitReview(payload).subscribe({
      next: () => {
        form.submitting = false;
        form.comment = '';
        this.loadReviews(itinerary.id!);
      },
      error: (err) => {
        console.error('Failed to submit review', err);
        form.submitting = false;
        form.error = err.error?.error || 'Review submission failed.';
      }
    });
  }

  getStarDisplay(rating: number): string {
    const fullStar = '★';
    const emptyStar = '☆';
    const fullStars = fullStar.repeat(Math.floor(rating));
    const emptyStars = emptyStar.repeat(5 - Math.floor(rating));
    return fullStars + emptyStars;
  }
}
