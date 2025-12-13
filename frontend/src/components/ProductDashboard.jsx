import { useState, useEffect } from 'react';
import { Zap, Check, RefreshCw, TrendingUp, Package, DollarSign, AlertCircle, LogOut, Settings, X, Wifi, WifiOff, BarChart3, Activity, ShoppingCart, Calendar, Clock, TrendingDown } from 'lucide-react';

// API URL - automatically uses production URL when deployed
const API_URL = process.env.REACT_APP_API_URL || '';

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
              <span className={`font-bold text-lg ${profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                ${profit}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Profit Margin:</span>
              <span className={`font-semibold ${margin >= 20 ? 'text-green-400' : margin >= 10 ? 'text-yellow-400' : 'text-red-400'}`}>
                {margin}%
              </span>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-700 text-white font-semibold rounded-lg transition"
          >
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

  const handleConnect = async () => {
    if (!formData.shop || !formData.accessToken) {
      setError('Please fill in all fields');
      return;
    }

    setConnecting(true);
    setError(null);
    try {
      await api.call('/api/shopify/connect', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      onConnect();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setConnecting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-2xl border border-slate-700 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div className="flex items-center space-x-3">
            <Settings className="w-6 h-6 text-purple-400" />
            <h2 className="text-2xl font-bold text-white">Shopify Connection</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-lg transition">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        <div className="p-6 space-y-6">
          {shopifyConnected ? (
            <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
              <div className="flex items-center space-x-3">
                <Check className="w-6 h-6 text-green-400" />
                <div>
                  <h3 className="text-green-300 font-semibold">Connected Successfully!</h3>
                  <p className="text-green-200/80 text-sm">Your Shopify store is synced and ready.</p>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <h3 className="text-blue-300 font-semibold mb-2">How to get your credentials:</h3>
                <ol className="text-sm text-blue-200 space-y-2">
                  <li>1. Go to your Shopify Admin → Settings → Apps and sales channels</li>
                  <li>2. Click "Develop apps" → Create an app</li>
                  <li>3. Configure Admin API scopes (read_products, write_products, read_orders)</li>
                  <li>4. Install the app and copy your access token</li>
                </ol>
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-white font-medium mb-2">Shop Domain</label>
                  <input
                    type="text"
                    value={formData.shop}
                    onChange={(e) => setFormData({ ...formData, shop: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition"
                    placeholder="your-store.myshopify.com"
                  />
                </div>
                <div>
                  <label className="block text-white font-medium mb-2">Access Token</label>
                  <input
                    type="password"
                    value={formData.accessToken}
                    onChange={(e) => setFormData({ ...formData, accessToken: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition"
                    placeholder="shpat_xxxxxxxxxxxxx"
                  />
                </div>
              </div>

              <button
                onClick={handleConnect}
                disabled={connecting}
                className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-700 text-white font-semibold rounded-lg transition"
              >
                {connecting ? 'Connecting...' : 'Connect Shopify'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function CountdownTimer({ timeRemaining, onRefresh }) {
  const [time, setTime] = useState(timeRemaining);

  useEffect(() => {
    setTime(timeRemaining);
  }, [timeRemaining]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTime((prev) => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []); // Remove onRefresh dependency to prevent recreation

  // Separate effect for calling onRefresh when time hits 0
  useEffect(() => {
    if (time === 0 && timeRemaining > 0) {
      onRefresh();
    }
  }, [time, timeRemaining, onRefresh]);

  const minutes = Math.floor(time / 60);
  const seconds = time % 60;

  return (
    <div className="flex items-center space-x-2">
      <Clock className="w-4 h-4 text-purple-400" />
      <span className="text-white font-mono font-semibold">
        {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
      </span>
    </div>
  );
}

function ProductDashboard({ userEmail, onLogout }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [products, setProducts] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState(null);
  const [shopifyConnected, setShopifyConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showCostPriceModal, setShowCostPriceModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [analysisStatus, setAnalysisStatus] = useState({ analyzing: false, timeRemaining: 1800, manualUsed: 0, manualRemaining: 10 }); // 30 minutes in seconds
  const [showAnalysisResults, setShowAnalysisResults] = useState(false);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [lastAutoAnalysis, setLastAutoAnalysis] = useState(() => {
    const saved = localStorage.getItem('lastAutoAnalysis');
    return saved ? parseInt(saved) : Date.now();
  });
  const [assignedApp, setAssignedApp] = useState(null);
  const [hasTriedAutoConnect, setHasTriedAutoConnect] = useState(() => {
    // Check localStorage to prevent infinite redirects
    const tried = localStorage.getItem('hasTriedAutoConnect');
    return tried === 'true';
  });
  const [connectionCheckComplete, setConnectionCheckComplete] = useState(false);
  const [showNewRecommendationsAlert, setShowNewRecommendationsAlert] = useState(false);
  const [newRecommendationsCount, setNewRecommendationsCount] = useState(0);

  useEffect(() => {
    initializeDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initializeDashboard = async () => {
    // Run these in parallel for faster loading
    await Promise.all([
      checkShopifyConnection(),
      checkAssignedApp()
    ]);

    // Mark connection check as complete
    setConnectionCheckComplete(true);

    // Load dashboard data (non-blocking)
    loadDashboardData();
    loadAnalysisStatus();
  };

  const checkShopifyConnection = async () => {
    try {
      console.log('🔍 Checking Shopify connection status...');
      const data = await api.call('/api/shopify/status');
      console.log('📊 Shopify connection result:', data);
      setShopifyConnected(data.connected);

      if (data.connected) {
        console.log(`✅ Shopify connected: ${data.shop}`);
        // Clear the auto-connect flag when successfully connected
        localStorage.removeItem('hasTriedAutoConnect');
      } else {
        console.log('⚠️ Shopify not connected');
      }

      return data.connected;
    } catch (err) {
      console.error('❌ Failed to check Shopify connection:', err);
      return false;
    }
  };

  const checkAssignedApp = async () => {
    try {
      console.log('🔍 Checking for assigned Shopify app...');
      const data = await api.call('/api/user/assigned-app');
      setAssignedApp(data.app);

      if (data.app) {
        console.log('✅ User has assigned app:', data.app.app_name);
      } else {
        console.log('⚠️ No app assigned to user');
      }

      return data.app;
    } catch (err) {
      console.error('❌ Failed to check assigned app:', err);
      return null;
    }
  };

  // Auto-redirect to OAuth ONLY ONCE if user has assigned app but no Shopify connection
  useEffect(() => {
    // Only attempt redirect after connection check is complete
    if (!connectionCheckComplete) {
      return;
    }

    // Check if we should auto-redirect
    const shouldAutoRedirect = !hasTriedAutoConnect && assignedApp && !shopifyConnected;

    if (shouldAutoRedirect) {
      console.log('🚀 Auto-redirecting to OAuth install for assigned app:', assignedApp);
      console.log(`   App: ${assignedApp.app_name}`);
      console.log(`   Shop: ${assignedApp.shop_domain}`);

      setHasTriedAutoConnect(true);
      // Persist to localStorage to prevent infinite redirects
      localStorage.setItem('hasTriedAutoConnect', 'true');

      // Small delay to ensure state is saved before redirect
      setTimeout(() => {
        const installUrl = `${API_URL}/api/shopify/install?shop=${assignedApp.shop_domain}&app_id=${assignedApp.id}&user_email=${encodeURIComponent(userEmail)}`;
        console.log(`   Redirecting to: ${installUrl}`);
        window.location.href = installUrl;
      }, 500);
    } else if (connectionCheckComplete) {
      console.log('ℹ️ Skipping auto-redirect:', {
        connectionCheckComplete,
        hasTriedAutoConnect,
        hasAssignedApp: !!assignedApp,
        shopifyConnected
      });
    }
  }, [connectionCheckComplete, assignedApp, shopifyConnected, hasTriedAutoConnect, userEmail]);

  // Countdown timer for auto-analysis
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.floor((now - lastAutoAnalysis) / 1000); // seconds since last analysis
      const remaining = Math.max(1800 - elapsed, 0); // 30 minutes = 1800 seconds

      setAnalysisStatus(prev => ({ ...prev, timeRemaining: remaining }));

      // Auto-analysis every 30 minutes
      if (remaining === 0 && shopifyConnected && !analysisStatus.analyzing) {
        const newTime = Date.now();
        setLastAutoAnalysis(newTime);
        localStorage.setItem('lastAutoAnalysis', newTime.toString());
        setAnalysisStatus(prev => ({ ...prev, analyzing: false, timeRemaining: 1800 }));

        // Auto-analysis runs every 30 minutes (manual limits are tracked separately on backend with 24hr rolling window)
      }
    }, 1000); // Update every second

    return () => clearInterval(interval);
  }, [lastAutoAnalysis, shopifyConnected, analysisStatus.analyzing]);

  const loadAnalysisStatus = async () => {
    try {
      console.log('🔍 Loading analysis status from API...');
      // Add cache-busting query parameter to prevent stale data
      const cacheBuster = Date.now();
      const data = await api.call(`/api/analysis/status?_=${cacheBuster}`);
      console.log('📊 API Response:', data);
      console.log('   manualUsedToday:', data.manualUsedToday);
      console.log('   manualRemaining:', data.manualRemaining);

      const newStatus = {
        analyzing: data.analyzing || false,
        timeRemaining: data.timeRemaining || 0,
        manualUsed: data.manualUsedToday || 0,
        manualRemaining: data.manualRemaining || 10
      };

      console.log('✅ Setting analysis status to:', newStatus);
      setAnalysisStatus(newStatus);
    } catch (err) {
      console.error('❌ Failed to load analysis status:', err);
    }
  };

  const loadDashboardData = async (forceSync = false) => {
    setLoading(true);
    setError(null);
    try {
      // Use Promise.allSettled to handle partial failures gracefully
      const results = await Promise.allSettled([
        api.call('/api/products'),
        api.call('/api/recommendations'),
        api.call('/api/orders'),
        api.call('/api/stats')
      ]);

      // Extract data with fallbacks for failed requests
      const productsData = results[0].status === 'fulfilled' ? results[0].value : { products: [] };
      const recsData = results[1].status === 'fulfilled' ? results[1].value : { recommendations: [] };
      const ordersData = results[2].status === 'fulfilled' ? results[2].value : { orders: [] };
      const statsData = results[3].status === 'fulfilled' ? results[3].value : { revenue: '0.00', orders: 0, products: 0, averageOrderValue: '0.00', profitIncrease: 0 };

      setProducts(productsData.products || []);
      setRecommendations(recsData.recommendations || []);
      setOrders(ordersData.orders || []);
      setStats(statsData);

      // Check for new recommendations since last visit
      const lastViewed = localStorage.getItem('lastViewedRecommendations');
      const newRecs = recsData.recommendations || [];
      if (lastViewed && newRecs.length > 0) {
        // Filter recommendations created after last viewed time
        const lastViewedTime = parseInt(lastViewed);
        const newOnes = newRecs.filter(rec => {
          const recTime = new Date(rec.created_at).getTime();
          return recTime > lastViewedTime;
        });

        if (newOnes.length > 0) {
          setNewRecommendationsCount(newOnes.length);
          setShowNewRecommendationsAlert(true);
        }
      }

      // CRITICAL: Auto-sync products on first dashboard load to get fresh sales data
      // This ensures pagination fix fetches ALL orders, not just cached data
      const hasAutoSyncedThisSession = sessionStorage.getItem('hasAutoSynced');
      if (!hasAutoSyncedThisSession && shopifyConnected && !forceSync) {
        console.log('🔄 Auto-syncing products on dashboard load to fetch latest sales data...');
        try {
          sessionStorage.setItem('hasAutoSynced', 'true');
          await api.call('/api/products/sync', { method: 'POST' });
          console.log('✅ Products auto-synced successfully, reloading dashboard...');
          // Reload after sync to show fresh data
          setTimeout(() => loadDashboardData(true), 2000);
        } catch (syncErr) {
          console.error('❌ Auto-sync failed:', syncErr);
          // Continue loading with cached data
        }
      } else if ((productsData.products || []).length === 0 && shopifyConnected && !forceSync) {
        // Fallback: If no products at all, still try to sync
        console.log('📦 No products found, triggering sync...');
        try {
          await api.call('/api/products/sync', { method: 'POST' });
          console.log('✅ Products synced, reloading...');
          setTimeout(() => loadDashboardData(true), 2000);
        } catch (syncErr) {
          console.error('Sync failed:', syncErr);
        }
      }

      // Log any failures for debugging
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          const endpoints = ['/api/products', '/api/recommendations', '/api/orders', '/api/stats'];
          console.warn(`Failed to load ${endpoints[index]}:`, result.reason);
        }
      });
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const applyRecommendation = async (recId, productId, newPrice) => {
    try {
      await api.call(`/api/recommendations/${recId}/apply`, {
        method: 'POST',
        body: JSON.stringify({ productId, newPrice })
      });

      // Optimistic update - remove recommendation immediately
      setRecommendations(prev => prev.filter(r => r.id !== recId));

      // Update product price in local state
      setProducts(prev => prev.map(p =>
        p.id === productId ? { ...p, price: newPrice } : p
      ));

      setSuccessMessage('✅ Price updated successfully on Shopify!');
      setTimeout(() => setSuccessMessage(null), 3000);

      // Only reload stats in background, not full dashboard
      api.call('/api/stats').then(data => setStats(data)).catch(err => {
        console.warn('Failed to reload stats:', err);
      });
    } catch (err) {
      setError(err.message);
      // Reload on error to ensure consistency
      loadDashboardData();
    }
  };

  const rejectRecommendation = async (recId, productId) => {
    try {
      await api.call(`/api/recommendations/${recId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ productId })
      });
      loadDashboardData();
    } catch (err) {
      setError(err.message);
    }
  };

  const runAnalysis = async () => {
    // Check if any products have cost price set (frontend validation)
    const productsWithCost = products.filter(p => p.cost_price > 0);
    if (productsWithCost.length === 0) {
      setError('⚠️ Please set cost price for at least one product before running analysis. Click "Set Cost Price" on a product.');
      setTimeout(() => setError(null), 5000);
      return;
    }

    try {
      setAnalysisStatus({ ...analysisStatus, analyzing: true });
      const result = await api.call('/api/analyze', { method: 'POST' });

      // Update analysis status with backend response
      setAnalysisStatus({
        ...analysisStatus,
        analyzing: false,
        manualUsed: result.manualUsed || 0,
        manualRemaining: result.manualRemaining || 10
      });

      // Show results modal
      setAnalysisResults(result);
      setShowAnalysisResults(true);

      // Reload data to show new recommendations
      loadDashboardData();
      // Reload analysis status to get updated counts
      loadAnalysisStatus();
    } catch (err) {
      const errorMessage = err.message || 'Failed to run analysis';
      setError(errorMessage);
      setAnalysisStatus({ ...analysisStatus, analyzing: false });
      setTimeout(() => setError(null), 8000);
    }
  };

  const calculateAIProfit = () => {
    if (!stats) return '0.00';
    return parseFloat(stats.profitIncrease || 0).toFixed(2);
  };

  const handleLogout = async () => {
    localStorage.removeItem('authToken');
    onLogout();
  };

  const dismissNewRecommendationsAlert = () => {
    setShowNewRecommendationsAlert(false);
    setNewRecommendationsCount(0);
    // Update last viewed time to now
    localStorage.setItem('lastViewedRecommendations', Date.now().toString());
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

      {/* Analysis Results Bottom Notification */}
      {showAnalysisResults && analysisResults && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md animate-slide-up">
          <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <div className="flex items-center space-x-3">
                <BarChart3 className="w-5 h-5 text-purple-400" />
                <h3 className="font-bold text-white">AI Analysis Complete</h3>
              </div>
              <button
                onClick={() => setShowAnalysisResults(false)}
                className="p-1 hover:bg-slate-700 rounded transition"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            <div className="p-4">
              {analysisResults.recommendations && analysisResults.recommendations.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-green-400 font-semibold flex items-center space-x-2">
                    <Check className="w-4 h-4" />
                    <span>Found {analysisResults.recommendations.length} price optimization{analysisResults.recommendations.length > 1 ? 's' : ''}!</span>
                  </p>
                  <p className="text-sm text-gray-400">
                    Scroll down to see recommendations below
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-green-400 font-semibold flex items-center space-x-2">
                    <Check className="w-4 h-4" />
                    <span>All Prices Optimized!</span>
                  </p>
                  <p className="text-sm text-gray-400">
                    No changes recommended at this time
                  </p>
                </div>
              )}
              <p className="text-xs text-gray-500 mt-2">
                Manual analyses: {analysisStatus.manualUsed || 0}/10 (resets after 24hrs)
              </p>
            </div>
          </div>
        </div>
      )}

      <SettingsModal
        isOpen={showSettings}
        onClose={() => {
          setShowSettings(false);
          checkShopifyConnection();
          loadDashboardData();
        }}
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

            {activeTab === 'dashboard' && analysisStatus.timeRemaining && Number(analysisStatus.timeRemaining) > 0 && (
              <div className="flex items-center space-x-3 px-4 py-2 bg-slate-800/50 border border-purple-500/30 rounded-lg">
                <span className="text-sm text-gray-400">Next Analysis:</span>
                <CountdownTimer
                  timeRemaining={Number(analysisStatus.timeRemaining)}
                  onRefresh={loadAnalysisStatus}
                />
              </div>
            )}

            <div className="flex items-center space-x-4">
              <div className="text-right mr-2">
                <p className="text-xs text-gray-400">Logged in as</p>
                <p className="text-sm text-white font-medium">{userEmail}</p>
              </div>
              {shopifyConnected ? (
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
        {/* New Recommendations Alert */}
        {showNewRecommendationsAlert && (
          <div className="mb-6 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/40 rounded-xl p-4 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-500 rounded-lg">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg">
                    {newRecommendationsCount} New Price Recommendation{newRecommendationsCount !== 1 ? 's' : ''} Available!
                  </h3>
                  <p className="text-purple-200 text-sm">
                    AI has analyzed your products while you were away. Check the recommendations below.
                  </p>
                </div>
              </div>
              <button
                onClick={dismissNewRecommendationsAlert}
                className="p-2 hover:bg-purple-500/20 rounded-lg transition"
              >
                <X className="w-5 h-5 text-purple-300" />
              </button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center space-x-4 mb-8">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-6 py-3 rounded-lg font-semibold transition ${
              activeTab === 'dashboard'
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
          <button
            onClick={() => setActiveTab('roi')}
            className={`px-6 py-3 rounded-lg font-semibold transition ${
              activeTab === 'roi'
                ? 'bg-purple-600 text-white'
                : 'bg-slate-800/50 text-gray-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <div className="flex items-center space-x-2">
              <DollarSign className="w-5 h-5" />
              <span>ROI Calculator</span>
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
        {!shopifyConnected && activeTab === 'dashboard' && (
          <div className="mb-8 p-6 bg-blue-500/10 border border-blue-500/30 rounded-xl flex items-start space-x-4">
            <WifiOff className="w-6 h-6 text-blue-400 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="text-blue-300 font-semibold mb-1">Connecting to Shopify...</h3>
              <p className="text-blue-200/80 text-sm">Your admin has assigned you a Shopify app. Connecting automatically...</p>
              <div className="mt-3 flex items-center space-x-2">
                <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />
                <span className="text-blue-300 text-sm">Redirecting to Shopify authorization...</span>
              </div>
            </div>
          </div>
        )}

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <>
            {/* Stats Grid */}
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-gradient-to-br from-blue-600/20 to-blue-600/5 border border-blue-500/30 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-2">
                    <Package className="w-8 h-8 text-blue-400" />
                  </div>
                  <p className="text-blue-300 text-sm font-medium mb-1">Total Products</p>
                  <p className="text-white text-3xl font-bold">{products.length}</p>
                </div>
                <div className="bg-gradient-to-br from-green-600/20 to-green-600/5 border border-green-500/30 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-2">
                    <DollarSign className="w-8 h-8 text-green-400" />
                  </div>
                  <p className="text-green-300 text-sm font-medium mb-1">Revenue (30d)</p>
                  <p className="text-white text-3xl font-bold">${parseFloat(stats.revenue || stats.totalRevenue || 0).toFixed(2)}</p>
                </div>
                <div className="bg-gradient-to-br from-purple-600/20 to-purple-600/5 border border-purple-500/30 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-2">
                    <ShoppingCart className="w-8 h-8 text-purple-400" />
                  </div>
                  <p className="text-purple-300 text-sm font-medium mb-1">Total Orders</p>
                  <p className="text-white text-3xl font-bold">{stats.orders || stats.totalOrders || 0}</p>
                </div>
                <div className="bg-gradient-to-br from-pink-600/20 to-pink-600/5 border border-pink-500/30 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-2">
                    <TrendingUp className="w-8 h-8 text-pink-400" />
                  </div>
                  <p className="text-pink-300 text-sm font-medium mb-1">AI Profit Increase</p>
                  <p className="text-white text-3xl font-bold">${calculateAIProfit()}</p>
                </div>
              </div>
            )}

            {/* Analysis Status & Button */}
            <div className="mb-8 space-y-4">
              {/* Countdown Timer & Manual Resets Counter */}
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <Clock className="w-5 h-5 text-blue-400" />
                    <div>
                      <p className="text-gray-400 text-sm">Next Auto-Analysis</p>
                      <p className="text-white text-xl font-bold">
                        {Math.floor(analysisStatus.timeRemaining / 60)}:{(analysisStatus.timeRemaining % 60).toString().padStart(2, '0')}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex-1 bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <Activity className="w-5 h-5 text-purple-400" />
                    <div>
                      <p className="text-gray-400 text-sm">Manual Analyses (24hr)</p>
                      <p className="text-white text-xl font-bold">
                        {analysisStatus.manualUsed || 0}/10
                        {(analysisStatus.manualRemaining || 10) === 0 && <span className="text-red-400 text-sm ml-2">(Limit Reached)</span>}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Sync Products Button - ALWAYS VISIBLE */}
                <button
                  onClick={async () => {
                    try {
                      setLoading(true);
                      setError(null);
                      await api.call('/api/products/sync', { method: 'POST' });
                      await loadDashboardData();
                      // Success - data reloaded
                    } catch (err) {
                      setError('Failed to sync products: ' + (err.message || 'Unknown error'));
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading || !shopifyConnected}
                  className="flex items-center justify-center space-x-3 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition shadow-lg shadow-green-500/20"
                >
                  <RefreshCw className="w-5 h-5" />
                  <span>Sync Products from Shopify</span>
                </button>

                {/* Analysis Button */}
                <button
                  onClick={runAnalysis}
                  disabled={analysisStatus.analyzing || !shopifyConnected || (analysisStatus.manualRemaining || 10) === 0}
                  className="flex items-center justify-center space-x-3 px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition shadow-lg shadow-purple-500/20"
                >
                  {analysisStatus.analyzing ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      <span>Analyzing Products...</span>
                    </>
                  ) : (
                    <>
                      <BarChart3 className="w-5 h-5" />
                      <span>Run AI Analysis Now</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Products List Section */}
            <div className="mb-8">
              <h3 className="text-2xl font-bold text-white mb-4">Your Products</h3>
              {products.length === 0 ? (
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8 text-center">
                  <Package className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <h4 className="text-xl font-bold text-white mb-2">No Products Yet</h4>
                  <p className="text-gray-400 mb-4">Sync your products from Shopify to get started</p>
                  <button
                    onClick={async () => {
                      try {
                        await api.call('/api/products/sync', { method: 'POST' });
                        loadDashboardData();
                      } catch (err) {
                        setError('Failed to sync products');
                      }
                    }}
                    className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition"
                  >
                    <RefreshCw className="w-5 h-5 inline-block mr-2" />
                    Sync Products
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {products.map((product) => (
                    <div key={product.id} className="bg-gradient-to-br from-slate-800/80 to-slate-800/40 border border-slate-700 rounded-xl p-6 hover:border-purple-500/50 transition">
                      <div className="mb-4">
                        {product.image_url ? (
                          <img src={product.image_url} alt={product.title} className="w-full h-48 object-cover rounded-lg mb-4" />
                        ) : (
                          <div className="w-full h-48 bg-slate-700/50 rounded-lg mb-4 flex items-center justify-center">
                            <Package className="w-16 h-16 text-gray-600" />
                          </div>
                        )}
                        <h4 className="text-lg font-bold text-white mb-2">{product.title}</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-400 text-sm">Price:</span>
                            <span className="text-white font-semibold">${parseFloat(product.price).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-400 text-sm">Cost:</span>
                            <span className={`font-semibold ${product.cost_price > 0 ? 'text-green-400' : 'text-yellow-400'}`}>
                              {product.cost_price > 0 ? `$${parseFloat(product.cost_price).toFixed(2)}` : 'Not set'}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-400 text-sm">Inventory:</span>
                            <span className="text-white font-semibold">{product.inventory}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-400 text-sm">Sales (30d):</span>
                            <span className="text-white font-semibold">{product.total_sales_30d || 0}</span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedProduct(product);
                          setShowCostPriceModal(true);
                        }}
                        className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition flex items-center justify-center space-x-2"
                      >
                        <DollarSign className="w-4 h-4" />
                        <span>Set Cost Price</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recommendations Section */}
            {recommendations.length > 0 ? (
              <div>
                <h3 className="text-2xl font-bold text-white mb-4">AI Recommendations</h3>
                <div className="space-y-4">
                  {recommendations.map((rec) => (
                    <div key={rec.id} className="p-6 bg-gradient-to-br from-purple-600/20 to-pink-600/20 border border-purple-500/30 rounded-xl relative">
                      <button
                        onClick={() => rejectRecommendation(rec.id, rec.product_id)}
                        className="absolute top-4 right-4 p-2 hover:bg-slate-700/50 rounded-lg transition"
                        title="Dismiss recommendation"
                      >
                        <X className="w-5 h-5 text-gray-400 hover:text-white" />
                      </button>
                      <div className="flex items-start justify-between mb-4 pr-12">
                        <div className="flex-1">
                          <h4 className="text-xl font-bold text-white mb-2">{rec.title}</h4>
                          <p className="text-gray-300 text-sm leading-relaxed">{rec.reasoning}</p>
                        </div>
                        <div className="text-right ml-6">
                          <p className="text-gray-400 text-sm mb-1">Current Price</p>
                          <p className="text-white font-bold text-2xl mb-3">${parseFloat(rec.current_price).toFixed(2)}</p>
                          <p className="text-gray-400 text-sm mb-1">Recommended Price</p>
                          <p className={`font-bold text-3xl ${
                            parseFloat(rec.recommended_price) > parseFloat(rec.current_price) ? 'text-green-400' : 'text-red-400'
                          }`}>${parseFloat(rec.recommended_price).toFixed(2)}</p>
                          <p className={`text-xs mt-1 font-semibold ${
                            parseFloat(rec.recommended_price) > parseFloat(rec.current_price) ? 'text-green-300' : 'text-red-300'
                          }`}>
                            {parseFloat(rec.recommended_price) > parseFloat(rec.current_price) ? '↑' : '↓'}
                            ${Math.abs(parseFloat(rec.recommended_price) - parseFloat(rec.current_price)).toFixed(2)}
                            ({((Math.abs(parseFloat(rec.recommended_price) - parseFloat(rec.current_price)) / parseFloat(rec.current_price)) * 100).toFixed(1)}%)
                          </p>
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
                            onClick={() => rejectRecommendation(rec.id, rec.product_id)}
                            className="px-6 py-2 bg-slate-700 text-white rounded-lg font-semibold hover:bg-slate-600 transition flex items-center space-x-2"
                          >
                            <X className="w-4 h-4" />
                            <span>Reject</span>
                          </button>
                          <button
                            onClick={() => applyRecommendation(rec.id, rec.product_id, parseFloat(rec.recommended_price))}
                            className="px-6 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition flex items-center space-x-2 shadow-lg shadow-green-500/20"
                          >
                            <Check className="w-4 h-4" />
                            <span>Apply to Shopify</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : products.some(p => p.last_analyzed_at) && (
              <div className="p-6 bg-green-500/10 border border-green-500/30 rounded-xl">
                <div className="flex items-start space-x-3">
                  <Check className="w-6 h-6 text-green-400 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-green-300 font-semibold mb-1">All Prices Optimized!</h3>
                    <p className="text-green-200/80 text-sm">Your selected products are currently at optimal prices. No recommendations at this time.</p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Orders Tab */}
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
                  <h3 className="text-xl font-bold text-white mb-2">Shopify Not Connected</h3>
                  <p className="text-gray-400 mb-6">Connect your store to view order history</p>
                  <button
                    onClick={() => setShowSettings(true)}
                    className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition"
                  >
                    Connect Shopify
                  </button>
                </div>
              ) : loading ? (
                <div className="text-center py-16">
                  <RefreshCw className="w-12 h-12 text-purple-400 animate-spin mx-auto mb-4" />
                  <p className="text-gray-400">Loading orders...</p>
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-16">
                  <ShoppingCart className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-white mb-2">No Orders Yet</h3>
                  <p className="text-gray-400">Orders from the last 30 days will appear here</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-700">
                        <th className="text-left py-3 px-4 text-gray-400 font-semibold">Order #</th>
                        <th className="text-left py-3 px-4 text-gray-400 font-semibold">Customer</th>
                        <th className="text-left py-3 px-4 text-gray-400 font-semibold">Total</th>
                        <th className="text-left py-3 px-4 text-gray-400 font-semibold">Items</th>
                        <th className="text-left py-3 px-4 text-gray-400 font-semibold">Date</th>
                        <th className="text-left py-3 px-4 text-gray-400 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((order) => (
                        <tr key={order.id} className="border-b border-slate-800 hover:bg-slate-700/20 transition">
                          <td className="py-3 px-4 text-white font-medium">#{order.order_number}</td>
                          <td className="py-3 px-4 text-gray-300">{order.customer_name || 'Guest'}</td>
                          <td className="py-3 px-4 text-white font-bold">${parseFloat(order.total_price).toFixed(2)}</td>
                          <td className="py-3 px-4 text-gray-300">{order.line_items_count} items</td>
                          <td className="py-3 px-4 text-gray-400 text-sm">
                            {new Date(order.created_at).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              order.financial_status === 'paid' ? 'bg-green-500/20 text-green-300' :
                              order.financial_status === 'pending' ? 'bg-yellow-500/20 text-yellow-300' :
                              'bg-gray-500/20 text-gray-300'
                            }`}>
                              {order.financial_status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* ROI Calculator Tab */}
        {activeTab === 'roi' && (
          <>
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-white mb-2">ROI Calculator</h2>
              <p className="text-gray-400">Calculate your return on investment from using AutoMerchant's AI pricing</p>
            </div>

            {!shopifyConnected ? (
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-12 text-center">
                <div className="inline-block p-6 bg-yellow-500/10 rounded-2xl mb-4">
                  <WifiOff className="w-16 h-16 text-yellow-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Shopify Not Connected</h3>
                <p className="text-gray-400 mb-6">Connect your store to see accurate ROI projections based on your real data</p>
                <button
                  onClick={() => setShowSettings(true)}
                  className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition"
                >
                  Connect Shopify
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                  {/* Input Section */}
                  <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                    <h3 className="text-xl font-bold text-white mb-6">Your Metrics</h3>
                    <div className="space-y-4">
                      <div>
                        <p className="text-white font-semibold mb-1">Current Monthly Revenue</p>
                        <p className="text-gray-400 text-sm">
                          ${stats ? parseFloat(stats.revenue || 0).toFixed(2) : '0.00'} (from last 30 days)
                        </p>
                      </div>
                      <div>
                        <p className="text-white font-semibold mb-1">Total Products</p>
                        <p className="text-gray-400 text-sm">
                          {stats ? stats.products || products.length : products.length} active products
                        </p>
                      </div>
                      <div>
                        <p className="text-white font-semibold mb-1">Total Orders (30d)</p>
                        <p className="text-gray-400 text-sm">
                          {stats ? stats.orders || 0 : 0} orders
                        </p>
                      </div>
                      <div>
                        <p className="text-white font-semibold mb-1">Average Order Value</p>
                        <p className="text-gray-400 text-sm">
                          ${stats ? parseFloat(stats.averageOrderValue || 0).toFixed(2) : '0.00'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Results Section */}
                  <div className="bg-gradient-to-br from-green-600/20 to-emerald-600/20 border border-green-500/30 rounded-xl p-6">
                    <h3 className="text-xl font-bold text-white mb-6">Projected Impact</h3>
                    <div className="space-y-4">
                      <div>
                        <p className="text-green-200/80 text-sm mb-2">Potential Revenue Increase (5-8%)</p>
                        <p className="text-white text-4xl font-bold">
                          +${stats ? (parseFloat(stats.revenue || 0) * 0.05).toFixed(2) : '0.00'}/mo
                        </p>
                        <p className="text-green-200/60 text-xs mt-1">Based on conservative 5% lift</p>
                      </div>
                      <div className="h-px bg-green-500/30"></div>
                      <div>
                        <p className="text-green-200/80 text-sm mb-2">Actual AI Profit Increase</p>
                        <p className="text-white text-3xl font-bold">
                          ${stats ? parseFloat(stats.profitIncrease || 0).toFixed(2) : '0.00'}/mo
                        </p>
                        <p className="text-green-200/60 text-xs mt-1">From applied AI recommendations</p>
                      </div>
                      <div className="h-px bg-green-500/30"></div>
                      <div>
                        <p className="text-green-200/80 text-sm mb-2">Annual Projected Revenue</p>
                        <p className="text-white text-2xl font-bold">
                          ${stats ? (parseFloat(stats.revenue || 0) * 12 * 1.05).toFixed(2) : '0.00'}/yr
                        </p>
                        <p className="text-green-200/60 text-xs mt-1">With 5% monthly increase</p>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {shopifyConnected && (
              <>
                {/* ROI Breakdown */}
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 mb-8">
                  <h3 className="text-xl font-bold text-white mb-6">How We Calculate ROI</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <p className="text-white font-semibold mb-2">📊 Cost-Based Analysis</p>
                      <p className="text-gray-400 text-sm">
                        AI analyzes your cost prices and current sales to suggest optimal profit margins
                      </p>
                    </div>
                    <div>
                      <p className="text-white font-semibold mb-2">💹 Margin Optimization</p>
                      <p className="text-gray-400 text-sm">
                        Get recommendations to improve margins while maintaining competitive pricing
                      </p>
                    </div>
                    <div>
                      <p className="text-white font-semibold mb-2">⚡ On-Demand Analysis</p>
                      <p className="text-gray-400 text-sm">
                        Run AI analysis whenever you need fresh pricing recommendations for your products
                      </p>
                    </div>
                  </div>
                </div>

                {/* Estimated Monthly Value - ONLY IF THERE'S ACTUAL DATA */}
                {stats && parseFloat(stats.totalRevenue || 0) > 0 && (
                  <div className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-2xl font-bold text-white mb-2">
                          Estimated Monthly Value
                        </h3>
                        <p className="text-white/90 text-sm">
                          Revenue increase from AI-optimized pricing
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-white text-5xl font-bold">
                          ${(parseFloat(stats.totalRevenue || 0) * 0.05).toFixed(2)}
                        </p>
                        <p className="text-white/60 text-sm mt-1">per month</p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Detailed Statistics - ONLY IF CONNECTED */}
            {shopifyConnected && stats && (
              <div className="mt-8 bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                <h3 className="text-xl font-bold text-white mb-6">Detailed Statistics</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-gray-400 text-sm mb-2">Total Revenue (30d)</p>
                    <p className="text-white text-3xl font-bold">${parseFloat(stats.totalRevenue || 0).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm mb-2">Total Orders</p>
                    <p className="text-white text-3xl font-bold">{stats.totalOrders || 0}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm mb-2">Average Order Value</p>
                    <p className="text-white text-3xl font-bold">${parseFloat(stats.avgOrderValue || 0).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm mb-2">Products Analyzed</p>
                    <p className="text-white text-3xl font-bold">{stats.productsAnalyzed || 0}</p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default ProductDashboard;
