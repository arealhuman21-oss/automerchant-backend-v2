import { useState, useEffect } from 'react';
import { Zap, Check, RefreshCw, BarChart3, LogOut, Package, TrendingUp, DollarSign, AlertCircle } from 'lucide-react';
import { supabase } from './lib/supabaseClient';
import AdminPanel from './components/AdminPanel';
import ProductDashboard from './components/ProductDashboard';

const ADMIN_EMAIL = 'arealhuman21@gmail.com';

// Success Page Component
function SuccessPage({ signupNumber, onLogout, userEmail }) {
  // Always show manual onboarding info
  useEffect(() => {
    // Save to backend that user wants manual onboarding
    const saveOnboardingPreference = async () => {
      try {
        const API_URL = process.env.REACT_APP_API_URL || '';
        await fetch(`${API_URL}/api/set-manual-onboarding`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: userEmail })
        });
        console.log('✅ Manual onboarding preference saved');
      } catch (error) {
        console.error('❌ Failed to save manual onboarding preference:', error);
      }
    };
    saveOnboardingPreference();
  }, [userEmail]);

  const handleLogout = async () => {
    try {
      // Sign out from Supabase if available
      if (supabase) {
        await supabase.auth.signOut();
      }

      // Always clear local state and redirect
      localStorage.removeItem('authToken');
      localStorage.removeItem('wantsManualOnboarding');

      // Call parent logout handler
      if (onLogout) {
        onLogout();
      }

      // Force reload to landing page
      window.location.href = '/';
    } catch (err) {
      console.error('Logout error:', err);
      // Force logout even if error
      localStorage.removeItem('authToken');
      localStorage.removeItem('wantsManualOnboarding');
      window.location.href = '/';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>

      <div className="text-center max-w-3xl relative z-10">
        {/* Logout button in top right corner */}
        <button
          onClick={handleLogout}
          className="absolute -top-4 right-0 px-4 py-2 bg-slate-700/50 hover:bg-slate-600 text-white rounded-lg font-medium transition flex items-center space-x-2 border border-slate-600"
        >
          <LogOut className="w-4 h-4" />
          <span>Log Out</span>
        </button>

        {/* Animated Success Icon */}
        <div className="inline-block p-8 bg-gradient-to-r from-purple-600 to-pink-600 rounded-3xl mb-8 animate-bounce shadow-2xl shadow-purple-500/50">
          <Check className="w-20 h-20 text-white" />
        </div>

        {/* Main Heading with Gradient */}
        <h1 className="text-6xl font-black text-white mb-6 animate-fade-in-up">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-emerald-400 to-green-400 bg-[length:200%_auto] animate-gradient-flow">
            🎉 Prepare to be AMAZED!
          </span>
        </h1>

        <p className="text-2xl text-gray-200 mb-8 animate-fade-in-up font-semibold" style={{animationDelay: '0.1s'}}>
          You're on the list for <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 font-bold">AutoMerchant</span>
        </p>

        {signupNumber && (
          <div className="mb-8 inline-block px-8 py-4 bg-purple-500/20 border-2 border-purple-500/50 rounded-2xl animate-fade-in-up hover:scale-105 transition-transform duration-300" style={{animationDelay: '0.2s'}}>
            <p className="text-3xl font-bold text-purple-300">
              🚀 You're signup #{signupNumber}
            </p>
          </div>
        )}

        {userEmail && userEmail !== 'benjamincao98@gmail.com' && (
          <div className="mb-8 animate-fade-in-up" style={{animationDelay: '0.3s'}}>
            <p className="text-gray-400 text-sm">Signed in as: <span className="text-purple-300 font-medium">{userEmail}</span></p>
          </div>
        )}

        {/* Contact Information - Always show */}
        <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-2 border-purple-500/50 rounded-2xl p-8 mb-8 backdrop-blur-sm animate-fade-in-up shadow-2xl shadow-purple-500/20" style={{animationDelay: '0.4s'}}>
          <div className="mb-6 p-4 bg-purple-500/20 border-2 border-purple-500/50 rounded-xl">
            <h2 className="text-3xl font-bold text-white mb-2">
              📋 Manual Onboarding Required
            </h2>
            <p className="text-purple-200 text-lg">
              We need to manually onboard you to complete setup
            </p>
          </div>

          <p className="text-xl text-gray-300 mb-6 leading-relaxed">
            Please contact us to get your account activated and start using AutoMerchant:
          </p>

          <div className="space-y-4">
            {/* Discord Contact */}
            <div className="group p-6 bg-gradient-to-r from-indigo-600/20 to-purple-600/20 border border-indigo-500/50 rounded-xl hover:border-indigo-400 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-indigo-500/30">
              <div className="flex items-center justify-center space-x-3 mb-2">
                <div className="w-8 h-8 bg-indigo-500/30 rounded-lg flex items-center justify-center group-hover:rotate-12 transition-transform">
                  <Zap className="w-5 h-5 text-indigo-300" />
                </div>
                <h3 className="text-2xl font-bold text-white">Discord</h3>
              </div>
              <p className="text-indigo-200 text-lg font-mono bg-slate-900/50 px-4 py-2 rounded-lg inline-block">
                automerchantai_88517
              </p>
              <p className="text-gray-400 text-sm mt-2">Friend us and you'll be accepted and messaged soon!</p>
            </div>

            {/* Email Contact */}
            <div className="group p-6 bg-gradient-to-r from-pink-600/20 to-rose-600/20 border border-pink-500/50 rounded-xl hover:border-pink-400 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-pink-500/30">
              <div className="flex items-center justify-center space-x-3 mb-2">
                <div className="w-8 h-8 bg-pink-500/30 rounded-lg flex items-center justify-center group-hover:rotate-12 transition-transform">
                  <BarChart3 className="w-5 h-5 text-pink-300" />
                </div>
                <h3 className="text-2xl font-bold text-white">Email Support</h3>
              </div>
              <a
                href="mailto:waitlisteremail@gmail.com"
                className="text-pink-200 text-lg font-mono bg-slate-900/50 px-4 py-2 rounded-lg inline-block hover:bg-slate-800 transition-colors"
              >
                waitlisteremail@gmail.com
              </a>
              <p className="text-gray-400 text-sm mt-2">Our customer support team is standing by!</p>
            </div>
          </div>

          <div className="mt-6 p-6 bg-gradient-to-r from-green-600/20 to-emerald-600/20 border-2 border-green-500/50 rounded-xl">
            <div className="flex items-center justify-center space-x-3 mb-3">
              <div className="text-4xl">⚡</div>
              <h3 className="text-2xl font-black text-white">FAST ONBOARDING</h3>
            </div>
            <p className="text-green-200 text-xl font-bold mb-2">
              Process takes 5-10 minutes (max 20 minutes)
            </p>
            <p className="text-green-300 text-base">
              Email or message us on Discord and we'll get you set up IMMEDIATELY!
            </p>
          </div>
        </div>

        {/* What to Expect */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12 animate-fade-in-up" style={{animationDelay: '0.5s'}}>
          <div className="group p-6 bg-slate-800/50 border border-slate-700 rounded-xl hover:border-purple-500 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-purple-500/20">
            <div className="inline-block p-3 bg-purple-500/20 rounded-lg mb-4 group-hover:rotate-6 transition-transform">
              <BarChart3 className="w-8 h-8 text-purple-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Smart AI Analysis</h3>
            <p className="text-gray-400 text-sm">Automatic pricing optimization every 30 minutes</p>
          </div>

          <div className="group p-6 bg-slate-800/50 border border-slate-700 rounded-xl hover:border-green-500 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-green-500/20">
            <div className="inline-block p-3 bg-green-500/20 rounded-lg mb-4 group-hover:rotate-6 transition-transform">
              <RefreshCw className="w-8 h-8 text-green-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Manual Control</h3>
            <p className="text-gray-400 text-sm">Run analysis anytime with 10 daily manual runs</p>
          </div>
        </div>
      </div>

      {/* Add keyframe animations */}
      <style jsx>{`
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes gradient-flow {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.6s ease-out forwards;
        }
        .animate-gradient-flow {
          animation: gradient-flow 3s ease infinite;
        }
      `}</style>
    </div>
  );
}

// Interactive Recommendation Card Demo
function InteractiveRecommendationCard() {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-green-500/50 rounded-xl p-6 shadow-2xl transform transition-all duration-300 hover:scale-105 hover:shadow-green-500/30"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-white">Premium Wireless Headphones</h3>
          <p className="text-sm text-gray-400">SKU: WH-1000XM4</p>
        </div>
        <span className="px-3 py-1 bg-red-500/20 border border-red-500/50 rounded-full text-red-300 text-xs font-bold">
          🚨 CRITICAL
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-slate-900/50 rounded-lg p-3">
          <p className="text-gray-400 text-xs mb-1">Current Price</p>
          <p className="text-white text-2xl font-bold">$89.99</p>
          <p className="text-red-400 text-sm">25% margin ⚠️</p>
        </div>
        <div className="bg-green-900/30 border border-green-500/30 rounded-lg p-3">
          <p className="text-gray-400 text-xs mb-1">AI Recommended</p>
          <p className="text-green-300 text-2xl font-bold">$119.99</p>
          <p className="text-green-400 text-sm">40% margin ✓</p>
        </div>
      </div>

      <div className={`bg-slate-900/70 border ${isHovered ? 'border-green-500/50' : 'border-slate-700'} rounded-lg p-4 transition-colors duration-300`}>
        <p className="text-gray-400 text-xs mb-2">🧠 AI Reasoning:</p>
        <p className="text-green-300 font-mono text-sm leading-relaxed">
          "🛡️ MARGIN TOO LOW: Current margin 25% is below healthy minimum of 30%.
          Raising price from $89.99 to $119.99 (+33%) to achieve 40% target margin.
          Sales velocity: 12 units/week suggests elastic demand. Confidence: 87%"
        </p>
      </div>

      <div className="flex gap-3 mt-4">
        <button className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition flex items-center justify-center gap-2">
          <Check className="w-4 h-4" />
          Apply +$360/mo
        </button>
        <button className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition">
          Reject
        </button>
      </div>

      {isHovered && (
        <p className="text-center text-purple-300 text-xs mt-3 animate-fade-in">
          👆 This is what you see for EVERY recommendation
        </p>
      )}
    </div>
  );
}

