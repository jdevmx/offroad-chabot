import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Timestamp } from 'firebase-admin/firestore';
import { Client } from '../../domain/client/Client';
import { FirestoreClientRepository } from './FirestoreClientRepository';

const NOW = new Date('2026-01-01T00:00:00Z');
const NOW_TIMESTAMP = Timestamp.fromDate(NOW);

const VALID_FIRESTORE_DATA = {
  username: 'trail_rider',
  displayName: 'Trail Rider',
  pinHash: 'hashed_pin_value',
  vehicle: {
    make: 'Toyota',
    model: '4Runner',
    year: 2022,
    trim: 'TRD Pro',
    modifications: ['lift kit', 'skid plates'],
  },
  preferences: {
    terrainTypes: ['rock', 'mud'],
    experience: 'intermediate',
  },
  createdAt: NOW_TIMESTAMP,
  updatedAt: NOW_TIMESTAMP,
};

const TEST_UID = 'uid-abc-123';

function makeClient(): Client {
  return new Client({
    uid: TEST_UID,
    username: 'trail_rider',
    displayName: 'Trail Rider',
    pinHash: 'hashed_pin_value',
    vehicle: {
      make: 'Toyota',
      model: '4Runner',
      year: 2022,
      trim: 'TRD Pro',
      modifications: ['lift kit', 'skid plates'],
    },
    preferences: {
      terrainTypes: ['rock', 'mud'],
      experience: 'intermediate',
    },
    createdAt: NOW,
    updatedAt: NOW,
  });
}

function makeDb() {
  const set = vi.fn().mockResolvedValue(undefined);
  const docGet = vi.fn();
  const docRef = { get: docGet, set };

  const whereGet = vi.fn();
  const limitRef = { get: whereGet };
  const whereRef = { limit: vi.fn().mockReturnValue(limitRef) };
  const collectionRef = {
    doc: vi.fn().mockReturnValue(docRef),
    where: vi.fn().mockReturnValue(whereRef),
  };

  const db = {
    collection: vi.fn().mockReturnValue(collectionRef),
  };

  return { db, collectionRef, docRef, docGet, whereRef, limitRef, whereGet, set };
}

describe('FirestoreClientRepository', () => {
  let mocks: ReturnType<typeof makeDb>;
  let repo: FirestoreClientRepository;

  beforeEach(() => {
    mocks = makeDb();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    repo = new FirestoreClientRepository(mocks.db as any);
  });

  describe('findByUid', () => {
    it('returns a Client when the document exists', async () => {
      mocks.docGet.mockResolvedValue({
        exists: true,
        data: () => VALID_FIRESTORE_DATA,
        id: TEST_UID,
      });

      const result = await repo.findByUid(TEST_UID);

      expect(result).toBeInstanceOf(Client);
      expect(result?.uid).toBe(TEST_UID);
      expect(result?.username).toBe('trail_rider');
      expect(result?.vehicle.make).toBe('Toyota');
    });

    it('returns null when the document does not exist', async () => {
      mocks.docGet.mockResolvedValue({ exists: false });

      const result = await repo.findByUid(TEST_UID);

      expect(result).toBeNull();
    });

    it('converts Timestamp fields to Date instances', async () => {
      mocks.docGet.mockResolvedValue({
        exists: true,
        data: () => VALID_FIRESTORE_DATA,
        id: TEST_UID,
      });

      const result = await repo.findByUid(TEST_UID);

      expect(result?.createdAt).toBeInstanceOf(Date);
      expect(result?.updatedAt).toBeInstanceOf(Date);
      expect(result?.createdAt.toISOString()).toBe(NOW.toISOString());
    });

    it('defaults vehicle.modifications to [] when absent', async () => {
      const dataWithoutMods = {
        ...VALID_FIRESTORE_DATA,
        vehicle: { ...VALID_FIRESTORE_DATA.vehicle, modifications: undefined },
      };
      mocks.docGet.mockResolvedValue({
        exists: true,
        data: () => dataWithoutMods,
        id: TEST_UID,
      });

      const result = await repo.findByUid(TEST_UID);

      expect(result?.vehicle.modifications).toEqual([]);
    });
  });

  describe('findByUsername', () => {
    it('returns a Client when a matching document exists', async () => {
      mocks.whereGet.mockResolvedValue({
        empty: false,
        docs: [{ data: () => VALID_FIRESTORE_DATA, id: TEST_UID }],
      });

      const result = await repo.findByUsername('trail_rider');

      expect(result).toBeInstanceOf(Client);
      expect(result?.username).toBe('trail_rider');
      expect(mocks.collectionRef.where).toHaveBeenCalledWith(
        'username',
        '==',
        'trail_rider',
      );
    });

    it('returns null when no matching document exists', async () => {
      mocks.whereGet.mockResolvedValue({ empty: true, docs: [] });

      const result = await repo.findByUsername('unknown_user');

      expect(result).toBeNull();
    });
  });

  describe('save', () => {
    it('calls set() on the correct document reference with serialized data', async () => {
      const client = makeClient();
      await repo.save(client);

      expect(mocks.db.collection).toHaveBeenCalledWith('clients');
      expect(mocks.collectionRef.doc).toHaveBeenCalledWith(TEST_UID);
      expect(mocks.set).toHaveBeenCalledWith(
        expect.objectContaining({
          uid: TEST_UID,
          username: 'trail_rider',
          pinHash: 'hashed_pin_value',
          vehicle: expect.objectContaining({ make: 'Toyota', year: 2022 }),
          preferences: expect.objectContaining({ experience: 'intermediate' }),
        }),
      );
    });

    it('converts Date fields to Timestamp when saving', async () => {
      const client = makeClient();
      await repo.save(client);

      const [[savedData]] = mocks.set.mock.calls;
      expect(savedData.createdAt).toBeInstanceOf(Timestamp);
      expect(savedData.updatedAt).toBeInstanceOf(Timestamp);
    });
  });
});
