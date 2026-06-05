import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCBKqpj3iwD2sxxJ3ZzOh7thukDi29ez7c",
  authDomain: "home-control-1408.firebaseapp.com",
  projectId: "home-control-1408",
  storageBucket: "home-control-1408.firebasestorage.app",
  messagingSenderId: "270166714736",
  appId: "1:270166714736:web:30daeac31bd28aee5407b5",
  measurementId: "G-MD1J8K5NB9"
};

let app: FirebaseApp;
let db: Firestore;

export const getFirebaseApp = (): FirebaseApp => {
  if (!app) {
    app = initializeApp(firebaseConfig);
  }
  return app;
};

export const getFirestoreDB = (): Firestore => {
  if (!db) {
    const firebaseApp = getFirebaseApp();
    db = getFirestore(firebaseApp);
  }
  return db;
};

export { app, db };
