import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  email: string = '';
  password: string = '';
  errorMessage: string = '';
  isLoading: boolean = false;
  returnUrl: string = '/home';

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) { }

  ngOnInit(): void {
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/home';

    if (this.authService.isAuthenticated()) {
      this.router.navigate([this.returnUrl]);
    }
  }

  onLogin(): void {
    this.errorMessage = '';

    if (!this.email || !this.password) {
      this.errorMessage = 'Please enter both email and password';
      return;
    }

    this.isLoading = true;

    this.authService.login(this.email, this.password).subscribe({
      next: (response) => {
        console.log('Login successful:', response);
        this.router.navigate([this.returnUrl]);
      },
      error: (error) => {
        console.error('Login error:', error);
        this.errorMessage = error.error?.error || 'Login failed. Please check your credentials.';
        this.isLoading = false;
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  goToSignup(): void {
    this.router.navigate(['/signup']);
  }
}
