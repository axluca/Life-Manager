import React, { useState } from 'react';
import Login from './Login';
import Register from './Register';

interface AuthProps {
  onAuthSuccess: () => void;
}

// Set to `false` or remove the button entirely for production
const isDevelopment = true;

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

      {isDevelopment && (
         <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-gray-300 dark:border-slate-600" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-gray-50 dark:bg-slate-900 px-2 text-slate-500">{`For Testing`}</span>
              </div>
            </div>
            <div className="mt-4">
              <p className="text-xs text-center text-slate-500 dark:text-slate-400 mb-3">
                Test credentials: test@example.com / Test@123
              </p>
            </div>
          </div>
      )}
    </div>
  );
};

export default Auth;
        >
          {isLoginView ? 'Sign Up' : 'Sign In'}
        </button>
      </p>

      {isDevelopment && (
         <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-gray-300 dark:border-slate-600" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-gray-50 dark:bg-slate-900 px-2 text-slate-500">{`For Testing`}</span>
              </div>
            </div>
            <div className="mt-4">
              <button
                type="button"
                onClick={handleTestLogin}
                disabled={isLoading}
                className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm bg-white dark:bg-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-50 dark:focus:ring-offset-slate-900 focus:ring-indigo-500 disabled:opacity-50"
              >
                {isLoading ? 'Loading...' : 'Continue with Test User'}
              </button>
              {error && <p className="mt-2 text-sm text-center text-red-500 dark:text-red-400">{error}</p>}
            </div>
          </div>
      )}
    </div>
  );
};

export default Auth;