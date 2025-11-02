import { useState, useEffect } from 'react';
import { Zap, Check, RefreshCw, TrendingUp, Package, DollarSign, AlertCircle, LogOut, Settings, X, Wifi, WifiOff, BarChart3, Activity, ShoppingCart, Calendar, Clock } from 'lucide-react';

const API_URL = 'http://localhost:5000';

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

function CostPriceModal({ isOpen, onClose, product, onSave }) {
  const [costPrice, setCostPrice] = useState('0.00');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (product) setCostPrice(product.cost_price || '0.00');
  }, [product]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await api.call(`/api/products/${product.id}/cost-price`, {
        method: 'POST',
        body: JSON.stringify({ costPrice: parseFloat(costPrice) })
      });
      onSave();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !product) return null;

  const currentPrice = parseFloat(product.price);
  const cost = parseFloat(costPrice);
  const margin = cost > 0 ? (((currentPrice - cost) / currentPrice) * 100).toFixed(1) : 0;
  const profit = (currentPrice - cost).toFixed(2);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-2xl border border-slate-700 max-w-md w-full shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div>
            <h2 className="text-xl font-bold text-white">Set Cost Price</h2>
            <p className="text-sm text-gray-400 mt-1">{product.title}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-lg transition">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
          <div>
            <label className="block text-white font-medium mb-2">Cost Price (What you paid)</label>
            <div className="relative">
              <span className="absolute left-3 top-3 text-gray-400 text-lg">$</span>
              <input
                type="number"
                step="0.01"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                className="w-full pl-8 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white text-lg focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition"
                placeholder="0.00"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">AI will never recommend below this price</p>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Current Selling Price:</span>
              <span className="text-white font-bold text-lg">${currentPrice.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Your Cost:</span>
              <span className="text-white font-semibold">${cost.toFixed(2)}</span>
            </div>
            <div className="h-px bg-slate-700"></div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Profit per Unit:</span>
              <span className={`font-bold text-lg ${parseFloat(profit) > 0 ? 'text-green-400' : 'text-red-400'}`}>${profit}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Margin:</span>
              <span className={`font-bold text-lg ${margin > 30 ? 'text-green-400' : margin > 15 ? 'text-yellow-400' : 'text-red-400'}`}>{margin}%</span>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-slate-700">
          <button onClick={onClose} className="px-6 py-2.5 bg-slate-700 text-white rounded-lg font-semibold hover:bg-slate-600 transition">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="px-6 py-2.5 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed">
            {saving ? 'Saving...' : 'Save Cost Price'}
          </button>
        </div>
      </div>
    </div>
  );
}

