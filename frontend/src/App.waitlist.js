import { useState, useEffect } from 'react';
import { Zap, Check, RefreshCw, BarChart3, LogOut } from 'lucide-react';
import { supabase } from './lib/supabaseClient';

// Success Page Component
function SuccessPage({ signupNumber, onLogout, userEmail }) {
  const handleLogout = async () => {
    if (!supabase) return;

    try {
      await supabase.auth.signOut();
      onLogout();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col items-center justify-center p-4">
      <div className="text-center max-w-2xl relative">
        {/* Logout button in top right corner */}
        <button
          onClick={handleLogout}
          className="absolute top-0 right-0 px-4 py-2 bg-slate-700/50 hover:bg-slate-600 text-white rounded-lg font-medium transition flex items-center space-x-2 border border-slate-600"
        >
          <LogOut className="w-4 h-4" />
          <span>Log Out</span>
        </button>

        <div className="inline-block p-8 bg-gradient-to-r from-purple-600 to-pink-600 rounded-3xl mb-8 animate-bounce">
          <Check className="w-20 h-20 text-white" />
        </div>

        <h1 className="text-5xl font-bold text-white mb-6">
          🎉 You're officially on the waitlist!
        </h1>

        <p className="text-xl text-gray-300 mb-8">
          Thanks for joining <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 font-bold">AutoMerchant Pricing AI</span> — you're among the first to experience intelligent, automated pricing built for Shopify sellers.
        </p>

        {signupNumber && (
          <div className="mb-8 inline-block px-8 py-4 bg-purple-500/20 border-2 border-purple-500/50 rounded-2xl">
            <p className="text-3xl font-bold text-purple-300">
              🚀 You're signup #{signupNumber}
            </p>
          </div>
        )}

        {userEmail && (
          <div className="mb-6">
            <p className="text-gray-400 text-sm">Signed in as: <span className="text-purple-300 font-medium">{userEmail}</span></p>
          </div>
        )}

        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8 mb-8">
          <p className="text-gray-300 text-lg leading-relaxed">
            We'll email you when early access opens. In the meantime, keep an eye on your inbox — exciting updates are coming soon.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <div className="p-6 bg-slate-800/50 border border-slate-700 rounded-xl">
            <div className="inline-block p-3 bg-purple-500/20 rounded-lg mb-4">
              <BarChart3 className="w-8 h-8 text-purple-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Smart AI Analysis</h3>
            <p className="text-gray-400 text-sm">Automatic pricing optimization every 30 minutes</p>
          </div>

          <div className="p-6 bg-slate-800/50 border border-slate-700 rounded-xl">
            <div className="inline-block p-3 bg-green-500/20 rounded-lg mb-4">
              <RefreshCw className="w-8 h-8 text-green-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Manual Control</h3>
            <p className="text-gray-400 text-sm">Run analysis anytime with 10 daily manual runs</p>
          </div>

          <div className="p-6 bg-slate-800/50 border border-slate-700 rounded-xl">
            <div className="inline-block p-3 bg-blue-500/20 rounded-lg mb-4">
              <Zap className="w-8 h-8 text-blue-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Pro Features</h3>
            <p className="text-gray-400 text-sm">Analyze up to 10 products simultaneously</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Landing Page Component
function LandingPage({ onJoinWaitlist, waitlistCount, userAlreadySignedUp }) {
  return (
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
        {userAlreadySignedUp ? (
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
              onClick={onJoinWaitlist}
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
  );
}

function App() {
  const [view, setView] = useState('landing'); // 'landing' | 'oauth' | 'success'
  const [waitlistCount, setWaitlistCount] = useState(null);
  const [signupNumber, setSignupNumber] = useState(null);
  const [userAlreadySignedUp, setUserAlreadySignedUp] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [userEmail, setUserEmail] = useState(null);

  // Fetch waitlist count on mount
  useEffect(() => {
    fetchWaitlistCount();

    // DON'T check user status if we have an OAuth hash - let the callback handle it
    const hasOAuthHash = window.location.hash.includes('access_token');
    if (!hasOAuthHash) {
      checkIfUserSignedUp();
    } else {
      console.log('OAuth hash detected, waiting for Supabase to process...');
    }
  }, []);

  // Listen for OAuth callback
  useEffect(() => {
    if (!supabase) return;

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.email);

      if (event === 'SIGNED_IN' && session) {
        // Check if this is a fresh OAuth callback
        const hasHashToken = window.location.hash.includes('access_token');
        const urlParams = new URLSearchParams(window.location.search);
        const hasCodeParam = urlParams.get('code');
        const isOAuthCallback = hasHashToken || hasCodeParam;

        console.log('OAuth callback detection:', {
          hasHashToken,
          hasCodeParam,
          isOAuthCallback,
          isProcessing,
          currentHash: window.location.hash.substring(0, 50) + '...'
        });

        if (isOAuthCallback && !isProcessing) {
          console.log('Processing OAuth signup for:', session.user.email);
          setIsProcessing(true);
          await handleWaitlistSignup(session.user.email);
        } else if (!isOAuthCallback && !isProcessing) {
          // Returning user - check their status
          console.log('Returning user, checking waitlist status...');
          await checkIfUserSignedUp();
        }
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, [isProcessing]);

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
        setUserEmail(user.email); // Store user email

        // Check if user is already in waitlist
        const { data, error } = await supabase
          .from('waitlist_emails')
          .select('email, created_at')
          .eq('email', user.email.toLowerCase())
          .single();

        if (data) {
          setUserAlreadySignedUp(true);

          // Get their signup number if they're already on the list
          const { count } = await supabase
            .from('waitlist_emails')
            .select('*', { count: 'exact', head: true })
            .lte('created_at', data.created_at);

          setSignupNumber(count);
          setView('success'); // Show success page for returning users
        }
      }
    } catch (err) {
      // User not signed up or not authenticated - that's fine
      console.log('User check:', err.message);
    }
  };

  const handleJoinWaitlist = async () => {
    if (!supabase) {
      alert('Supabase is not configured. Please contact support.');
      return;
    }

    try {
      // Trigger Google OAuth
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        }
      });

      if (error) throw error;
      setView('oauth'); // Show loading state
    } catch (err) {
      console.error('Google sign-in error:', err);
      alert(err.message || 'Failed to sign in with Google. Please try again.');
    }
  };

  const handleWaitlistSignup = async (email) => {
    try {
      setUserEmail(email); // Store user email

      // AIRTIGHT CHECK 1: Query database for existing email
      const { data: existing, error: checkError } = await supabase
        .from('waitlist_emails')
        .select('email, created_at')
        .eq('email', email.toLowerCase())
        .maybeSingle(); // Use maybeSingle to avoid errors if not found

      if (checkError) {
        console.error('Error checking existing signup:', checkError);
      }

      if (existing) {
        // Already signed up - DO NOT increment count
        console.log('User already on waitlist:', email);
        setUserAlreadySignedUp(true);

        // Get their signup number (how many signed up before them)
        const { count } = await supabase
          .from('waitlist_emails')
          .select('*', { count: 'exact', head: true })
          .lte('created_at', existing.created_at);

        setSignupNumber(count);
        setView('success');
        setIsProcessing(false);

        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
        return; // EXIT - DO NOT PROCEED TO INSERT
      }

      // AIRTIGHT CHECK 2: Insert with database-level unique constraint
      // If another request inserted this email between our check and insert,
      // the database will reject it with error code 23505
      const { error: insertError } = await supabase
        .from('waitlist_emails')
        .insert([{ email: email.toLowerCase() }]);

      if (insertError) {
        if (insertError.code === '23505') {
          // DUPLICATE DETECTED - Database rejected duplicate
          console.log('Duplicate prevented by database constraint:', email);
          setUserAlreadySignedUp(true);

          // Fetch their existing record to get signup number
          const { data: existingRecord } = await supabase
            .from('waitlist_emails')
            .select('created_at')
            .eq('email', email.toLowerCase())
            .single();

          if (existingRecord) {
            const { count } = await supabase
              .from('waitlist_emails')
              .select('*', { count: 'exact', head: true })
              .lte('created_at', existingRecord.created_at);

            setSignupNumber(count);
          }

          setView('success');
          setIsProcessing(false);
          window.history.replaceState({}, document.title, window.location.pathname);
          return; // EXIT - DO NOT INCREMENT COUNT
        }
        throw insertError;
      }

      // SUCCESS - New signup, increment counter ONLY once
      console.log('New signup successful:', email);

      // Increment counter (only happens for new signups)
      await supabase.rpc('increment_waitlist');

      // Fetch updated count
      await fetchWaitlistCount();

      // Get the user's signup number (total count at time of signup)
      const { count } = await supabase
        .from('waitlist_emails')
        .select('*', { count: 'exact', head: true });

      setSignupNumber(count);
      setView('success');
      setIsProcessing(false);

      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (err) {
      console.error('Waitlist signup error:', err);
      alert(err.message || 'Something went wrong. Please try again.');
      setView('landing');
      setIsProcessing(false);
    }
  };

  const handleLogout = () => {
    setView('landing');
    setUserAlreadySignedUp(false);
    setSignupNumber(null);
    setUserEmail(null);
    setIsProcessing(false);
  };

  if (view === 'success') {
    return <SuccessPage signupNumber={signupNumber} onLogout={handleLogout} userEmail={userEmail} />;
  }

  if (view === 'oauth') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col items-center justify-center p-4">
        <div className="text-center">
          <RefreshCw className="w-16 h-16 text-purple-400 animate-spin mx-auto mb-4" />
          <p className="text-xl text-white">Signing you in...</p>
        </div>
      </div>
    );
  }

  return (
    <LandingPage
      onJoinWaitlist={handleJoinWaitlist}
      waitlistCount={waitlistCount}
      userAlreadySignedUp={userAlreadySignedUp}
    />
  );
}

export default App;
