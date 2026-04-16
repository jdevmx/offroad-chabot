export interface Vehicle {
  make: string;
  model: string;
  year: number;
  trim?: string;
  modifications: string[];
}

export type ExperienceLevel = 'beginner' | 'intermediate' | 'expert';

export interface Preferences {
  terrainTypes: string[];
  experience: ExperienceLevel;
}

export interface ClientData {
  uid: string;
  username: string;
  displayName: string;
  pinHash: string;
  vehicle: Vehicle;
  preferences: Preferences;
  createdAt: Date;
  updatedAt: Date;
}

export class Client {
  readonly uid: string;
  readonly username: string;
  readonly displayName: string;
  readonly pinHash: string;
  readonly vehicle: Vehicle;
  readonly preferences: Preferences;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(data: ClientData) {
    this.uid = data.uid;
    this.username = data.username;
    this.displayName = data.displayName;
    this.pinHash = data.pinHash;
    this.vehicle = data.vehicle;
    this.preferences = data.preferences;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }
}
