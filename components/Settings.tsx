import React, { useState } from 'react';
import { Theme } from '../App';
import { TimeFormat, CalendarViewKey } from '../types';
import TwoFactorModal from './TwoFactorModal';

interface SettingsProps {
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  timeFormat: TimeFormat;
  onTimeFormatChange: (format: TimeFormat) => void;
  visibleCalendarViews: CalendarViewKey[];
  onVisibleCalendarViewsChange: (views: CalendarViewKey[]) => void;
  userId?: string;
  userTwoFactorEnabled?: boolean;
  userPhoneNumber?: string;
}

const allCalendarViews: { key: CalendarViewKey; label: string }[] = [
    { key: 'year', label: 'Year' },
    { key: 'quarter', label: 'Quarter' },
    { key: 'month', label: 'Month' },
    { key: 'week', label: 'Week' },
    { key: 'day', label: 'Day' },
];

const Settings: React.FC<SettingsProps> = ({ 
  theme, onThemeChange, 
  timeFormat, onTimeFormatChange,
  visibleCalendarViews, onVisibleCalendarViewsChange,
  userId = '',
  userTwoFactorEnabled = false,
  userPhoneNumber = '',
}) => {
  const [show2FAModal, setShow2FAModal] = useState(false);

  const toggleTheme = () => {
    onThemeChange(theme === 'dark' ? 'light' : 'dark');
  };

  const handleViewToggle = (viewKey: CalendarViewKey) => {
    const isCurrentlyVisible = visibleCalendarViews.includes(viewKey);
    const essentialViews: CalendarViewKey[] = ['week', 'day'];
    
    // Prevent disabling the last essential view
    if (isCurrentlyVisible && essentialViews.includes(viewKey)) {
      const visibleEssentialCount = visibleCalendarViews.filter(v => essentialViews.includes(v)).length;
      if (visibleEssentialCount <= 1) {
        // Do not allow the change
        return;
      }
    }

    const newViews = isCurrentlyVisible
      ? visibleCalendarViews.filter(v => v !== viewKey)
      : [...visibleCalendarViews, viewKey];
    
    // Keep original order
    const orderedNewViews = allCalendarViews.map(v => v.key).filter(key => newViews.includes(key));
    
    onVisibleCalendarViewsChange(orderedNewViews);
  };

  return (
    <div className="space-y-8">
        <h1 className="text-3xl font-bold">Settings</h1>
        
        <div className="bg-white dark:bg-slate-800/60 backdrop-blur-sm border border-gray-200 dark:border-slate-700 rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold">Appearance</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 mb-6">Customize the look and feel of the application.</p>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-100 dark:bg-slate-700/50 rounded-lg">
                  <div>
                      <h3 className="font-semibold text-slate-800 dark:text-slate-200">Theme</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Current: {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</p>
                  </div>
                  <button
                      onClick={toggleTheme}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-800 ${theme === 'dark' ? 'bg-indigo-600' : 'bg-gray-300'}`}
                      role="switch"
                      aria-checked={theme === 'dark'}
                  >
                      <span
                          aria-hidden="true"
                          className={`${
                          theme === 'dark' ? 'translate-x-5' : 'translate-x-0'
                          } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                      />
                  </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-100 dark:bg-slate-700/50 rounded-lg">
                  <div>
                      <h3 className="font-semibold text-slate-800 dark:text-slate-200">Time Format</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Current: {timeFormat === '24h' ? '24-hour' : '12-hour (AM/PM)'}</p>
                  </div>
                  <div className="flex rounded-lg p-1 bg-gray-200 dark:bg-slate-800">
                      <button
                          onClick={() => onTimeFormatChange('24h')}
                          className={`px-3 py-1 text-sm font-medium rounded-md transition-shadow ${timeFormat === '24h' ? 'bg-white dark:bg-slate-600 shadow' : 'text-slate-600 dark:text-slate-400'}`}
                      >
                          24h
                      </button>
                      <button
                          onClick={() => onTimeFormatChange('12h')}
                          className={`px-3 py-1 text-sm font-medium rounded-md transition-shadow ${timeFormat === '12h' ? 'bg-white dark:bg-slate-600 shadow' : 'text-slate-600 dark:text-slate-400'}`}
                      >
                          AM/PM
                      </button>
                  </div>
              </div>

              <div className="p-4 bg-gray-100 dark:bg-slate-700/50 rounded-lg">
                  <div>
                      <h3 className="font-semibold text-slate-800 dark:text-slate-200">Visible Calendar Views</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Choose which views to show in the calendar.</p>
                  </div>
                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {allCalendarViews.map(({ key, label }) => {
                          const isVisible = visibleCalendarViews.includes(key);
                          const isEssential = key === 'week' || key === 'day';
                          const canBeDisabled = !isEssential || visibleCalendarViews.filter(v => v === 'week' || v === 'day').length > 1;

                          return (
                            <label key={key} className={`flex items-center space-x-2 p-2 rounded-md border-2 transition-colors ${isVisible ? 'bg-indigo-100/80 dark:bg-indigo-600/30 border-indigo-500' : 'bg-gray-200 dark:bg-slate-800 border-transparent'} ${!canBeDisabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
                                <input
                                    type="checkbox"
                                    checked={isVisible}
                                    onChange={() => handleViewToggle(key)}
                                    disabled={!canBeDisabled}
                                    className="h-4 w-4 rounded bg-gray-300 dark:bg-slate-600 border-gray-400 dark:border-slate-500 text-indigo-600 focus:ring-indigo-500"
                                />
                                <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{label}</span>
                            </label>
                          );
                      })}
                  </div>
                   <p className="text-xs text-slate-500 mt-3">At least the 'Day' or 'Week' view must be active to ensure calendar functionality.</p>
              </div>
            </div>
        </div>

        <div className="bg-white dark:bg-slate-800/60 backdrop-blur-sm border border-gray-200 dark:border-slate-700 rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold">Security</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 mb-6">Manage your account security settings.</p>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-100 dark:bg-slate-700/50 rounded-lg">
                  <div>
                      <h3 className="font-semibold text-slate-800 dark:text-slate-200">Two-Factor Authentication</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {userTwoFactorEnabled ? 'Enabled via SMS' : 'Add an extra layer of security'}
                      </p>
                  </div>
                  <button
                      onClick={() => setShow2FAModal(true)}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        userTwoFactorEnabled
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50'
                          : 'bg-indigo-600 text-white hover:bg-indigo-700'
                      }`}
                  >
                    {userTwoFactorEnabled ? 'Manage' : 'Enable'}
                  </button>
              </div>
            </div>

            <TwoFactorModal
              userId={userId}
              isOpen={show2FAModal}
              onClose={() => setShow2FAModal(false)}
              twoFactorEnabled={userTwoFactorEnabled}
              phoneNumber={userPhoneNumber}
              onSuccess={() => window.location.reload()}
            />
        </div>
    </div>
  );
};

export default Settings;
