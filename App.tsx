import React, { useState, useCallback, useEffect } from 'react';
import { User, TimeFormat, CalendarViewKey } from './types';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import { subscribeToAuthState, fetchUserData, signOut } from './firebase';
import { testFirestoreConnection } from './firebaseDiagnostics';

export type Theme = 'light' | 'dark';

interface FirebaseUser {
  uid: string;
  email: string;
  name: string;
  subscriptionStatus: 'Free' | 'Premium';
}

const defaultVisibleViews: CalendarViewKey[] = ['year', 'month', 'week', 'day'];

const App: React.FC = () => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem('theme') as Theme) || 'dark';
  });
  const [timeFormat, setTimeFormat] = useState<TimeFormat>(() => {
    return (localStorage.getItem('timeFormat') as TimeFormat) || '24h';
  });
  const [visibleCalendarViews, setVisibleCalendarViews] = useState<CalendarViewKey[]>(() => {
    try {
      const stored = localStorage.getItem('visibleCalendarViews');
      return stored ? JSON.parse(stored) : defaultVisibleViews;
    } catch {
      return defaultVisibleViews;
    }
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('timeFormat', timeFormat);
  }, [timeFormat]);

  useEffect(() => {
    localStorage.setItem('visibleCalendarViews', JSON.stringify(visibleCalendarViews));
  }, [visibleCalendarViews]);

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
  };

  const handleTimeFormatChange = (newFormat: TimeFormat) => {
    setTimeFormat(newFormat);
  };

  const handleVisibleCalendarViewsChange = (newViews: CalendarViewKey[]) => {
    setVisibleCalendarViews(newViews);
  };

  // Subscribe to Firebase auth state
  useEffect(() => {
    console.log('[App] Setting up auth state subscription');
    const unsubscribe = subscribeToAuthState((firebaseUser) => {
      console.log('[App] Auth state changed, user:', firebaseUser?.uid || 'none');
      setUser(firebaseUser);
      setIsLoading(false);
    });

    return () => {
      console.log('[App] Cleaning up auth state subscription');
      unsubscribe();
    };
  }, []);

  // Apply base styling to the body for theme transitions
  useEffect(() => {
    document.body.className = 'bg-gray-50 dark:bg-slate-900 text-slate-900 dark:text-white transition-colors duration-300';
  }, []);

  const handleAuthSuccess = useCallback(() => {
    // Auth state will be automatically updated by the subscription
    console.log('[App] Auth success callback triggered');
    setIsLoading(false);
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await signOut();
      setUser(null);
    } catch (error) {
      console.error('[App] Error signing out:', error);
      setUser(null); // Clear user state even if signOut fails
    }
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 font-sans">
        <div className="w-full max-w-md mx-auto">
          <Auth onAuthSuccess={handleAuthSuccess} />
        </div>
      </div>
    );
  }

  return (
    <Dashboard 
      user={{
        name: user.name,
        email: user.email,
        subscriptionStatus: user.subscriptionStatus,
      }}
      userId={user.uid}
      onLogout={handleLogout}
      theme={theme}
      onThemeChange={handleThemeChange}
      timeFormat={timeFormat}
      onTimeFormatChange={handleTimeFormatChange}
      visibleCalendarViews={visibleCalendarViews}
      onVisibleCalendarViewsChange={handleVisibleCalendarViewsChange}
    />
  );
};

export default App;