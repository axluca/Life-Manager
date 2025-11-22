import { initializeApp } from 'firebase/app';
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  onAuthStateChanged,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  PhoneAuthProvider,
  signInWithCredential,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  doc,
  writeBatch,
  QueryConstraint,
  enableIndexedDbPersistence,
} from 'firebase/firestore';

// Firebase configuration - loaded from environment variables
const firebaseConfig = {
  apiKey: "REDACTED_API_KEY",
  authDomain: "life-manager-99518.firebaseapp.com",
  projectId: "life-manager-99518",
  storageBucket: "life-manager-99518.firebasestorage.app",
  messagingSenderId: "213626612303",
  appId: "1:213626612303:web:f4a52ad3f3cbb26b1d183a",
  measurementId: "G-98J9BXF4RF",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Set persistence to LOCAL (survive browser close)
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error('[Firebase] Failed to set auth persistence:', error);
});

// Enable offline persistence for Firestore
try {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('[Firebase] Multiple tabs open - offline persistence disabled');
    } else if (err.code === 'unimplemented') {
      console.warn('[Firebase] Browser does not support offline persistence');
    }
  });
} catch (err) {
  console.warn('[Firebase] Could not enable offline persistence:', err);
}

// --- TYPE DEFINITIONS ---
import type { User, Value, Goal, Project, Task, Review, Habit, IdealWeekBlock, TaskStatus, TaskPriority, ReviewCadence, HabitFrequency } from './types';

export interface FirebaseUser {
  uid: string;
  email: string;
  name: string;
  subscriptionStatus: 'Free' | 'Premium';
}

// --- FIREBASE SERVICE FUNCTIONS ---

// Auth functions
export const getCurrentUser = (): Promise<FirebaseUser | null> => {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      unsubscribe();
      if (!firebaseUser) {
        resolve(null);
        return;
      }
      try {
        const userRef = doc(db, 'users', firebaseUser.uid);
        let userDoc = await getDoc(userRef);
        if (!userDoc.exists()) {
          // Create user document if missing
          try {
            const newUser = {
              uid: firebaseUser.uid,
              name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
              email: firebaseUser.email || '',
              createdAt: new Date().toISOString(),
              subscriptionStatus: 'Free',
            };
            await setDoc(userRef, newUser);
            userDoc = await getDoc(userRef);
            console.log('[Firebase] Created missing Firestore user document:', newUser);
          } catch (err) {
            console.error('[Firebase] Failed to create Firestore user document:', err);
            resolve(null);
            return;
          }
        }
        resolve({
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          ...userDoc.data(),
        } as FirebaseUser);
      } catch (error) {
        console.error('Error getting current user:', error);
        resolve(null);
      }
    });
  });
};

