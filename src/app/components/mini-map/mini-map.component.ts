import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import Config from '@arcgis/core/config';
import WebMap from '@arcgis/core/WebMap';
import MapView from '@arcgis/core/views/MapView';
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer';
import Graphic from '@arcgis/core/Graphic';
import Point from '@arcgis/core/geometry/Point';
import Polyline from '@arcgis/core/geometry/Polyline';
import { Itinerary } from '../../services/api.service';

@Component({
  selector: 'app-mini-map',
  templateUrl: './mini-map.component.html',
  styleUrls: ['./mini-map.component.scss']
})
export class MiniMapComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() itinerary: Itinerary | null = null;
  @Output() mapClick = new EventEmitter<void>();

  @ViewChild('miniMapView', { static: true }) private mapViewEl: ElementRef;

  hasRoute = false;
  private view: MapView | null = null;
  private map: WebMap | null = null;
  private graphicsLayer: GraphicsLayer | null = null;

  ngAfterViewInit(): void {
    this.initializeMap();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['itinerary'] && this.view) {
      this.renderItinerary();
    }
  }

  ngOnDestroy(): void {
    if (this.view) {
      this.view.container = null;
      this.view.destroy();
      this.view = null;
    }
  }

  handleClick(): void {
    this.mapClick.emit();
  }

  private initializeMap(): void {
    Config.apiKey = "AAPTxy8BH1VEsoebNVZXo8HurDPKAq3VaV_xrgUjYre1Pnmwp3O85BVX3fDDKZ1H__qI1kee4d-W5Ai2SSeMCpqWYRpFR_d8YiiRVtGr3WsfTNvUVcuwbnsI6TS9yWTu4Anah6wZlYP73GrnQy_GXhHmnB8lt3sfcc7MpN_MRzvanQ2WjNrxKnBnCuc9DW250fAPPtSyHx31yUN9T5Dh2wlE-DRhGh7RJRYnBBD6IHRhxiY.AT1_4BxOT2Pv";

    this.map = new WebMap({
      basemap: 'streets-vector'
    });

    this.graphicsLayer = new GraphicsLayer();
    this.map.add(this.graphicsLayer);

    this.view = new MapView({
      container: this.mapViewEl.nativeElement,
      map: this.map,
      center: [26.1025, 44.4268],
      zoom: 5,
      ui: { components: [] },
      constraints: { rotationEnabled: false }
    });

    this.view.when(() => {
      this.renderItinerary();
    });
  }

  private renderItinerary(): void {
    if (!this.view || !this.graphicsLayer) {
      return;
    }

    this.graphicsLayer.removeAll();
    this.hasRoute = false;

    if (!this.itinerary) {
      return;
    }

    const routeLine = this.itinerary.routeLine;
    if (routeLine?.paths) {
      const polyline = new Polyline({
        paths: routeLine.paths,
        spatialReference: routeLine.spatialReference
      });
      const lineGraphic = new Graphic({
        geometry: polyline,
        symbol: {
          type: 'simple-line',
          color: [0, 122, 255, 0.9],
          width: 2.5
        } as any
      });
      this.graphicsLayer.add(lineGraphic);
      this.hasRoute = true;
    } else if (this.itinerary.routeGeometry && this.itinerary.routeGeometry.length > 1) {
      const paths = this.itinerary.routeGeometry.map((coord: number[]) => [coord[0], coord[1]]);
      const polyline = new Polyline({
        paths: [paths]
      });
      const lineGraphic = new Graphic({
        geometry: polyline,
        symbol: {
          type: 'simple-line',
          color: [0, 122, 255, 0.7],
          width: 2
        } as any
      });
      this.graphicsLayer.add(lineGraphic);
      this.hasRoute = true;
    }

    const points: Point[] = [];
    if (this.itinerary.attractions?.length) {
      this.itinerary.attractions.forEach((stop) => {
        if (stop.location) {
          const point = new Point({
            longitude: stop.location.longitude,
            latitude: stop.location.latitude
          });
          points.push(point);
          this.graphicsLayer?.add(new Graphic({
            geometry: point,
            symbol: {
              type: 'simple-marker',
              color: [59, 130, 246, 0.9],
              size: 6,
              outline: { color: [255, 255, 255], width: 1 }
            } as any
          }));
        }
      });
    }

    const target = routeLine?.paths
      ? this.graphicsLayer.graphics.find(g => g.geometry.type === 'polyline')?.geometry?.extent
      : points;

    if (target) {
      this.view.goTo(target, { duration: 0 }).catch(() => undefined);
    }
  }
}
