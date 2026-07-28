import { Injectable } from '@angular/core';
import {
    HttpRequest,
    HttpHandler,
    HttpEvent,
    HttpInterceptor
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

    constructor(private authService: AuthService) { }

    intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
        // 1. Obține tokenul salvat de la AuthService
        const token = this.authService.getToken();

        // 2. Clonează cererea originală și adaugă antetul de autorizare
        if (token) {
            // Verifică dacă tokenul există
            const cloned = request.clone({
                headers: request.headers.set('Authorization', 'Bearer ' + token)
            });
            return next.handle(cloned);
        }

        // Dacă nu există token, trimite cererea originală (sau nu o trimite, dar în contextul dvs., ar trebui să fie prezent)
        return next.handle(request);
    }
}