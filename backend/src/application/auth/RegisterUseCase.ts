import bcrypt from 'bcrypt';
import { Client } from '../../domain/client/Client';
import { IClientRepository } from '../../domain/client/IClientRepository';
import { ConflictError, ValidationError } from '../../domain/errors';
import { IAuthProvider } from './IAuthProvider';

export interface RegisterInput {
  username: string;
  displayName: string;
  pin: string;
  vehicle: {
    make: string;
    model: string;
    year: number;
    trim?: string;
    modifications?: string[];
  };
  preferences: {
    terrainTypes: string[];
    experience: 'beginner' | 'intermediate' | 'expert';
  };
}

export interface RegisterOutput {
  customToken: string;
  uid: string;
}

const CURRENT_YEAR = new Date().getFullYear();
const VALID_EXPERIENCE = new Set(['beginner', 'intermediate', 'expert']);

export class RegisterUseCase {
  constructor(
    private readonly repo: IClientRepository,
    private readonly auth: IAuthProvider,
  ) {}

  async execute(input: RegisterInput): Promise<RegisterOutput> {
    this.validate(input);

    const existing = await this.repo.findByUsername(input.username);
    if (existing !== null) {
      throw new ConflictError('Username already taken');
    }

    const { uid } = await this.auth.createUser(input.displayName);
    const pinHash = await bcrypt.hash(input.pin, 10);

    const now = new Date();
    const client = new Client({
      uid,
      username: input.username,
      displayName: input.displayName,
      pinHash,
      vehicle: {
        make: input.vehicle.make,
        model: input.vehicle.model,
        year: input.vehicle.year,
        trim: input.vehicle.trim,
        modifications: input.vehicle.modifications ?? [],
      },
      preferences: {
        terrainTypes: input.preferences.terrainTypes,
        experience: input.preferences.experience,
      },
      createdAt: now,
      updatedAt: now,
    });

    await this.repo.save(client);
    const customToken = await this.auth.createCustomToken(uid);

    return { customToken, uid };
  }

  private validate(input: RegisterInput): void {
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(input.username)) {
      throw new ValidationError(
        'Username must be 3-30 characters and contain only letters, numbers, and underscores',
      );
    }

    if (!input.displayName || input.displayName.length > 60) {
      throw new ValidationError(
        'Display name is required and must be at most 60 characters',
      );
    }

    if (!/^\d{4}$/.test(input.pin)) {
      throw new ValidationError('PIN must be exactly 4 digits');
    }

    if (!input.vehicle.make) {
      throw new ValidationError('Vehicle make is required');
    }

    if (!input.vehicle.model) {
      throw new ValidationError('Vehicle model is required');
    }

    const year = input.vehicle.year;
    if (!Number.isInteger(year) || year < 1950 || year > CURRENT_YEAR + 1) {
      throw new ValidationError(
        `Vehicle year must be between 1950 and ${CURRENT_YEAR + 1}`,
      );
    }

    if (!VALID_EXPERIENCE.has(input.preferences.experience)) {
      throw new ValidationError(
        'Experience must be beginner, intermediate, or expert',
      );
    }
  }
}
