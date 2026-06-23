import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, doc, getDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { getDatabase } from 'firebase/database';
import firebaseConfigJson from '../../firebase-applet-config.json';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
  UPLOAD = 'upload',
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
  }
}

export function handleFirestoreError(error: any, operationType: OperationType, path: string | null) {
  const errCode = error?.code || '';
  const errStr = error?.message || errCode || String(error);
  
  const auth = getAuth();
  const errInfo: FirestoreErrorInfo = {
    error: errStr,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };

  const isRead = operationType === OperationType.LIST || operationType === OperationType.GET;
  const isUnavailable = errCode === 'unavailable' || errCode === 'deadline-exceeded' || errStr.includes('offline');
  const isQuotaExceeded = errCode === 'resource-exhausted' || errStr.toLowerCase().includes('quota');

  if (isRead && (isUnavailable || isQuotaExceeded)) {
    console.warn(`Firestore [${path}] temporarily unavailable.`, errInfo);
    return;
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('firestore-error', { 
      detail: { code: errCode, message: errStr, path, operationType } 
    }));
  }

  console.error(`Firestore Error [${path}]: `, JSON.stringify(errInfo));

  if (!isRead) {
    throw new Error(errStr);
  }
}

export function handleStorageError(error: any, path: string) {
  const errInfo = {
    error: error?.message || error?.code || String(error),
    authInfo: { userId: getAuth().currentUser?.uid },
    operationType: 'UPLOAD',
    path
  };
  console.error(`Storage Error [${path}]: `, JSON.stringify(errInfo));
  throw new Error(`STORAGE_ERROR: ${errInfo.error}`);
}

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || firebaseConfigJson.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfigJson.authDomain,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || (firebaseConfigJson as any).databaseURL || "https://gen-lang-client-0195841357-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || firebaseConfigJson.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfigJson.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfigJson.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || firebaseConfigJson.appId,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || firebaseConfigJson.measurementId,
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID || firebaseConfigJson.firestoreDatabaseId || "(default)"
};

console.log('Firebase Configuration Check:', {
  projectId: firebaseConfig.projectId,
  databaseId: firebaseConfig.firestoreDatabaseId,
  hasApiKey: !!firebaseConfig.apiKey
});

const app = initializeApp(firebaseConfig);

const firestoreDbId = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
  ? firebaseConfig.firestoreDatabaseId 
  : undefined;

export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, firestoreDbId);

export const auth = getAuth(app);
export const storage = getStorage(app);
export const rtdb = getDatabase(app);

let messagingInstance: any = null;

const initializeMessaging = async () => {
  if (typeof window === 'undefined') return null;
  try {
    const supported = await isSupported();
    if (supported) {
      messagingInstance = getMessaging(app);
      onMessage(messagingInstance, (payload) => {
        const title = payload.notification?.title || 'إشعار جديد';
        const body = payload.notification?.body || '';
        const event = new CustomEvent('fcm-message', { detail: { title, body, payload } });
        window.dispatchEvent(event);
      });
      return messagingInstance;
    }
  } catch (e) {
    console.warn("Firebase Messaging initialization failed:", e);
  }
  return null;
};

initializeMessaging();

async function testConnection() {
  try {
    await getDoc(doc(db, 'test', 'connection'));
    console.info('Firestore connection test initiated.');
  } catch (error: any) {
    const errStr = error?.message || '';
    if (errStr.includes('offline') || error?.code === 'unavailable') {
      console.warn("Firestore offline mode.");
    } else {
      console.error("Firestore connectivity issue:", error?.message);
    }
  }
}
testConnection();

export const messaging = messagingInstance;

export const requestNotificationPermission = async () => {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  
  const activeMessaging = messagingInstance || await initializeMessaging();
  if (!activeMessaging) return;
  
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      let registration;
      if ('serviceWorker' in navigator) {
        registration = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
        if (!registration) {
          registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' });
        }
      }

      const currentToken = await getToken(activeMessaging, { 
        vapidKey: 'BLpfNtPFcOkDCoXJ0F_vmM3RmtPtWy24cGby0tw-XL2EeZz3xxa_2DXYjS8uw_dRSsZIrcq-05Rv68nTJbJgrzg',
        serviceWorkerRegistration: registration 
      });
      
      if (currentToken) {
        const { doc: firestoreDoc, setDoc, serverTimestamp } = await import('firebase/firestore');
        const user = getAuth().currentUser;
        await setDoc(firestoreDoc(db, 'fcm_tokens', currentToken), {
          token: currentToken,
          userId: user ? user.uid : 'anonymous',
          lastSeen: serverTimestamp(),
          platform: navigator.platform,
          userAgent: navigator.userAgent,
          isPWA: window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true,
          status: 'active'
        }, { merge: true });

        return currentToken;
      }
    }
  } catch (err) {
    console.warn('FCM Permission/Token error:', err);
  }
};

export const uploadImage = async (file: File, folder: string): Promise<string> => {
  const path = `${folder}/${Date.now()}_${file.name}`;
  try {
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  } catch (error) {
    handleStorageError(error, path);
    return '';
  }
};