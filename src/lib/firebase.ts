import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, doc, getDocFromServer, persistentLocalCache, persistentMultipleTabManager, persistentSingleTabManager } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
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
    console.warn(`Firestore [${path}] temporarily unavailable. Operating in offline/quota-exceeded mode.`, errInfo);
    return;
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('firestore-error', { 
      detail: { code: errCode, message: errStr, path, operationType } 
    }));
  }

  console.error(`Firestore Error [${path}]: `, JSON.stringify(errInfo));
  if (isQuotaExceeded) {
     console.warn("Quota Exceeded. Application degraded.");
  }
}

export function handleStorageError(error: any, path: string) {
  const errInfo = {
    error: error?.message || error?.code || String(error),
    authInfo: {
      userId: getAuth().currentUser?.uid,
    },
    operationType: 'UPLOAD',
    path
  };
  console.error(`Storage Error [${path}]: `, JSON.stringify(errInfo));
  throw new Error(`STORAGE_ERROR: ${errInfo.error}`);
}

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || firebaseConfigJson.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfigJson.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || firebaseConfigJson.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfigJson.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfigJson.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || firebaseConfigJson.appId,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || firebaseConfigJson.measurementId,
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID || firebaseConfigJson.firestoreDatabaseId
};

console.log('Firebase Configuration Check:', {
  projectId: firebaseConfig.projectId,
  databaseId: firebaseConfig.firestoreDatabaseId,
  hasApiKey: !!firebaseConfig.apiKey
});

const app = initializeApp(firebaseConfig);

// Detect if running inside an iframe or if third-party storage is restricted
const isIframe = typeof window !== 'undefined' && (window.self !== window.top);
const canUseStorage = (() => {
  try {
    if (typeof window === 'undefined') return false;
    localStorage.setItem('__test_ls', '1');
    localStorage.removeItem('__test_ls');
    return true;
  } catch (e) {
    return false;
  }
})();

const firestoreSettings: any = {
  experimentalForceLongPolling: true,
};

if (!isIframe && canUseStorage) {
  try {
    firestoreSettings.localCache = persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    });
  } catch (e) {
    console.warn("Failed to initialize persistentMultipleTabManager:", e);
  }
} else if (canUseStorage) {
  try {
    // Falls back to single tab cache when inside iframe sandbox to avoid broadcast lock issues
    firestoreSettings.localCache = persistentLocalCache({
      tabManager: persistentSingleTabManager({})
    });
  } catch (e) {
    console.warn("Failed to initialize persistentSingleTabManager inside sandbox:", e);
  }
}

export const db = initializeFirestore(app, firestoreSettings, firebaseConfig.firestoreDatabaseId || '(default)');

export const auth = getAuth(app);
export const storage = getStorage(app);

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
    console.warn("Firebase Messaging initialization failed (expected in some environments):", e);
  }
  return null;
};

initializeMessaging();

async function testConnection() {
  try {
    // Avoid getDocFromServer for the initial test as it's too aggressive and fails immediately if handshake hasn't finished
    const { getDoc } = await import('firebase/firestore');
    await getDoc(doc(db, 'test', 'connection'));
    console.info('Firestore connection test initiated.');
  } catch (error: any) {
    const errStr = error?.message || '';
    if (errStr.includes('offline') || error?.code === 'unavailable') {
      console.warn("Firestore is currently in offline mode. It will sync automatically once a connection is established.");
    } else {
       console.error("Firestore connectivity issue:", error);
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
      // Get service worker registration
      let registration;
      if ('serviceWorker' in navigator) {
        registration = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
        if (!registration) {
          registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
            scope: '/'
          });
        }
      }

      const currentToken = await getToken(activeMessaging, { 
        vapidKey: 'BLpfNtPFcOkDCoXJ0F_vmM3RmtPtWy24cGby0tw-XL2EeZz3xxa_2DXYjS8uw_dRSsZIrcq-05Rv68nTJbJgrzg',
        serviceWorkerRegistration: registration 
      });
      
      if (currentToken) {
        console.log('FCM Token generated:', currentToken);
        const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
        const user = getAuth().currentUser;
        
        // Save token with more metadata
        await setDoc(doc(db, 'fcm_tokens', currentToken), {
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
