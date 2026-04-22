import jwt from 'jsonwebtoken';
import { Auth } from 'firebase-admin/auth';
import { CreateUserResult, IAuthProvider } from '../../application/auth/IAuthProvider';

export class FirebaseAuthProvider implements IAuthProvider {
  constructor(private readonly auth: Auth) {}

  async createUser(displayName: string): Promise<CreateUserResult> {
    const record = await this.auth.createUser({ displayName });
    return { uid: record.uid };
  }

  async createToken(uid: string): Promise<string> {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET environment variable is not set');
    return jwt.sign({ uid }, secret, { expiresIn: '7d' });
  }
}