export const subscribeToAuthState = (callback: (user: FirebaseUser | null) => void) => {
  
  const fetchUserDocWithRetry = async (firebaseUser: any, maxAttempts = 3): Promise<FirebaseUser | null> => {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`[Firebase] Fetching user data for user: ${firebaseUser.uid} (attempt ${attempt}/${maxAttempts})`);
        const userRef = doc(db, 'users', firebaseUser.uid);
        let userDoc = await getDoc(userRef);
        
        if (!userDoc.exists()) {
          // Create user document if missing
          try {
            const newUser = {
              uid: firebaseUser.uid,
              name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
              email: firebaseUser.email || '',
              createdAt: new Date().toISOString(),
              subscriptionStatus: 'Free',
            };
            console.log('[Firebase] Creating new user document:', newUser);
            await setDoc(userRef, newUser);
            userDoc = await getDoc(userRef);
            console.log('[Firebase] Created missing Firestore user document:', newUser);
          } catch (err) {
            console.error('[Firebase] Failed to create Firestore user document:', err);
            throw err;
          }
        }
        
        const userData = userDoc.data();
        console.log('[Firebase] User data retrieved:', userData);
        
        const firebaseUserData: FirebaseUser = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          name: userData?.name || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
          subscriptionStatus: userData?.subscriptionStatus || 'Free',
        };
        
        console.log('[Firebase] Successfully fetched user data:', firebaseUserData);
        return firebaseUserData;
      } catch (error: any) {
        console.warn(`[Firebase] Attempt ${attempt}/${maxAttempts} failed:`, error.message);
        
        // If this is the last attempt or error is not network-related, give up
        if (attempt === maxAttempts || (error.code !== 'unavailable' && !error.message?.includes('offline'))) {
          console.error('[Firebase] Failed to fetch user document:', error);
          return null;
        }
        
        // Wait before retrying (exponential backoff)
        const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        console.log(`[Firebase] Retrying in ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
    
    return null;
  };
  
  return onAuthStateChanged(auth, async (firebaseUser) => {
    if (!firebaseUser) {
      console.log('[Firebase] User signed out');
      callback(null);
      return;
    }
    
    console.log('[Firebase] Auth state changed for user:', firebaseUser.uid);
    
    try {
      // Try to fetch user data, but don't block on failure
      const userData = await fetchUserDocWithRetry(firebaseUser);
      
      if (userData) {
        console.log('[Firebase] Calling callback with complete user data:', userData);
        callback(userData);
      } else {
        // Firestore is offline/unavailable, but auth succeeded
        // Create a minimal user object to allow sign-in to proceed
        console.warn('[Firebase] Could not fetch user data from Firestore, using minimal user object');
        const minimalUser: FirebaseUser = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
          subscriptionStatus: 'Free',
        };
        callback(minimalUser);
      }
    } catch (error) {
      console.error('[Firebase] Unexpected error in auth state subscription:', error);
      // Even on error, allow sign-in with minimal user data
      const minimalUser: FirebaseUser = {
        uid: firebaseUser.uid,
        email: firebaseUser.email || '',
        name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
        subscriptionStatus: 'Free',
      };
      callback(minimalUser);
    }
  });
};

// --- DATA FETCHING FUNCTIONS ---

export const fetchUserData = async (userId: string, maxAttempts = 3) => {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`[Firebase] Fetching user data for ${userId} (attempt ${attempt}/${maxAttempts})`);
      
      const [valuesSnap, goalsSnap, projectsSnap, tasksSnap, reviewsSnap, habitsSnap, blocksSnap] = await Promise.all([
        getDocs(query(collection(db, 'values'), where('userId', '==', userId))),
        getDocs(query(collection(db, 'goals'), where('userId', '==', userId))),
        getDocs(query(collection(db, 'projects'), where('userId', '==', userId))),
        getDocs(query(collection(db, 'tasks'), where('userId', '==', userId))),
        getDocs(query(collection(db, 'reviews'), where('userId', '==', userId))),
        getDocs(query(collection(db, 'habits'), where('userId', '==', userId))),
        getDocs(query(collection(db, 'idealWeekBlocks'), where('userId', '==', userId))),
      ]);

      console.log('[Firebase] User data fetched successfully');
      
      return {
        values: valuesSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Value & { userId: string })),
        goals: goalsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Goal & { userId: string })),
        projects: projectsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Project & { userId: string })),
        tasks: tasksSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Task & { userId: string })),
        reviews: reviewsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Review & { userId: string })),
        habits: habitsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Habit & { userId: string })),
        idealWeekBlocks: blocksSnap.docs.map((d) => ({ id: d.id, ...d.data() } as IdealWeekBlock & { userId: string })),
      };
    } catch (error: any) {
      console.warn(`[Firebase] Attempt ${attempt}/${maxAttempts} failed:`, error.message);
      
      // If offline/unavailable, try retry on earlier attempts
      const isNetworkError = error.code === 'unavailable' || error.message?.includes('offline') || error.message?.includes('permission');
      
      if (attempt === maxAttempts || !isNetworkError) {
        console.error('[Firebase] Error fetching user data:', error.message);
        throw new Error(`Failed to load data: ${error.message}`);
      }
      
      // Wait before retrying (exponential backoff)
      const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
      console.log(`[Firebase] Retrying in ${delayMs}ms...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  throw new Error('Failed to fetch user data after all retries');
};

// --- DATA SAVING FUNCTIONS ---

export const saveValue = async (userId: string, value: Omit<Value, 'id'>) => {
  try {
    const id = doc(collection(db, 'values')).id;
    // Remove undefined fields to avoid Firestore errors
    const cleanValue = Object.fromEntries(
      Object.entries({ ...value, userId }).filter(([_, v]) => v !== undefined)
    );
    await setDoc(doc(db, 'values', id), cleanValue);
    return { id, ...value } as Value & { userId: string };
  } catch (error) {
    console.error('Error saving value:', error);
    throw error;
  }
};

export const updateValue = async (valueId: string, updates: Partial<Value>) => {
  try {
    await updateDoc(doc(db, 'values', valueId), updates);
  } catch (error) {
    console.error('Error updating value:', error);
    throw error;
  }
};

export const deleteValue = async (valueId: string) => {
  try {
    await deleteDoc(doc(db, 'values', valueId));
  } catch (error) {
    console.error('Error deleting value:', error);
    throw error;
  }
};

export const saveGoal = async (userId: string, goal: Omit<Goal, 'id' | 'order'>, maxAttempts = 3) => {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`[Firebase] Saving goal for user ${userId} (attempt ${attempt}/${maxAttempts}):`, goal);
      
      // Get the current max order to assign the next order
      const goalsSnap = await getDocs(query(collection(db, 'goals'), where('userId', '==', userId)));
      const maxOrder = goalsSnap.docs.reduce((max, doc) => {
        const order = (doc.data() as any).order || 0;
        return Math.max(max, order);
      }, -1);
      
      const id = doc(collection(db, 'goals')).id;
      const goalWithOrder = { ...goal, order: maxOrder + 1 };
      
      console.log('[Firebase] Saving goal with ID:', id, 'Order:', goalWithOrder.order);
      
      // Remove undefined fields to avoid Firestore errors
      const cleanGoal = Object.fromEntries(
        Object.entries({ ...goalWithOrder, userId }).filter(([_, value]) => value !== undefined)
      );
      
      await setDoc(doc(db, 'goals', id), cleanGoal);
      
      console.log('[Firebase] Goal saved successfully');
      
      return { id, ...goalWithOrder } as Goal & { userId: string };
    } catch (error: any) {
      console.warn(`[Firebase] Attempt ${attempt}/${maxAttempts} failed:`, error.message);
      
      // If this is the last attempt or error is not network-related, give up
      if (attempt === maxAttempts || (error.code !== 'unavailable' && !error.message?.includes('offline'))) {
        console.error('[Firebase] Error saving goal:', error);
        throw error;
      }
      
      // Wait before retrying (exponential backoff)
      const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
      console.log(`[Firebase] Retrying in ${delayMs}ms...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  throw new Error('Failed to save goal after all retries');
};

export const updateGoal = async (goalId: string, updates: Partial<Goal>) => {
  try {
    await updateDoc(doc(db, 'goals', goalId), updates);
  } catch (error) {
    console.error('Error updating goal:', error);
    throw error;
  }
};

export const deleteGoal = async (goalId: string) => {
  try {
    await deleteDoc(doc(db, 'goals', goalId));
  } catch (error) {
    console.error('Error deleting goal:', error);
    throw error;
  }
};

export const saveProject = async (userId: string, project: Omit<Project, 'id'>) => {
  try {
    const id = doc(collection(db, 'projects')).id;
    // Remove undefined fields to avoid Firestore errors
    const cleanProject = Object.fromEntries(
      Object.entries({ ...project, userId }).filter(([_, v]) => v !== undefined)
    );
    await setDoc(doc(db, 'projects', id), cleanProject);
    return { id, ...project } as Project & { userId: string };
  } catch (error) {
    console.error('Error saving project:', error);
    throw error;
  }
};

export const updateProject = async (projectId: string, updates: Partial<Project>) => {
  try {
    await updateDoc(doc(db, 'projects', projectId), updates);
  } catch (error) {
    console.error('Error updating project:', error);
    throw error;
  }
};

export const deleteProject = async (projectId: string) => {
  try {
    await deleteDoc(doc(db, 'projects', projectId));
  } catch (error) {
    console.error('Error deleting project:', error);
    throw error;
  }
};

export const saveTask = async (userId: string, task: Omit<Task, 'id'>) => {
  try {
    const id = doc(collection(db, 'tasks')).id;
    // Remove undefined fields to avoid Firestore errors
    const cleanTask = Object.fromEntries(
      Object.entries({ ...task, userId }).filter(([_, v]) => v !== undefined)
    );
    await setDoc(doc(db, 'tasks', id), cleanTask);
    return { id, ...task } as Task & { userId: string };
  } catch (error) {
    console.error('Error saving task:', error);
    throw error;
  }
};

export const updateTask = async (taskId: string, updates: Partial<Task>) => {
  try {
    await updateDoc(doc(db, 'tasks', taskId), updates);
  } catch (error) {
    console.error('Error updating task:', error);
    throw error;
  }
};

export const deleteTask = async (taskId: string) => {
  try {
    await deleteDoc(doc(db, 'tasks', taskId));
  } catch (error) {
    console.error('Error deleting task:', error);
    throw error;
  }
};

export const saveReview = async (userId: string, review: Omit<Review, 'id'>) => {
  try {
    const id = doc(collection(db, 'reviews')).id;
    // Remove undefined fields to avoid Firestore errors
    const cleanReview = Object.fromEntries(
      Object.entries({ ...review, userId }).filter(([_, v]) => v !== undefined)
    );
    await setDoc(doc(db, 'reviews', id), cleanReview);
    return { id, ...review } as Review & { userId: string };
  } catch (error) {
    console.error('Error saving review:', error);
    throw error;
  }
};

export const updateReview = async (reviewId: string, updates: Partial<Review>) => {
  try {
    await updateDoc(doc(db, 'reviews', reviewId), updates);
  } catch (error) {
    console.error('Error updating review:', error);
    throw error;
  }
};

export const deleteReview = async (reviewId: string) => {
  try {
    await deleteDoc(doc(db, 'reviews', reviewId));
  } catch (error) {
    console.error('Error deleting review:', error);
    throw error;
  }
};

export const saveHabit = async (userId: string, habit: Omit<Habit, 'id' | 'order'>) => {
  try {
    // Get the current max order to assign the next order
    const habitsSnap = await getDocs(query(collection(db, 'habits'), where('userId', '==', userId)));
    const maxOrder = habitsSnap.docs.reduce((max, doc) => {
      const order = (doc.data() as any).order || 0;
      return Math.max(max, order);
    }, -1);
    
    const id = doc(collection(db, 'habits')).id;
    const habitWithOrder = { ...habit, order: maxOrder + 1 };
    
    // Remove undefined fields to avoid Firestore errors
    const cleanHabit = Object.fromEntries(
      Object.entries({ ...habitWithOrder, userId }).filter(([_, value]) => value !== undefined)
    );
    
    await setDoc(doc(db, 'habits', id), cleanHabit);
    return { id, ...habitWithOrder } as Habit & { userId: string };
  } catch (error) {
    console.error('Error saving habit:', error);
    throw error;
  }
};

export const updateHabit = async (habitId: string, updates: Partial<Habit>) => {
  try {
    // Remove undefined fields to avoid Firestore errors
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, value]) => value !== undefined)
    );
    
    await updateDoc(doc(db, 'habits', habitId), cleanUpdates);
  } catch (error) {
    console.error('Error updating habit:', error);
    throw error;
  }
};

export const deleteHabit = async (habitId: string) => {
  try {
    await deleteDoc(doc(db, 'habits', habitId));
  } catch (error) {
    console.error('Error deleting habit:', error);
    throw error;
  }
};

export const saveIdealWeekBlock = async (userId: string, block: Omit<IdealWeekBlock, 'id'>) => {
  try {
    const id = doc(collection(db, 'idealWeekBlocks')).id;
    // Remove undefined fields to avoid Firestore errors
    const cleanBlock = Object.fromEntries(
      Object.entries({ ...block, userId }).filter(([_, v]) => v !== undefined)
    );
    await setDoc(doc(db, 'idealWeekBlocks', id), cleanBlock);
    return { id, ...block } as IdealWeekBlock & { userId: string };
  } catch (error) {
    console.error('Error saving ideal week block:', error);
    throw error;
  }
};

export const updateIdealWeekBlock = async (blockId: string, updates: Partial<IdealWeekBlock>) => {
  try {
    await updateDoc(doc(db, 'idealWeekBlocks', blockId), updates);
  } catch (error) {
    console.error('Error updating ideal week block:', error);
    throw error;
  }
};

export const deleteIdealWeekBlock = async (blockId: string) => {
  try {
    await deleteDoc(doc(db, 'idealWeekBlocks', blockId));
  } catch (error) {
    console.error('Error deleting ideal week block:', error);
    throw error;
  }
};

export const signOut = async () => {
  try {
    await auth.signOut();
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
};

// Google Sign-In
export const signInWithGoogle = async () => {
  try {
    const provider = new GoogleAuthProvider();
    // Set the OAuth client ID for Google
    provider.setCustomParameters({
      client_id: '213626612303-nv7jm4jc857e8n4cvffqmfq0c056qjkg.apps.googleusercontent.com'
    });
    // Request specific scopes
    provider.addScope('profile');
    provider.addScope('email');
    
    const result = await signInWithPopup(auth, provider);
    console.log('[Firebase] Google sign-in successful:', result.user.uid);
    return result.user;
  } catch (error: any) {
    console.error('[Firebase] Google sign-in error:', error);
    throw error;
  }
};

// Apple Sign-In
export const signInWithApple = async () => {
  try {
    const provider = new OAuthProvider('apple.com');
    // Request specific scopes
    provider.addScope('email');
    provider.addScope('name');
    
    const result = await signInWithPopup(auth, provider);
    console.log('[Firebase] Apple sign-in successful:', result.user.uid);
    return result.user;
  } catch (error: any) {
    console.error('[Firebase] Apple sign-in error:', error);
    throw error;
  }
};

// Password Recovery
export const sendPasswordReset = async (email: string) => {
  try {
    console.log('[Firebase] Sending password reset email to:', email);
    await sendPasswordResetEmail(auth, email);
    console.log('[Firebase] Password reset email sent successfully');
  } catch (error: any) {
    console.error('[Firebase] Password reset error:', error);
    throw error;
  }
};

// Two-Factor Authentication (Phone-based)
let verificationId: string | null = null;

export const initializeRecaptcha = (containerId: string) => {
  try {
    const recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
      size: 'invisible',
      callback: (response: any) => {
        console.log('[Firebase] reCAPTCHA callback:', response);
      },
      'expired-callback': () => {
        console.log('[Firebase] reCAPTCHA expired');
      },
    });
    return recaptchaVerifier;
  } catch (error: any) {
    console.error('[Firebase] reCAPTCHA initialization error:', error);
    throw error;
  }
};

export const sendPhoneVerificationCode = async (
  phoneNumber: string,
  recaptchaVerifier: RecaptchaVerifier
): Promise<string> => {
  try {
    console.log('[Firebase] Sending phone verification code to:', phoneNumber);
    const appVerifier = recaptchaVerifier;
    const confirmationResult = await signInWithPhoneNumber(
      auth,
      phoneNumber,
      appVerifier
    );
    // Store verificationId for later use
    verificationId = confirmationResult.verificationId;
    console.log('[Firebase] Verification code sent successfully');
    return confirmationResult.verificationId;
  } catch (error: any) {
    console.error('[Firebase] Phone verification error:', error);
    throw error;
  }
};

export const verifyPhoneOTP = async (otp: string): Promise<any> => {
  try {
    if (!verificationId) {
      throw new Error('Verification ID not found. Please request a code first.');
    }
    console.log('[Firebase] Verifying OTP...');
    const credential = PhoneAuthProvider.credential(verificationId, otp);
    const result = await signInWithCredential(auth, credential);
    console.log('[Firebase] Phone verification successful:', result.user.uid);
    verificationId = null; // Clear verification ID after use
    return result.user;
  } catch (error: any) {
    console.error('[Firebase] OTP verification error:', error);
    throw error;
  }
};

export const enable2FA = async (userId: string, phoneNumber: string) => {
  try {
    console.log('[Firebase] Enabling 2FA for user:', userId);
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, {
      twoFactorEnabled: true,
      phoneNumber: phoneNumber,
      twoFactorUpdatedAt: new Date().toISOString(),
    });
    console.log('[Firebase] 2FA enabled successfully');
  } catch (error: any) {
    console.error('[Firebase] Enable 2FA error:', error);
    throw error;
  }
};

export const disable2FA = async (userId: string) => {
  try {
    console.log('[Firebase] Disabling 2FA for user:', userId);
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, {
      twoFactorEnabled: false,
      phoneNumber: null,
      twoFactorUpdatedAt: new Date().toISOString(),
    });
    console.log('[Firebase] 2FA disabled successfully');
  } catch (error: any) {
    console.error('[Firebase] Disable 2FA error:', error);
    throw error;
  }
};
