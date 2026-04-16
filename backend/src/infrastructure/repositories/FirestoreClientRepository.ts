import { Firestore, Timestamp } from 'firebase-admin/firestore';
import {
  Client,
  ClientData,
  ExperienceLevel,
  Preferences,
  Vehicle,
} from '../../domain/client/Client';
import { IClientRepository } from '../../domain/client/IClientRepository';

export class FirestoreClientRepository implements IClientRepository {
  private readonly db: Firestore;

  constructor(db: Firestore) {
    this.db = db;
  }

  async findByUid(uid: string): Promise<Client | null> {
    const snapshot = await this.db.collection('clients').doc(uid).get();
    if (!snapshot.exists) {
      return null;
    }
    return this.toClient(snapshot.data()!, uid);
  }

  async findByUsername(username: string): Promise<Client | null> {
    const querySnapshot = await this.db
      .collection('clients')
      .where('username', '==', username)
      .limit(1)
      .get();

    if (querySnapshot.empty) {
      return null;
    }

    const doc = querySnapshot.docs[0];
    return this.toClient(doc.data(), doc.id);
  }

  async save(client: Client): Promise<void> {
    const data = this.toFirestore(client);
    await this.db.collection('clients').doc(client.uid).set(data);
  }

  private toClient(
    data: FirebaseFirestore.DocumentData,
    uid: string,
  ): Client {
    const vehicle: Vehicle = {
      make: data.vehicle.make as string,
      model: data.vehicle.model as string,
      year: data.vehicle.year as number,
      trim: data.vehicle.trim as string | undefined,
      modifications: (data.vehicle.modifications as string[]) ?? [],
    };

    const preferences: Preferences = {
      terrainTypes: data.preferences.terrainTypes as string[],
      experience: data.preferences.experience as ExperienceLevel,
    };

    const clientData: ClientData = {
      uid,
      username: data.username as string,
      displayName: data.displayName as string,
      pinHash: data.pinHash as string,
      vehicle,
      preferences,
      createdAt: (data.createdAt as Timestamp).toDate(),
      updatedAt: (data.updatedAt as Timestamp).toDate(),
    };

    return new Client(clientData);
  }

  private toFirestore(client: Client): Record<string, unknown> {
    return {
      uid: client.uid,
      username: client.username,
      displayName: client.displayName,
      pinHash: client.pinHash,
      vehicle: {
        make: client.vehicle.make,
        model: client.vehicle.model,
        year: client.vehicle.year,
        trim: client.vehicle.trim,
        modifications: client.vehicle.modifications,
      },
      preferences: {
        terrainTypes: client.preferences.terrainTypes,
        experience: client.preferences.experience,
      },
      createdAt: Timestamp.fromDate(client.createdAt),
      updatedAt: Timestamp.fromDate(client.updatedAt),
    };
  }
}
