import bcrypt from 'bcrypt';
import { IClientRepository } from '../../domain/client/IClientRepository';
import { NotFoundError, ValidationError } from '../../domain/errors';
import { IAuthProvider } from './IAuthProvider';

export interface LoginInput {
  username: string;
  pin: string;
}

export interface LoginOutput {
  customToken: string;
  uid: string;
}

const INVALID_CREDENTIALS_MSG = 'Invalid username or PIN';

export class LoginUseCase {
  constructor(
    private readonly repo: IClientRepository,
    private readonly auth: IAuthProvider,
  ) {}

  async execute(input: LoginInput): Promise<LoginOutput> {
    if (!input.username) {
      throw new ValidationError('Username is required');
    }

    if (!/^\d{4}$/.test(input.pin)) {
      throw new ValidationError('PIN must be exactly 4 digits');
    }

    const client = await this.repo.findByUsername(input.username);
    if (client === null) {
      throw new NotFoundError(INVALID_CREDENTIALS_MSG);
    }

    const pinMatch = await bcrypt.compare(input.pin, client.pinHash);
    if (!pinMatch) {
      throw new NotFoundError(INVALID_CREDENTIALS_MSG);
    }

    const customToken = await this.auth.createCustomToken(client.uid);
    return { customToken, uid: client.uid };
  }
}
