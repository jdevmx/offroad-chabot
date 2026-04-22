import bcrypt from 'bcrypt';
import { describe, expect, it } from 'vitest';
import { Client } from '../../domain/client/Client';
import { IClientRepository } from '../../domain/client/IClientRepository';
import { ConflictError, ValidationError } from '../../domain/errors';
import { IAuthProvider } from './IAuthProvider';
import { RegisterInput, RegisterUseCase } from './RegisterUseCase';

class InMemoryClientRepository implements IClientRepository {
  private clients: Client[] = [];

  async findByUid(uid: string): Promise<Client | null> {
    return this.clients.find((c) => c.uid === uid) ?? null;
  }

  async findByUsername(username: string): Promise<Client | null> {
    return this.clients.find((c) => c.username === username) ?? null;
  }

  async save(client: Client): Promise<void> {
    this.clients.push(client);
  }

  all(): Client[] {
    return this.clients;
  }
}

class InMemoryAuthProvider implements IAuthProvider {
  private nextUid = 'test-uid-1';

  async createUser(_displayName: string) {
    return { uid: this.nextUid };
  }

  async createToken(_uid: string): Promise<string> {
    return 'test-token';
  }
}

function makeValidInput(overrides: Partial<RegisterInput> = {}): RegisterInput {
  return {
    username: 'trail_rider',
    displayName: 'Trail Rider',
    pin: '1234',
    vehicle: {
      make: 'Toyota',
      model: '4Runner',
      year: 2022,
      modifications: ['lift kit'],
    },
    preferences: {
      terrainTypes: ['rock'],
      experience: 'intermediate',
    },
    ...overrides,
  };
}

function makeUseCase(repo?: IClientRepository, auth?: IAuthProvider) {
  return new RegisterUseCase(
    repo ?? new InMemoryClientRepository(),
    auth ?? new InMemoryAuthProvider(),
  );
}

describe('RegisterUseCase', () => {
  it('returns token, userId and displayName on valid input', async () => {
    const result = await makeUseCase().execute(makeValidInput());

    expect(result.userId).toBe('test-uid-1');
    expect(result.displayName).toBe('Trail Rider');
    expect(result.token).toBe('test-token');
  });

  it('saves the client with a hashed PIN', async () => {
    const repo = new InMemoryClientRepository();
    await makeUseCase(repo).execute(makeValidInput());

    const saved = repo.all()[0];
    expect(saved).toBeDefined();
    expect(saved.pinHash).not.toBe('1234');
    expect(await bcrypt.compare('1234', saved.pinHash)).toBe(true);
  });

  it('throws ConflictError when username is already taken', async () => {
    const repo = new InMemoryClientRepository();
    const useCase = makeUseCase(repo);

    await useCase.execute(makeValidInput());

    await expect(useCase.execute(makeValidInput())).rejects.toThrow(ConflictError);
  });

  it('throws ValidationError for username that is too short', async () => {
    await expect(
      makeUseCase().execute(makeValidInput({ username: 'ab' })),
    ).rejects.toThrow(ValidationError);
  });

  it('throws ValidationError for username with special characters', async () => {
    await expect(
      makeUseCase().execute(makeValidInput({ username: 'trail-rider!' })),
    ).rejects.toThrow(ValidationError);
  });

  it('throws ValidationError for PIN that is not 4 digits', async () => {
    await expect(
      makeUseCase().execute(makeValidInput({ pin: '123' })),
    ).rejects.toThrow(ValidationError);
  });

  it('throws ValidationError for PIN containing letters', async () => {
    await expect(
      makeUseCase().execute(makeValidInput({ pin: '12ab' })),
    ).rejects.toThrow(ValidationError);
  });

  it('throws ValidationError for vehicle year before 1950', async () => {
    const input = makeValidInput();
    input.vehicle.year = 1949;
    await expect(makeUseCase().execute(input)).rejects.toThrow(ValidationError);
  });

  it('throws ValidationError for invalid experience level', async () => {
    const input = makeValidInput();
    (input.preferences as { experience: string }).experience = 'pro';
    await expect(makeUseCase().execute(input)).rejects.toThrow(ValidationError);
  });

  it('throws ValidationError when vehicle make is missing', async () => {
    const input = makeValidInput();
    input.vehicle.make = '';
    await expect(makeUseCase().execute(input)).rejects.toThrow(ValidationError);
  });

  it('defaults modifications to [] when not provided', async () => {
    const repo = new InMemoryClientRepository();
    const input = makeValidInput();
    delete (input.vehicle as { modifications?: string[] }).modifications;

    await makeUseCase(repo).execute(input);

    const saved = repo.all()[0];
    expect(saved.vehicle.modifications).toEqual([]);
  });
});
