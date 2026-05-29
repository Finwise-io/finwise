import { initializeApp, getApps, getApp } from 'firebase/app';

// Firebase client config is public by design — security is enforced via
// Firebase Security Rules, not by keeping these values secret.
const firebaseConfig = {
  apiKey:            'AIzaSyArskqgN7sNAKFmeVXYlzLavQq1GrbHyL8',
  authDomain:        'finwise-app-jj.firebaseapp.com',
  projectId:         'finwise-app-jj',
  storageBucket:     'finwise-app-jj.firebasestorage.app',
  messagingSenderId: '420357539725',
  appId:             '1:420357539725:web:68362db186b0c75b4e1fc4',
};

export const firebaseApp = getApps().length === 0
  ? initializeApp(firebaseConfig)
  : getApp();