// Interactive Stats Dashboard Demo
function InteractiveStatsDashboard() {
  const [activeTab, setActiveTab] = useState(0);
  const stats = [
    { label: 'Total Products', value: '47', change: '+12%', icon: Package, color: 'blue' },
    { label: 'Avg Margin', value: '38%', change: '+5%', icon: TrendingUp, color: 'green' },
    { label: 'Monthly Revenue', value: '$23.4K', change: '+18%', icon: DollarSign, color: 'purple' },
    { label: 'Active Recommendations', value: '8', change: 'new', icon: AlertCircle, color: 'orange' }
  ];

  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-purple-500/50 rounded-xl p-6 shadow-2xl">
      <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <BarChart3 className="w-6 h-6 text-purple-400" />
        Your Dashboard Overview
      </h3>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          const isActive = activeTab === idx;
          const colorClasses = {
            blue: 'from-blue-500/20 to-blue-600/20 border-blue-500/50',
            green: 'from-green-500/20 to-green-600/20 border-green-500/50',
            purple: 'from-purple-500/20 to-purple-600/20 border-purple-500/50',
            orange: 'from-orange-500/20 to-orange-600/20 border-orange-500/50'
          };

          return (
            <div
              key={idx}
              className={`bg-gradient-to-br ${colorClasses[stat.color]} border rounded-lg p-4 cursor-pointer transition-all duration-300 ${isActive ? 'scale-105 shadow-lg' : 'hover:scale-102'}`}
              onClick={() => setActiveTab(idx)}
            >
              <div className="flex items-center justify-between mb-2">
                <Icon className={`w-5 h-5 text-${stat.color}-300`} />
                <span className="text-green-400 text-xs font-bold">{stat.change}</span>
              </div>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              <p className="text-gray-400 text-xs mt-1">{stat.label}</p>
            </div>
          );
        })}
      </div>

      <p className="text-center text-purple-300 text-sm mt-4">
        ✨ Click the cards to see them animate
      </p>
    </div>
  );
}

