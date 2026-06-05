'use client';

import { useState, useEffect } from 'react';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  onSnapshot,
  DocumentSnapshot,
  Unsubscribe 
} from 'firebase/firestore';
import { getFirestoreDB } from './firebase';
import { FirestoreData, FirestoreState } from './types';

const USER_ID = 'user-1'; // Simple single-user structure

// Helper functions for localStorage
const loadFromLocalStorage = (): FirestoreData | null => {
  try {
    const saved = localStorage.getItem('homeControlData');
    return saved ? JSON.parse(saved) : null;
  } catch (e) {
    console.error('Error loading from localStorage:', e);
    return null;
  }
};

const saveToLocalStorage = (data: FirestoreData) => {
  try {
    localStorage.setItem('homeControlData', JSON.stringify(data));
  } catch (e) {
    console.error('Error saving to localStorage:', e);
  }
};

const getInitialData = (): FirestoreData => ({
  electricity: {},
  water: {},
  planner: {},
  alerts: [],
  settings: {
    electricityPrice: "4.50",
    waterPrice: "45.00",
    notificationsEnabled: true,
    autoUpdateEnabled: true
  }
});

export const useFirestore = () => {
  const [state, setState] = useState<FirestoreState>({
    data: null,
    loading: true,
    error: null
  });

  const [usingLocalStorage, setUsingLocalStorage] = useState(false);

  useEffect(() => {
    const db = getFirestoreDB();
    const userDocRef = doc(db, 'users', USER_ID);

    // Initial load
    const loadData = async () => {
      try {
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
          const firestoreData = docSnap.data() as FirestoreData;
          // Save to localStorage as backup
          saveToLocalStorage(firestoreData);
          setState({
            data: firestoreData,
            loading: false,
            error: null
          });
        } else {
          // Initialize with empty data
          const initialData = getInitialData();
          await setDoc(userDocRef, initialData);
          saveToLocalStorage(initialData);
          setState({
            data: initialData,
            loading: false,
            error: null
          });
        }
      } catch (error) {
        console.error('Error loading Firestore data, falling back to localStorage:', error);
        // Fallback to localStorage
        const localData = loadFromLocalStorage();
        if (localData) {
          setState({
            data: localData,
            loading: false,
            error: null
          });
          setUsingLocalStorage(true);
        } else {
          // Use initial data if no localStorage data
          const initialData = getInitialData();
          saveToLocalStorage(initialData);
          setState({
            data: initialData,
            loading: false,
            error: null
          });
          setUsingLocalStorage(true);
        }
      }
    };

    loadData();

    // Set up real-time listener only if not using localStorage
    let unsubscribe: Unsubscribe | null = null;
    if (!usingLocalStorage) {
      unsubscribe = onSnapshot(
        userDocRef,
        (docSnap: DocumentSnapshot) => {
          if (docSnap.exists()) {
            const firestoreData = docSnap.data() as FirestoreData;
            saveToLocalStorage(firestoreData);
            setState(prev => ({
              ...prev,
              data: firestoreData,
              loading: false,
              error: null
            }));
          }
        },
        (error) => {
          console.error('Firestore listener error, falling back to localStorage:', error);
          const localData = loadFromLocalStorage();
          if (localData) {
            setState(prev => ({
              ...prev,
              data: localData,
              error: null
            }));
            setUsingLocalStorage(true);
          } else {
            setState(prev => ({
              ...prev,
              error: error instanceof Error ? error.message : 'Listener error'
            }));
          }
        }
      );
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [usingLocalStorage]);

  const updateData = async (updates: Partial<FirestoreData>) => {
    if (!state.data) return;

    // Always save to localStorage first for immediate persistence
    const updatedData = { ...state.data, ...updates };
    saveToLocalStorage(updatedData);

    // Try to save to Firestore
    try {
      const db = getFirestoreDB();
      const userDocRef = doc(db, 'users', USER_ID);
      
      if (usingLocalStorage) {
        // If using localStorage, try to reconnect to Firestore
        try {
          await setDoc(userDocRef, updatedData, { merge: true });
          setUsingLocalStorage(false);
          setState(prev => ({ ...prev, error: null }));
        } catch (reconnectError) {
          console.error('Failed to reconnect to Firestore, staying on localStorage:', reconnectError);
        }
      } else {
        await updateDoc(userDocRef, updates);
      }
    } catch (error) {
      console.error('Error updating Firestore data, using localStorage only:', error);
      // Data is already saved to localStorage, so app continues to work
      setUsingLocalStorage(true);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to update data'
      }));
    }
  };

  return { state, updateData, usingLocalStorage };
};
