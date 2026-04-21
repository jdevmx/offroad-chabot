import { Auth } from 'firebase-admin/auth';
import { CreateUserResult, IAuthProvider } from '../../application/auth/IAuthProvider';

export class FirebaseAuthProvider implements IAuthProvider {
  constructor(private readonly auth: Auth) {}

  async createUser(displayName: string): Promise<CreateUserResult> {
    const record = await this.auth.createUser({ displayName });
    return { uid: record.uid };
  }

  async createCustomToken(uid: string): Promise<string> {
    return this.auth.createCustomToken(uid);
  }
}
