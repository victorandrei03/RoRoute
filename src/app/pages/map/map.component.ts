import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  Output,
  EventEmitter,
  OnDestroy
} from "@angular/core";

import esri = __esri; // Esri TypeScript Types

import Config from '@arcgis/core/config';
import WebMap from '@arcgis/core/WebMap';
import MapView from '@arcgis/core/views/MapView';
import Bookmarks from '@arcgis/core/widgets/Bookmarks';
import Expand from '@arcgis/core/widgets/Expand';

import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer";
import Graphic from '@arcgis/core/Graphic';
import Point from '@arcgis/core/geometry/Point';

import FeatureLayer from '@arcgis/core/layers/FeatureLayer';

import Polygon from '@arcgis/core/geometry/Polygon';
import Polyline from '@arcgis/core/geometry/Polyline';

import Search from '@arcgis/core/widgets/Search';
import * as route from '@arcgis/core/rest/route';
import RouteParameters from '@arcgis/core/rest/support/RouteParameters';
import FeatureSet from '@arcgis/core/rest/support/FeatureSet';
import { FirebaseService } from '../../services/firebase.service';
import { ApiService, Attraction, Itinerary } from '../../services/api.service';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';


@Component({
  selector: "app-map",
  templateUrl: "./map.component.html",
  styleUrls: ["./map.component.scss"]
})
export class MapComponent implements OnInit, OnDestroy {
  @Output() mapLoadedEvent = new EventEmitter<boolean>();

  @ViewChild("mapViewNode", { static: true }) private mapViewEl: ElementRef;

  map: esri.Map;
  view: esri.MapView;
  graphicsLayer: esri.GraphicsLayer;
  trailheadsLayer: esri.FeatureLayer;
  tourismLayer: esri.FeatureLayer;
  countiesLayer: esri.FeatureLayer;

  // Tourism attraction filter options (excluding accommodations)
  tourismFilterOptions = [
    { value: "all", label: "All Attractions", selected: true },
    { value: "museum", label: "Museums", selected: false },
    { value: "attraction", label: "Tourist Attractions", selected: false },
    { value: "viewpoint", label: "Viewpoints", selected: false },
    { value: "artwork", label: "Artwork", selected: false },
    { value: "gallery", label: "Galleries", selected: false },
    { value: "theme_park", label: "Theme Parks", selected: false },
    { value: "zoo", label: "Zoos", selected: false },
    { value: "aquarium", label: "Aquariums", selected: false },
    { value: "picnic_site", label: "Picnic Sites", selected: false }
  ];

  selectedTourismFilter: string = "all";

  zoom = 10;
  center: Array<number> = [26.1025, 44.4268];
  basemap = "streets-vector";
  loaded = false;
  currentUser: User | null = null; //
  selectedStops: Attraction[] = [];
  routeLoading: boolean = false;
  totalDistance: number = 0;
  startLocation: Attraction | any = null;
  itineraryTitle = '';
  itineraryDescription = '';
  savingItinerary = false;
  saveMessage = '';
  routeGeometry: number[][] | null = null;
  arcgisRouteLine: any = null;

  // Directions panel
  showDirections: boolean = false;
  directions: any[] = [];
  routeSummary: { distance: string, time: string } | null = null;
  routeGraphicsLayer: esri.GraphicsLayer;

  constructor(
    private fb: FirebaseService,
    private apiService: ApiService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) { }
  private firebaseUnsubscribe: (() => void) | null = null;
  private userPosUnsubscribe: (() => void) | null = null;
  private clientId: string = 'client_' + Math.random().toString(36).substr(2, 9);
  private lastCenterSent: number = 0;
  private centerSyncTimer: any = null;
  graphicsLayerFirebase: esri.GraphicsLayer;
  private pendingItineraryId: string | null = null;

  ngOnInit() {
    // Load tourism configuration from backend
    this.authService.currentUser.subscribe(user => { //
      this.currentUser = user;
    });

    this.loadTourismConfig();

    this.route.queryParams.subscribe(params => {
      const itineraryId = params['itineraryId'];
      if (itineraryId) {
        if (this.loaded) {
          this.loadItineraryForMap(itineraryId);
        } else {
          this.pendingItineraryId = itineraryId;
        }
      }
    });

    this.initializeMap().then(() => {
      this.loaded = this.view.ready;
      this.mapLoadedEvent.emit(true);
      if (this.pendingItineraryId) {
        this.loadItineraryForMap(this.pendingItineraryId);
        this.pendingItineraryId = null;
      }
    });
  }

