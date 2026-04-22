import * as admin from 'firebase-admin';
import { getFirestore as adminGetFirestore } from 'firebase-admin/firestore';

const REQUIRED_ENV_VARS = [
  'FIREBASE_PROJECT_ID',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_PRIVATE_KEY',
] as const;

function validateEnv(): void {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`,
    );
  }
}

function initializeAdmin(): admin.app.App {
  validateEnv();

  if (admin.apps.length > 0) {
    return admin.apps[0] as admin.app.App;
  }

  const privateKey = (process.env.FIREBASE_PRIVATE_KEY as string).replace(
    /\\n/g,
    '\n',
  );

  return admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID as string,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL as string,
      privateKey,
    }),
  });
}

let _app: admin.app.App | null = null;

function getApp(): admin.app.App {
  if (_app === null) {
    _app = initializeAdmin();
  }
  return _app;
}

export function getFirebaseAdmin(): admin.app.App {
  return getApp();
}

export function getFirestore(): admin.firestore.Firestore {
  const app = getApp();
  const databaseId = process.env.FIREBASE_DATABASE_ID;
  console.log(`[Firestore] project="${process.env.FIREBASE_PROJECT_ID}" databaseId="${databaseId ?? '(not set — using SDK default)'}"`);
  if (databaseId) {
    return adminGetFirestore(app, databaseId);
  }
  return adminGetFirestore(app);
}

export function getAuth(): admin.auth.Auth {
  return getApp().auth();
}
