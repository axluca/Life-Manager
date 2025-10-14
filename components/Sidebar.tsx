import React from 'react';
import { TargetIcon, BriefcaseIcon, ClipboardCheckIcon, CalendarIcon, ChartBarIcon, CogIcon, FlameIcon } from './icons';

// FIX: Removed 'dashboard' from the View type as it is not a valid view in the app. This resolves a type mismatch error when passing the state setter from the parent Dashboard component.
type View = 'goals' | 'projects' | 'tasks' | 'habits' | 'calendar' | 'reviews' | 'settings';

interface SidebarProps {
  currentView: View;
  onViewChange: (view: View) => void;
  isOpen: boolean;
}

const navItems: { view: View; label: string; icon: React.FC<React.SVGProps<SVGSVGElement>> }[] = [
  { view: 'goals', label: 'Goals & Values', icon: TargetIcon },
  { view: 'projects', label: 'Projects', icon: BriefcaseIcon },
  { view: 'tasks', label: 'Tasks', icon: ClipboardCheckIcon },
  { view: 'habits', label: 'Habits', icon: FlameIcon },
  { view: 'calendar', label: 'Calendar', icon: CalendarIcon },
  { view: 'reviews', label: 'Reviews', icon: ChartBarIcon },
  { view: 'settings', label: 'Settings', icon: CogIcon },
];

const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange, isOpen }) => {
  return (
    <aside
      className={`fixed top-16 bottom-0 left-0 z-30 w-64 flex-shrink-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-r border-gray-200 dark:border-slate-700 p-4 flex flex-col transform transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <nav className="flex-grow">
        <ul className="space-y-2">
          {navItems.map(item => (
            <li key={item.view}>
              <button
                onClick={() => onViewChange(item.view)}
                className={`w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                  currentView === item.view
                    ? 'bg-indigo-600 text-white shadow-lg'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700/50'
                }`}
              >
                <item.icon className="h-5 w-5 mr-3" />
                <span>{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <div className="flex-shrink-0 mt-auto">
        {/* Placeholder for future sidebar footer content */}
        <p className="text-xs text-center text-slate-500">
            Life Manager v1.0
        </p>
      </div>
    </aside>
  );
};

export default Sidebar;
