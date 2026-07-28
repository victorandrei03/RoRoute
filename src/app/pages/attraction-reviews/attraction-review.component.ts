// pages/attraction-reviews/attraction-reviews.component.ts

import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService, Review, RatingSummary } from '../../services/api.service';
import { AuthService, User } from '../../services/auth.service';

@Component({
    selector: 'app-attraction-reviews',
    templateUrl: './attraction-reviews.component.html',
    styleUrls: ['./attraction-reviews.component.scss']
})
export class AttractionReviewsComponent implements OnInit {
    attractionId: string = '';
    attractionName: string = 'Attraction';
    reviews: Review[] = [];
    ratingSummary: RatingSummary = { average: 0, count: 0 };
    isLoading = true;
    isLoggedIn = false;
    currentUser: User | null = null;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private apiService: ApiService,
        private authService: AuthService
    ) { }

    ngOnInit(): void {
        this.isLoggedIn = this.authService.isAuthenticated();

        // Extrage ID-ul atracției din URL (definit în app-routing)
        this.attractionId = this.route.snapshot.paramMap.get('id') || '';

        this.currentUser = this.authService.currentUserValue;

        // Extrage numele atracției din query params (trimis din map.component.ts)
        this.attractionName = this.route.snapshot.queryParams['name'] || this.attractionName;

        if (this.attractionId) {
            this.loadReviewsAndRating();
        } else {
            console.error('Attraction ID is missing from URL. Cannot load reviews.');
            this.isLoading = false;
            this.attractionName = 'Error: Attraction ID Missing';
        }
    }

    loadReviewsAndRating() {
        this.isLoading = true;

        // Încarcă Ratingul Mediu
        this.apiService.getAttractionRating(this.attractionId).subscribe({
            next: (summary) => {
                this.ratingSummary = summary;
            },
            error: (err) => {
                console.error('Failed to load rating summary', err);
            }
        });

        // Încarcă Recenziile
        this.apiService.getAttractionReviews(this.attractionId).subscribe({
            next: (reviews) => {
                // Recenziile vin cu userName-ul deja atasat de backend (vezi app.py)
                this.reviews = reviews.sort((a, b) => new Date(b.created || 0).getTime() - new Date(a.created || 0).getTime());
                this.isLoading = false;
            },
            error: (err) => {
                console.error('Failed to load reviews', err);
                this.isLoading = false;
            }
        });
    }

    // Navigare către formularul de adăugare recenzie
    goToAddReview() {
        if (!this.isLoggedIn) {
            this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
            return;
        }
        this.router.navigate(['/attractions', this.attractionId, 'add-review'], {
            queryParams: { name: this.attractionName }
        });
    }

    getStarRating(rating: number): string {
        const fullStar = '★';
        const emptyStar = '☆';
        const fullStars = fullStar.repeat(Math.floor(rating));
        const emptyStars = emptyStar.repeat(5 - Math.floor(rating));
        return fullStars + emptyStars;
    }
    isMyReview(review: Review): boolean {
        return this.isLoggedIn && !!this.currentUser && review.user_id === this.currentUser.user_id;
    }

    goToEditReview(review: Review) {
        if (!review.id) {
            console.error('Review ID missing for edit operation.');
            return;
        }
        this.router.navigate(['/attractions', this.attractionId, 'edit-review', review.id], {
            queryParams: { name: this.attractionName }
        });
    }

    deleteReview(review: Review) {
        if (!review.id) {
            console.error('Review ID missing for delete operation.');
            return;
        }

        if (confirm('Are you sure you want to delete this review?')) {
            this.isLoading = true;
            this.apiService.deleteReview(review.id).subscribe({
                next: () => {
                    console.log('Review deleted successfully');
                    this.loadReviewsAndRating();
                },
                error: (err) => {
                    console.error('Failed to delete review', err);
                    alert('Failed to delete review. Please try again.');
                    this.isLoading = false;
                }
            });
        }
    }
}