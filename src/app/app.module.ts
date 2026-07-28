import { BrowserModule } from "@angular/platform-browser";
import { NgModule } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { HTTP_INTERCEPTORS, HttpClientModule } from "@angular/common/http";

import { AppComponent } from "./app.component";
import { MapComponent } from "./pages/map/map.component";
import { HomeComponent } from "./pages/home/home.component";
import { LoginComponent } from "./pages/login/login.component";
import { SignupComponent } from "./pages/signup/signup.component";
import { FirebaseService } from './services/firebase.service';
import { ApiService } from './services/api.service';
import { AuthService } from './services/auth.service';
import { AppRoutingModule } from "./app-routing.module";
import { AuthGuard } from './guards/auth.guard';

import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';
import { FlexLayoutModule } from '@angular/flex-layout';

import { SurveyComponent } from './pages/surveycomponent/survey.component';
import { AuthInterceptor } from './interceptors/auth.interceptors';
import { CommonModule } from '@angular/common';

import { RouterModule } from '@angular/router';
import { AttractionReviewsComponent } from './pages/attraction-reviews/attraction-review.component';
import { AddReviewComponent } from './pages/add-review/add-review.component';
import { MyItinerariesComponent } from './pages/my-itineraries/my-itineraries.component';
import { MiniMapComponent } from './components/mini-map/mini-map.component';
import { FeedComponent } from './pages/feed/feed.component';


@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    MapComponent,
    LoginComponent,
    SignupComponent,
    SurveyComponent,
    AttractionReviewsComponent,
    AddReviewComponent,
    MyItinerariesComponent,
    MiniMapComponent,
    FeedComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    HttpClientModule,
    MatTabsModule,
    MatButtonModule,
    MatDividerModule,
    MatListModule,
    FlexLayoutModule,
    CommonModule,
    RouterModule
  ],
  providers: [
    FirebaseService,
    ApiService,
    AuthService,
    AuthGuard,
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