  loadTourismConfig() {
    this.apiService.getTourismConfig().subscribe({
      next: (config) => {
        this.tourismFilterOptions = config.filter_options;
        console.log('Tourism config loaded from backend:', config);
      },
      error: (err) => {
        console.error('Error loading tourism config:', err);
      }
    });
  }

  async initializeMap() {
    try {
      Config.apiKey = "AAPTxy8BH1VEsoebNVZXo8HurDPKAq3VaV_xrgUjYre1Pnmwp3O85BVX3fDDKZ1H__qI1kee4d-W5Ai2SSeMCpqWYRpFR_d8YiiRVtGr3WsfTNvUVcuwbnsI6TS9yWTu4Anah6wZlYP73GrnQy_GXhHmnB8lt3sfcc7MpN_MRzvanQ2WjNrxKnBnCuc9DW250fAPPtSyHx31yUN9T5Dh2wlE-DRhGh7RJRYnBBD6IHRhxiY.AT1_4BxOT2Pv";

      const mapProperties: esri.WebMapProperties = {
        basemap: this.basemap
      };
      this.map = new WebMap(mapProperties);

      this.addFeatureLayers();
      this.addGraphicsLayer();
      this.routeGraphicsLayer = new GraphicsLayer({
        id: "route-layer",
        title: "Calculated Route Stops"
      });
      this.map.add(this.routeGraphicsLayer);
      this.addGraphicElements();

      const mapViewProperties = {
        container: this.mapViewEl.nativeElement,
        center: this.center,
        zoom: this.zoom,
        map: this.map
      };
      this.view = new MapView(mapViewProperties);

      this.view.on('pointer-move', ["Shift"], (event) => {
        const point = this.view.toMap({ x: event.x, y: event.y });
        console.log("Map pointer moved: ", point.longitude, point.latitude);
      });

      await this.view.when();
      console.log("ArcGIS map loaded");
      this.setupFirebaseSync();
      this.addSearchWidget();
      return this.view;
    } catch (error) {
      console.error("Error loading the map: ", error);
      alert("Error loading the map");
    }
  }

  addSearchWidget() {
    const search = new Search({
      view: this.view,
      popupEnabled: true,
      includeDefaultSources: false,
      sources: [
        {
          layer: this.tourismLayer,
          searchFields: ["name"],
          displayField: "name",
          exactMatch: false,
          outFields: ["*"],
          name: "Tourist Attractions Romania",
          placeholder: "Search for an attraction (e.g., Bran Castle)",
          popupTemplate: this.tourismLayer.popupTemplate
        } as any
      ]
    });

    this.view.ui.add(search, "top-right");
  }

  filterTourismAttractions(filterValue: string) {
    this.selectedTourismFilter = filterValue;

    // Get definition expression from backend
    this.apiService.getTourismFilter(filterValue).subscribe({
      next: (response) => {
        const definitionExpression = response.definition_expression;

        if (this.tourismLayer) {
          this.tourismLayer.definitionExpression = definitionExpression;
          console.log("Tourism filter applied:", filterValue, definitionExpression);
        }
      },
      error: (err) => {
        console.error('Error getting tourism filter:', err);
      }
    });
  }

