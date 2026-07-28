import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, SignupRequest } from '../../services/auth.service';

@Component({
  selector: 'app-signup',
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.scss']
})
export class SignupComponent implements OnInit {
  username: string = '';
  email: string = '';
  password: string = '';
  confirmPassword: string = '';
  travelPreferences: string = '';
  errorMessage: string = '';
  successMessage: string = '';
  isLoading: boolean = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) { }

  ngOnInit(): void {
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/home']);
    }
  }

  onSignup(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.username || !this.email || !this.password) {
      this.errorMessage = 'Please fill in all required fields';
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'Passwords do not match';
      return;
    }

    if (this.password.length < 6) {
      this.errorMessage = 'Password must be at least 6 characters long';
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(this.email)) {
      this.errorMessage = 'Please enter a valid email address';
      return;
    }

    this.isLoading = true;

    const signupData: SignupRequest = {
      username: this.username,
      email: this.email,
      password: this.password,
      travel_preferences: this.travelPreferences || undefined
    };

    this.authService.signup(signupData).subscribe({
      next: (response) => {
        console.log('Signup successful:', response);
        this.successMessage = 'Account created successfully! Redirecting to login...';
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 2000);
      },
      error: (error) => {
        console.error('Signup error:', error);
        this.errorMessage = error.error?.error || 'Signup failed. Please try again.';
        this.isLoading = false;
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }
}
