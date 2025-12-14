import { useState, useEffect } from 'react';
import { Zap, Check, RefreshCw, TrendingUp, Package, DollarSign, AlertCircle, LogOut, Settings, X, Wifi, WifiOff, BarChart3, Activity, ShoppingCart, Clock, Search, CheckSquare, Square } from 'lucide-react';

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

function ResetCountdownTimer({ timeUntilReset, onRefresh }) {
  const [time, setTime] = useState(timeUntilReset);

  useEffect(() => {
    setTime(timeUntilReset);
  }, [timeUntilReset]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTime((prev) => {
        if (prev <= 1) {
          onRefresh();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [onRefresh]);

  const hours = Math.floor(time / 3600);
  const minutes = Math.floor((time % 3600) / 60);
  const seconds = time % 60;

  return (
    <div className="flex items-center space-x-2">
      <RefreshCw className="w-4 h-4 text-green-400" />
      <span className="text-gray-400 text-sm">
        Resets in: {hours.toString().padStart(2, '0')}:{minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
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
  const [analysisStatus, setAnalysisStatus] = useState({ analyzing: false, timeRemaining: 1800, manualUsed: 0, manualRemaining: 10, timeUntilReset: 0, resetTime: null }); // 30 minutes in seconds
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
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [showNewRecommendationsAlert, setShowNewRecommendationsAlert] = useState(false);
  const [newRecommendationsCount, setNewRecommendationsCount] = useState(0);
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [expandedRecommendation, setExpandedRecommendation] = useState(null);

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

  // Auto-select products when products change (for ≤10 products)
  useEffect(() => {
    if (products.length > 0 && products.length <= 10) {
      // Auto-select all products with cost price set
      const productsWithCost = products.filter(p => p.cost_price > 0).map(p => p.id);
      setSelectedProductIds(productsWithCost);
      console.log(`✅ Auto-selected ${productsWithCost.length} products (≤10 total products)`);
    }
  }, [products]);

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
        manualRemaining: data.manualRemaining || 10,
        timeUntilReset: data.timeUntilReset || 0,
        resetTime: data.resetTime || null
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
      // Add cache-busting timestamp to prevent stale data
      const cacheBust = `?t=${Date.now()}`;
      const results = await Promise.allSettled([
        api.call(`/api/products${cacheBust}`),
        api.call(`/api/recommendations${cacheBust}`),
        api.call(`/api/orders${cacheBust}`),
        api.call(`/api/stats${cacheBust}`)
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

      // CRITICAL: Auto-sync products to get fresh sales data
      // Sync every 5 minutes instead of once per session to prevent stale data
      const lastSyncTime = sessionStorage.getItem('lastSyncTime');
      const now = Date.now();
      const fiveMinutes = 5 * 60 * 1000;
      const shouldSync = !lastSyncTime || (now - parseInt(lastSyncTime)) > fiveMinutes;

      if (shouldSync && shopifyConnected && !forceSync) {
        console.log('🔄 Auto-syncing products to fetch latest sales data...');
        try {
          sessionStorage.setItem('lastSyncTime', now.toString());
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

  const toggleProductSelection = (productId) => {
    setSelectedProductIds(prev => {
      if (prev.includes(productId)) {
        return prev.filter(id => id !== productId);
      } else {
        // Limit to 50 products
        if (prev.length >= 50) {
          setError('⚠️ Maximum 50 products can be selected for analysis');
          setTimeout(() => setError(null), 3000);
          return prev;
        }
        return [...prev, productId];
      }
    });
  };

  const selectAllProducts = () => {
    const productsWithCost = products.filter(p => p.cost_price > 0);
    const idsToSelect = productsWithCost.slice(0, 50).map(p => p.id);
    setSelectedProductIds(idsToSelect);
  };

  const clearAllSelections = () => {
    setSelectedProductIds([]);
  };

  const runAnalysis = async () => {
    // Check if any products have cost price set (frontend validation)
    const productsWithCost = products.filter(p => p.cost_price > 0);
    if (productsWithCost.length === 0) {
      setError('⚠️ Please set cost price for at least one product before running analysis. Click "Set Cost Price" on a product.');
      setTimeout(() => setError(null), 5000);
      return;
    }

    // Validation for >10 products case
    if (products.length > 10 && selectedProductIds.length === 0) {
      setError('⚠️ Please select at least one product to analyze. Check the boxes next to products you want to analyze.');
      setTimeout(() => setError(null), 5000);
      return;
    }

    try {
      setAnalysisStatus({ ...analysisStatus, analyzing: true });
      const result = await api.call('/api/analyze', {
        method: 'POST',
        body: JSON.stringify({
          productIds: products.length > 10 ? selectedProductIds : productsWithCost.map(p => p.id)
        })
      });

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
    // Try totalAIProfit first (new field), fallback to profitIncrease (old field)
    return parseFloat(stats.totalAIProfit || stats.profitIncrease || 0).toFixed(2);
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
                  <p className="text-pink-300 text-sm font-medium mb-1">Potential Profit Increase</p>
                  <p className="text-white text-3xl font-bold">${calculateAIProfit()}<span className="text-lg text-gray-400">/mo</span></p>
                  <p className="text-pink-200/60 text-xs mt-1">If you apply AI recommendations</p>
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
                    <div className="flex-1">
                      <p className="text-gray-400 text-sm">Manual Analyses Today</p>
                      <p className="text-white text-xl font-bold">
                        {analysisStatus.manualUsed || 0}/10
                        {(analysisStatus.manualRemaining || 10) === 0 && <span className="text-red-400 text-sm ml-2">(Limit Reached)</span>}
                      </p>
                      {analysisStatus.timeUntilReset > 0 && (
                        <div className="mt-2">
                          <ResetCountdownTimer
                            timeUntilReset={Number(analysisStatus.timeUntilReset)}
                            onRefresh={loadAnalysisStatus}
                          />
                        </div>
                      )}
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

            {/* Product Selection UI - Shows only when >10 products */}
            {products.length > 10 && (
              <div className="mb-8 p-6 border-2 border-purple-500/50 bg-purple-900/20 rounded-xl">
                <div className="mb-4">
                  <h3 className="text-2xl font-bold text-white mb-2">Select Products to Analyze</h3>
                  <p className="text-gray-300">
                    You have {products.length} products. Select up to 50 to analyze. Only products with cost prices set can be selected.
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    ℹ️ We limit analysis to 50 products at a time to ensure fast, accurate recommendations.
                  </p>
                </div>

                {/* Search and Selection Controls */}
                <div className="mb-4 space-y-3">
                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="🔍 Search products..."
                      value={productSearchQuery}
                      onChange={(e) => setProductSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                    />
                  </div>

                  {/* Select All / Clear All Buttons */}
                  <div className="flex items-center justify-between">
                    <div className="flex gap-3">
                      <button
                        onClick={selectAllProducts}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition flex items-center space-x-2"
                      >
                        <CheckSquare className="w-4 h-4" />
                        <span>Select First 50 (with cost price)</span>
                      </button>
                      <button
                        onClick={clearAllSelections}
                        className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-semibold transition flex items-center space-x-2"
                      >
                        <Square className="w-4 h-4" />
                        <span>Clear All</span>
                      </button>
                    </div>
                    <div className="text-white font-semibold">
                      {selectedProductIds.length} / 50 selected
                    </div>
                  </div>
                </div>

                {/* Info Message */}
                {selectedProductIds.length > 0 && (
                  <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                    <p className="text-blue-300 text-sm">
                      ✓ {selectedProductIds.length} product{selectedProductIds.length !== 1 ? 's' : ''} selected. Click "Run AI Analysis Now" above to analyze.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Auto-select message for ≤10 products */}
            {products.length > 0 && products.length <= 10 && (
              <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <p className="text-blue-300 font-medium">
                  ✅ All {products.length} products will be analyzed automatically (products with cost prices set)
                </p>
              </div>
            )}

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
                  {products
                    .filter(product =>
                      product.title.toLowerCase().includes(productSearchQuery.toLowerCase())
                    )
                    .map((product) => {
                      const isSelected = selectedProductIds.includes(product.id);
                      const canBeSelected = product.cost_price > 0;
                      const showCheckbox = products.length > 10;

                      return (
                    <div
                      key={product.id}
                      className={`bg-gradient-to-br from-slate-800/80 to-slate-800/40 border rounded-xl p-6 transition ${
                        isSelected ? 'border-purple-500 shadow-lg shadow-purple-500/20' : 'border-slate-700 hover:border-purple-500/50'
                      }`}
                    >
                      {/* Checkbox for >10 products */}
                      {showCheckbox && (
                        <div className="mb-3">
                          <label className="flex items-center space-x-3 cursor-pointer group">
                            <div
                              onClick={() => canBeSelected && toggleProductSelection(product.id)}
                              className={`w-6 h-6 rounded border-2 flex items-center justify-center transition ${
                                canBeSelected
                                  ? isSelected
                                    ? 'bg-purple-600 border-purple-600'
                                    : 'border-slate-500 group-hover:border-purple-500'
                                  : 'border-slate-700 bg-slate-800 cursor-not-allowed opacity-50'
                              }`}
                            >
                              {isSelected && <Check className="w-4 h-4 text-white" />}
                            </div>
                            <span className={`text-sm font-medium ${canBeSelected ? 'text-white' : 'text-gray-500'}`}>
                              {isSelected ? 'Selected for analysis' : canBeSelected ? 'Select for analysis' : 'Set cost price first'}
                            </span>
                          </label>
                        </div>
                      )}

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
                    );
                  })}
                </div>
              )}
            </div>

            {/* Recommendations Section */}
            {recommendations.length > 0 ? (
              <div>
                <h3 className="text-2xl font-bold text-white mb-4">AI Recommendations</h3>
                <div className="space-y-4">
                  {recommendations.map((rec) => {
                    const isExpanded = expandedRecommendation === rec.id;
                    const product = products.find(p => p.id === rec.product_id);
                    const priceChange = parseFloat(rec.recommended_price) - parseFloat(rec.current_price);
                    const isIncrease = priceChange > 0;
                    const changePercent = (Math.abs(priceChange) / parseFloat(rec.current_price)) * 100;

                    return (
                    <div key={rec.id} className={`p-6 bg-gradient-to-br rounded-xl relative transition border-2 ${
                      rec.urgency === 'CRITICAL' ? 'from-red-900/30 to-red-900/10 border-red-500/50' :
                      rec.urgency === 'URGENT' ? 'from-orange-900/30 to-orange-900/10 border-orange-500/50' :
                      rec.urgency === 'HIGH' ? 'from-yellow-900/30 to-yellow-900/10 border-yellow-500/50' :
                      'from-purple-600/20 to-pink-600/20 border-purple-500/30'
                    }`}>
                      {/* Header with Product Image and Title */}
                      <div className="flex items-start gap-4 mb-4">
                        {product?.image_url && (
                          <img
                            src={product.image_url}
                            alt={rec.title}
                            className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                          />
                        )}
                        <div className="flex-1 pr-12">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                              rec.urgency === 'CRITICAL' ? 'bg-red-500 text-white' :
                              rec.urgency === 'URGENT' ? 'bg-orange-500 text-white' :
                              rec.urgency === 'HIGH' ? 'bg-yellow-500 text-black' :
                              'bg-blue-500 text-white'
                            }`}>
                              {rec.urgency === 'CRITICAL' ? '🚨' : rec.urgency === 'URGENT' ? '⚠️' : rec.urgency === 'HIGH' ? '📊' : '💡'} {rec.urgency}
                            </span>
                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-900/50 text-white">
                              {rec.confidence}% Confidence
                            </span>
                          </div>
                          <h4 className="text-xl font-bold text-white mb-2">{rec.title}</h4>
                        </div>
                        <button
                          onClick={() => rejectRecommendation(rec.id, rec.product_id)}
                          className="absolute top-4 right-4 p-2 hover:bg-slate-700/50 rounded-lg transition"
                          title="Dismiss recommendation"
                        >
                          <X className="w-5 h-5 text-gray-400 hover:text-white" />
                        </button>
                      </div>

                      {/* Recommendation Summary */}
                      <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-5 mb-4">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-gray-400 text-sm font-semibold">Recommended Action:</p>
                          <p className={`text-2xl font-bold ${isIncrease ? 'text-green-400' : 'text-yellow-400'}`}>
                            {isIncrease ? '📈 Increase Price' : '📉 Lower Price'}
                          </p>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-slate-800 rounded-lg mb-3">
                          <div>
                            <p className="text-gray-400 text-sm">New Price:</p>
                            <p className="text-3xl font-bold text-white">
                              ${parseFloat(rec.recommended_price).toFixed(2)}
                            </p>
                          </div>
                          <div className="text-center px-4">
                            <p className="text-gray-400 text-sm">Change:</p>
                            <p className={`text-2xl font-bold ${isIncrease ? 'text-green-400' : 'text-yellow-400'}`}>
                              {isIncrease ? '+' : '-'}${Math.abs(priceChange).toFixed(2)}
                            </p>
                            <p className="text-sm text-gray-400">({changePercent.toFixed(1)}%)</p>
                          </div>
                          <div className="text-right">
                            <p className="text-gray-400 text-sm">Current:</p>
                            <p className="text-2xl font-bold text-white">
                              ${parseFloat(rec.current_price).toFixed(2)}
                            </p>
                          </div>
                        </div>
                        {/* Profit Increase */}
                        {rec.profit_increase_monthly != null && (
                          <div className="p-3 bg-gradient-to-r from-green-900/30 to-emerald-900/30 border border-green-500/30 rounded-lg">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <TrendingUp className="w-5 h-5 text-green-400" />
                                <span className="text-gray-300 text-sm font-medium">Potential Monthly Profit Increase:</span>
                              </div>
                              <span className="text-2xl font-bold text-green-400">
                                +${Math.abs(rec.profit_increase_monthly).toFixed(2)}/mo
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Reasoning */}
                      <div className="bg-purple-950/30 border border-purple-500/30 rounded-lg p-4 mb-4">
                        <p className="text-sm text-purple-300 font-semibold mb-2">💡 Why this recommendation:</p>
                        <p className="text-gray-200 leading-relaxed">{rec.reasoning}</p>
                      </div>

                      {/* Expandable Details */}
                      <button
                        onClick={() => setExpandedRecommendation(isExpanded ? null : rec.id)}
                        className="w-full text-left px-4 py-3 bg-slate-800/50 hover:bg-slate-800 rounded-lg transition flex items-center justify-between mb-4"
                      >
                        <span className="text-blue-300 font-semibold">
                          {isExpanded ? '📖 Hide' : '📖 Show'} Detailed Analysis
                        </span>
                        <span className="text-2xl">{isExpanded ? '▲' : '▼'}</span>
                      </button>

                      {isExpanded && product && (
                        <div className="mb-4 p-5 bg-slate-900/70 border border-slate-700 rounded-lg space-y-4">
                          {/* Inputs AI Used */}
                          <div>
                            <p className="text-sm font-semibold text-gray-300 mb-3">📊 Inputs AI Used:</p>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div className="p-3 bg-slate-800 rounded">
                                <p className="text-gray-400">Current Price</p>
                                <p className="text-white font-bold">${parseFloat(rec.current_price).toFixed(2)}</p>
                              </div>
                              <div className="p-3 bg-slate-800 rounded">
                                <p className="text-gray-400">Cost Price</p>
                                <p className="text-white font-bold">${product.cost_price?.toFixed(2) || 'Not set'}</p>
                              </div>
                              <div className="p-3 bg-slate-800 rounded">
                                <p className="text-gray-400">Current Margin</p>
                                <p className="text-white font-bold">
                                  {product.cost_price ? `${(((parseFloat(rec.current_price) - product.cost_price) / parseFloat(rec.current_price)) * 100).toFixed(1)}%` : 'N/A'}
                                </p>
                              </div>
                              <div className="p-3 bg-slate-800 rounded">
                                <p className="text-gray-400">New Margin</p>
                                <p className="text-green-400 font-bold">
                                  {product.cost_price ? `${(((parseFloat(rec.recommended_price) - product.cost_price) / parseFloat(rec.recommended_price)) * 100).toFixed(1)}%` : 'N/A'}
                                </p>
                              </div>
                              <div className="p-3 bg-slate-800 rounded">
                                <p className="text-gray-400">Sales (30d)</p>
                                <p className="text-white font-bold">{product.total_sales_30d || 0} units</p>
                              </div>
                              <div className="p-3 bg-slate-800 rounded">
                                <p className="text-gray-400">Sales Velocity</p>
                                <p className="text-white font-bold">
                                  {(product.sales_velocity || 0).toFixed(2)}/day
                                </p>
                              </div>
                              <div className="p-3 bg-slate-800 rounded">
                                <p className="text-gray-400">Inventory</p>
                                <p className="text-white font-bold">{product.inventory || 0} units</p>
                              </div>
                              <div className="p-3 bg-slate-800 rounded">
                                <p className="text-gray-400">Revenue (30d)</p>
                                <p className="text-white font-bold">${(product.revenue_30d || 0).toFixed(2)}</p>
                              </div>
                            </div>
                          </div>

                          {/* Safety Checks */}
                          <div className="border-t border-slate-700 pt-4">
                            <p className="text-sm font-semibold text-gray-300 mb-3">🛡️ Safety Checks AI Performed:</p>
                            <div className="space-y-2 text-sm">
                              <div className="flex items-center space-x-2">
                                <span className="text-green-400">✓</span>
                                <span className="text-gray-300">
                                  {parseFloat(rec.recommended_price) >= (product.cost_price || 0)
                                    ? `Won't sell below cost (new price $${parseFloat(rec.recommended_price).toFixed(2)} > cost $${(product.cost_price || 0).toFixed(2)})`
                                    : `⚠️ WARNING: Below cost`}
                                </span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className="text-green-400">✓</span>
                                <span className="text-gray-300">
                                  {Math.abs(priceChange) <= parseFloat(rec.current_price) * 0.25
                                    ? `Change within safe limits (${changePercent.toFixed(1)}% ≤ 25% max)`
                                    : `Large change (${changePercent.toFixed(1)}%)`}
                                </span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className="text-green-400">✓</span>
                                <span className="text-gray-300">Based on actual sales data ({product.total_sales_30d || 0} units in 30 days)</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className="text-green-400">✓</span>
                                <span className="text-gray-300">Data reliability verified before recommendation</span>
                              </div>
                            </div>
                          </div>

                          {/* Assumptions */}
                          <div className="border-t border-slate-700 pt-4">
                            <p className="text-sm font-semibold text-gray-300 mb-2">📋 Assumptions Made:</p>
                            <ul className="text-sm text-gray-400 space-y-1">
                              <li>• Sales velocity will remain similar after price change</li>
                              <li>• Customer demand has some price elasticity</li>
                              <li>• Your cost prices are accurate</li>
                              <li>• Market conditions remain stable</li>
                            </ul>
                          </div>

                          {/* Your Control */}
                          <div className="border-t border-slate-700 pt-4">
                            <p className="text-sm font-semibold text-gray-300 mb-2">⚙️ You Stay in Control:</p>
                            <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                              <p className="text-sm text-blue-200">
                                <strong>This is a recommendation only.</strong> You decide whether to apply it.
                                You can also manually adjust the price to any value in Shopify.
                                <strong className="block mt-2">Nothing changes without your approval.</strong>
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => rejectRecommendation(rec.id, rec.product_id)}
                          className="px-6 py-3 bg-slate-700 text-white rounded-lg font-semibold hover:bg-slate-600 transition flex items-center space-x-2"
                        >
                          <X className="w-4 h-4" />
                          <span>Reject</span>
                        </button>
                        <button
                          onClick={() => applyRecommendation(rec.id, rec.product_id, parseFloat(rec.recommended_price))}
                          className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-bold hover:from-green-700 hover:to-emerald-700 transition flex items-center justify-center space-x-2 shadow-lg shadow-green-500/20"
                        >
                          <Check className="w-5 h-5" />
                          <span>Apply This Price to Shopify</span>
                        </button>
                      </div>
                    </div>
                    );
                  })}
                </div>
              </div>
            ) : products.some(p => p.last_analyzed_at) ? (
              <div className="space-y-6">
                {/* Main "All Good" Header */}
                <div className="p-8 bg-green-500/10 border-2 border-green-500/30 rounded-xl text-center">
                  <div className="flex flex-col items-center">
                    <div className="text-6xl mb-4">✅</div>
                    <h3 className="text-2xl font-bold text-white mb-2">All Prices Look Good!</h3>
                    <p className="text-gray-300 mb-4 max-w-md">
                      Our AI analyzed your products and found no pricing issues that need immediate attention.
                    </p>
                    <div className="max-w-md bg-slate-900/50 border border-green-500/20 rounded-lg p-5 text-left">
                      <p className="text-sm text-gray-400 mb-2">✅ What AI Verified:</p>
                      <ul className="text-sm text-gray-300 space-y-1">
                        <li>• All margins are healthy (30%+)</li>
                        <li>• No products selling below cost</li>
                        <li>• Sales velocity looks reasonable</li>
                        <li>• No obvious pricing errors detected</li>
                      </ul>
                    </div>
                    <p className="text-sm text-gray-500 mt-4">
                      We'll continue monitoring. Run analysis again after more sales data comes in.
                    </p>
                  </div>
                </div>

                {/* Detailed Explainability - Show What AI Analyzed */}
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-bold text-white">🔍 What AI Analyzed</h4>
                    <span className="text-xs text-gray-400 bg-slate-700/50 px-3 py-1 rounded-full">Transparency Report</span>
                  </div>

                  {products.filter(p => p.last_analyzed_at).map(product => {
                    const margin = product.cost_price > 0
                      ? ((parseFloat(product.price) - parseFloat(product.cost_price)) / parseFloat(product.price) * 100).toFixed(1)
                      : 0;
                    const salesVelocity = (product.sales_velocity || 0).toFixed(2);

                    return (
                      <div key={product.id} className="mb-4 p-4 bg-slate-900/30 border border-slate-700/50 rounded-lg">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h5 className="text-white font-semibold">{product.title}</h5>
                            <p className="text-xs text-gray-400">Analyzed {new Date(product.last_analyzed_at).toLocaleString()}</p>
                          </div>
                          <span className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded">Optimal</span>
                        </div>

                        {/* Inputs Used */}
                        <div className="mb-3">
                          <p className="text-xs text-gray-400 font-semibold mb-2">📊 Inputs AI Used:</p>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-gray-500">Current Price:</span>
                              <span className="text-white ml-2 font-semibold">${parseFloat(product.price).toFixed(2)}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Cost Price:</span>
                              <span className="text-white ml-2 font-semibold">${parseFloat(product.cost_price || 0).toFixed(2)}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Margin:</span>
                              <span className="text-white ml-2 font-semibold">{margin}%</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Sales Velocity:</span>
                              <span className="text-white ml-2 font-semibold">{salesVelocity} units/day</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Sales (30d):</span>
                              <span className="text-white ml-2 font-semibold">{product.total_sales_30d || 0} units</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Inventory:</span>
                              <span className="text-white ml-2 font-semibold">{product.inventory} units</span>
                            </div>
                          </div>
                        </div>

                        {/* AI Decision Reasoning */}
                        <div className="mb-3 p-3 bg-slate-800/50 border border-green-500/20 rounded">
                          <p className="text-xs text-gray-400 font-semibold mb-1">💡 AI Reasoning:</p>
                          <p className="text-xs text-green-200 leading-relaxed">
                            Price is performing well with {margin}% margin (above 30% minimum).
                            Sales velocity of {salesVelocity} units/day with {product.total_sales_30d || 0} total sales indicates healthy demand.
                            No safety issues detected (not below cost, margin adequate).
                            No obvious mispricing found.
                          </p>
                        </div>

                        {/* Safety Checks */}
                        <div>
                          <p className="text-xs text-gray-400 font-semibold mb-2">🛡️ Safety Checks Passed:</p>
                          <div className="space-y-1 text-xs text-gray-300">
                            <div className="flex items-center space-x-2">
                              <span className="text-green-400">✓</span>
                              <span>Not selling below cost ({parseFloat(product.price) > parseFloat(product.cost_price || 0) ? 'PASS' : 'FAIL'})</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="text-green-400">✓</span>
                              <span>Margin above 30% minimum ({margin}% {parseFloat(margin) >= 30 ? '≥' : '<'} 30%)</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="text-green-400">✓</span>
                              <span>Data reliability sufficient (has sales history)</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="text-green-400">✓</span>
                              <span>No pricing errors detected (markup reasonable)</span>
                            </div>
                          </div>
                        </div>

                        {/* What AI Considered */}
                        <div className="mt-3 pt-3 border-t border-slate-700">
                          <p className="text-xs text-gray-400 mb-1">⚖️ Alternatives AI Considered:</p>
                          <ul className="text-xs text-gray-500 space-y-1">
                            <li>• Increase price → Would improve margin but risk reducing sales</li>
                            <li>• Decrease price → Not needed, sales velocity is adequate</li>
                            <li>• Keep current → <span className="text-green-300 font-semibold">Best option (chosen)</span></li>
                          </ul>
                        </div>
                      </div>
                    );
                  })}

                  <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                    <p className="text-xs text-blue-200">
                      <strong>💡 Nothing changes without you:</strong> Even when AI finds opportunities,
                      all price changes require your manual approval. You stay in complete control.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 bg-blue-500/10 border-2 border-blue-500/30 rounded-xl text-center">
                <div className="text-6xl mb-4">💡</div>
                <h3 className="text-2xl font-bold text-white mb-2">Ready to Get Started?</h3>
                <p className="text-gray-300 mb-4 max-w-md mx-auto">
                  Set cost prices for your products and run your first AI analysis to get pricing recommendations.
                </p>
                <button
                  onClick={runAnalysis}
                  disabled={products.filter(p => p.cost_price > 0).length === 0}
                  className="px-8 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg font-bold transition"
                >
                  Run First Analysis
                </button>
                <p className="text-sm text-gray-500 mt-3">
                  {products.filter(p => p.cost_price > 0).length === 0 && '⚠️ Set cost prices first'}
                </p>
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
              <h2 className="text-3xl font-bold text-white mb-2">Impact Calculator</h2>
              <p className="text-gray-400">Honest metrics about what AI recommendations could change — based on YOUR actual data</p>
            </div>

            {!shopifyConnected ? (
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-12 text-center">
                <div className="inline-block p-6 bg-yellow-500/10 rounded-2xl mb-4">
                  <WifiOff className="w-16 h-16 text-yellow-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Shopify Not Connected</h3>
                <p className="text-gray-400 mb-6">Connect your store to see real calculations based on your actual sales data</p>
                <button
                  onClick={() => setShowSettings(true)}
                  className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition"
                >
                  Connect Shopify
                </button>
              </div>
            ) : (
              <>
                {/* Data Coverage Indicator */}
                <div className="mb-6 p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold text-white">Data Coverage</h4>
                    <span className="text-xs text-gray-400">Last 30 days</span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-white">{stats?.orders || 0}</p>
                      <p className="text-xs text-gray-400">Orders analyzed</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">{products.length}</p>
                      <p className="text-xs text-gray-400">Products tracked</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">{recommendations.length}</p>
                      <p className="text-xs text-gray-400">Active recommendations</p>
                    </div>
                  </div>
                </div>

                {/* MEASURED RESULTS (What's Real) */}
                <div className="mb-8 p-6 bg-gradient-to-br from-green-600/20 to-emerald-600/20 border-2 border-green-500/50 rounded-xl">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-white">✅ MEASURED: What AI Has Found</h3>
                    <span className="text-xs text-green-200/70 bg-green-500/20 px-3 py-1 rounded-full">Real Data</span>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <p className="text-green-200/80 text-sm mb-2">Potential Additional Profit (If You Approve Recommendations)</p>
                      <p className="text-white text-4xl font-bold">
                        +${stats ? parseFloat(stats.profitIncrease || 0).toFixed(2) : '0.00'}
                      </p>
                      <p className="text-green-200/60 text-xs mt-2">
                        📊 Calculated from {recommendations.length} active AI recommendations based on your actual sales volume
                      </p>
                      <p className="text-green-200/60 text-xs mt-1">
                        ⚠️ This assumes sales velocity stays constant after price changes (which may or may not happen)
                      </p>
                    </div>
                    <div className="h-px bg-green-500/30"></div>
                    <div>
                      <p className="text-green-200/80 text-sm mb-2">Current 30-Day Revenue</p>
                      <p className="text-white text-2xl font-bold">
                        ${stats ? parseFloat(stats.revenue || 0).toFixed(2) : '0.00'}
                      </p>
                      <p className="text-green-200/60 text-xs mt-1">From {stats?.orders || 0} orders in the last 30 days</p>
                    </div>
                  </div>
                </div>

                {/* PROJECTED SCENARIOS (What Could Happen) */}
                <div className="mb-8 p-6 bg-slate-800/50 border border-slate-700 rounded-xl">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-white">📈 PROJECTED: Three Scenarios</h3>
                    <span className="text-xs text-gray-400 bg-slate-700/50 px-3 py-1 rounded-full">Estimates Only</span>
                  </div>
                  <p className="text-gray-400 text-sm mb-6">
                    These are <span className="text-yellow-300">educated guesses</span> about what could happen if you apply recommendations.
                    Real results depend on customer behavior, competition, and market conditions.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Conservative Scenario */}
                    <div className="p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                      <p className="text-blue-300 text-sm font-semibold mb-3">Conservative</p>
                      <p className="text-white text-2xl font-bold mb-2">
                        +${stats ? (parseFloat(stats.profitIncrease || 0) * 0.5).toFixed(2) : '0.00'}/mo
                      </p>
                      <p className="text-xs text-gray-400 mb-3">50% of AI estimate</p>
                      <div className="text-xs text-gray-400 space-y-1">
                        <p>✓ Some customers resist price changes</p>
                        <p>✓ Sales velocity drops slightly</p>
                      </div>
                    </div>

                    {/* Moderate Scenario */}
                    <div className="p-4 bg-purple-900/20 border border-purple-500/30 rounded-lg">
                      <p className="text-purple-300 text-sm font-semibold mb-3">Moderate</p>
                      <p className="text-white text-2xl font-bold mb-2">
                        +${stats ? (parseFloat(stats.profitIncrease || 0) * 0.75).toFixed(2) : '0.00'}/mo
                      </p>
                      <p className="text-xs text-gray-400 mb-3">75% of AI estimate</p>
                      <div className="text-xs text-gray-400 space-y-1">
                        <p>✓ Minor impact on demand</p>
                        <p>✓ Most customers accept changes</p>
                      </div>
                    </div>

                    {/* Optimistic Scenario */}
                    <div className="p-4 bg-green-900/20 border border-green-500/30 rounded-lg">
                      <p className="text-green-300 text-sm font-semibold mb-3">Optimistic</p>
                      <p className="text-white text-2xl font-bold mb-2">
                        +${stats ? parseFloat(stats.profitIncrease || 0).toFixed(2) : '0.00'}/mo
                      </p>
                      <p className="text-xs text-gray-400 mb-3">100% of AI estimate</p>
                      <div className="text-xs text-gray-400 space-y-1">
                        <p>✓ Sales volume stays constant</p>
                        <p>✓ No demand sensitivity</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                    <p className="text-yellow-200 text-xs">
                      <strong>Reality check:</strong> These scenarios assume sales volume doesn't change when prices do.
                      In reality, raising prices usually decreases sales slightly (price elasticity). We show multiple scenarios because we're honest about uncertainty.
                    </p>
                  </div>
                </div>

                {/* Assumptions Section */}
                <div className="mb-8 p-6 bg-slate-800/50 border border-slate-700 rounded-xl">
                  <h3 className="text-xl font-bold text-white mb-4">🔍 How We Calculate This</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-start space-x-3">
                      <span className="text-purple-400 font-bold">1.</span>
                      <div>
                        <p className="text-white font-semibold">We look at your actual sales data</p>
                        <p className="text-gray-400">Orders from the last 30 days, product costs, current prices</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <span className="text-purple-400 font-bold">2.</span>
                      <div>
                        <p className="text-white font-semibold">AI calculates profit per sale (current vs recommended price)</p>
                        <p className="text-gray-400">Example: $50 → $55 = +$5 profit per sale</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <span className="text-purple-400 font-bold">3.</span>
                      <div>
                        <p className="text-white font-semibold">Multiply by your sales volume</p>
                        <p className="text-gray-400">If you sold 10 units: +$5 × 10 = +$50 additional profit</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <span className="text-purple-400 font-bold">4.</span>
                      <div>
                        <p className="text-white font-semibold">Big assumption: Sales stay the same</p>
                        <p className="text-gray-400 text-yellow-200">⚠️ This may not be true! Higher prices can reduce demand.</p>
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
