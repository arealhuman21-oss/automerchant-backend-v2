import { useState, useEffect } from 'react';
import { Zap, Check, RefreshCw, BarChart3, LogOut } from 'lucide-react';
import { supabase } from './lib/supabaseClient';
import AdminPanel from './components/AdminPanel';
import ProductDashboard from './components/ProductDashboard';

const ADMIN_EMAIL = 'arealhuman21@gmail.com';

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
          Thanks for joining <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 font-bold">AutoMerchant Margin Optimizer AI</span> — you're among the first to experience transparent, intelligent pricing built for Shopify merchants.
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
        {/* Animated Logo/Icon */}
        <div className="inline-block p-6 bg-gradient-to-r from-purple-600/30 to-pink-600/30 rounded-3xl mb-6 animate-pulse border-2 border-purple-500/50">
          <Zap className="w-24 h-24 text-purple-300" />
        </div>

        {/* Main Headline */}
        <h1 className="text-7xl font-black text-white mb-4 tracking-tight">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 animate-gradient">
            AutoMerchant
          </span>
        </h1>
        <h2 className="text-4xl font-bold text-purple-200 mb-6">
          Margin Optimizer AI
        </h2>

        {/* Subheadline with unique value prop */}
        <div className="space-y-4 mb-8">
          <p className="text-3xl text-white font-bold">
            Finally, an AI you can <span className="text-green-400">actually trust</span>
          </p>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
            Tired of pricing tools that work like a black box?
            <br />
            <span className="text-purple-300 font-bold">See exactly why</span> each price is recommended.
            <br />
            <span className="text-pink-300 font-semibold">Learn from AI.</span> Don't just blindly follow it.
          </p>
        </div>

        {/* Eye-catching differentiators */}
        <div className="mb-8 flex flex-wrap items-center justify-center gap-4">
          <div className="inline-block px-5 py-2 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-2 border-green-500/50 rounded-full">
            <p className="text-green-300 font-bold text-base flex items-center space-x-2">
              <Check className="w-5 h-5" />
              <span>Transparent AI</span>
            </p>
          </div>
          <div className="inline-block px-5 py-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-2 border-purple-500/50 rounded-full">
            <p className="text-purple-300 font-bold text-base flex items-center space-x-2">
              <Check className="w-5 h-5" />
              <span>Manual Approval</span>
            </p>
          </div>
          <div className="inline-block px-5 py-2 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border-2 border-blue-500/50 rounded-full">
            <p className="text-blue-300 font-bold text-base flex items-center space-x-2">
              <Check className="w-5 h-5" />
              <span>5min Setup</span>
            </p>
          </div>
        </div>

        {/* Waitlist Count Display - Always show */}
        <div className="mb-8 inline-block">
          <div className="px-6 py-3 bg-purple-500/10 border border-purple-500/30 rounded-full">
            <p className="text-purple-300 font-medium">
              {waitlistCount === null ? (
                '🚀 Loading waitlist...'
              ) : (
                `🚀 ${waitlistCount} ${waitlistCount === 1 ? 'person has' : 'people have'} already joined!`
              )}
            </p>
          </div>
        </div>

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

        {/* Why AutoMerchant is Different */}
        <div className="mt-16 mb-12">
          <h3 className="text-3xl font-bold text-white mb-4">What Makes Us Different?</h3>
          <p className="text-gray-400 text-lg mb-8">Spoiler: We're not like the others</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-8 bg-gradient-to-br from-purple-800/30 to-purple-900/30 border border-purple-500/50 rounded-2xl hover:border-purple-400 transition transform hover:scale-105">
              <div className="inline-block p-4 bg-purple-500/30 rounded-xl mb-4">
                <BarChart3 className="w-10 h-10 text-purple-300" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">AI That Explains Itself</h3>
              <p className="text-gray-300 leading-relaxed">
                See <span className="text-purple-300 font-semibold">exactly why</span> each price is recommended.
                No black boxes. Full transparency.
              </p>
            </div>

            <div className="p-8 bg-gradient-to-br from-green-800/30 to-green-900/30 border border-green-500/50 rounded-2xl hover:border-green-400 transition transform hover:scale-105">
              <div className="inline-block p-4 bg-green-500/30 rounded-xl mb-4">
                <RefreshCw className="w-10 h-10 text-green-300" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Always In Control</h3>
              <p className="text-gray-300 leading-relaxed">
                Manual approval required. <span className="text-green-300 font-semibold">You</span> decide what gets applied.
                AI assists, you decide.
              </p>
            </div>

            <div className="p-8 bg-gradient-to-br from-blue-800/30 to-blue-900/30 border border-blue-500/50 rounded-2xl hover:border-blue-400 transition transform hover:scale-105">
              <div className="inline-block p-4 bg-blue-500/30 rounded-xl mb-4">
                <Zap className="w-10 h-10 text-blue-300" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Setup in 5 Minutes</h3>
              <p className="text-gray-300 leading-relaxed">
                No competitor URLs. No complex rules.
                <span className="text-blue-300 font-semibold"> Just works</span> out of the box.
              </p>
            </div>
          </div>
        </div>

        {/* Unique Value Prop - What Makes Us Different */}
        <div className="mt-12 space-y-6">
          {/* The Big Problem */}
          <div className="p-8 bg-red-900/20 border-2 border-red-500/50 rounded-2xl">
            <p className="text-xl text-red-200 font-semibold mb-3">
              ❌ Other pricing tools are a BLACK BOX
            </p>
            <p className="text-gray-300 text-lg">
              They change your prices with ZERO explanation. You have no idea if their AI is helping or hurting your business.
            </p>
          </div>

          {/* Our Solution */}
          <div className="p-8 bg-gradient-to-br from-green-900/30 to-emerald-900/30 border-2 border-green-500/70 rounded-2xl">
            <p className="text-2xl text-green-200 font-bold mb-3">
              ✅ AutoMerchant shows you EXACTLY WHY
            </p>
            <div className="bg-slate-900/50 border border-green-500/30 rounded-xl p-6 mb-4 text-left">
              <p className="text-gray-400 text-sm mb-2">Example Recommendation:</p>
              <p className="text-green-300 font-mono text-sm leading-relaxed">
                "🛡️ MARGIN TOO LOW: Current margin 25% is below healthy minimum of 30%.
                Raising price from $100 to $120 (+20%) to achieve 40% target margin while
                staying within safety limits."
              </p>
            </div>
            <p className="text-gray-200 text-lg">
              <span className="text-green-300 font-bold">You see the math.</span> You understand the reasoning.
              You stay in control. <span className="text-purple-300 font-bold">No other tool does this.</span>
            </p>
          </div>

          {/* The Challenge */}
          <div className="p-8 bg-gradient-to-r from-purple-900/30 to-pink-900/30 border-2 border-purple-500/50 rounded-2xl">
            <p className="text-2xl font-bold text-white mb-3">
              🚀 Join the first 100 merchants who value transparency
            </p>
            <p className="text-gray-300 text-lg">
              Early access opens soon. Be part of the movement to bring honesty back to AI pricing.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [view, setView] = useState('landing'); // 'landing' | 'oauth' | 'success' | 'product'
  const [waitlistCount, setWaitlistCount] = useState(null);
  const [signupNumber, setSignupNumber] = useState(null);
  const [userAlreadySignedUp, setUserAlreadySignedUp] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [isProcessing, setIsProcessing] = useState(false);
  const [userEmail, setUserEmail] = useState(null);
  const [userApproved, setUserApproved] = useState(false);

  // Fetch waitlist count on mount
  useEffect(() => {
    // Fetch immediately
    fetchWaitlistCount();

    // Also fetch after a delay in case Supabase wasn't ready
    const timer = setTimeout(() => {
      console.log('🔄 Retrying waitlist count fetch...');
      fetchWaitlistCount();
    }, 1000);

    // DON'T check user status if we have an OAuth hash - let the callback handle it
    const hasOAuthHash = window.location.hash.includes('access_token');
    if (!hasOAuthHash) {
      checkIfUserSignedUp();
    } else {
      console.log('OAuth hash detected, waiting for Supabase to process...');
    }

    return () => clearTimeout(timer);
  }, []);

  // Check backend approval status
  const checkBackendApprovalStatus = async (email) => {
    try {
      console.log('🔍 Checking backend approval for:', email);
      const API_URL = process.env.REACT_APP_API_URL || '';

      const response = await fetch(`${API_URL}/api/check-approval`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      if (!response.ok) {
        throw new Error('Failed to check approval');
      }

      const data = await response.json();
      console.log('📋 Backend approval response:', data);

      if (data.approved && data.token) {
        // User is approved! Store token and show product dashboard
        localStorage.setItem('authToken', data.token);
        setUserApproved(true);
        setView('product');
        console.log('✅ User approved, showing product dashboard');
      } else if (data.suspended) {
        // User is suspended
        setUserAlreadySignedUp(true);
        setUserApproved(false);
        setView('success'); // Show message about being suspended
        console.log('🚫 User suspended');
      } else {
        // User is pending approval
        setUserAlreadySignedUp(true);
        setUserApproved(false);
        setView('success'); // Show "awaiting approval" message
        console.log('⏳ User pending approval');
      }

      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (error) {
      console.error('❌ Backend approval check failed:', error);
      // Fall back to showing landing page
    }
  };

  // Listen for OAuth callback - NO DEPENDENCIES to avoid re-creation
  useEffect(() => {
    if (!supabase) return;

    console.log('Setting up auth listener...');
    let hasProcessed = false; // Track if we've already processed this session

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔔 Auth state changed:', event, session?.user?.email);

      if (event === 'SIGNED_IN' && session && !hasProcessed) {
        // Check if this is a fresh OAuth callback
        const hasHashToken = window.location.hash.includes('access_token');
        const urlParams = new URLSearchParams(window.location.search);
        const hasCodeParam = urlParams.get('code');
        const isOAuthCallback = hasHashToken || hasCodeParam;

        console.log('📊 OAuth detection:', {
          hasHashToken,
          hasCodeParam,
          isOAuthCallback,
          hash: window.location.hash.substring(0, 80),
          email: session.user.email
        });

        if (isOAuthCallback) {
          console.log('✅ Processing OAuth signup for:', session.user.email);
          hasProcessed = true; // Mark as processed
          setIsProcessing(true);

          // Process the waitlist signup
          try {
            setUserEmail(session.user.email);

            // Special case: Admin email goes straight to admin panel
            if (session.user.email === ADMIN_EMAIL) {
              console.log('🔑 Admin user detected, showing admin panel');
              setView('success');
              setIsProcessing(false);
              window.history.replaceState({}, document.title, window.location.pathname);
              return;
            }

            // Check if already signed up
            const { data: existing, error: checkError } = await supabase
              .from('waitlist_emails')
              .select('email, created_at')
              .eq('email', session.user.email.toLowerCase())
              .maybeSingle();

            console.log('📊 Existing check result:', { existing, checkError });

            if (existing) {
              console.log('ℹ️ User already on waitlist');
              setUserAlreadySignedUp(true);
              const { count, error: countError } = await supabase
                .from('waitlist_emails')
                .select('*', { count: 'exact', head: true })
                .lte('created_at', existing.created_at);

              console.log('📊 Signup number query:', { count, countError });
              setSignupNumber(count || 1);
            } else {
              console.log('➕ Adding new user to waitlist:', session.user.email.toLowerCase());

              // Insert new signup using authenticated insert (should work with proper RLS)
              const { data: insertData, error: insertError } = await supabase
                .from('waitlist_emails')
                .insert([{ email: session.user.email.toLowerCase() }])
                .select();

              console.log('📊 Insert result:', { insertData, insertError });

              if (insertError) {
                // If it's a duplicate, that's OK - user already exists
                if (insertError.code === '23505') {
                  console.log('⚠️ Duplicate detected, user already on waitlist');
                  setUserAlreadySignedUp(true);

                  // Get their signup number
                  const { data: existingRecord } = await supabase
                    .from('waitlist_emails')
                    .select('created_at')
                    .eq('email', session.user.email.toLowerCase())
                    .maybeSingle();

                  if (existingRecord) {
                    const { count } = await supabase
                      .from('waitlist_emails')
                      .select('*', { count: 'exact', head: true })
                      .lte('created_at', existingRecord.created_at);
                    setSignupNumber(count || 1);
                  }
                } else {
                  console.error('❌ Insert failed:', insertError);
                  throw new Error(insertError.message || 'Failed to add to waitlist');
                }
              } else {
                console.log('✅ Successfully added to waitlist');

                // Increment counter
                const { error: rpcError } = await supabase.rpc('increment_waitlist');
                if (rpcError) {
                  console.warn('⚠️ Counter increment failed (non-fatal):', rpcError);
                }

                // Get signup number
                const { count } = await supabase
                  .from('waitlist_emails')
                  .select('*', { count: 'exact', head: true });

                console.log('📊 Total waitlist count:', count);
                setSignupNumber(count || 1);
              }
            }

            // Show success page
            console.log('🎯 Setting view to success, userEmail:', session.user.email);

            // Clean up URL BEFORE setting view
            window.history.replaceState({}, document.title, window.location.pathname);

            setView('success');
            setIsProcessing(false);
            console.log('✅ Signup complete!');
          } catch (err) {
            console.error('❌ Signup error:', err);
            alert(err.message || 'Something went wrong. Please try again.');
            setView('landing');
            setIsProcessing(false);
          }
        } else {
          console.log('👤 Returning user detected');
          // Check their status
          const { data: { user } } = await supabase.auth.getUser();
          if (user?.email) {
            setUserEmail(user.email);

            // Special case: Admin email goes straight to admin panel
            if (user.email === ADMIN_EMAIL) {
              console.log('🔑 Admin user detected (returning), showing admin panel');
              // Clean up URL
              window.history.replaceState({}, document.title, window.location.pathname);
              setView('success');
              return;
            }

            try {
              const { data, error: fetchError } = await supabase
                .from('waitlist_emails')
                .select('email, created_at')
                .eq('email', user.email.toLowerCase())
                .maybeSingle();

              if (data) {
                console.log('👤 Confirmed: User is in waitlist (Supabase)');
                // Check backend approval status
                await checkBackendApprovalStatus(user.email);
              } else {
                console.log('👤 Returning user NOT in Supabase waitlist - adding now...');

                // Add to Supabase waitlist table
                try {
                  const { error: insertError } = await supabase
                    .from('waitlist_emails')
                    .insert([{ email: user.email.toLowerCase() }]);

                  if (insertError) {
                    console.error('Failed to insert into waitlist:', insertError);
                  } else {
                    console.log('✅ Added to Supabase waitlist');

                    // Increment counter
                    const { error: rpcError } = await supabase.rpc('increment_waitlist');
                    if (rpcError) {
                      console.error('Failed to increment counter:', rpcError);
                    } else {
                      console.log('✅ Counter incremented');
                    }
                  }
                } catch (err) {
                  console.error('Supabase insert error:', err);
                }

                // Check backend approval status
                await checkBackendApprovalStatus(user.email);
              }
            } catch (error) {
              console.error('⚠️ Could not check waitlist status:', error);
              // If there's an error, just show landing page
            }
          }
        }
      }
    });

    return () => {
      console.log('Cleaning up auth listener');
      authListener?.subscription?.unsubscribe();
    };
  }, []); // NO DEPENDENCIES - listener persists for component lifetime

  const fetchWaitlistCount = async () => {
    // Use cached value immediately for speed
    const cached = localStorage.getItem('waitlistCount');
    if (cached) {
      setWaitlistCount(parseInt(cached));
    } else {
      setWaitlistCount(7); // Default fallback
    }

    if (!supabase) {
      return;
    }

    try {
      // Fetch in background and update cache
      const { count, error } = await supabase
        .from('waitlist_emails')
        .select('*', { count: 'exact', head: true });

      if (!error && count !== null) {
        setWaitlistCount(count);
        localStorage.setItem('waitlistCount', count.toString());
      }
    } catch (err) {
      // Silently fail - we already have the fallback
      console.log('Waitlist count fetch failed, using cached value');
    }
  };

  const checkIfUserSignedUp = async () => {
    if (!supabase) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setUserEmail(user.email); // Store user email

        // Special case: Admin email goes straight to admin panel
        if (user.email === ADMIN_EMAIL) {
          console.log('🔑 Admin user detected in checkIfUserSignedUp, showing admin panel');
          setView('success');
          return;
        }

        // Check if user is already in waitlist
        const { data, error: fetchError } = await supabase
          .from('waitlist_emails')
          .select('email, created_at')
          .eq('email', user.email.toLowerCase())
          .maybeSingle();

        if (fetchError) {
          console.log('⚠️ Could not check waitlist:', fetchError.message);
          // If there's an error, just stay on landing page
          return;
        }

        if (data) {
          console.log('✅ User is in waitlist, showing success page');
          setUserAlreadySignedUp(true);

          // Get their signup number if they're already on the list
          const { count } = await supabase
            .from('waitlist_emails')
            .select('*', { count: 'exact', head: true })
            .lte('created_at', data.created_at);

          setSignupNumber(count);
          setView('success'); // Show success page for returning users
        } else {
          console.log('ℹ️ User not in waitlist, staying on landing page');
          // User is signed in but not in waitlist - stay on landing page
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
      // Trigger Google OAuth with explicit production URL
      const redirectUrl = process.env.NODE_ENV === 'production'
        ? 'https://automerchant.vercel.app'
        : window.location.origin;

      console.log('🔐 Starting OAuth with redirectTo:', redirectUrl);

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: false
        }
      });

      if (error) {
        console.error('OAuth error:', error);
        throw error;
      }

      console.log('✅ OAuth initiated successfully');
      setView('oauth'); // Show loading state
    } catch (err) {
      console.error('Google sign-in error:', err);
      alert(err.message || 'Failed to sign in with Google. Please try again.');
    }
  };

  // eslint-disable-next-line no-unused-vars
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
            .maybeSingle();

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
    setUserApproved(false);
    setIsProcessing(false);
    localStorage.removeItem('authToken');
  };

  console.log('📊 Current state:', { view, userEmail, signupNumber, userAlreadySignedUp, userApproved });

  // Show product dashboard for approved users
  if (view === 'product' && userApproved) {
    console.log('✅ Showing product dashboard for approved user:', userEmail);
    return <ProductDashboard userEmail={userEmail} onLogout={handleLogout} />;
  }

  if (view === 'success') {
    // Show admin panel for admin email
    console.log('🔍 Checking admin status:', { userEmail, ADMIN_EMAIL, isAdmin: userEmail === ADMIN_EMAIL });
    if (userEmail === ADMIN_EMAIL) {
      console.log('✅ Showing admin panel for:', userEmail);
      return <AdminPanel userEmail={userEmail} onLogout={handleLogout} />;
    }
    console.log('📄 Showing success page for:', userEmail);
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
