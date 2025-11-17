import React, { useState } from 'react';
import Login from './Login';
import Register from './Register';

interface AuthProps {
  onAuthSuccess: () => void;
}

const Auth: React.FC<AuthProps> = ({ onAuthSuccess }) => {
  const [isLoginView, setIsLoginView] = useState(true);

  return (
    <div>
      {isLoginView ? (
        <Login onLoginSuccess={onAuthSuccess} />
      ) : (
        <Register onRegisterSuccess={onAuthSuccess} />
      )}
      <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
        {isLoginView ? "Don't have an account?" : 'Already have an account?'}
        <button
          onClick={() => setIsLoginView(!isLoginView)}
          className="ml-2 font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-50 dark:focus:ring-offset-slate-800 focus:ring-indigo-500 rounded"
        >
          {isLoginView ? 'Sign Up' : 'Sign In'}
        </button>
      </p>

      <div className="mt-6">
        <div className="relative">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-gray-300 dark:border-slate-600" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-gray-50 dark:bg-slate-900 px-2 text-slate-500">Test credentials</span>
          </div>
        </div>
        <div className="mt-4">
          <p className="text-xs text-center text-slate-500 dark:text-slate-400 mb-3">
            Email: test@example.com / Password: Test@123
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;