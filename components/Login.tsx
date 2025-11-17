import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, signInWithGoogle, signInWithApple, sendPasswordReset } from '../firebase';

interface LoginProps {
  onLoginSuccess: () => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotPasswordStatus, setForgotPasswordStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [forgotPasswordMessage, setForgotPasswordMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Don't set isLoading to false here - let the parent component handle it
      // The auth state subscription in App.tsx will trigger the callback when ready
      onLoginSuccess();
    } catch (err: any) {
      const errorMessage = getErrorMessage(err.code);
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setIsLoading(true);
    try {
      await signInWithGoogle();
      onLoginSuccess();
    } catch (err: any) {
      const errorMessage = getGoogleErrorMessage(err.code);
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setError('');
    setIsLoading(true);
    try {
      await signInWithApple();
      onLoginSuccess();
    } catch (err: any) {
      const errorMessage = getAppleErrorMessage(err.code);
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotPasswordStatus('loading');
    setForgotPasswordMessage('');

    try {
      await sendPasswordReset(forgotEmail);
      setForgotPasswordStatus('success');
      setForgotPasswordMessage('Password reset email sent! Check your inbox.');
      setForgotEmail('');
      setTimeout(() => {
        setShowForgotPassword(false);
        setForgotPasswordStatus('idle');
      }, 3000);
    } catch (err: any) {
      setForgotPasswordStatus('error');
      setForgotPasswordMessage(err.message || 'Failed to send reset email. Please try again.');
    }
  };

  const getErrorMessage = (errorCode: string): string => {
    switch (errorCode) {
      case 'auth/user-not-found':
        return 'No account found with this email address.';
      case 'auth/wrong-password':
        return 'Incorrect password. Please try again.';
      case 'auth/invalid-email':
        return 'Invalid email address.';
      case 'auth/user-disabled':
        return 'This account has been disabled.';
      case 'auth/too-many-requests':
        return 'Too many failed login attempts. Please try again later.';
      default:
        return 'Sign in failed. Please check your credentials and try again.';
    }
  };

  const getGoogleErrorMessage = (errorCode: string): string => {
    switch (errorCode) {
      case 'auth/popup-closed-by-user':
        return 'Sign-in popup was closed. Please try again.';
      case 'auth/network-request-failed':
        return 'Network error. Please check your connection.';
      default:
        return 'Google sign-in failed. Please try again.';
    }
  };

  const getAppleErrorMessage = (errorCode: string): string => {
    switch (errorCode) {
      case 'auth/popup-closed-by-user':
        return 'Sign-in popup was closed. Please try again.';
      case 'auth/network-request-failed':
        return 'Network error. Please check your connection.';
      case 'auth/operation-not-supported-in-this-environment':
        return 'Apple Sign-In is not available in this browser.';
      default:
        return 'Apple sign-in failed. Please try again.';
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-center text-slate-900 dark:text-gray-100">Welcome Back</h2>
      <p className="text-center text-slate-600 dark:text-slate-400 text-sm mt-2 mb-6">Sign in to continue your journey.</p>
      
      {/* Google Sign-In Button */}
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={isLoading}
        className="w-full flex justify-center items-center py-2 px-4 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-800 focus:ring-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-2"
      >
        <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
          <image href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%234285F4' d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z'/%3E%3Cpath fill='%2334A853' d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z'/%3E%3Cpath fill='%23FBBC05' d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z'/%3E%3Cpath fill='%23EA4335' d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z'/%3E%3C/svg%3E" width="20" height="20" />
        </svg>
        Sign in with Google
      </button>

      {/* Apple Sign-In Button */}
      <button
        type="button"
        onClick={handleAppleSignIn}
        disabled={isLoading}
        className="w-full flex justify-center items-center py-2 px-4 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-800 focus:ring-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-4"
      >
        <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.05 13.5c-.91 0-1.82.55-2.25 1.51.99.44 1.67 1.48 1.67 2.65 0 1.66-1.34 3-3 3-1.66 0-3-1.34-3-3 0-1.17.68-2.21 1.67-2.65-.43-.96-1.34-1.51-2.25-1.51-2.49 0-4.5 2.01-4.5 4.5S6.56 22 9.05 22s4.5-2.01 4.5-4.5c0-.55-.1-1.08-.27-1.59.41.26.9.41 1.42.41 1.66 0 3-1.34 3-3s-1.34-3-3-3z"/>
          <path d="M10 3C5.58 3 2 6.58 2 11h2c0-3.31 2.69-6 6-6s6 2.69 6 6h2c0-4.42-3.58-8-8-8z"/>
        </svg>
        Sign in with Apple
      </button>

      <div className="relative mb-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300 dark:border-slate-600" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400">Or continue with email</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Email address
          </label>
          <div className="mt-1">
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
            />
          </div>
        </div>

        <div>
          <label htmlFor="password"  className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Password
          </label>
          <div className="mt-1">
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-500 dark:text-red-400">{error}</p>}

        <div className="flex items-center justify-between">
            <div className="text-sm">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300"
                >
                Forgot your password?
                </button>
            </div>
        </div>

        <div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-50 dark:focus:ring-offset-slate-800 focus:ring-indigo-500 transition-colors disabled:bg-indigo-400 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Signing In...' : 'Sign In'}
          </button>
        </div>
      </form>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Reset Password</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">Enter your email address and we'll send you a link to reset your password.</p>
              
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label htmlFor="forgot-email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Email address
                  </label>
                  <input
                    id="forgot-email"
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                {forgotPasswordMessage && (
                  <p className={`text-sm ${forgotPasswordStatus === 'success' ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                    {forgotPasswordMessage}
                  </p>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotPassword(false);
                      setForgotPasswordStatus('idle');
                      setForgotPasswordMessage('');
                    }}
                    className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 rounded-md hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={forgotPasswordStatus === 'loading'}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors disabled:bg-indigo-400 disabled:cursor-not-allowed"
                  >
                    {forgotPasswordStatus === 'loading' ? 'Sending...' : 'Send Reset Email'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;