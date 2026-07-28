import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface User {
  user_id: string;
  email: string;
  username: string;
  travel_preferences?: string;
}

export interface LoginResponse {
  token: string;
  user: User;
  message: string;
}

export interface SignupRequest {
  email: string;
  password: string;
  username: string;
  travel_preferences?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiUrl;
  private tokenKey = 'auth_token';
  private userKey = 'current_user';

  private currentUserSubject: BehaviorSubject<User | null>;
  public currentUser: Observable<User | null>;

  constructor(private http: HttpClient) {
    const storedUser = localStorage.getItem(this.userKey);
    this.currentUserSubject = new BehaviorSubject<User | null>(
      storedUser ? JSON.parse(storedUser) : null
    );
    this.currentUser = this.currentUserSubject.asObservable();
  }

  public get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  public isAuthenticated(): boolean {
    return !!this.getToken() && !!this.currentUserValue;
  }

  public getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/auth/login`, {
      email,
      password
    }).pipe(
      tap(response => {
        localStorage.setItem(this.tokenKey, response.token);
        localStorage.setItem(this.userKey, JSON.stringify(response.user));
        this.currentUserSubject.next(response.user);
      })
    );
  }

  signup(signupData: SignupRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/users`, signupData);
  }

  logout(): Observable<any> {
    const token = this.getToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    return this.http.post(`${this.apiUrl}/auth/logout`, {}, { headers }).pipe(
      tap(() => {
        localStorage.removeItem(this.tokenKey);
        localStorage.removeItem(this.userKey);
        this.currentUserSubject.next(null);
      })
    );
  }

  verifyToken(): Observable<any> {
    const token = this.getToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    return this.http.get(`${this.apiUrl}/auth/verify`, { headers });
  }

  getAuthHeaders(): HttpHeaders {
    const token = this.getToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }
}
