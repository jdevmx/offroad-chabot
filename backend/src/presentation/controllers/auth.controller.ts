import { NextFunction, Request, Response } from 'express';
import { LoginUseCase } from '../../application/auth/LoginUseCase';
import { RegisterUseCase } from '../../application/auth/RegisterUseCase';
import { getAuth, getFirestore } from '../../infrastructure/firebase/firebaseAdmin';
import { FirebaseAuthProvider } from '../../infrastructure/auth/FirebaseAuthProvider';
import { FirestoreClientRepository } from '../../infrastructure/repositories/FirestoreClientRepository';

export async function checkUsername(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { username } = req.query;
    if (!username || typeof username !== 'string') {
      res.status(400).json({ error: 'username query param required' });
      return;
    }

    const repo = new FirestoreClientRepository(getFirestore());
    const client = await repo.findByUsername(username);
    res.status(200).json({ available: client === null });
  } catch (err) {
    next(err);
  }
}

export async function register(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { username, displayName, pin, vehicle, preferences } = req.body as {
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
    };

    const useCase = new RegisterUseCase(
      new FirestoreClientRepository(getFirestore()),
      new FirebaseAuthProvider(getAuth()),
    );

    const result = await useCase.execute({ username, displayName, pin, vehicle, preferences });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function login(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { username, pin } = req.body as { username: string; pin: string };

    const useCase = new LoginUseCase(
      new FirestoreClientRepository(getFirestore()),
      new FirebaseAuthProvider(getAuth()),
    );

    const result = await useCase.execute({ username, pin });
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}
