import { ExtraOptions, RouterModule, Routes } from '@angular/router';
import { NgModule } from '@angular/core';
import { MapComponent } from './pages/map/map.component';
import { HomeComponent } from './pages/home/home.component';
import { LoginComponent } from './pages/login/login.component';
import { SignupComponent } from './pages/signup/signup.component';
import { AuthGuard } from './guards/auth.guard';
import { SurveyComponent } from './pages/surveycomponent/survey.component';
import { AttractionReviewsComponent } from './pages/attraction-reviews/attraction-review.component';
import { AddReviewComponent } from './pages/add-review/add-review.component';
import { MyItinerariesComponent } from './pages/my-itineraries/my-itineraries.component';
import { FeedComponent } from './pages/feed/feed.component';


export const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent,
  },
  {
    path: 'signup',
    component: SignupComponent,
  },
  {
    path: 'home',
    component: HomeComponent
  },
  {
    path: 'map',
    component: MapComponent
  },
  {
    path: 'my-itineraries',
    component: MyItinerariesComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'feed',
    component: FeedComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'survey',
    component: SurveyComponent
  },
  {
    path: 'attractions/:id/reviews',
    component: AttractionReviewsComponent
  },
  {
    path: 'attractions/:id/add-review',
    component: AddReviewComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'attractions/:id/edit-review/:reviewId',
    component: AddReviewComponent,
    canActivate: [AuthGuard]
  },
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  }
];

const config: ExtraOptions = {
  useHash: true,
};

@NgModule({
  imports: [RouterModule.forRoot(routes, config)],
  exports: [RouterModule],
})
export class AppRoutingModule {
}
