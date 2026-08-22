import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from 'firebase/auth';
import { Code2, Mail, Lock } from 'lucide-react';
import { auth, githubProvider, googleProvider } from '../firebase';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const getAuthError = (err: any) => {
    switch (err?.code) {
      case 'auth/invalid-email': return 'Please enter a valid email address.';
      case 'auth/user-not-found':
      case 'auth/invalid-credential': return 'Invalid email or password.';
      case 'auth/wrong-password': return 'Invalid email or password.';
      case 'auth/email-already-in-use': return 'This email is already registered. Please sign in instead.';
      case 'auth/weak-password': return 'Password must be at least 6 characters long.';
      case 'auth/popup-closed-by-user': return 'Sign-in was cancelled.';
      case 'auth/popup-blocked': return 'Popup blocked by your browser. Please allow popups and try again.';
      case 'auth/unauthorized-domain': return 'This domain is not authorized in Firebase Authentication.';
      case 'auth/operation-not-allowed': return 'This sign-in method is not enabled in Firebase Authentication.';
      case 'auth/account-exists-with-different-credential': return 'An account already exists with the same email using a different sign-in method.';
      default: return err?.message || 'Authentication failed. Please try again.';
    }
  };

  const persistAuthenticatedUser = (user: any, provider: string) => {
    localStorage.setItem('currentUser', JSON.stringify({
      email: user.email || '',
      name: user.displayName || user.email?.split('@')[0] || 'User',
      id: user.uid,
      provider,
      photoURL: user.photoURL || null,
      loginTime: new Date().toISOString(),
    }));
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setError('');
    setLoading(true);

    try {
      const normalizedEmail = email.trim();
      let userCredential;

      if (isLogin) {
        userCredential = await signInWithEmailAndPassword(auth, normalizedEmail, password);
      } else {
        userCredential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
        const displayName = normalizedEmail.split('@')[0];
        await updateProfile(userCredential.user, {
          displayName: displayName.charAt(0).toUpperCase() + displayName.slice(1),
        });
      }

      persistAuthenticatedUser(userCredential.user, 'password');
      navigate('/dashboard');
    } catch (err: any) {
      setError(getAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleProviderSignIn = async (provider: 'google' | 'github') => {
    if (loading) return;

    setError('');
    setLoading(true);

    try {
      const selectedProvider = provider === 'google' ? googleProvider : githubProvider;
      const result = await signInWithPopup(auth, selectedProvider);
      persistAuthenticatedUser(result.user, provider);
      navigate('/dashboard');
    } catch (err: any) {
      setError(getAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg">
            <Code2 className="w-8 h-8 text-black" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-white">
          {isLogin ? 'Sign in to your account' : 'Create your account'}
        </h2>
        <p className="mt-2 text-center text-sm text-zinc-400">
          Or{' '}
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
              setEmail('');
              setPassword('');
            }}
            className="font-medium text-zinc-300 hover:text-white transition-colors"
          >
            {isLogin ? 'create a new account' : 'sign in to your existing account'}
          </button>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-zinc-900 py-8 px-4 shadow-xl border border-zinc-800 sm:rounded-2xl sm:px-10">
          <form className="space-y-6" onSubmit={handleEmailAuth}>
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-zinc-300">Email address</label>
              <div className="mt-1 relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-zinc-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="block w-full appearance-none rounded-lg border border-zinc-800 bg-zinc-950 pl-10 pr-3 py-2 text-zinc-200 placeholder-zinc-500 focus:border-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600 sm:text-sm transition-colors disabled:opacity-50"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300">Password</label>
              <div className="mt-1 relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-zinc-500" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="block w-full appearance-none rounded-lg border border-zinc-800 bg-zinc-950 pl-10 pr-3 py-2 text-zinc-200 placeholder-zinc-500 focus:border-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600 sm:text-sm transition-colors disabled:opacity-50"
                  placeholder="••••••••"
                />
              </div>
              {!isLogin && <p className="mt-1 text-xs text-zinc-500">Min 6 characters</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full justify-center rounded-lg border border-transparent bg-white py-2.5 px-4 text-sm font-semibold text-black shadow-sm hover:bg-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 focus:ring-offset-zinc-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : (isLogin ? 'Sign in' : 'Sign up')}
            </button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-800" /></div>
              <div className="relative flex justify-center text-sm"><span className="bg-zinc-900 px-2 text-zinc-500">Or continue with</span></div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleProviderSignIn('google')}
                disabled={loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950 py-2.5 px-4 text-sm font-medium text-zinc-300 shadow-sm hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Google
              </button>

              <button
                type="button"
                onClick={() => handleProviderSignIn('github')}
                disabled={loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950 py-2.5 px-4 text-sm font-medium text-zinc-300 shadow-sm hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58v-2.23c-3.34.73-4.04-1.42-4.04-1.42-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.21.09 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.49 1 .11-.78.42-1.31.76-1.61-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23.96-.27 1.98-.4 3-.4 1.02 0 2.05.13 3.01.4 2.29-1.55 3.3-1.23 3.3-1.23.65 1.66.24 2.88.12 3.18.77.84 1.23 1.91 1.23 3.22 0 4.61-2.81 5.62-5.48 5.92.43.37.82 1.1.82 2.22v3.29c0 .32.22.69.82.58A12.01 12.01 0 0 0 24 12C24 5.37 18.63 0 12 0z" />
                </svg>
                GitHub
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