  addGraphicElements() {
    const point = new Point({
      longitude: -118.80657463861,
      latitude: 34.0005930608889,
    });

    const simpleMarkerSymbol = {
      type: "simple-marker",
      color: [226, 119, 40],
      outline: {
        color: [255, 255, 255],
        width: 1,
      },
    };

    const pointGraphic = new Graphic({
      geometry: point,
      symbol: simpleMarkerSymbol
    });
    this.graphicsLayer.add(pointGraphic);

    const polyline = new Polyline({
      paths: [
        [
          [-118.821527826096, 34.0139576938577],
          [-118.814893761649, 34.0080602407843],
          [-118.808878330345, 34.0016642996246]
        ]
      ]
    });

    const simpleLineSymbol = {
      type: "simple-line",
      color: [226, 119, 40],
      width: 2,
    };

    const polylineGraphic = new Graphic({
      geometry: polyline,
      symbol: simpleLineSymbol
    });
    this.graphicsLayer.add(polylineGraphic);

    const polygon = new Polygon({
      rings: [
        [
          [-118.818984489994, 34.0137559967283],
          [-118.806796597377, 34.0215816298725],
          [-118.791432890735, 34.0163883241613],
          [-118.79596686535, 34.008564864635],
          [-118.808558110679, 34.0035027131376],
          [-118.818984489994, 34.0137559967283]
        ]
      ],
    });

    const simpleFillSymbol = {
      type: "simple-fill",
      color: [227, 139, 79, 0.8],
      outline: {
        color: [255, 255, 255],
        width: 1
      },
    };

    const polygonGraphic = new Graphic({
      geometry: polygon,
      symbol: simpleFillSymbol,
    });
    this.graphicsLayer.add(polygonGraphic);

    console.log("Lab 02 graphics added: point, polyline, and polygon");
  }

  toggleGraphics() {
    this.graphicsLayer.visible = !this.graphicsLayer.visible;
    console.log("Graphics visibility:", this.graphicsLayer.visible);
  }

  addFeatureLayers() {
    this.trailheadsLayer = new FeatureLayer({
      url: "https://services3.arcgis.com/GVgbJbqm8hXASVYi/arcgis/rest/services/Trailheads/FeatureServer/0",
      outFields: ['*']
    });
    this.map.add(this.trailheadsLayer);

    const trailsLayer = new FeatureLayer({
      url: "https://services3.arcgis.com/GVgbJbqm8hXASVYi/arcgis/rest/services/Trails/FeatureServer/0"
    });
    this.map.add(trailsLayer, 0);
    this.countiesLayer = new FeatureLayer({
      url: "https://services2.arcgis.com/T4rPchMqQ2Fwj1pR/arcgis/rest/services/Judete_Romania/FeatureServer/0",
      title: "Romanian Counties",
      outFields: ["*"],
      opacity: 0.6,
      renderer: {
        type: "simple",
        symbol: {
          type: "simple-fill",
          color: [51, 51, 204, 0.2],
          outline: {
            color: [40, 40, 120, 0.8],
            width: 2
          }
        }
      } as any,
      popupTemplate: {
        title: "{JUDET}",
        content: [{
          type: "fields",
          fieldInfos: [
            {
              fieldName: "JUDET",
              label: "County Name"
            }
          ]
        }]
      } as any
    });
    this.map.add(this.countiesLayer, 0);
    // Add OpenStreetMap Tourism Layer for Europe (includes Romania)
    // Exclude all accommodation types
    const excludeAccommodation = "tourism NOT IN ('apartment', 'camp_pitch', 'camp_site', 'caravan_site', 'chalet', 'guest_house', 'hostel', 'hotel', 'motel', 'trail_riding_station')";

    this.tourismLayer = new FeatureLayer({
      url: "https://services-eu1.arcgis.com/zci5bUiJ8olAal7N/arcgis/rest/services/OSM_EU_Tourism/FeatureServer/0",
      title: "Romanian Tourist Attractions",
      outFields: ["*"],
      definitionExpression: `name IS NOT NULL AND ${excludeAccommodation}`,
      popupTemplate: {
        title: "{name}",
        content: [
          {
            type: "custom",
            creator: (event: any) => {
              const attr = event.graphic.attributes;

              // containerul principal 
              const mainContainer = document.createElement("div");
              mainContainer.style.display = "flex";
              mainContainer.style.flexDirection = "column";
              mainContainer.style.border = "none";
              mainContainer.style.outline = "none";
              mainContainer.className = "popup-custom-content";

              const isAlreadyStart = this.startLocation && this.startLocation.attraction_id === attr.OBJECTID?.toString();
              const isAlreadyInList = this.selectedStops.some(s => s.attraction_id === attr.OBJECTID?.toString());

              // secțiunea de informații text
              const infoDiv = document.createElement("div");
              infoDiv.style.padding = "10px";
              infoDiv.innerHTML = `
                <p><strong>Type:</strong> ${attr.tourism || ''} ${attr.historic || ''} ${attr.amenity || ''}</p>
                <p><strong>Description:</strong> ${attr.description || 'N/A'}</p>
                <p><strong>Opening Hours:</strong> ${attr.opening_hours || 'N/A'}</p>
                <p><strong>Website:</strong> ${attr.website || 'N/A'}</p>
                <p><strong>Phone:</strong> ${attr.phone || 'N/A'}</p>
              `;
              mainContainer.appendChild(infoDiv);

              // butoane
              const buttonContainer = document.createElement("div");
              buttonContainer.className = "popup-review-controls";
              buttonContainer.style.display = "flex";
              buttonContainer.style.gap = "8px";
              buttonContainer.style.paddingTop = "10px";
              buttonContainer.style.borderTop = "1px solid #e2e8f0";

              if (isAlreadyStart || isAlreadyInList) {
                const statusMsg = document.createElement("div");
                statusMsg.innerHTML = `<span style="color: #48bb78; font-weight: bold; padding: 8px;">✓ Already in itinerary</span>`;
                statusMsg.style.flex = "1";
                buttonContainer.appendChild(statusMsg);
              } else {
                const visitBtn = document.createElement("button");
                visitBtn.innerText = "Visit";
                visitBtn.className = "btn btn-primary btn-add-stop";
                visitBtn.style.flex = "1";
                visitBtn.addEventListener("click", () => {
                  this.handlePopupVisitClick(event.graphic);
                });
                buttonContainer.appendChild(visitBtn);
              }

              const reviewsBtn = document.createElement("a");
              reviewsBtn.innerText = "Reviews";
              reviewsBtn.className = "btn btn-primary";
              reviewsBtn.style.flex = "1";
              reviewsBtn.style.textAlign = "center";
              reviewsBtn.href = `#/attractions/${attr.OBJECTID}/reviews?name=${encodeURIComponent(attr.name || '')}`;
              buttonContainer.appendChild(reviewsBtn);

              mainContainer.appendChild(buttonContainer);
              return mainContainer;
            }
          }
        ]
      }
    } as any);
    this.map.add(this.tourismLayer);

    console.log("Feature layers added including Romanian tourism layer");
  }

