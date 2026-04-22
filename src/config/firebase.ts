// src/config/firebase.ts
import {
  cert,
  getApp,
  getApps,
  initializeApp,
  type App,
  type AppOptions,
  type ServiceAccount,
} from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, Filter, Timestamp, getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";


function validateServiceAccount(sa: ServiceAccount | undefined): void {
  if (!sa || !sa.projectId || !sa.clientEmail || !sa.privateKey) {
    throw new Error(
      "Firebase Admin credentials are missing. Please set either:\n" +
        "  • FIREBASE_SERVICE_ACCOUNT_JSON (recommended)\n" +
        "  • or FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY"
    );
  }
}

function parseFirebaseServiceAccount(): ServiceAccount | undefined {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();

  if (serviceAccountJson) {
    try {
      return normalizeServiceAccount(JSON.parse(serviceAccountJson));
    } catch {
      throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON contains invalid JSON.");
    }
  }

  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    return undefined;
  }

  return {
    projectId,
    clientEmail,
    privateKey,
  };
}

function normalizeServiceAccount(value: unknown): ServiceAccount {
  const record = value as Record<string, unknown>;

  return {
    projectId:
      typeof record.projectId === "string"
        ? record.projectId
        : typeof record.project_id === "string"
          ? record.project_id
          : undefined,
    clientEmail:
      typeof record.clientEmail === "string"
        ? record.clientEmail
        : typeof record.client_email === "string"
          ? record.client_email
          : undefined,
    privateKey:
      typeof record.privateKey === "string"
        ? record.privateKey.replace(/\\n/g, "\n")
        : typeof record.private_key === "string"
          ? record.private_key.replace(/\\n/g, "\n")
          : undefined,
  };
}

function buildFirebaseOptions(): AppOptions {
  const serviceAccount = parseFirebaseServiceAccount();

  if (serviceAccount) {
    validateServiceAccount(serviceAccount); // ← early clear error
  }

  const projectId = process.env.FIREBASE_PROJECT_ID?.trim() || serviceAccount?.projectId;
  const storageBucket = process.env.FIREBASE_STORAGE_BUCKET?.trim();

  return {
    ...(serviceAccount ? { credential: cert(serviceAccount) } : {}),
    ...(projectId ? { projectId } : {}),
    ...(storageBucket ? { storageBucket } : {}),
  };
}

function resolveAppName() {
  const appName = process.env.FIREBASE_APP_NAME?.trim();
  return appName && appName.length > 0 ? appName : undefined;
}

export function getFirebaseAdminApp(): App {
  const appName = resolveAppName();

  if (appName) {
    const existingNamedApp = getApps().find((app) => app.name === appName);
    if (existingNamedApp) return existingNamedApp;
    return initializeApp(buildFirebaseOptions(), appName);
  }

  if (getApps().length > 0) {
    return getApp();
  }

  return initializeApp(buildFirebaseOptions());
}

export function getFirebaseDb() {
  return getFirestore(getFirebaseAdminApp());
}

export function getFirebaseAuth() {
  return getAuth(getFirebaseAdminApp());
}

export function getFirebaseStorage() {
  return getStorage(getFirebaseAdminApp());
}

export { FieldValue, Filter, Timestamp };