// Interactive ROI Calculator Demo
function InteractiveROICalculator() {
  const [profit, setProfit] = useState(450);

  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-green-500/50 rounded-xl p-6 shadow-2xl">
      <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <DollarSign className="w-6 h-6 text-green-400" />
        Potential Monthly Profit Increase
      </h3>

      <div className="text-center mb-6">
        <p className="text-5xl font-black text-green-400 mb-2">
          +${profit.toLocaleString()}/mo
        </p>
        <p className="text-gray-400">If you apply all current recommendations</p>
      </div>

      <div className="space-y-3">
        <div className="bg-slate-900/50 rounded-lg p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-400 text-sm">8 Recommendations Available</span>
            <span className="text-green-400 font-bold">+$450</span>
          </div>
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full animate-pulse" style={{width: '75%'}}></div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-slate-900/50 rounded-lg p-3">
            <p className="text-2xl font-bold text-white">12</p>
            <p className="text-gray-400 text-xs">Products</p>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-3">
            <p className="text-2xl font-bold text-green-400">+15%</p>
            <p className="text-gray-400 text-xs">Avg Increase</p>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-3">
            <p className="text-2xl font-bold text-purple-400">87%</p>
            <p className="text-gray-400 text-xs">Confidence</p>
          </div>
        </div>
      </div>

      <input
        type="range"
        min="200"
        max="800"
        value={profit}
        onChange={(e) => setProfit(parseInt(e.target.value))}
        className="w-full mt-4 accent-green-500"
      />
      <p className="text-center text-purple-300 text-xs mt-2">
        👆 Drag to see different scenarios
      </p>
    </div>
  );
}

