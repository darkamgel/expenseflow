import { useState, type FormEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './common/Button';
import { InputField } from './common/FormField';

type Mode = 'login' | 'signup' | 'reset';

export function AuthPage() {
  const { signIn, signUp, resetPassword } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      if (mode === 'login') {
        const { error: err } = await signIn(email, password);
        if (err) setError(err);
      } else if (mode === 'signup') {
        const { error: err, needsEmailConfirmation } = await signUp(email, password);
        if (err) {
          setError(err);
        } else if (needsEmailConfirmation) {
          setMessage('Check your email for a confirmation link to finish creating your account.');
        }
      } else {
        const { error: err } = await resetPassword(email);
        if (err) setError(err);
        else setMessage('If an account exists for that email, a password reset link is on its way.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8 dark:bg-slate-950">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
        <div className="mb-2 text-3xl" aria-hidden="true">💸</div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          {mode === 'login' ? 'Sign in to ExpenseFlow' : mode === 'signup' ? 'Create your account' : 'Reset your password'}
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {mode === 'reset'
            ? "We'll email you a link to set a new password."
            : 'Your data syncs across every device you sign in on.'}
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <InputField
            label="Email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            autoFocus
          />
          {mode !== 'reset' && (
            <InputField
              label="Password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              hint={mode === 'signup' ? 'At least 6 characters.' : undefined}
            />
          )}

          {error && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
          {message && (
            <p role="status" className="text-sm text-emerald-600 dark:text-emerald-400">
              {message}
            </p>
          )}

          <Button type="submit" fullWidth disabled={submitting}>
            {submitting ? 'Please wait…' : mode === 'login' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send reset link'}
          </Button>
        </form>

        <div className="mt-4 flex flex-col items-center gap-1 text-sm">
          {mode === 'login' && (
            <>
              <button onClick={() => setMode('reset')} className="text-emerald-600 hover:underline dark:text-emerald-400">
                Forgot password?
              </button>
              <p className="text-slate-500 dark:text-slate-400">
                No account?{' '}
                <button onClick={() => setMode('signup')} className="font-medium text-emerald-600 hover:underline dark:text-emerald-400">
                  Sign up
                </button>
              </p>
            </>
          )}
          {mode === 'signup' && (
            <p className="text-slate-500 dark:text-slate-400">
              Already have an account?{' '}
              <button onClick={() => setMode('login')} className="font-medium text-emerald-600 hover:underline dark:text-emerald-400">
                Sign in
              </button>
            </p>
          )}
          {mode === 'reset' && (
            <button onClick={() => setMode('login')} className="text-emerald-600 hover:underline dark:text-emerald-400">
              Back to sign in
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