  addGraphicsLayer() {
    this.graphicsLayer = new GraphicsLayer();
    this.map.add(this.graphicsLayer);

    this.graphicsLayerFirebase = new GraphicsLayer({ title: 'Firebase Points' });
    this.map.add(this.graphicsLayerFirebase);
  }

  // Route calculation is handled by backend algorithm
  // Points and routes are managed through your custom route optimizer service

  setupFirebaseSync() {
    this.firebaseUnsubscribe = this.fb.subscribePoints((data) => {
      if (this.graphicsLayerFirebase) {
        this.graphicsLayerFirebase.removeAll();
      }
      if (!data) return;
      Object.keys(data).forEach((k) => {
        const p: any = data[k];
        if (!p || typeof p.lat !== 'number' || typeof p.lng !== 'number') return;
        const point = new Point({ longitude: p.lng, latitude: p.lat });
        const symbol = {
          type: 'simple-marker',
          color: [0, 120, 255],
          outline: { color: [255, 255, 255], width: 1 },
          size: 10
        };
        const g = new Graphic({ geometry: point, symbol, attributes: { ...p, id: k } });
        this.graphicsLayerFirebase.add(g);
      });
    });

    this.centerSyncTimer = setInterval(() => {
      if (!this.view || !this.view.center) return;
      const center = this.view.center as any;
      const now = Date.now();
      if (now - this.lastCenterSent < 1000) return;
      this.lastCenterSent = now;
      try {
        this.fb.updateUserPosition(this.clientId, { lat: center.latitude, lng: center.longitude, timestamp: now });
      } catch (err) {
        console.error('Error updating user position to Firebase', err);
      }
    }, 1000);
  }