// Landing Page Component - ULTRA HIGH CONVERTING
function LandingPage({ onJoinWaitlist, waitlistCount, userAlreadySignedUp }) {
  const [showManualOnboarding, setShowManualOnboarding] = useState(false)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>

      <div className="relative py-12 px-4">
        <div className="max-w-7xl mx-auto">

          {/* HERO SECTION */}
          <div className="text-center mb-16">
            <div className="inline-block p-4 bg-gradient-to-r from-purple-600/30 to-pink-600/30 rounded-2xl mb-6 border-2 border-purple-500/50 shadow-2xl shadow-purple-500/50">
              <Zap className="w-16 h-16 text-purple-300" />
            </div>

            <h1 className="text-6xl md:text-7xl font-black text-white mb-4">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-[length:200%_auto] animate-gradient-flow">
                AutoMerchant
              </span>
            </h1>
            <h2 className="text-3xl md:text-4xl font-bold text-purple-200 mb-8">
              AI Pricing That Actually <span className="text-green-400">Explains Itself</span>
            </h2>

            <div className="mb-8 flex flex-wrap items-center justify-center gap-4">
              <div className="px-4 py-2 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-2 border-green-500/50 rounded-full hover:scale-110 transition-transform">
                <p className="text-green-300 font-bold flex items-center gap-2">
                  <Check className="w-5 h-5" /> 100% Transparent
                </p>
              </div>
              <div className="px-4 py-2 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border-2 border-blue-500/50 rounded-full hover:scale-110 transition-transform">
                <p className="text-blue-300 font-bold flex items-center gap-2">
                  <Zap className="w-5 h-5" /> 5min Setup
                </p>
              </div>
              <div className="px-4 py-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-2 border-purple-500/50 rounded-full hover:scale-110 transition-transform">
                <p className="text-purple-300 font-bold flex items-center gap-2">
                  <Check className="w-5 h-5" /> No Complexity
                </p>
              </div>
            </div>

            {/* TOP CTA BUTTON */}
            <div className="mb-12">
              <button
                onClick={onJoinWaitlist}
                className="group px-10 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold text-xl hover:from-purple-700 hover:to-pink-700 transition transform hover:scale-105 shadow-2xl shadow-purple-500/50 flex items-center gap-3 mx-auto"
              >
                <Zap className="w-6 h-6" />
                Get Manually Onboarded (5-10 min)
              </button>
              <p className="text-gray-400 text-sm mt-3 text-center">
                Sign in with Google to get started
              </p>
            </div>
          </div>

          {/* THE BIG PROBLEM - MORE EMOTIONAL */}
          <div className="max-w-4xl mx-auto mb-16">
            <div className="p-8 bg-red-900/20 border-2 border-red-500/50 rounded-2xl mb-6">
              <h3 className="text-2xl md:text-3xl font-bold text-red-200 mb-4 flex items-center gap-3">
                <AlertCircle className="w-8 h-8" />
                Why Other Pricing Tools Feel Like a Gamble
              </h3>
              <div className="space-y-4 text-lg text-gray-300 leading-relaxed">
                <p>
                  Ever wake up wondering <span className="text-red-400 font-bold">"Did my AI just tank my sales?"</span>
                </p>
                <p>
                  Other tools are <span className="text-red-400 font-bold">BLACK BOXES</span>. They change your prices with ZERO explanation.
                  You're supposed to just... <span className="text-red-300 font-semibold">trust them</span>? With your entire business?
                </p>
                <p className="text-xl font-bold text-red-200">
                  That's insane. You deserve to know WHY.
                </p>
              </div>
            </div>
          </div>

          {/* OVERVIEW VIDEO - CENTER STAGE */}
          <div className="max-w-5xl mx-auto mb-16">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border-4 border-purple-500/50">
              <video
                controls
                autoPlay
                className="w-full"
              >
                <source src="/OVERVIEW-VIDEO.mp4" type="video/mp4" />
                Your browser doesn't support video.
              </video>
            </div>
            <p className="text-center text-purple-300 text-lg mt-4 font-semibold">
              👆 Product Overview - See How It Works
            </p>
          </div>

          {/* TRANSPARENCY SECTION - THE KILLER FEATURE */}
          <div className="max-w-4xl mx-auto mb-16">
            <div className="p-8 bg-gradient-to-br from-green-900/30 to-emerald-900/30 border-2 border-green-500/70 rounded-2xl">
              <h3 className="text-3xl md:text-4xl font-black text-white mb-6 text-center">
                ✅ AutoMerchant: <span className="text-green-400">Transparent by Design</span>
              </h3>
              <p className="text-xl text-gray-200 text-center mb-8 leading-relaxed">
                Every recommendation comes with <span className="text-green-300 font-bold">full reasoning</span>.
                You see the math. You understand the "why". <span className="text-purple-300 font-bold">No other tool does this.</span>
              </p>
            </div>
          </div>

          {/* COMPARISON TABLE */}
          <div className="max-w-5xl mx-auto mb-16">
            <h2 className="text-4xl md:text-5xl font-black text-white text-center mb-12">
              AutoMerchant vs. Everyone Else
            </h2>

            <div className="bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-purple-500/50 rounded-2xl overflow-hidden">
              <div className="grid md:grid-cols-3 gap-0">
                <div className="p-6 bg-slate-900/50 border-b md:border-b-0 md:border-r border-slate-700">
                  <h3 className="text-xl font-bold text-white mb-4">Feature</h3>
                </div>
                <div className="p-6 bg-purple-900/20 border-b md:border-b-0 md:border-r border-purple-500/30">
                  <h3 className="text-xl font-bold text-purple-300 mb-4 flex items-center gap-2">
                    <Zap className="w-5 h-5" /> AutoMerchant
                  </h3>
                </div>
                <div className="p-6 bg-slate-900/50">
                  <h3 className="text-xl font-bold text-gray-400 mb-4">Others</h3>
                </div>

                {[
                  { feature: 'Shows AI Reasoning', us: '✅ Full transparency', them: '❌ Black box' },
                  { feature: 'Setup Time', us: '⚡ 5 minutes', them: '🐌 Hours of config' },
                  { feature: 'Complexity', us: '✅ Just works', them: '😵 Competitor URLs, rules' },
                  { feature: 'Trust Factor', us: '💯 You understand it', them: '🎲 Blind faith' },
                  { feature: 'Manual Approval', us: '✅ You decide', them: '⚠️ Auto-applies' },
                ].map((row, idx) => (
                  <div key={idx} className="contents">
                    <div className="p-4 border-b border-slate-700 bg-slate-900/30">
                      <p className="text-gray-300 font-semibold">{row.feature}</p>
                    </div>
                    <div className="p-4 border-b border-purple-500/30 bg-purple-900/10">
                      <p className="text-green-300 font-bold">{row.us}</p>
                    </div>
                    <div className="p-4 border-b border-slate-700 bg-slate-900/30">
                      <p className="text-red-300">{row.them}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* INTERACTIVE DEMOS */}
          <div className="mb-16">
            <h2 className="text-4xl md:text-5xl font-black text-white text-center mb-4">
              Try The Dashboard (Interactive!)
            </h2>
            <p className="text-xl text-gray-300 text-center mb-4">
              These are <span className="text-purple-300 font-bold">real interactive examples</span> of what you'll see in your dashboard
            </p>
            <p className="text-lg text-purple-300 text-center mb-12 font-semibold">
              👇 Hover, click, and drag to explore!
            </p>

            <div className="grid md:grid-cols-2 gap-8 mb-8">
              <div>
                <h3 className="text-2xl font-bold text-white mb-3 flex items-center gap-2">
                  <Check className="w-6 h-6 text-green-400" /> Recommendation Card
                </h3>
                <p className="text-gray-400 mb-4">Hover to see the AI reasoning in action</p>
                <InteractiveRecommendationCard />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white mb-3 flex items-center gap-2">
                  <DollarSign className="w-6 h-6 text-green-400" /> ROI Calculator
                </h3>
                <p className="text-gray-400 mb-4">Drag the slider to see profit projections</p>
                <InteractiveROICalculator />
              </div>
            </div>

            <div className="mb-8">
              <h3 className="text-2xl font-bold text-white mb-3 flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-purple-400" /> Dashboard Stats
              </h3>
              <p className="text-gray-400 mb-4">Click each stat card to see it highlight</p>
              <InteractiveStatsDashboard />
            </div>
          </div>

          {/* SIMPLICITY SECTION */}
          <div className="max-w-4xl mx-auto mb-16">
            <h2 className="text-4xl md:text-5xl font-black text-white text-center mb-12">
              Ridiculously <span className="text-blue-400">Simple</span>
            </h2>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="p-6 bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-blue-500/50 rounded-xl">
                <div className="text-5xl mb-4">1️⃣</div>
                <h4 className="text-xl font-bold text-white mb-2">Connect Shopify</h4>
                <p className="text-gray-400">One-click OAuth. Takes 30 seconds.</p>
              </div>

              <div className="p-6 bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-purple-500/50 rounded-xl">
                <div className="text-5xl mb-4">2️⃣</div>
                <h4 className="text-xl font-bold text-white mb-2">Set Cost Prices</h4>
                <p className="text-gray-400">Tell us what you paid. That's it.</p>
              </div>

              <div className="p-6 bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-green-500/50 rounded-xl">
                <div className="text-5xl mb-4">3️⃣</div>
                <h4 className="text-xl font-bold text-white mb-2">Get Recommendations</h4>
                <p className="text-gray-400">AI analyzes every 30 minutes. Automatically.</p>
              </div>
            </div>

            <div className="mt-8 p-6 bg-blue-900/20 border-2 border-blue-500/50 rounded-xl">
              <p className="text-center text-xl text-blue-200">
                <span className="font-bold">No competitor URLs.</span> No complex rules. No BS.<br/>
                <span className="text-blue-400 font-bold">Just works.</span>
              </p>
            </div>
          </div>

          {/* URGENCY BANNER */}
          <div className="max-w-4xl mx-auto mb-12">
            <div className="p-6 bg-gradient-to-r from-orange-900/30 to-red-900/30 border-2 border-orange-500/50 rounded-xl">
              <p className="text-center text-xl text-orange-200 font-bold">
                ⚡ <span className="text-orange-300">Limited Onboarding Spots</span> - We manually onboard to ensure quality
              </p>
              <p className="text-center text-gray-300 mt-2">
                Get in now while we have capacity
              </p>
            </div>
          </div>

          {/* MANUAL ONBOARDING CTA */}
          <div className="max-w-3xl mx-auto text-center mb-16">
            <div className="p-10 bg-gradient-to-r from-purple-900/50 to-pink-900/50 border-2 border-purple-500/70 rounded-3xl">
              <h2 className="text-4xl md:text-5xl font-black text-white mb-6">
                Ready to Stop Guessing?
              </h2>
              <p className="text-xl text-gray-200 mb-2">
                Get manually onboarded in <span className="text-green-400 font-bold">5-10 minutes</span>
              </p>
              <p className="text-lg text-purple-300 mb-8">
                Start seeing <span className="font-bold">transparent AI recommendations</span> today
              </p>
              <button
                onClick={onJoinWaitlist}
                className="px-12 py-6 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-2xl font-bold text-2xl hover:from-purple-700 hover:to-pink-700 transition transform hover:scale-105 shadow-2xl shadow-purple-500/50 flex items-center gap-3 mx-auto animate-pulse"
              >
                <Zap className="w-8 h-8" />
                Get Manual Onboarding Now
              </button>
              <p className="text-gray-400 text-sm mt-6">
                Sign in with Google to get started
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* Add keyframe animations */}
      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes gradient-flow {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-fade-in {
          animation: fade-in 0.6s ease-out forwards;
        }
        .animate-gradient-flow {
          animation: gradient-flow 3s ease infinite;
        }
      `}</style>
    </div>
  );
}


function App() {
  const [view, setView] = useState('landing'); // 'landing' | 'oauth' | 'success' | 'product' | 'error'
  const [waitlistCount, setWaitlistCount] = useState(null);
  const [signupNumber, setSignupNumber] = useState(null);
  const [userAlreadySignedUp, setUserAlreadySignedUp] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [userEmail, setUserEmail] = useState(null);
  const [userApproved, setUserApproved] = useState(false);
  const [error, setError] = useState(null); // FIX: Add error state

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

  // Check backend approval status with retry logic
  const checkBackendApprovalStatus = async (email, retryCount = 0) => {
    const MAX_RETRIES = 3;
    try {
      console.log(`🔍 Checking backend approval for: ${email} (Attempt ${retryCount + 1})`);
      const API_URL = process.env.REACT_APP_API_URL || '';

      const response = await fetch(`${API_URL}/api/check-approval`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      if (!response.ok) {
        // FIX: Retry on server errors
        if (response.status >= 500 && retryCount < MAX_RETRIES) {
          const delay = 1000 * Math.pow(2, retryCount);
          console.log(`⚠️ Server error (${response.status}), retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return checkBackendApprovalStatus(email, retryCount + 1);
        }
        throw new Error(`Failed to check approval status: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('📋 Backend approval response:', data);

      if (data.approved && data.token) {
        localStorage.setItem('authToken', data.token);
        setUserApproved(true);
        setView('product');
        console.log('✅ User approved, showing product dashboard');
      } else if (data.suspended) {
        setUserAlreadySignedUp(true);
        setUserApproved(false);
        setView('success'); // Shows suspended message
        console.log('🚫 User suspended');
      } else {
        setUserAlreadySignedUp(true);
        setUserApproved(false);
        setView('success');
        if (data.wantsManualOnboarding) {
          localStorage.setItem('wantsManualOnboarding', 'true');
        }
        console.log('⏳ User pending approval');
      }

      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (err) {
      console.error('❌ Backend approval check failed after all retries:', err);
      // FIX: Show a dedicated error screen with a retry button
      setError({
        message: 'Unable to connect to our servers to verify your account status. Please check your internet connection and try again.',
        canRetry: true,
        retryAction: () => {
          setError(null); // Clear error before retrying
          checkBackendApprovalStatus(email, 0);
        }
      });
      setView('error');
    }
  };

  // Listen for OAuth callback - NO DEPENDENCIES to avoid re-creation
  useEffect(() => {
    if (!supabase) return;

    console.log('Setting up auth listener...');
    let hasProcessed = false;

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔔 Auth state changed:', event, session?.user?.email);

      if (event === 'SIGNED_IN' && session && !hasProcessed) {
        const hasHashToken = window.location.hash.includes('access_token');
        const urlParams = new URLSearchParams(window.location.search);
        const hasCodeParam = urlParams.get('code');
        const isOAuthCallback = hasHashToken || hasCodeParam;

        if (isOAuthCallback) {
          console.log('✅ Processing OAuth signup for:', session.user.email);
          hasProcessed = true;
          setIsProcessing(true);

          try {
            setUserEmail(session.user.email);

            if (session.user.email === ADMIN_EMAIL) {
              console.log('🔑 Admin user detected, showing admin panel');
              setView('success');
              setIsProcessing(false);
              window.history.replaceState({}, document.title, window.location.pathname);
              return;
            }

            // CRITICAL: Save to BOTH waitlist_emails AND users table
            const userEmail = session.user.email.toLowerCase();

            // 1. Save to waitlist_emails (for counter)
            const { data: existing } = await supabase
              .from('waitlist_emails')
              .select('email, created_at')
              .eq('email', userEmail)
              .maybeSingle();

            if (existing) {
              const { count } = await supabase
                .from('waitlist_emails')
                .select('*', { count: 'exact', head: true })
                .lte('created_at', existing.created_at);
              setSignupNumber(count || 1);
            } else {
              const { error: insertError } = await supabase
                .from('waitlist_emails')
                .insert([{ email: userEmail }])
                .select();

              if (insertError && insertError.code !== '23505') {
                 throw new Error(insertError.message || 'Failed to add to waitlist');
              }
              const { error: rpcError } = await supabase.rpc('increment_waitlist');
              if (rpcError) console.warn('⚠️ Counter increment failed (non-fatal):', rpcError);
              const { count } = await supabase.from('waitlist_emails').select('*', { count: 'exact', head: true });
              setSignupNumber(count || 1);
            }

            // 2. CRITICAL: ALSO save to users table (for approval/dashboard access)
            try {
              const { error: userInsertError } = await supabase
                .from('users')
                .insert([{
                  email: userEmail,
                  approved: false,
                  created_at: new Date().toISOString()
                }])
                .select();

              if (userInsertError && userInsertError.code !== '23505') {
                console.warn('⚠️ Failed to create user record:', userInsertError);
              } else {
                console.log('✅ User record created in users table');
              }
            } catch (userErr) {
              console.warn('⚠️ User creation error (non-fatal):', userErr);
            }
            window.history.replaceState({}, document.title, window.location.pathname);
            setView('success');
            setIsProcessing(false);
          } catch (err) {
            console.error('❌ Signup error:', err);
            setError({
              message: 'A problem occurred during signup. Please refresh and try again.',
              canRetry: false
            });
            setView('error');
            setIsProcessing(false);
          }
        } else {
          console.log('👤 Returning user detected');
          const { data: { user } } = await supabase.auth.getUser();
          if (user?.email) {
            setUserEmail(user.email);
            if (user.email === ADMIN_EMAIL) {
              window.history.replaceState({}, document.title, window.location.pathname);
              setView('success');
              return;
            }

            // CRITICAL: Ensure user exists in database (for users who signed up before this fix)
            try {
              const userEmail = user.email.toLowerCase();

              // Check if user exists in users table
              const { data: existingUser } = await supabase
                .from('users')
                .select('id')
                .eq('email', userEmail)
                .maybeSingle();

              // If not, create them now
              if (!existingUser) {
                console.log('⚠️ Returning user not in database, creating now...');
                const { error: userInsertError } = await supabase
                  .from('users')
                  .insert([{
                    email: userEmail,
                    approved: false,
                    created_at: new Date().toISOString()
                  }])
                  .select();

                if (userInsertError && userInsertError.code !== '23505') {
                  console.warn('⚠️ Failed to create returning user record:', userInsertError);
                } else {
                  console.log('✅ Returning user record created');
                }
              }
            } catch (userErr) {
              console.warn('⚠️ Returning user creation error (non-fatal):', userErr);
            }

            await checkBackendApprovalStatus(user.email);
          }
        }
      }
    });

    return () => {
      console.log('Cleaning up auth listener');
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const fetchWaitlistCount = async () => {
    const cached = localStorage.getItem('waitlistCount');
    if (cached) {
      setWaitlistCount(parseInt(cached));
    } else {
      setWaitlistCount(7);
    }
    if (!supabase) return;
    try {
      const { count, error } = await supabase.from('waitlist_emails').select('*', { count: 'exact', head: true });
      if (!error && count !== null) {
        setWaitlistCount(count);
        localStorage.setItem('waitlistCount', count.toString());
      }
    } catch (err) {
      console.log('Waitlist count fetch failed, using cached value');
    }
  };

  const checkIfUserSignedUp = async () => {
    if (!supabase) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setUserEmail(user.email);
        if (user.email === ADMIN_EMAIL) {
          setView('success');
          return;
        }
        const { data } = await supabase.from('waitlist_emails').select('email, created_at').eq('email', user.email.toLowerCase()).maybeSingle();
        if (data) {
          const { count } = await supabase.from('waitlist_emails').select('*', { count: 'exact', head: true }).lte('created_at', data.created_at);
          setSignupNumber(count);
          setView('success');
        }
      }
    } catch (err) {
      console.log('User check:', err.message);
    }
  };

  const handleJoinWaitlist = async () => {
    if (!supabase) {
      alert('Supabase is not configured. Please contact support.');
      return;
    }
    try {
      const redirectUrl = process.env.NODE_ENV === 'production' ? 'https://automerchant.vercel.app' : window.location.origin;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: redirectUrl, skipBrowserRedirect: false }
      });
      if (error) throw error;
      setView('oauth');
    } catch (err) {
      alert(err.message || 'Failed to sign in with Google. Please try again.');
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

  if (view === 'product' && userApproved) {
    return <ProductDashboard userEmail={userEmail} onLogout={handleLogout} />;
  }

  if (view === 'success') {
    if (userEmail === ADMIN_EMAIL) {
      return <AdminPanel userEmail={userEmail} onLogout={handleLogout} />;
    }
    return <SuccessPage signupNumber={signupNumber} onLogout={handleLogout} userEmail={userEmail} />;
  }
  
  // FIX: Render error view
  if (view === 'error' && error) {
    return (
       <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
        <div className="text-center max-w-lg p-8 bg-slate-800 border border-red-500/50 rounded-2xl">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Connection Error</h2>
          <p className="text-gray-300 mb-6">{error.message}</p>
          {error.canRetry && (
            <button
              onClick={error.retryAction}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition flex items-center justify-center mx-auto space-x-2"
            >
              <RefreshCw className="w-5 h-5" />
              <span>Try Again</span>
            </button>
          )}
        </div>
      </div>
    );
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
