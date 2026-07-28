import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

import { initializeApp, FirebaseApp } from 'firebase/app';
import {
  getDatabase,
  Database,
  ref,
  push,
  onValue,
  set,
  update,
  off
} from 'firebase/database';

export interface IPoint {
  lat: number;
  lng: number;
  timestamp?: number;
  [key: string]: any;
}

@Injectable({
  providedIn: 'root'
})
export class FirebaseService {
  private app: FirebaseApp;
  private db: Database;

  constructor() {
    this.app = initializeApp(environment.firebase);
    this.db = getDatabase(this.app);
  }

  addPoint(point: IPoint) {
    const pointsRef = ref(this.db, 'points');
    point.timestamp = point.timestamp || Date.now();
    return push(pointsRef, point);
  }

  subscribePoints(callback: (data: Record<string, IPoint> | null) => void) {
    const pointsRef = ref(this.db, 'points');
    const listener = onValue(pointsRef, (snapshot) => {
      callback(snapshot.val());
    });
    return () => off(pointsRef, 'value', listener);
  }

  updateUserPosition(uid: string, pos: { lat: number; lng: number; timestamp?: number }) {
    const userPosRef = ref(this.db, `userPositions/${uid}`);
    pos.timestamp = pos.timestamp || Date.now();
    return set(userPosRef, pos);
  }

  subscribeUserPositions(callback: (data: any) => void) {
    const refPos = ref(this.db, 'userPositions');
    const listener = onValue(refPos, (snapshot) => {
      callback(snapshot.val());
    });
    return () => off(refPos, 'value', listener);
  }
}