  ngOnDestroy() {
    if (this.view) {
      this.view.container = null;
    }
    if (this.firebaseUnsubscribe) {
      this.firebaseUnsubscribe();
      this.firebaseUnsubscribe = null;
    }
    if (this.userPosUnsubscribe) {
      this.userPosUnsubscribe();
      this.userPosUnsubscribe = null;
    }
    if (this.centerSyncTimer) {
      clearInterval(this.centerSyncTimer);
      this.centerSyncTimer = null;
    }
  }
  logout() {
    this.authService.logout().subscribe({ //
      next: () => {
        this.router.navigate(['/login']); //
      },
      error: (err) => {
        console.error('Logout error:', err);
        this.router.navigate(['/login']);
      }
    });
  }

  goToLogin() {
    this.router.navigate(['/login']); //
  }

  goToSignup() {
    this.router.navigate(['/signup']); //
  }
  /**
 * Șterge un punct de oprire din listă.
 */
  removeStop(index: number): void {
    this.selectedStops.splice(index, 1);
    this.redrawStopGraphics();
  }

  /**
   * Șterge toate punctele de oprire.
   */
  clearAll(): void {
    this.startLocation = null;
    this.selectedStops = [];

    this.totalDistance = 0;
    this.routeSummary = null;
    this.routeGeometry = null;
    this.arcgisRouteLine = null;
    this.saveMessage = '';
    this.showDirections = false;

    if (this.routeGraphicsLayer) {
      this.routeGraphicsLayer.removeAll();
    }

    console.log("Itinerary completely cleared.");
  }

  canSaveItinerary(): boolean {
    return !!this.currentUser && !this.savingItinerary && (!!this.startLocation || this.selectedStops.length > 0);
  }

  private buildItineraryAttractions(): Attraction[] {
    const stops = [...this.selectedStops];
    if (this.startLocation) {
      const startAttraction: Attraction = {
        attraction_id: this.startLocation.attraction_id || `start_${Date.now()}`,
        name: this.startLocation.name || 'Start',
        location: {
          latitude: this.startLocation.location.latitude,
          longitude: this.startLocation.location.longitude
        },
        description: '',
        type: 'start',
        city_id: 'RO'
      };
      if (!stops.some(stop => stop.attraction_id === startAttraction.attraction_id)) {
        stops.unshift(startAttraction);
      }
    }
    return stops;
  }

  saveItinerary(): void {
    if (!this.currentUser) {
      this.router.navigate(['/login']);
      return;
    }

    if (!this.canSaveItinerary()) {
      return;
    }

    const title = this.itineraryTitle.trim() || `Itinerary ${new Date().toLocaleDateString()}`;
    const description = this.itineraryDescription.trim() || 'Saved from the map planner.';

    const itinerary: Itinerary = {
      title,
      description,
      attractions: this.buildItineraryAttractions(),
      userId: this.currentUser.user_id,
      userName: this.currentUser.username,
      duration: this.routeSummary ? `${this.routeSummary.time} min` : undefined,
      totalDistance: this.totalDistance || undefined,
      routeGeometry: this.routeGeometry || undefined,
      routeLine: this.arcgisRouteLine || undefined
    };

    this.savingItinerary = true;
    this.saveMessage = '';
    this.apiService.createItinerary(itinerary).subscribe({
      next: () => {
        this.savingItinerary = false;
        this.saveMessage = 'Itinerary saved to your account.';
      },
      error: (err) => {
        console.error('Error saving itinerary:', err);
        this.savingItinerary = false;
        this.saveMessage = 'Could not save itinerary. Please try again.';
      }
    });
  }

  goToMyItineraries(): void {
    this.router.navigate(['/my-itineraries']);
  }

  private loadItineraryForMap(itineraryId: string): void {
    this.apiService.getItinerary(itineraryId).subscribe({
      next: (itinerary) => {
        this.applyItineraryToMap(itinerary);
      },
      error: (err) => {
        console.error('Error loading itinerary:', err);
      }
    });
  }