function SettingsModal({ isOpen, onClose, onConnect, shopifyConnected }) {
  const [formData, setFormData] = useState({ shop: '', accessToken: '' });
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleConnect = async (e) => {
    e.preventDefault();
    setConnecting(true);
    setError(null);
    setSuccess(false);
    try {
      await api.call('/api/shopify/connect', {
        method: 'POST',
        body: JSON.stringify({ shopifyShop: formData.shop, accessToken: formData.accessToken })
      });
      setSuccess(true);
      setTimeout(() => {
        onConnect();
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setConnecting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-2xl border border-slate-700 max-w-2xl w-full shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div className="flex items-center space-x-3">
            <Settings className="w-6 h-6 text-purple-400" />
            <h2 className="text-2xl font-bold text-white">Shopify Connection</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-lg transition">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        <div className="p-6">
          {shopifyConnected ? (
            <div className="text-center py-8">
              <div className="inline-block p-4 bg-green-500/20 rounded-full mb-4">
                <Wifi className="w-12 h-12 text-green-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Connected to Shopify</h3>
              <p className="text-gray-400 mb-6">Your store is successfully connected</p>
              <button onClick={onClose} className="px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition">Close</button>
            </div>
          ) : (
            <>
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
                <h3 className="text-blue-300 font-semibold mb-2">How to get your credentials:</h3>
                <ol className="text-sm text-blue-200 space-y-2">
                  <li>1. Go to your Shopify Admin → Settings → Apps and sales channels</li>
                  <li>2. Click "Develop apps" → Create an app</li>
                  <li>3. Configure Admin API scopes (read_products, write_products, read_orders)</li>
                  <li>4. Install the app and copy your Admin API access token</li>
                </ol>
              </div>
              {error && (
                <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}
              {success && (
                <div className="mb-4 p-4 bg-green-500/10 border border-green-500/30 rounded-lg flex items-start space-x-3">
                  <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <p className="text-green-400 text-sm">Successfully connected to Shopify!</p>
                </div>
              )}
              <form onSubmit={handleConnect} className="space-y-4">
                <div>
                  <label className="block text-white font-medium mb-2">Shop URL</label>
                  <input 
                    type="text" 
                    value={formData.shop} 
                    onChange={(e) => setFormData({ ...formData, shop: e.target.value })} 
                    placeholder="your-store.myshopify.com" 
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition" 
                    required 
                  />
                </div>
                <div>
                  <label className="block text-white font-medium mb-2">Admin API Access Token</label>
                  <input 
                    type="password" 
                    value={formData.accessToken} 
                    onChange={(e) => setFormData({ ...formData, accessToken: e.target.value })} 
                    placeholder="shpat_xxxxxxxxxxxxx" 
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition" 
                    required 
                  />
                </div>
                <div className="flex space-x-3 pt-4">
                  <button type="button" onClick={onClose} className="flex-1 py-3 bg-slate-700 text-white rounded-lg font-semibold hover:bg-slate-600 transition">Cancel</button>
                  <button type="submit" disabled={connecting} className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-500/30">
                    {connecting ? 'Connecting...' : 'Connect Shopify'}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// NEW: Countdown Timer Component
function CountdownTimer({ timeRemaining, onRefresh }) {
  const [time, setTime] = useState(timeRemaining);
  
  useEffect(() => {
    setTime(timeRemaining);
  }, [timeRemaining]);
  
  useEffect(() => {
    if (time <= 0) {
      onRefresh();
      return;
    }
    
    const interval = setInterval(() => {
      setTime(prev => {
        if (prev <= 1) {
          onRefresh();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [time, onRefresh]);
  
  const minutes = Math.floor(time / 60);
  const seconds = time % 60;
  
  return (
    <div className="flex items-center space-x-2">
      <Clock className="w-5 h-5 text-purple-400" />
      <span className="text-white font-mono text-lg">
        {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
      </span>
    </div>
  );
}

function App() {
  const [view, setView] = useState('landing');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const savedUser = localStorage.getItem('user');
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
      setView('dashboard');
    }
  }, []);

  const AuthView = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({ email: '', password: '', name: '' });

    const handleSubmit = async (e) => {
      e.preventDefault();
      setLoading(true);
      setError(null);
      try {
        const endpoint = isLogin ? '/api/login' : '/api/register';
        const data = await api.call(endpoint, {
          method: 'POST',
          body: JSON.stringify(formData)
        });
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setUser(data.user);
        setView('dashboard');
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <div className="inline-block p-4 bg-purple-600/20 rounded-2xl mb-4">
              <Zap className="w-12 h-12 text-purple-400" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">{isLogin ? 'Welcome Back' : 'Get Started'}</h1>
            <p className="text-gray-400">{isLogin ? 'Sign in to your AutoMerchant account' : 'Create your AutoMerchant account'}</p>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700 p-8">
            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div>
                  <label className="block text-white font-medium mb-2">Name</label>
                  <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition" placeholder="Your name" required />
                </div>
              )}
              <div>
                <label className="block text-white font-medium mb-2">Email</label>
                <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition" placeholder="your@email.com" required />
              </div>
              <div>
                <label className="block text-white font-medium mb-2">Password</label>
                <input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition" placeholder="••••••••" required />
              </div>
              <button type="submit" disabled={loading} className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-bold hover:from-purple-700 hover:to-pink-700 transition disabled:opacity-50 disabled:cursor-not-allowed">
                {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Create Account')}
              </button>
              <button type="button" onClick={() => setIsLogin(!isLogin)} className="text-purple-400 hover:text-purple-300 text-sm transition">
                {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
              </button>
            </form>
          </div>
          <div className="text-center mt-6">
            <button onClick={() => setView('landing')} className="text-gray-400 hover:text-white text-sm transition">← Back to home</button>
          </div>
        </div>
      </div>
    );
  };

  const DashboardView = () => {
    const [activeTab, setActiveTab] = useState('overview');
    const [products, setProducts] = useState([]);
    const [recommendations, setRecommendations] = useState([]);
    const [orders, setOrders] = useState([]);
    const [stats, setStats] = useState(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [shopifyConnected, setShopifyConnected] = useState(false);
    const [checkingConnection, setCheckingConnection] = useState(true);
    const [showCostPriceModal, setShowCostPriceModal] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);
    
    // NEW: Analysis status state
    const [analysisStatus, setAnalysisStatus] = useState({
      selectedCount: 0,
      limit: 10,
      timeRemaining: 0,
      canAnalyze: true, // Default to true until we load actual status
      nextAnalysisDue: null,
      manualUsedToday: 0,
      manualRemaining: 10
    });

    useEffect(() => {
      loadDashboardData();
      checkShopifyConnection();
      loadOrders();
      loadAnalysisStatus();
    }, []);

    const loadAnalysisStatus = async () => {
      try {
        const status = await api.call('/api/analysis/status');
        console.log('📊 Analysis status loaded:', status);
        setAnalysisStatus(status);
      } catch (err) {
        console.error('Failed to load analysis status:', err);
        // Keep default state if API fails
      }
    };

    const toggleProductSelection = async (productId, currentlySelected) => {
      try {
        const result = await api.call(`/api/products/${productId}/toggle-analysis`, {
          method: 'POST',
          body: JSON.stringify({ selected: !currentlySelected })
        });
        
        setProducts(products.map(p => 
          p.id === productId ? { ...p, selected_for_analysis: !currentlySelected } : p
        ));
        
        setAnalysisStatus(prev => ({ ...prev, selectedCount: result.selectedCount }));
      } catch (err) {
        if (err.message.includes('limit')) {
          setError('⚠️ Product limit reached! You can select up to 10 products on the Pro plan.');
          setTimeout(() => setError(null), 5000);
        } else {
          setError(err.message);
        }
      }
    };

    const runManualAnalysis = async () => {
      if (analysisStatus.manualRemaining <= 0) {
        setError(`⏰ Daily limit reached! You've used all 10 manual analyses today. Resets at midnight.`);
        setTimeout(() => setError(null), 5000);
        return;
      }

      if (analysisStatus.selectedCount === 0) {
        setError('⚠️ Please select at least one product for analysis');
        setTimeout(() => setError(null), 3000);
        return;
      }
      
      setAnalyzing(true);
      setError(null);
      try {
        const result = await api.call('/api/analysis/run-now', { method: 'POST' });
        await loadDashboardData();
        await loadAnalysisStatus();
        setSuccessMessage(`✅ Analysis completed! ${result.manualRemaining} manual analyses remaining today.`);
        setTimeout(() => setSuccessMessage(null), 5000);
      } catch (err) {
        setError(err.message);
      } finally {
        setAnalyzing(false);
      }
    };

    const loadOrders = async () => {
      try {
        const ordersData = await api.call('/api/orders');
        setOrders(ordersData.orders || []);
      } catch (err) {
        console.error('Failed to load orders:', err);
      }
    };

    const checkShopifyConnection = async () => {
      try {
        const result = await api.call('/api/shopify/check');
        setShopifyConnected(result.connected);
      } catch (err) {
        console.error('Failed to check Shopify connection:', err);
      } finally {
        setCheckingConnection(false);
      }
    };

    const loadDashboardData = async () => {
      try {
        const [productsData, recsData, statsData] = await Promise.all([
          api.call('/api/products'),
          api.call('/api/recommendations'),
          api.call('/api/analytics/dashboard')
        ]);
        setProducts(productsData.products || []);
        setRecommendations(recsData.recommendations || []);
        setStats(statsData);
      } catch (err) {
        setError(err.message);
      }
    };

    const syncProducts = async () => {
      setLoading(true);
      setError(null);
      try {
        await api.call('/api/products/sync', { method: 'POST' });
        await loadDashboardData();
        await loadOrders();
        await loadAnalysisStatus();
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    const applyRecommendation = async (recommendationId, productId, newPrice) => {
      try {
        await api.call('/api/price-changes/apply', {
          method: 'POST',
          body: JSON.stringify({ productId, newPrice })
        });
        setRecommendations(recommendations.filter(r => r.id !== recommendationId));
        await loadDashboardData();
        setSuccessMessage('✅ Price updated successfully!');
        setTimeout(() => setSuccessMessage(null), 3000);
      } catch (err) {
        setError('Failed to apply recommendation: ' + err.message);
      }
    };

    const handleLogout = () => {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      setUser(null);
      setView('landing');
    };

    const handleSettingsClose = () => {
      setShowSettings(false);
      checkShopifyConnection();
      loadDashboardData();
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <CostPriceModal 
          isOpen={showCostPriceModal}
          onClose={() => {
            setShowCostPriceModal(false);
            setSelectedProduct(null);
          }}
          product={selectedProduct}
          onSave={() => {
            loadDashboardData();
            setSuccessMessage('✅ Cost price updated successfully!');
            setTimeout(() => setSuccessMessage(null), 3000);
          }}
        />

        <SettingsModal
          isOpen={showSettings}
          onClose={handleSettingsClose}
          onConnect={checkShopifyConnection}
          shopifyConnected={shopifyConnected}
        />

        {/* Header */}
        <div className="border-b border-slate-700/50 backdrop-blur-sm bg-slate-900/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-600/20 rounded-lg">
                  <Zap className="w-6 h-6 text-purple-400" />
                </div>
                <span className="text-2xl font-bold text-white">AutoMerchant Pricing AI</span>
              </div>
              
              {activeTab === 'overview' && analysisStatus.timeRemaining && Number(analysisStatus.timeRemaining) > 0 && (
                <div className="flex items-center space-x-3 px-4 py-2 bg-slate-800/50 border border-purple-500/30 rounded-lg">
                  <span className="text-sm text-gray-400">Next Analysis:</span>
                  <CountdownTimer
                    timeRemaining={Number(analysisStatus.timeRemaining)}
                    onRefresh={loadAnalysisStatus}
                  />
                </div>
              )}
              
              <div className="flex items-center space-x-3">
                {checkingConnection ? (
                  <div className="flex items-center space-x-2 px-3 py-2 bg-slate-800/50 rounded-lg">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-purple-500 border-t-transparent"></div>
                    <span className="text-sm text-gray-400">Checking connection...</span>
                  </div>
                ) : shopifyConnected ? (
                  <div className="flex items-center space-x-2 px-3 py-2 bg-green-500/20 border border-green-500/30 rounded-lg">
                    <Wifi className="w-4 h-4 text-green-400" />
                    <span className="text-sm text-green-300 font-medium">Shopify Connected</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2 px-3 py-2 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
                    <WifiOff className="w-4 h-4 text-yellow-400" />
                    <span className="text-sm text-yellow-300 font-medium">Not Connected</span>
                  </div>
                )}
                <button onClick={() => setShowSettings(true)} className="flex items-center space-x-2 px-4 py-2 bg-slate-700 rounded-lg text-white hover:bg-slate-600 transition">
                  <Settings className="w-4 h-4" />
                  <span>Settings</span>
                </button>
                <button onClick={handleLogout} className="flex items-center space-x-2 px-4 py-2 bg-slate-700 rounded-lg text-white hover:bg-slate-600 transition">
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Tabs */}
          <div className="flex items-center space-x-4 mb-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-6 py-3 rounded-lg font-semibold transition ${
                activeTab === 'overview'
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-800/50 text-gray-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-5 h-5" />
                <span>Dashboard</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`px-6 py-3 rounded-lg font-semibold transition ${
                activeTab === 'orders'
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-800/50 text-gray-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <div className="flex items-center space-x-2">
                <ShoppingCart className="w-5 h-5" />
                <span>Orders</span>
              </div>
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-red-400" />
                <p className="text-red-400 font-medium">{error}</p>
              </div>
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
              <p className="text-green-400 font-medium">{successMessage}</p>
            </div>
          )}

          {/* Shopify Not Connected Warning */}
          {!shopifyConnected && activeTab === 'overview' && (
            <div className="mb-8 p-6 bg-yellow-500/10 border border-yellow-500/30 rounded-xl flex items-start space-x-4">
              <WifiOff className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="text-yellow-300 font-semibold mb-1">Shopify Not Connected</h3>
                <p className="text-yellow-200/80 text-sm mb-3">Connect your Shopify store to sync products and enable AI-powered pricing optimization.</p>
                <button onClick={() => setShowSettings(true)} className="px-4 py-2 bg-yellow-600 text-white rounded-lg font-semibold hover:bg-yellow-700 transition text-sm">Connect Shopify Now</button>
              </div>
            </div>
          )}

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <>
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-white mb-2">Products</h2>
                <div className="flex items-center justify-between">
                  <p className="text-gray-400">
                    {analysisStatus.selectedCount}/{analysisStatus.limit} products selected for AI analysis
                  </p>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2 px-4 py-2 bg-purple-500/20 border border-purple-500/30 rounded-lg">
                      <Zap className="w-4 h-4 text-purple-400" />
                      <span className="text-sm text-purple-300 font-medium">
                        {analysisStatus.manualRemaining}/10 manual analyses today
                      </span>
                    </div>
                    
                    {analysisStatus.timeRemaining && Number(analysisStatus.timeRemaining) > 0 && (
                      <div className="flex items-center space-x-2 px-4 py-2 bg-slate-800/50 border border-slate-600 rounded-lg">
                        <span className="text-sm text-gray-400">Next auto-analysis:</span>
                        <CountdownTimer
                          timeRemaining={Number(analysisStatus.timeRemaining)}
                          onRefresh={loadAnalysisStatus}
                        />
                      </div>
                    )}
                    
                    <button
                      onClick={runManualAnalysis}
                      disabled={analyzing || analysisStatus.manualRemaining <= 0 || analysisStatus.selectedCount === 0}
                      className="flex items-center space-x-2 px-6 py-3 bg-purple-600 rounded-lg text-white font-semibold hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Zap className={`w-5 h-5 ${analyzing ? 'animate-pulse' : ''}`} />
                      <span>
                        {analyzing ? 'Analyzing...' :
                         analysisStatus.manualRemaining <= 0 ? 'Daily Limit Reached' :
                         'Analyze Selected Now'}
                      </span>
                    </button>
                    
                    <button
                      onClick={syncProducts}
                      disabled={loading || !shopifyConnected}
                      className="flex items-center space-x-2 px-4 py-2 bg-slate-700 rounded-lg text-white hover:bg-slate-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                      <span>Sync Products</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Products Grid */}
              <div className="bg-gradient-to-br from-slate-800/80 to-slate-800/40 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6 shadow-2xl mb-8">
                {products.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="inline-block p-6 bg-slate-700/30 rounded-2xl mb-4">
                      <Package className="w-16 h-16 text-gray-500" />
                    </div>
                    <p className="text-gray-300 text-lg font-semibold mb-2">No products yet</p>
                    <p className="text-gray-500 mb-6">
                      {shopifyConnected ? 'Click "Sync" to import products from your Shopify store' : 'Connect your Shopify store to get started'}
                    </p>
                    {shopifyConnected && (
                      <button onClick={syncProducts} disabled={loading} className="px-6 py-3 bg-slate-700 text-white rounded-lg font-semibold hover:bg-slate-600 transition">
                        Sync from Shopify
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {products.map((product) => {
                      const costPrice = parseFloat(product.cost_price) || 0;
                      const sellingPrice = parseFloat(product.price);
                      const margin = costPrice > 0 ? (((sellingPrice - costPrice) / sellingPrice) * 100).toFixed(1) : 0;
                      const salesVelocity = parseFloat(product.sales_velocity) || 0;
                      const isSelected = product.selected_for_analysis || false;
                      
                      return (
                        <div key={product.id} className="p-5 bg-slate-900/50 rounded-lg border border-slate-700/50 hover:border-slate-600 transition">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-start space-x-3">
                              <label className="flex items-center cursor-pointer mt-1">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleProductSelection(product.id, isSelected)}
                                  disabled={!isSelected && analysisStatus.selectedCount >= analysisStatus.limit}
                                  className="w-5 h-5 rounded border-2 border-slate-600 bg-slate-800 checked:bg-purple-600 checked:border-purple-600 focus:ring-2 focus:ring-purple-500/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                />
                              </label>
                              <div className="flex-1">
                                <p className="text-white font-semibold text-lg mb-1">{product.title}</p>
                                <p className="text-gray-400 text-sm">
                                  Stock: {product.inventory} units
                                  {salesVelocity > 0 && (
                                    <span className="ml-2">• <span className="text-green-400">{salesVelocity.toFixed(2)} sales/day</span></span>
                                  )}
                                </p>
                                {product.total_sales_30d > 0 && (
                                  <p className="text-gray-500 text-xs mt-1">
                                    📊 {product.total_sales_30d} units sold (30d) • ${parseFloat(product.revenue_30d || 0).toFixed(2)} revenue
                                  </p>
                                )}
                                {product.last_analyzed_at && (
                                  <p className="text-purple-400 text-xs mt-1">
                                    ⚡ Last analyzed: {new Date(product.last_analyzed_at).toLocaleString()}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="text-right ml-4">
                              <p className="text-white font-bold text-xl">${sellingPrice.toFixed(2)}</p>
                              {costPrice > 0 && (
                                <p className={`text-sm font-semibold ${margin > 30 ? 'text-green-400' : margin > 15 ? 'text-yellow-400' : 'text-red-400'}`}>
                                  {margin}% margin
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center justify-between pt-3 border-t border-slate-700/50">
                            <div className="flex items-center space-x-3">
                              {costPrice > 0 ? (
                                <div className="text-sm">
                                  <span className="text-gray-400">Cost: </span>
                                  <span className="text-white font-semibold">${costPrice.toFixed(2)}</span>
                                  <span className="text-gray-500 ml-2">(${(sellingPrice - costPrice).toFixed(2)} profit/unit)</span>
                                </div>
                              ) : (
                                <div className="flex items-center space-x-2 px-3 py-1 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                                  <AlertCircle className="w-4 h-4 text-yellow-400" />
                                  <span className="text-yellow-400 text-xs font-medium">No cost price set - AI can't analyze</span>
                                </div>
                              )}
                            </div>
                            <button
                              onClick={() => {
                                setSelectedProduct(product);
                                setShowCostPriceModal(true);
                              }}
                              className="px-4 py-2 bg-purple-600/20 border border-purple-600/30 text-purple-300 rounded-lg text-sm font-semibold hover:bg-purple-600/30 transition"
                            >
                              {costPrice > 0 ? 'Update Cost' : '⚠️ Set Cost Price'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Product Selection Help */}
              {products.length > 0 && (
                <div className="mb-8 p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="w-5 h-5 text-purple-400 mt-0.5" />
                    <div className="text-sm text-purple-300">
                      <p className="font-semibold mb-1">💡 How Analysis Works:</p>
                      <ul className="list-disc list-inside space-y-1 text-purple-300/80">
                        <li>Select up to {analysisStatus.limit} products for AI analysis (Pro plan)</li>
                        <li>Analysis runs <strong>automatically every 30 minutes</strong> on selected products</li>
                        <li>You can run <strong>10 manual analyses per day</strong> anytime you want</li>
                        <li>Manual analysis limit resets at midnight</li>
                        <li>Make sure to set cost prices before selecting products</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Recommendations Section */}
              {recommendations.length > 0 && (
                <div>
                  <h3 className="text-2xl font-bold text-white mb-4">AI Recommendations</h3>
                  <div className="space-y-4">
                    {recommendations.map((rec) => (
                      <div key={rec.id} className="p-6 bg-gradient-to-br from-purple-600/20 to-pink-600/20 border border-purple-500/30 rounded-xl">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h4 className="text-xl font-bold text-white mb-2">{rec.title}</h4>
                            <p className="text-gray-300 text-sm leading-relaxed">{rec.reasoning}</p>
                          </div>
                          <div className="text-right ml-6">
                            <p className="text-gray-400 text-sm mb-1">Current Price</p>
                            <p className="text-white font-bold text-2xl mb-3">${parseFloat(rec.current_price).toFixed(2)}</p>
                            <p className="text-gray-400 text-sm mb-1">Recommended Price</p>
                            <p className="text-green-400 font-bold text-3xl">${parseFloat(rec.recommended_price).toFixed(2)}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-4 border-t border-purple-500/30">
                          <div className="flex items-center space-x-4">
                            <div className="px-3 py-1 bg-slate-900/50 rounded-lg">
                              <span className="text-gray-400 text-xs">Urgency: </span>
                              <span className={`font-semibold text-sm ${
                                rec.urgency === 'CRITICAL' ? 'text-red-400' :
                                rec.urgency === 'URGENT' ? 'text-orange-400' :
                                rec.urgency === 'HIGH' ? 'text-yellow-400' : 'text-green-400'
                              }`}>{rec.urgency}</span>
                            </div>
                            <div className="px-3 py-1 bg-slate-900/50 rounded-lg">
                              <span className="text-gray-400 text-xs">Confidence: </span>
                              <span className="text-white font-semibold text-sm">{rec.confidence}%</span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <button
                              onClick={() => applyRecommendation(rec.id, rec.product_id, parseFloat(rec.recommended_price))}
                              className="px-6 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition flex items-center space-x-2"
                            >
                              <Check className="w-4 h-4" />
                              <span>Apply Price</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === 'orders' && (
            <>
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-white mb-2">Recent Orders</h2>
                <p className="text-gray-400">Last 30 days from your Shopify store</p>
              </div>
              <div className="bg-gradient-to-br from-slate-800/80 to-slate-800/40 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6 shadow-2xl">
                {!shopifyConnected ? (
                  <div className="text-center py-16">
                    <div className="inline-block p-6 bg-yellow-500/10 rounded-2xl mb-4">
                      <WifiOff className="w-16 h-16 text-yellow-400" />
                    </div>
                    <p className="text-gray-300 text-lg font-semibold mb-2">Connect Shopify to View Orders</p>
                    <p className="text-gray-500 mb-6">Connect your Shopify store to see your recent orders and sales data</p>
                    <button onClick={() => setShowSettings(true)} className="px-6 py-3 bg-yellow-600 text-white rounded-lg font-semibold hover:bg-yellow-700 transition">
                      Connect Shopify
                    </button>
                  </div>
                ) : orders.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="inline-block p-6 bg-slate-700/30 rounded-2xl mb-4">
                      <ShoppingCart className="w-16 h-16 text-gray-500" />
                    </div>
                    <p className="text-gray-300 text-lg font-semibold mb-2">No orders yet</p>
                    <p className="text-gray-500 mb-6">No orders found in the last 30 days</p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center space-x-4">
                        <div className="bg-green-500/20 border border-green-500/30 rounded-lg px-4 py-2">
                          <p className="text-xs text-green-300 mb-1">Total Orders</p>
                          <p className="text-2xl font-bold text-green-400">{orders.length}</p>
                        </div>
                        <div className="bg-purple-500/20 border border-purple-500/30 rounded-lg px-4 py-2">
                          <p className="text-xs text-purple-300 mb-1">Total Revenue</p>
                          <p className="text-2xl font-bold text-purple-400">
                            ${orders.reduce((sum, o) => sum + parseFloat(o.totalPrice), 0).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {orders.map((order) => (
                        <div key={order.id} className="p-5 bg-slate-900/50 rounded-lg border border-slate-700/50">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <p className="text-white font-semibold text-lg mb-1">Order #{order.orderNumber}</p>
                              <p className="text-gray-400 text-sm">{order.customerName} • {order.email}</p>
                              <p className="text-gray-500 text-xs mt-1">
                                {new Date(order.createdAt).toLocaleDateString()} at {new Date(order.createdAt).toLocaleTimeString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-white font-bold text-xl">${parseFloat(order.totalPrice).toFixed(2)}</p>
                              <p className="text-gray-400 text-sm mt-1">{order.lineItemsCount} items</p>
                            </div>
                          </div>
                          <div className="pt-3 border-t border-slate-700/50">
                            <div className="space-y-2">
                              {order.items.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between text-sm">
                                  <span className="text-gray-300">{item.title} × {item.quantity}</span>
                                  <span className="text-white font-semibold">${(parseFloat(item.price) * item.quantity).toFixed(2)}</span>
                                </div>
                              ))}
                            </div>
                            <div className="flex items-center space-x-2 mt-3">
                              <div className={`px-2 py-1 rounded text-xs font-semibold ${
                                order.financialStatus === 'paid' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                              }`}>
                                {order.financialStatus}
                              </div>
                              <div className={`px-2 py-1 rounded text-xs font-semibold ${
                                order.fulfillmentStatus === 'fulfilled' ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-500/20 text-gray-400'
                              }`}>
                                {order.fulfillmentStatus || 'unfulfilled'}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  const LandingView = () => {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col items-center justify-center p-4">
        <div className="text-center max-w-4xl">
          <div className="inline-block p-6 bg-purple-600/20 rounded-3xl mb-8">
            <Zap className="w-20 h-20 text-purple-400" />
          </div>
          <h1 className="text-6xl font-bold text-white mb-6">
            AutoMerchant <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">Pricing AI</span>
          </h1>
          <p className="text-2xl text-gray-300 mb-12">AI-powered pricing optimization for your Shopify store</p>
          <div className="flex items-center justify-center space-x-4">
            <button
              onClick={() => setView('auth')}
              className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-bold text-lg hover:from-purple-700 hover:to-pink-700 transition"
            >
              Get Started
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {view === 'landing' && <LandingView />}
      {view === 'auth' && <AuthView />}
      {view === 'dashboard' && <DashboardView />}
    </>
  );
}

export default App;
