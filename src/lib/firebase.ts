import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  getDocFromServer,
  getFirestore,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import type {
  CareerRole,
  LearnerProfile,
  MentorMessage,
  OrchestrationState,
} from '../types';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
void testConnection();

function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefined(item)) as unknown as T;
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v !== undefined) {
        out[k] = stripUndefined(v);
      }
    }
    return out as T;
  }
  return value;
}

export interface PersistedWorkspacePayload {
  profile: LearnerProfile;
  orchestration: OrchestrationState;
  roles: CareerRole[];
  mentorMessages: MentorMessage[];
}

export async function signInWithGooglePopup(): Promise<User> {
  const credential = await signInWithPopup(auth, googleProvider);
  return credential.user;
}

export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

export function subscribeToAuth(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}

export async function loadUserWorkspace(
  uid: string
): Promise<PersistedWorkspacePayload | null> {
  const docPath = `workspaces/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'workspaces', uid));
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      profile: data.profile as LearnerProfile,
      orchestration: data.orchestration as OrchestrationState,
      roles: data.roles as CareerRole[],
      mentorMessages: data.mentorMessages as MentorMessage[],
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, docPath);
  }
}

export async function saveUserWorkspace(
  user: User,
  payload: PersistedWorkspacePayload
): Promise<void> {
  const docPath = `workspaces/${user.uid}`;
  const docRef = doc(db, 'workspaces', user.uid);
  const displayName = (user.displayName || payload.profile.name || 'Learner').slice(0, 120);

  const sanitized = stripUndefined({
    profile: payload.profile,
    orchestration: payload.orchestration,
    roles: payload.roles.slice(0, 25),
    mentorMessages: payload.mentorMessages.slice(-150),
  });

  try {
    const existing = await getDoc(docRef);
    if (!existing.exists()) {
      await setDoc(docRef, {
        ownerId: user.uid,
        displayName,
        ...sanitized,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(
        docRef,
        {
          ownerId: existing.data().ownerId || user.uid,
          displayName,
          ...sanitized,
          createdAt: existing.data().createdAt,
          updatedAt: serverTimestamp(),
        },
        { merge: false }
      );
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, docPath);
  }
}
