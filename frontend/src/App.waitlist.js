import { useState, useEffect } from 'react';
import { Zap, Check, RefreshCw, TrendingUp, Package, DollarSign, AlertCircle, LogOut, Settings, X, Wifi, WifiOff, BarChart3, Activity, ShoppingCart, Calendar, Clock } from 'lucide-react';
import { supabase } from './lib/supabaseClient';

// API URL - automatically uses production URL when deployed
const API_URL = process.env.REACT_APP_API_URL ||
                (window.location.hostname === 'localhost'
                  ? 'http://localhost:5000'
                  : 'https://api.automerchant.ai');

const DEV_EMAIL = 'arealhuman21@gmail.com';

const api = {
  async call(endpoint, options = {}) {
    const token = localStorage.getItem('authToken');
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers
    };
    const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Request failed');
    }
    return response.json();
  }
};

// Waitlist Modal Component
function WaitlistModal({ isOpen, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [totalSignups, setTotalSignups] = useState(null);
  const [alreadySignedUp, setAlreadySignedUp] = useState(false);
  const [userEmail, setUserEmail] = useState(null);

  useEffect(() => {
    if (isOpen && supabase) {
      fetchTotalSignups();
      checkAuthStatus();
    }
  }, [isOpen]);

  const checkAuthStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setUserEmail(user.email);
      }
    } catch (err) {
      console.error('Error checking auth:', err);
    }
  };

  const fetchTotalSignups = async () => {
    try {
      const { data, error } = await supabase
        .from('waitlist_metrics')
        .select('total_signups')
        .eq('id', 1)
        .single();

      if (error) throw error;
      setTotalSignups(data?.total_signups || 0);
    } catch (err) {
      console.error('Error fetching signups:', err);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!supabase) {
      setError('Supabase is not configured. Please contact support.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        }
      });

      if (error) throw error;
    } catch (err) {
      console.error('Google sign-in error:', err);
      setError(err.message || 'Failed to sign in with Google. Please try again.');
      setLoading(false);
    }
  };

  const handleAddToWaitlist = async (email) => {
    try {
      const { data: insertData, error: insertError } = await supabase
        .from('waitlist_emails')
        .insert([{ email: email.toLowerCase() }])
        .select();

      if (insertError) {
        if (insertError.code === '23505') {
          setAlreadySignedUp(true);
          return;
        }
        throw insertError;
      }

      const { error: updateError } = await supabase.rpc('increment_waitlist');

      if (updateError) {
        console.error('Error incrementing counter:', updateError);
      }

      await fetchTotalSignups();
      setSuccess(true);

      // Notify parent component of success
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error('Waitlist error:', err);
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userEmail && !success && !alreadySignedUp) {
      handleAddToWaitlist(userEmail);
    }
  }, [userEmail, success, alreadySignedUp]);

  const handleClose = () => {
    setSuccess(false);
    setError('');
    setAlreadySignedUp(false);
    setUserEmail(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-2xl border border-slate-700 max-w-md w-full shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <h2 className="text-xl font-bold text-white">
            {success || alreadySignedUp ? '🎉 Success!' : 'Join the Waitlist'}
          </h2>
          <button onClick={handleClose} className="p-2 hover:bg-slate-700 rounded-lg transition">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-6">
          {success ? (
            <div className="text-center py-8">
              <div className="inline-block p-6 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl mb-6">
                <Check className="w-12 h-12 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">You're officially on the waitlist!</h3>
              <p className="text-gray-300 mb-6">
                You're part of the first builders shaping AutoMerchant. Our AI is learning fast — and with your feedback, we're turning it into something truly beautiful.
              </p>
              {totalSignups !== null && (
                <p className="text-purple-400 font-semibold">🚀 You're signup #{totalSignups}</p>
              )}
            </div>
          ) : alreadySignedUp ? (
            <div className="text-center py-8">
              <div className="inline-block p-6 bg-blue-500/20 rounded-2xl mb-6">
                <Check className="w-12 h-12 text-blue-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">You're already on the waitlist!</h3>
              <p className="text-gray-300">We'll be in touch soon. 🚀</p>
            </div>
          ) : (
            <>
              {totalSignups !== null && (
                <div className="mb-6 p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                  <p className="text-purple-300 text-center">🚀 {totalSignups} people have already joined!</p>
                </div>
              )}

              {error && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <div className="text-center mb-6">
                <p className="text-gray-300 text-lg mb-2">Be the first to experience the new AI platform</p>
                <p className="text-gray-500 text-sm">Sign in with your Google account to join the waitlist. We'll notify you when AutoMerchant launches.</p>
              </div>

              <button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full px-6 py-3 bg-white text-gray-900 rounded-lg font-semibold hover:bg-gray-100 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    <span>Sign in with Google</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>

        <div className="flex items-center justify-end p-6 border-t border-slate-700">
          <button onClick={handleClose} className="px-6 py-2.5 bg-slate-700 text-white rounded-lg font-semibold hover:bg-slate-600 transition">
            {success || alreadySignedUp ? 'Close' : 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [showWaitlist, setShowWaitlist] = useState(false);
  const [waitlistCount, setWaitlistCount] = useState(null);
  const [userStatus, setUserStatus] = useState(null); // null | 'signed_up' | 'checking'
  const [hasHandledAuth, setHasHandledAuth] = useState(false);

  // Fetch waitlist count on mount
  useEffect(() => {
    fetchWaitlistCount();
    checkIfUserSignedUp();
  }, []);

  // Listen for OAuth callback - only trigger modal if user clicked the button
  useEffect(() => {
    if (!supabase) return;

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session && !hasHandledAuth) {
        console.log('User signed in:', session.user.email);
        setHasHandledAuth(true);
        // Only auto-open modal if this is a fresh OAuth callback
        // Check if user came from OAuth redirect
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('code') || document.referrer.includes('accounts.google.com')) {
          setShowWaitlist(true);
        }
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, [hasHandledAuth]);

  const fetchWaitlistCount = async () => {
    if (!supabase) return;

    try {
      // Use direct count query for real-time accuracy
      const { count, error } = await supabase
        .from('waitlist_emails')
        .select('*', { count: 'exact', head: true });

      if (error) throw error;
      setWaitlistCount(count || 0);
    } catch (err) {
      console.error('Error fetching waitlist count:', err);
      // Fallback to metrics table
      try {
        const { data } = await supabase
          .from('waitlist_metrics')
          .select('total_signups')
          .eq('id', 1)
          .single();
        setWaitlistCount(data?.total_signups || 0);
      } catch (fallbackErr) {
        console.error('Fallback count also failed:', fallbackErr);
      }
    }
  };

  const checkIfUserSignedUp = async () => {
    if (!supabase) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        // Check if user is already in waitlist
        const { data, error } = await supabase
          .from('waitlist_emails')
          .select('email')
          .eq('email', user.email.toLowerCase())
          .single();

        if (data) {
          setUserStatus('signed_up');
        }
      }
    } catch (err) {
      // User not signed up or not authenticated - that's fine
      console.log('User check:', err.message);
    }
  };

  const handleWaitlistSuccess = () => {
    // Refresh count after successful signup
    fetchWaitlistCount();
    setUserStatus('signed_up');
  };

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col items-center justify-center p-4">
        <div className="text-center max-w-4xl">
          <div className="inline-block p-6 bg-purple-600/20 rounded-3xl mb-8 animate-pulse">
            <Zap className="w-20 h-20 text-purple-400" />
          </div>
          <h1 className="text-6xl font-bold text-white mb-6">
            AutoMerchant <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">Pricing AI</span>
          </h1>
          <p className="text-2xl text-gray-300 mb-4">AI-powered pricing optimization for your Shopify store</p>
          <p className="text-lg text-gray-400 mb-8">Be the first to experience intelligent pricing — join the waitlist today.</p>

          {/* Waitlist Count Display */}
          {waitlistCount !== null && (
            <div className="mb-8 inline-block">
              <div className="px-6 py-3 bg-purple-500/10 border border-purple-500/30 rounded-full">
                <p className="text-purple-300 font-medium">
                  🚀 {waitlistCount} {waitlistCount === 1 ? 'person has' : 'people have'} already joined!
                </p>
              </div>
            </div>
          )}

          {/* Show different message if user already signed up */}
          {userStatus === 'signed_up' ? (
            <div className="mb-8">
              <div className="inline-block px-6 py-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                <p className="text-green-300 font-medium text-lg">
                  🎉 You're already on the waitlist! We'll reach out soon.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center space-x-4 mb-8">
              <button
                onClick={() => setShowWaitlist(true)}
                className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-bold text-lg hover:from-purple-700 hover:to-pink-700 transition transform hover:scale-105"
              >
                Join Waitlist
              </button>
            </div>
          )}

          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 bg-slate-800/50 border border-slate-700 rounded-xl">
              <div className="inline-block p-3 bg-purple-500/20 rounded-lg mb-4">
                <BarChart3 className="w-8 h-8 text-purple-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Smart AI Analysis</h3>
              <p className="text-gray-400">Automatic analysis every 30 minutes</p>
            </div>

            <div className="p-6 bg-slate-800/50 border border-slate-700 rounded-xl">
              <div className="inline-block p-3 bg-green-500/20 rounded-lg mb-4">
                <RefreshCw className="w-8 h-8 text-green-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Manual Control</h3>
              <p className="text-gray-400">10 manual analyses per day</p>
            </div>

            <div className="p-6 bg-slate-800/50 border border-slate-700 rounded-xl">
              <div className="inline-block p-3 bg-blue-500/20 rounded-lg mb-4">
                <Zap className="w-8 h-8 text-blue-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Pro Plan</h3>
              <p className="text-gray-400">Analyze up to 10 products</p>
            </div>
          </div>
        </div>
      </div>

      <WaitlistModal
        isOpen={showWaitlist}
        onClose={() => setShowWaitlist(false)}
        onSuccess={handleWaitlistSuccess}
      />
    </>
  );
}

export default App;
