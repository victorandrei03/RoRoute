import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService, SurveyPayload } from '../../services/api.service';
import { AuthService, User } from '../../services/auth.service';

interface SurveyDataForm {
    userId: string | null;
    travelCompanion: string;
    duration: number | null;
    selectedAttractionTypes: string[];
    budget: number;
}

@Component({
    selector: 'app-survey',
    templateUrl: './survey.component.html',
    styleUrls: ['./survey.component.scss']
})
export class SurveyComponent implements OnInit {
    // Proprietăți de stare
    isLoading: boolean = false;
    errorMessage: string = '';
    successMessage: string = '';
    currentUser: User | null = null;

    // Datele formularului
    surveyData: SurveyDataForm = {
        userId: null,
        travelCompanion: 'Solo',
        duration: 5, 
        selectedAttractionTypes: [],
        budget: 500, 
    };

    // Opțiunile de atracții preluate din configurație
    attractionTypeOptions = [
        { value: "museum", label: "Museums" },
        { value: "attraction", label: "Tourist Attractions" },
        { value: "viewpoint", label: "Viewpoints" },
        { value: "artwork", label: "Artwork" },
        { value: "gallery", label: "Galleries" },
        { value: "theme_park", label: "Theme Parks" },
        { value: "zoo", label: "Zoos" },
        { value: "aquarium", label: "Aquariums" },
        { value: "picnic_site", label: "Picnic Sites" }
    ];

    constructor(
        private router: Router,
        private apiService: ApiService,
        private authService: AuthService
    ) { }

    ngOnInit(): void {
        this.authService.currentUser.subscribe(user => {
            this.currentUser = user;
            // Setează userId dacă utilizatorul este autentificat
            if (user) {
                this.surveyData.userId = user.user_id;
            }
        });

        // Redirecționare dacă nu este autentificat
        if (!this.authService.isAuthenticated()) {
            this.router.navigate(['/login']);
            return;
        }
    }

    /**
     * Adaugă sau elimină o valoare din array-ul selectedAttractionTypes 
     * în funcție de starea checkbox-ului.
     * @param event Evenimentul de la checkbox.
     * @param value Valoarea opțiunii (e.g., "museum").
     */
    onCheckboxChange(event: any, value: string) {
        if (event.target.checked) {
            // Adaugă valoarea dacă checkbox-ul este bifat și nu e deja prezent
            if (!this.surveyData.selectedAttractionTypes.includes(value)) {
                this.surveyData.selectedAttractionTypes.push(value);
            }
        } else {
            // Elimină valoarea dacă checkbox-ul este debifat
            const index = this.surveyData.selectedAttractionTypes.indexOf(value);
            if (index > -1) {
                this.surveyData.selectedAttractionTypes.splice(index, 1);
            }
        }
        console.log('Selected Attractions:', this.surveyData.selectedAttractionTypes);
    }

    onSubmitSurvey(): void {
        this.errorMessage = '';
        this.successMessage = '';

        if (!this.currentUser || !this.surveyData.userId) {
            this.errorMessage = 'You must be logged in to submit the survey.';
            return;
        }

        const durationDays = this.surveyData.duration || 1;

        const payload: SurveyPayload = {
            userId: this.surveyData.userId,
            travelCompanion: this.surveyData.travelCompanion,
            durationDays: durationDays,
            budgetEur: this.surveyData.budget,
            attractionPreferences: this.surveyData.selectedAttractionTypes,
        };

        this.isLoading = true;

        this.apiService.submitSurvey(payload).subscribe({
            next: (response) => {
                this.successMessage = 'Thank you! Your preferences have been saved. Redirecting...';
                console.log('Survey submission successful:', response);

                // Navigare după o scurtă întârziere
                setTimeout(() => {
                    this.router.navigate(['/home']);
                }, 1500);
            },
            error: (error) => {
                console.error('Survey submission error:', error);
                this.errorMessage = error.error?.error || 'Submission failed. Please try again.';
                this.isLoading = false;
            },
            complete: () => {
                this.isLoading = false;
            }
        });
    }

    goToHome(): void {
        this.router.navigate(['/home']);
    }
}