  private applyItineraryToMap(itinerary: Itinerary): void {
    if (!itinerary || !itinerary.attractions) {
      return;
    }

    const attractions = [...itinerary.attractions];
    const first = attractions[0];
    if (first && (first.type === 'start' || (first.attraction_id || '').startsWith('start_'))) {
      this.startLocation = {
        attraction_id: first.attraction_id,
        name: first.name,
        location: first.location
      };
      this.selectedStops = attractions.slice(1);
    } else {
      this.startLocation = null;
      this.selectedStops = attractions;
    }

    this.totalDistance = itinerary.totalDistance || 0;
    if (itinerary.duration || itinerary.totalDistance) {
      this.routeSummary = {
        distance: itinerary.totalDistance ? itinerary.totalDistance.toFixed(2) : '',
        time: itinerary.duration || ''
      };
    } else {
      this.routeSummary = null;
    }

    this.routeGeometry = itinerary.routeGeometry || null;
    this.arcgisRouteLine = itinerary.routeLine || null;
    this.showDirections = false;
    this.saveMessage = '';

    if (this.routeGraphicsLayer) {
      this.routeGraphicsLayer.removeAll();
    }
    this.redrawStopGraphics();
    if (this.arcgisRouteLine) {
      this.drawArcgisRouteLine(this.arcgisRouteLine);
    } else if (this.routeGeometry && this.routeGeometry.length > 1) {
      this.drawRouteLine(this.routeGeometry);
    }

    this.fitViewToItinerary();
  }

  private fitViewToItinerary(): void {
    if (!this.view) {
      return;
    }

    const points: Point[] = [];
    if (this.startLocation?.location) {
      points.push(new Point({
        longitude: this.startLocation.location.longitude,
        latitude: this.startLocation.location.latitude
      }));
    }
    this.selectedStops.forEach(stop => {
      if (stop?.location) {
        points.push(new Point({
          longitude: stop.location.longitude,
          latitude: stop.location.latitude
        }));
      }
    });

    if (points.length === 0) {
      return;
    }

    this.view.goTo(points, { duration: 500 }).catch((error: any) => {
      console.error('Error fitting view to itinerary:', error);
    });
  }

  private drawArcgisRouteLine(routeLine: any): void {
    if (!this.routeGraphicsLayer || !routeLine?.paths) {
      return;
    }

    this.routeGraphicsLayer.graphics.forEach((graphic) => {
      if (graphic.geometry.type === 'polyline') {
        this.routeGraphicsLayer.remove(graphic);
      }
    });

    const polyline = new Polyline({
      paths: routeLine.paths,
      spatialReference: routeLine.spatialReference
    });

    const lineSymbol = {
      type: "simple-line",
      color: [51, 122, 183, 0.8],
      width: 4
    } as any;

    const routeGraphic = new Graphic({
      geometry: polyline,
      symbol: lineSymbol
    });

    this.routeGraphicsLayer.add(routeGraphic);
  }

  //test
  public setAsStart(index: number): void {
    const selected = this.selectedStops[index];

    if (this.startLocation && this.startLocation.attraction_id !== 'start_current') {
      this.selectedStops.push(this.startLocation);
    }

    this.startLocation = {
      attraction_id: selected.attraction_id,
      name: selected.name, 
      location: selected.location
    };

    this.selectedStops.splice(index, 1);
    this.redrawStopGraphics();
  }

  calculateRoute(): void {
    if (!this.startLocation && this.selectedStops.length < 1) {
      alert('Please select at least 2 locations to calculate the route.');
      return;
    }

    this.routeLoading = true;
    this.arcgisRouteLine = null;

    const payload = {
      attractions: this.selectedStops,
      start_location: this.startLocation 
    };

    let allPoints = [...this.selectedStops];
    if (this.startLocation) {
      // Transformăm startLocation într-un format compatibil cu restul listei
      const startAsStop = {
        ...this.startLocation,
        latitude: this.startLocation.location.latitude,
        longitude: this.startLocation.location.longitude
      };
      allPoints.unshift(startAsStop); // Îl punem pe prima poziție
    }

    // Transform attractions to match backend expected format
    const transformedAttractions = allPoints.map(stop => ({
      ...stop,
      latitude: stop.location ? stop.location.latitude : (stop as any).latitude,
      longitude: stop.location ? stop.location.longitude : (stop as any).longitude
    }));

    // Call backend to calculate optimal route order
    this.apiService.calculateOptimalRoute(transformedAttractions).subscribe({
      next: (result) => {
        console.log('Route calculation result:', result);

        // Transform result back to frontend format
        const transformedRoute = result.route.map((stop: any) => ({
          ...stop,
          location: {
            latitude: stop.latitude,
            longitude: stop.longitude
          }
        }));

        // Update the selected stops with the optimized order
        if (this.startLocation) {
          this.startLocation = transformedRoute[0];
          this.selectedStops = transformedRoute.slice(1);
        } else {
          this.selectedStops = transformedRoute;
        }

        this.totalDistance = result.total_distance;
        this.routeGeometry = result.route_geometry || null;
        this.redrawStopGraphics();
        // Redraw the stops in the new order
        this.redrawStopGraphics();

        
        // Now calculate the actual route using ArcGIS routing service
        const fullPath = this.startLocation ? [this.startLocation, ...this.selectedStops] : this.selectedStops;
        this.calculateArcGISRoute(fullPath);
      },
      error: (error) => {
        console.error('Error calculating route:', error);
        this.routeLoading = false;
        alert('Error calculating route. Please try again.');
      }
    });
  }

