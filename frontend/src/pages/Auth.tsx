import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithPopup } from 'firebase/auth';
import { Code2, Mail, Lock } from 'lucide-react';
import { auth, githubProvider, googleProvider } from '../firebase';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError('');
    setLoading(true);

    try {
      if (!email || !password) {
        setError('Email and password are required');
        setLoading(false);
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        setError('Please enter a valid email address');
        setLoading(false);
        return;
      }

      // Validate password length
      if (password.length < 6) {
        setError('Password must be at least 6 characters long');
        setLoading(false);
        return;
      }

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 800));

      if (isLogin) {
        // Login: Check if user exists
        const users = JSON.parse(localStorage.getItem('users') || '{}');
        const userKey = btoa(email); // Simple encoding
        
        if (!users[userKey]) {
          setError('Email not found. Please sign up first.');
          setLoading(false);
          return;
        }

        if (users[userKey].password !== btoa(password)) {
          setError('Invalid password');
          setLoading(false);
          return;
        }

        // Successful login
        const user = users[userKey];
        localStorage.setItem('currentUser', JSON.stringify({
          email: user.email,
          name: user.name,
          id: userKey,
          loginTime: new Date().toISOString()
        }));
        navigate('/dashboard');
      } else {
        // Sign up: Create new user
        const users = JSON.parse(localStorage.getItem('users') || '{}');
        const userKey = btoa(email);

        if (users[userKey]) {
          setError('Email already registered. Please sign in instead.');
          setLoading(false);
          return;
        }

        // Extract name from email
        const name = email.split('@')[0];
        users[userKey] = {
          email,
          name: name.charAt(0).toUpperCase() + name.slice(1),
          password: btoa(password),
          createdAt: new Date().toISOString()
        };

        localStorage.setItem('users', JSON.stringify(users));
        localStorage.setItem('currentUser', JSON.stringify({
          email,
          name: users[userKey].name,
          id: userKey,
          loginTime: new Date().toISOString()
        }));

        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const persistAuthenticatedUser = (user: any, provider: string) => {
    localStorage.setItem('currentUser', JSON.stringify({
      email: user.email || '',
      name: user.displayName || user.email?.split('@')[0] || 'User',
      id: user.uid,
      provider,
      photoURL: user.photoURL || null,
      loginTime: new Date().toISOString()
    }));
  };

  const getProviderError = (providerName: string, err: any) => {
    const code = err?.code || '';
    if (code === 'auth/popup-closed-by-user') return `${providerName} sign-in was cancelled.`;
    if (code === 'auth/popup-blocked') return `Popup blocked by browser. Please allow popups for ${providerName} sign-in.`;
    if (code === 'auth/unauthorized-domain') return `This domain is not authorized for ${providerName} sign-in.`;
    if (code === 'auth/operation-not-allowed') return `${providerName} sign-in is not enabled in authentication settings.`;
    return err?.message || `${providerName} sign-in failed.`;
  };

  const handleGoogleSignIn = async () => {
    if (loading) return;
    setError('');
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      persistAuthenticatedUser(result.user, 'google');
      navigate('/dashboard');
    } catch (err: any) {
      setError(getProviderError('Google', err));
    } finally {
      setLoading(false);
    }
  };

  const handleGithubSignIn = async () => {
    if (loading) return;
    setError('');
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, githubProvider);
      persistAuthenticatedUser(result.user, 'github');
      navigate('/dashboard');
    } catch (err: any) {
      setError(getProviderError('GitHub', err));
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
            {isLogin ? 'start your 14-day free trial' : 'sign in to your existing account'}
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
              <label className="block text-sm font-medium text-zinc-300">
                Email address
              </label>
              <div className="mt-1 relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-zinc-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full appearance-none rounded-lg border border-zinc-800 bg-zinc-950 pl-10 pr-3 py-2 text-zinc-200 placeholder-zinc-500 focus:border-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600 sm:text-sm transition-colors"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300">
                Password
              </label>
              <div className="mt-1 relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-zinc-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full appearance-none rounded-lg border border-zinc-800 bg-zinc-950 pl-10 pr-3 py-2 text-zinc-200 placeholder-zinc-500 focus:border-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600 sm:text-sm transition-colors"
                  placeholder="••••••••"
                />
              </div>
              {!isLogin && (
                <p className="mt-1 text-xs text-zinc-500">Min 6 characters</p>
              )}
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="flex w-full justify-center rounded-lg border border-transparent bg-white py-2.5 px-4 text-sm font-semibold text-black shadow-sm hover:bg-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 focus:ring-offset-zinc-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Processing...' : (isLogin ? 'Sign in' : 'Sign up')}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-800" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-zinc-900 px-2 text-zinc-500">Or continue with</span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="inline-flex w-full justify-center rounded-lg border border-zinc-800 bg-zinc-950 py-2.5 px-4 text-sm font-medium text-zinc-300 shadow-sm hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-600 focus:ring-offset-2 focus:ring-offset-zinc-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Continue with Google"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
              </button>

              <button
                type="button"
                onClick={handleGithubSignIn}
                disabled={loading}
                className="inline-flex w-full justify-center rounded-lg border border-zinc-800 bg-zinc-950 py-2.5 px-4 text-sm font-medium text-zinc-300 shadow-sm hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-600 focus:ring-offset-2 focus:ring-offset-zinc-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Continue with GitHub"
              >
                <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v 3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
