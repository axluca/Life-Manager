import { initializeApp } from 'firebase/app';
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  onAuthStateChanged,
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
  console.error('Failed to set auth persistence:', error);
});

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
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          resolve({
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            ...userDoc.data(),
          } as FirebaseUser);
        } else {
          resolve(null);
        }
      } catch (error) {
        console.error('Error getting current user:', error);
        resolve(null);
      }
    });
  });
};

export const subscribeToAuthState = (callback: (user: FirebaseUser | null) => void) => {
  return onAuthStateChanged(auth, async (firebaseUser) => {
    if (!firebaseUser) {
      callback(null);
      return;
    }
    try {
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      if (userDoc.exists()) {
        callback({
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          ...userDoc.data(),
        } as FirebaseUser);
      } else {
        callback(null);
      }
    } catch (error) {
      console.error('Error in auth state subscription:', error);
      callback(null);
    }
  });
};

// --- DATA FETCHING FUNCTIONS ---

export const fetchUserData = async (userId: string) => {
  try {
    const [valuesSnap, goalsSnap, projectsSnap, tasksSnap, reviewsSnap, habitsSnap, blocksSnap] = await Promise.all([
      getDocs(query(collection(db, 'values'), where('userId', '==', userId))),
      getDocs(query(collection(db, 'goals'), where('userId', '==', userId))),
      getDocs(query(collection(db, 'projects'), where('userId', '==', userId))),
      getDocs(query(collection(db, 'tasks'), where('userId', '==', userId))),
      getDocs(query(collection(db, 'reviews'), where('userId', '==', userId))),
      getDocs(query(collection(db, 'habits'), where('userId', '==', userId))),
      getDocs(query(collection(db, 'idealWeekBlocks'), where('userId', '==', userId))),
    ]);

    return {
      values: valuesSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Value & { userId: string })),
      goals: goalsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Goal & { userId: string })),
      projects: projectsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Project & { userId: string })),
      tasks: tasksSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Task & { userId: string })),
      reviews: reviewsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Review & { userId: string })),
      habits: habitsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Habit & { userId: string })),
      idealWeekBlocks: blocksSnap.docs.map((d) => ({ id: d.id, ...d.data() } as IdealWeekBlock & { userId: string })),
    };
  } catch (error) {
    console.error('Error fetching user data:', error);
    throw error;
  }
};

// --- DATA SAVING FUNCTIONS ---

export const saveValue = async (userId: string, value: Omit<Value, 'id'>) => {
  try {
    const id = doc(collection(db, 'values')).id;
    await setDoc(doc(db, 'values', id), { ...value, userId });
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

export const saveGoal = async (userId: string, goal: Omit<Goal, 'id'>) => {
  try {
    const id = doc(collection(db, 'goals')).id;
    await setDoc(doc(db, 'goals', id), { ...goal, userId });
    return { id, ...goal } as Goal & { userId: string };
  } catch (error) {
    console.error('Error saving goal:', error);
    throw error;
  }
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
    await setDoc(doc(db, 'projects', id), { ...project, userId });
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
    await setDoc(doc(db, 'tasks', id), { ...task, userId });
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
    await setDoc(doc(db, 'reviews', id), { ...review, userId });
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

export const saveHabit = async (userId: string, habit: Omit<Habit, 'id'>) => {
  try {
    const id = doc(collection(db, 'habits')).id;
    await setDoc(doc(db, 'habits', id), { ...habit, userId });
    return { id, ...habit } as Habit & { userId: string };
  } catch (error) {
    console.error('Error saving habit:', error);
    throw error;
  }
};

export const updateHabit = async (habitId: string, updates: Partial<Habit>) => {
  try {
    await updateDoc(doc(db, 'habits', habitId), updates);
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
    await setDoc(doc(db, 'idealWeekBlocks', id), { ...block, userId });
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
