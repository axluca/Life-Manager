/**
 * Firestore Diagnostics Helper
 * Use this to test Firestore connectivity
 */

import { db } from './firebase';
import { collection, getDocs, query, limit } from 'firebase/firestore';

export const testFirestoreConnection = async (): Promise<{
  isConnected: boolean;
  error?: string;
  details?: string;
}> => {
  try {
    console.log('[Diagnostics] Testing Firestore connection...');
    
    // Try to read a single document from any collection
    const testQuery = query(collection(db, 'users'), limit(1));
    const snapshot = await getDocs(testQuery);
    
    console.log('[Diagnostics] Firestore connection successful!');
    console.log('[Diagnostics] Database state:', snapshot.metadata);
    
    return {
      isConnected: true,
      details: `Successfully connected to Firestore. Database is ${snapshot.metadata.fromCache ? 'using cache' : 'online'}.`,
    };
  } catch (error: any) {
    console.error('[Diagnostics] Firestore connection failed:', error);
    
    return {
      isConnected: false,
      error: error.message || 'Unknown error',
      details: `Error code: ${error.code}, Message: ${error.message}`,
    };
  }
};

// Run on module load for debugging
if (typeof window !== 'undefined') {
  console.log('[Diagnostics] Run testFirestoreConnection() in console to test connectivity');
  // @ts-ignore - Make it available globally for debugging
  window.testFirestoreConnection = testFirestoreConnection;
}