  private calculateArcGISRoute(stops: Attraction[]): void {
    // ArcGIS World Routing Service URL
    const routeServiceUrl = "https://route-api.arcgis.com/arcgis/rest/services/World/Route/NAServer/Route_World";

    // Create route stops as graphics
    const routeStops = stops.map(stop => {
      return new Graphic({
        geometry: new Point({
          longitude: stop.location.longitude,
          latitude: stop.location.latitude
        }),
        attributes: {
          Name: stop.name
        }
      });
    });

    // Set up route parameters
    const routeParams = new RouteParameters({
      stops: new FeatureSet({
        features: routeStops
      }),
      returnDirections: true,
      directionsLanguage: 'en',
      directionsLengthUnits: 'kilometers',
      outSpatialReference: this.view.spatialReference
    });

    // Solve the route
    route.solve(routeServiceUrl, routeParams).then((result: any) => {
      console.log('ArcGIS Route result:', result);

      // Clear previous route
      this.routeGraphicsLayer.graphics.forEach((graphic) => {
        if (graphic.geometry.type === 'polyline') {
          this.routeGraphicsLayer.remove(graphic);
        }
      });

      // Display the route on the map
      if (result.routeResults && result.routeResults.length > 0) {
        const routeResult = result.routeResults[0];

        // Draw the route line
        const routeSymbol = {
          type: "simple-line",
          color: [51, 122, 183, 0.8],
          width: 4
        };

        const routeGraphic = new Graphic({
          geometry: routeResult.route.geometry,
          symbol: routeSymbol
        });

        this.routeGraphicsLayer.add(routeGraphic);
        this.arcgisRouteLine = routeResult.route.geometry?.toJSON
          ? routeResult.route.geometry.toJSON()
          : routeResult.route.geometry;

        // Get total distance from ArcGIS
        const totalKm = (routeResult.route.attributes.Total_Kilometers || 0).toFixed(2);
        const totalTime = (routeResult.route.attributes.Total_TravelTime || 0).toFixed(0); // in minutes

        this.totalDistance = parseFloat(totalKm);

        // Set route summary
        this.routeSummary = {
          distance: totalKm,
          time: totalTime
        };

        // Display directions
        if (routeResult.directions) {
          this.displayDirections(routeResult.directions);
        }

        this.routeLoading = false;
        alert(`Route calculated!\nDistance: ${totalKm} km\nEstimated time: ${totalTime} minutes\n\nSee directions panel for details.`);
      } else {
        this.routeLoading = false;
        alert('Could not calculate route on roads. Showing direct distance.');
      }
    }).catch((error: any) => {
      console.error('ArcGIS routing error:', error);
      this.routeLoading = false;

      // Fallback to simple line if routing service fails
      alert('Could not use ArcGIS routing service. Showing direct distance: ' + this.totalDistance.toFixed(2) + ' km');
    });
  }

