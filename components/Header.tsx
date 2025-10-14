import React, { useState, useRef, useEffect } from 'react';
import { User } from '../types';
import { LogoIcon, LogoutIcon, UserCircleIcon, StarIcon, ChevronDownIcon, MenuIcon } from './icons';

interface HeaderProps {
    user: User;
    onLogout: () => void;
    onToggleSidebar: () => void;
    isSidebarOpen: boolean;
}

const Header: React.FC<HeaderProps> = ({ user, onLogout, onToggleSidebar, isSidebarOpen }) => {
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    return (
        <header className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border-b border-gray-200 dark:border-slate-700 sticky top-0 z-40 h-16 flex-shrink-0">
            <div className="h-full">
                <div className="flex items-center justify-between h-full px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center">
                        <button
                            onClick={onToggleSidebar}
                            className="p-2 rounded-md text-slate-500 dark:text-slate-400 hover:bg-gray-200/50 dark:hover:bg-slate-700/50 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            aria-label="Toggle sidebar"
                        >
                            <MenuIcon className="h-6 w-6" />
                        </button>
                        <LogoIcon className="h-8 w-8 text-indigo-500 dark:text-indigo-400 ml-2" />
                        <h1 className="ml-3 text-xl font-bold tracking-tight text-slate-800 dark:text-gray-200">
                            Life Manager
                        </h1>
                    </div>
                    <div className="relative" ref={dropdownRef}>
                        <button
                            onClick={() => setDropdownOpen(!dropdownOpen)}
                            className="flex items-center space-x-2 p-2 rounded-md hover:bg-gray-200/50 dark:hover:bg-slate-700/50 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <UserCircleIcon className="h-8 w-8 text-slate-500 dark:text-slate-400" />
                            <span className="hidden sm:inline text-sm font-medium text-slate-700 dark:text-slate-300">{user.name}</span>
                            <ChevronDownIcon className={`h-5 w-5 text-slate-500 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {dropdownOpen && (
                            <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg overflow-hidden">
                                <div className="p-4 border-b border-gray-200 dark:border-slate-700">
                                    <p className="font-semibold text-slate-900 dark:text-white">{user.name}</p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">{user.email}</p>
                                    <div className="mt-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 dark:bg-indigo-500/20 text-indigo-800 dark:text-indigo-300">
                                        <StarIcon className="h-3 w-3 mr-1" />
                                        {user.subscriptionStatus} Tier
                                    </div>
                                </div>
                                <div className="p-2">
                                     <button
                                        onClick={onLogout}
                                        className="w-full flex items-center px-3 py-2 text-sm text-slate-700 dark:text-slate-300 rounded-md hover:bg-gray-100 dark:hover:bg-slate-700/70 transition-colors"
                                    >
                                        <LogoutIcon className="h-5 w-5 mr-3" />
                                        Log Out
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;