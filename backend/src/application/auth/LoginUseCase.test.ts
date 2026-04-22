import bcrypt from 'bcrypt';
import { beforeAll, describe, expect, it } from 'vitest';
import { Client } from '../../domain/client/Client';
import { IClientRepository } from '../../domain/client/IClientRepository';
import { NotFoundError, ValidationError } from '../../domain/errors';
import { IAuthProvider } from './IAuthProvider';
import { LoginUseCase } from './LoginUseCase';

class InMemoryClientRepository implements IClientRepository {
  constructor(private readonly clients: Client[] = []) {}

  async findByUid(uid: string): Promise<Client | null> {
    return this.clients.find((c) => c.uid === uid) ?? null;
  }

  async findByUsername(username: string): Promise<Client | null> {
    return this.clients.find((c) => c.username === username) ?? null;
  }

  async save(client: Client): Promise<void> {
    this.clients.push(client);
  }
}

class InMemoryAuthProvider implements IAuthProvider {
  async createUser(_displayName: string) {
    return { uid: 'unused' };
  }

  async createToken(_uid: string): Promise<string> {
    return 'test-token';
  }
}

let existingClient: Client;

beforeAll(async () => {
  const pinHash = await bcrypt.hash('1234', 1);
  existingClient = new Client({
    uid: 'uid-existing',
    username: 'trail_rider',
    displayName: 'Trail Rider',
    pinHash,
    vehicle: {
      make: 'Toyota',
      model: '4Runner',
      year: 2022,
      modifications: [],
    },
    preferences: { terrainTypes: ['rock'], experience: 'intermediate' },
    createdAt: new Date(),
    updatedAt: new Date(),
  });
});

function makeUseCase(clients: Client[] = []) {
  return new LoginUseCase(
    new InMemoryClientRepository(clients),
    new InMemoryAuthProvider(),
  );
}

describe('LoginUseCase', () => {
  it('returns token, userId and displayName for valid credentials', async () => {
    const result = await makeUseCase([existingClient]).execute({
      username: 'trail_rider',
      pin: '1234',
    });

    expect(result.userId).toBe('uid-existing');
    expect(result.displayName).toBe('Trail Rider');
    expect(result.token).toBe('test-token');
  });

  it('throws NotFoundError with generic message when username is not found', async () => {
    await expect(
      makeUseCase([]).execute({ username: 'unknown', pin: '1234' }),
    ).rejects.toThrow(NotFoundError);
  });

  it('throws NotFoundError with same generic message when PIN is wrong', async () => {
    let notFoundMsg = '';
    try {
      await makeUseCase([existingClient]).execute({
        username: 'trail_rider',
        pin: '9999',
      });
    } catch (err) {
      if (err instanceof NotFoundError) notFoundMsg = err.message;
    }

    let unknownMsg = '';
    try {
      await makeUseCase([]).execute({ username: 'unknown', pin: '1234' });
    } catch (err) {
      if (err instanceof NotFoundError) unknownMsg = err.message;
    }

    expect(notFoundMsg).toBe(unknownMsg);
    expect(notFoundMsg).not.toBe('');
  });

  it('throws ValidationError when username is empty', async () => {
    await expect(
      makeUseCase([existingClient]).execute({ username: '', pin: '1234' }),
    ).rejects.toThrow(ValidationError);
  });

  it('throws ValidationError for invalid PIN format', async () => {
    await expect(
      makeUseCase([existingClient]).execute({ username: 'trail_rider', pin: 'abcd' }),
    ).rejects.toThrow(ValidationError);
  });
});
