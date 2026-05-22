import { initializeApp, getApps, getApp } from 'firebase/app';
import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra ?? {};

const firebaseConfig = {
  apiKey:     extra.FIREBASE_API_KEY     as string,
  authDomain: extra.FIREBASE_AUTH_DOMAIN as string,
  projectId:  extra.FIREBASE_PROJECT_ID  as string,
};

export const firebaseApp = getApps().length === 0
  ? initializeApp(firebaseConfig)
  : getApp();
