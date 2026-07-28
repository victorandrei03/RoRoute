// pages/add-review/add-review.component.ts

import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService, Review } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { Observable } from 'rxjs';

@Component({
    selector: 'app-add-review',
    templateUrl: './add-review.component.html',
    styleUrls: ['./add-review.component.scss']
})
export class AddReviewComponent implements OnInit {
    attractionId: string = '';
    attractionName: string = 'Attraction';
    userId: string = '';
    reviewId: string | null = null;
    isEditMode: boolean = false;

    rating: number = 5; // Default rating
    comment: string = '';

    isLoading = false;
    errorMessage: string = '';
    successMessage: string = '';

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private apiService: ApiService,
        private authService: AuthService
    ) { }

    ngOnInit(): void {
        //  Extrage ID-ul atracției
        this.attractionId = this.route.snapshot.paramMap.get('id') || '';
        this.attractionName = this.route.snapshot.queryParams['name'] || this.attractionName;

        this.reviewId = this.route.snapshot.paramMap.get('reviewId');
        this.isEditMode = !!this.reviewId;

        //  Extrage ID-ul utilizatorului autentificat
        const currentUser = this.authService.currentUserValue;
        if (currentUser && currentUser.user_id) {
            this.userId = currentUser.user_id;
        } else {
            this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
        }

        if (this.isEditMode && this.reviewId) {
            this.isLoading = true;
            this.apiService.getReview(this.reviewId).subscribe({
                next: (review) => {
                    this.rating = review.rating;
                    this.comment = review.comment;
                    this.isLoading = false;
                },
                error: (error) => {
                    console.error('Failed to load review for edit:', error);
                    this.errorMessage = 'Could not load review data for editing.';
                    this.isLoading = false;
                }
            });
        }
    }

    // Setează ratingul la click pe o stea
    setRating(newRating: number): void {
        this.rating = newRating;
    }

    // Helper pentru a genera stelele de rating în formular
    getStarArray(): number[] {
        return [1, 2, 3, 4, 5];
    }

    onSubmit(): void {
        this.errorMessage = '';
        this.successMessage = '';

        if (this.rating < 1 || this.rating > 5) {
            this.errorMessage = 'Please select a valid rating between 1 and 5.';
            return;
        }

        if (!this.comment || this.comment.length < 5) {
            this.errorMessage = 'Please provide a comment of at least 5 characters.';
            return;
        }

        if (!this.userId) {
            this.errorMessage = 'User not authenticated.';
            return;
        }

        this.isLoading = true;
        this.errorMessage = '';
        this.successMessage = '';

        const reviewPayload: Partial<Review> = {
            rating: this.rating,
            comment: this.comment,
            user_id: this.userId,
            attraction_id: this.attractionId,
        };

        let submitObservable: Observable<any>;
        let successMsg: string;

        if (this.isEditMode && this.reviewId) {
            // MODUL EDITARE: Apelăm metoda de Actualizare (PUT)
            submitObservable = this.apiService.updateReview(this.reviewId, reviewPayload);
            successMsg = 'Review updated successfully!';
        } else {
            // MODUL ADĂUGARE: Apelăm metoda de Creare (POST)
            submitObservable = this.apiService.submitReview(reviewPayload as Review);
            successMsg = 'Review submitted successfully!';
        }

        submitObservable.subscribe({
            next: (response) => {
                this.successMessage = successMsg;
                this.isLoading = false;

                // Navighează înapoi la pagina de recenzii după 2 secunde
                setTimeout(() => {
                    this.router.navigate(['/attractions', this.attractionId, 'reviews'], {
                        queryParams: { name: this.attractionName }
                    });
                }, 2000);
            },
            error: (error) => {
                console.error('Operation failed:', error);
                this.errorMessage = error.error?.error || (this.isEditMode ? 'Review update failed.' : 'Review submission failed.');
                this.isLoading = false;
            }
        });
    }
}