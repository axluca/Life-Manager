import React, { useState, useRef, useEffect } from 'react';
import { initializeRecaptcha, sendPhoneVerificationCode, verifyPhoneOTP, enable2FA, disable2FA } from '../firebase';
import { RecaptchaVerifier } from 'firebase/auth';

interface TwoFactorModalProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  twoFactorEnabled?: boolean;
  phoneNumber?: string;
  onSuccess: () => void;
}

type Step = 'setup' | 'verify' | 'disabled';

const TwoFactorModal: React.FC<TwoFactorModalProps> = ({
  userId,
  isOpen,
  onClose,
  twoFactorEnabled = false,
  phoneNumber = '',
  onSuccess,
}) => {
  const [step, setStep] = useState<Step>(twoFactorEnabled ? 'disabled' : 'setup');
  const [phone, setPhone] = useState(phoneNumber || '');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [recaptchaVerifier, setRecaptchaVerifier] = useState<RecaptchaVerifier | null>(null);
  const recaptchaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && !recaptchaVerifier && recaptchaRef.current) {
      try {
        const verifier = initializeRecaptcha('recaptcha-container');
        setRecaptchaVerifier(verifier);
      } catch (err) {
        console.error('Failed to initialize reCAPTCHA:', err);
      }
    }
  }, [isOpen, recaptchaVerifier]);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    if (!phone.trim()) {
      setError('Please enter a phone number');
      setIsLoading(false);
      return;
    }

    if (!recaptchaVerifier) {
      setError('reCAPTCHA not initialized. Please refresh and try again.');
      setIsLoading(false);
      return;
    }

    try {
      // Format phone number - ensure it starts with +
      const formattedPhone = phone.startsWith('+') ? phone : '+1' + phone.replace(/\D/g, '');
      
      await sendPhoneVerificationCode(formattedPhone, recaptchaVerifier);
      setSuccess('Verification code sent! Check your SMS.');
      setStep('verify');
      setOtp('');
    } catch (err: any) {
      setError(err.message || 'Failed to send verification code');
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    if (!otp.trim() || otp.length !== 6) {
      setError('Please enter a valid 6-digit code');
      setIsLoading(false);
      return;
    }

    try {
      await verifyPhoneOTP(otp);
      
      // Save 2FA settings to Firestore
      const formattedPhone = phone.startsWith('+') ? phone : '+1' + phone.replace(/\D/g, '');
      await enable2FA(userId, formattedPhone);
      
      setSuccess('Two-factor authentication enabled successfully!');
      setTimeout(() => {
        onSuccess();
        handleClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to verify code');
      setIsLoading(false);
    }
  };

  const handleDisable2FA = async () => {
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      await disable2FA(userId);
      setSuccess('Two-factor authentication disabled');
      setTimeout(() => {
        onSuccess();
        handleClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to disable 2FA');
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setStep(twoFactorEnabled ? 'disabled' : 'setup');
    setPhone(phoneNumber || '');
    setOtp('');
    setError('');
    setSuccess('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {twoFactorEnabled ? 'Two-Factor Authentication' : 'Enable 2FA'}
            </h3>
            <button
              onClick={handleClose}
              className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-2xl leading-none"
            >
              ×
            </button>
          </div>

          {step === 'setup' && (
            <>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                Add an extra layer of security to your account. You'll receive a 6-digit code via SMS when you sign in.
              </p>
              <form onSubmit={handleSendCode} className="space-y-4">
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Phone Number
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    required
                    placeholder="+1 (555) 123-4567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Include country code (e.g., +1 for US)</p>
                </div>

                {error && (
                  <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
                )}

                {success && (
                  <p className="text-sm text-green-500 dark:text-green-400">{success}</p>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 rounded-md hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors disabled:bg-indigo-400 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Sending...' : 'Send Code'}
                  </button>
                </div>
              </form>
            </>
          )}

          {step === 'verify' && (
            <>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                Enter the 6-digit code we sent to {phone}
              </p>
              <form onSubmit={handleVerifyOTP} className="space-y-4">
                <div>
                  <label htmlFor="otp" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Verification Code
                  </label>
                  <input
                    id="otp"
                    type="text"
                    required
                    placeholder="000000"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-3 py-2 text-2xl text-center font-mono border border-gray-300 dark:border-slate-600 rounded-md shadow-sm placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                {error && (
                  <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
                )}

                {success && (
                  <p className="text-sm text-green-500 dark:text-green-400">{success}</p>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setStep('setup');
                      setOtp('');
                      setError('');
                    }}
                    className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 rounded-md hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading || otp.length !== 6}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors disabled:bg-indigo-400 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Verifying...' : 'Verify'}
                  </button>
                </div>
              </form>
            </>
          )}

          {step === 'disabled' && (
            <>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                Two-factor authentication is currently enabled for your account.
              </p>
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
                <p className="text-sm text-blue-900 dark:text-blue-200">
                  <strong>Phone:</strong> {phoneNumber || 'Not set'}
                </p>
              </div>

              {error && (
                <p className="text-sm text-red-500 dark:text-red-400 mb-4">{error}</p>
              )}

              {success && (
                <p className="text-sm text-green-500 dark:text-green-400 mb-4">{success}</p>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 rounded-md hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleDisable2FA}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors disabled:bg-red-400 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Disabling...' : 'Disable 2FA'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TwoFactorModal;
