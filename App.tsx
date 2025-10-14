import React, { useState, useCallback, useEffect } from 'react';
import { User, TimeFormat, CalendarViewKey } from './types';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import { apiFetch } from './server';

export type Theme = 'light' | 'dark';

const defaultVisibleViews: CalendarViewKey[] = ['year', 'month', 'week', 'day'];

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('authToken'));
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

  const fetchUserData = useCallback(async (authToken: string) => {
    try {
      const response = await apiFetch('/api/me', {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      if (!response.ok) throw new Error('Failed to fetch user');
      const userData: User = await response.json();
      setUser(userData);
    } catch (error) {
      console.error("Session validation failed:", error);
      localStorage.removeItem('authToken');
      setToken(null);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    // Apply base styling to the body for theme transitions
    document.body.className = 'bg-gray-50 dark:bg-slate-900 text-slate-900 dark:text-white transition-colors duration-300';
    if (token) {
      fetchUserData(token).finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [token, fetchUserData]);

  const handleAuthSuccess = useCallback(async (newToken: string) => {
    localStorage.setItem('authToken', newToken);
    setToken(newToken);
    setIsLoading(true);
    await fetchUserData(newToken);
    setIsLoading(false);
  }, [fetchUserData]);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('authToken');
    setToken(null);
    setUser(null);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!user || !token) {
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
      user={user} 
      token={token} 
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