  private displayDirections(directions: any): void {
    console.log('Route Directions:');
    console.log('=================');

    if (directions.features && directions.features.length > 0) {
      // Extract and format directions
      this.directions = directions.features.map((feature: any) => ({
        text: feature.attributes.text,
        length: (feature.attributes.length || 0).toFixed(2)
      }));

      // Log to console as well
      this.directions.forEach((direction, index) => {
        console.log(`${index + 1}. ${direction.text} (${direction.length} km)`);
      });

      console.log('=================');
      console.log('Total Features:', this.directions.length);

      // Show the directions panel
      this.showDirections = true;
    }
  }

  closeDirections(): void {
    this.showDirections = false;
  }

  private drawRouteLine(routeGeometry: number[][]): void {
    // Clear any existing route lines
    this.routeGraphicsLayer.graphics.forEach((graphic) => {
      if (graphic.geometry.type === 'polyline') {
        this.routeGraphicsLayer.remove(graphic);
      }
    });

    // Convert route geometry to Polyline
    const paths = routeGeometry.map(coord => [coord[1], coord[0]]); // [lng, lat]

    const polyline = new Polyline({
      paths: [paths]
    });

    const lineSymbol = {
      type: "simple-line",
      color: [51, 122, 183, 0.8], // Blue color
      width: 4
    } as any;

    const routeGraphic = new Graphic({
      geometry: polyline,
      symbol: lineSymbol
    });

    this.routeGraphicsLayer.add(routeGraphic);
    console.log('Route line drawn on map');
  }

  private drawStopGraphic(stop: Attraction, order: number): void {
    const point = new Point({
      latitude: stop.location.latitude,
      longitude: stop.location.longitude
    });

    const markerSymbol = {
      type: "simple-marker",
      style: "circle",
      color: [102, 126, 234, 0.9],
      size: 8
    } as esri.SimpleMarkerSymbolProperties;

    const stopGraphic = new Graphic({
      geometry: point,
      symbol: markerSymbol,
      attributes: stop
    });
    this.routeGraphicsLayer.add(stopGraphic);
  }

  redrawStopGraphics(): void {
  this.routeGraphicsLayer.removeAll();
  
  if (this.startLocation) {
    this.drawStartGraphic(this.startLocation);
  }

  this.selectedStops.forEach((stop, i) => this.drawStopGraphic(stop, i + 1));
}

  drawStartGraphic(start: any): void {
    const point = new Point({
      latitude: start.location.latitude,
      longitude: start.location.longitude
    });

    const startSymbol = {
      type: "simple-marker",
      style: "path",
      // Un simbol de tip "pin" verde pentru start
      path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",
      color: [72, 187, 120],
      size: 24,
      outline: { color: [255, 255, 255], width: 2 }
    } as any;

    const graphic = new Graphic({
      geometry: point,
      symbol: startSymbol,
      attributes: start
    });
    this.routeGraphicsLayer.add(graphic);
  }

  addStopToRoute(attraction: Attraction): void {
    const isStart = this.startLocation && this.startLocation.attraction_id === attraction.attraction_id;

    const isSelected = this.selectedStops.some(s => s.attraction_id === attraction.attraction_id);

    if (isStart) {
      alert('This location is already set as the Starting Point!');
      return;
    }

    if (!isSelected) {
      this.selectedStops.push(attraction);
      this.redrawStopGraphics();
    } else {
      alert('This location is already in the stops list!');
    }
  }

  handlePopupVisitClick(graphic: esri.Graphic) {
    console.log("Visit button clicked via custom creator!");

    const attr = graphic.attributes;
    const point = graphic.geometry as esri.Point;

    const newStop: Attraction = {
      attraction_id: attr.OBJECTID?.toString() || `id_${Date.now()}`,
      name: attr.name || "Unnamed location",
      location: {
        latitude: point.latitude,
        longitude: point.longitude
      },
      description: attr.description || '',
      type: attr.tourism || 'attraction',
      city_id: 'RO'
    };

    this.addStopToRoute(newStop);

    if (this.view.popup) {
      this.view.popup.close();
    }
  }

  setStartToCurrentLocation() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        this.startLocation = {
          attraction_id: 'start_current',
          name: "My Location",
          location: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          }
        };

        this.redrawStopGraphics();

        this.view.goTo({
          center: [position.coords.longitude, position.coords.latitude],
          zoom: 14
        });
      });
    }
  }
  
}
