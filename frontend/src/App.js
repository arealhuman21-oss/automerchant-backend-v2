import { useState, useEffect } from 'react';
import {
  Page,
  Card,
  Button,
  TextField,
  Banner,
  Badge,
  Layout,
  BlockStack,
  InlineStack,
  Text,
  Modal,
  Icon,
  Spinner,
  EmptyState,
  Tabs,
  Box,
  Divider,
  ProgressBar,
  CalloutCard,
  InlineGrid,
  DataTable,
  Checkbox,
  Thumbnail,
} from '@shopify/polaris';
import {
  HomeIcon,
  ChartVerticalFilledIcon,
  CartIcon,
  ClockIcon,
  RefreshIcon,
  SettingsIcon,
  ExitIcon,
  CheckIcon,
  XIcon,
  SunIcon,
  MoonIcon,
} from '@shopify/polaris-icons';
import { WaitlistButton } from './components/Waitlist';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Gradient styles for visual enhancement
const gradientStyles = {
  purplePink: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '24px',
    borderRadius: '16px',
  },
  successGlow: {
    background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
    padding: '16px',
    borderRadius: '12px',
  },
  warningGlow: {
    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    padding: '16px',
    borderRadius: '12px',
  },
  infoGlow: {
    background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    padding: '16px',
    borderRadius: '12px',
  },
};

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

  if (!product) return null;

  const currentPrice = parseFloat(product.price);
  const cost = parseFloat(costPrice);
  const margin = cost > 0 ? (((currentPrice - cost) / currentPrice) * 100).toFixed(1) : 0;
  const profit = (currentPrice - cost).toFixed(2);

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Set Cost Price"
      primaryAction={{
        content: 'Save Cost Price',
        onAction: handleSave,
        loading: saving,
      }}
      secondaryActions={[
        {
          content: 'Cancel',
          onAction: onClose,
        },
      ]}
    >
      <Modal.Section>
        <BlockStack gap="400">
          <Text variant="bodyMd" as="p" tone="subdued">
            {product.title}
          </Text>

          {error && (
            <Banner tone="critical">
              <p>{error}</p>
            </Banner>
          )}

          <TextField
            label="Cost Price (What you paid)"
            type="number"
            value={costPrice}
            onChange={setCostPrice}
            prefix="$"
            step={0.01}
            helpText="AI will never recommend below this price"
            autoComplete="off"
          />

          <Card>
            <BlockStack gap="300">
              <InlineStack align="space-between">
                <Text variant="bodyMd" tone="subdued">Current Selling Price:</Text>
                <Text variant="headingLg" fontWeight="bold">${currentPrice.toFixed(2)}</Text>
              </InlineStack>

              <InlineStack align="space-between">
                <Text variant="bodyMd" tone="subdued">Your Cost:</Text>
                <Text variant="headingMd" fontWeight="semibold">${cost.toFixed(2)}</Text>
              </InlineStack>

              <Divider />

              <InlineStack align="space-between">
                <Text variant="bodyMd" tone="subdued">Profit per Unit:</Text>
                <Text variant="headingLg" fontWeight="bold" tone={parseFloat(profit) > 0 ? 'success' : 'critical'}>
                  ${profit}
                </Text>
              </InlineStack>

              <InlineStack align="space-between">
                <Text variant="bodyMd" tone="subdued">Margin:</Text>
                <Text
                  variant="headingLg"
                  fontWeight="bold"
                  tone={margin > 30 ? 'success' : margin > 15 ? 'warning' : 'critical'}
                >
                  {margin}%
                </Text>
              </InlineStack>
            </BlockStack>
          </Card>
        </BlockStack>
      </Modal.Section>
    </Modal>
  );
}

function SettingsModal({ isOpen, onClose, onConnect, shopifyConnected, colorScheme, setColorScheme }) {
  const [formData, setFormData] = useState({ shop: '', accessToken: '' });
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    console.log('SettingsModal colorScheme:', colorScheme);
    console.log('SettingsModal setColorScheme type:', typeof setColorScheme);
  }, [colorScheme, setColorScheme]);

  const handleConnect = async () => {
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

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={
        <InlineStack gap="200" blockAlign="center">
          <Icon source={SettingsIcon} tone="magic" />
          <Text variant="headingLg" as="h2">Shopify Connection</Text>
        </InlineStack>
      }
      large
    >
      <Modal.Section>
        <BlockStack gap="400">
          {shopifyConnected ? (
            <Box paddingBlock="800">
              <BlockStack gap="400" align="center">
                <div style={{...gradientStyles.successGlow, display: 'inline-block'}}>
                  <Icon source={CheckIcon} tone="success" />
                </div>
                <Text variant="headingLg" fontWeight="bold">Connected to Shopify</Text>
                <Text variant="bodyMd" tone="subdued">Your store is successfully connected</Text>
                <Button onClick={onClose} variant="primary">Close</Button>
              </BlockStack>
            </Box>
          ) : (
            <>
              <Banner tone="info">
                <BlockStack gap="200">
                  <Text variant="headingMd" fontWeight="semibold">How to get your credentials:</Text>
                  <BlockStack gap="100">
                    <Text variant="bodySm">1. Go to your Shopify Admin → Settings → Apps and sales channels</Text>
                    <Text variant="bodySm">2. Click "Develop apps" → Create an app</Text>
                    <Text variant="bodySm">3. Configure Admin API scopes (read_products, write_products, read_orders)</Text>
                    <Text variant="bodySm">4. Install the app and copy your Admin API access token</Text>
                  </BlockStack>
                </BlockStack>
              </Banner>

              {error && (
                <Banner tone="critical">
                  <p>{error}</p>
                </Banner>
              )}

              {success && (
                <Banner tone="success">
                  <p>Successfully connected to Shopify!</p>
                </Banner>
              )}

              <TextField
                label="Shop URL"
                type="text"
                value={formData.shop}
                onChange={(value) => setFormData({ ...formData, shop: value })}
                placeholder="your-store.myshopify.com"
                autoComplete="off"
              />

              <TextField
                label="Admin API Access Token"
                type="password"
                value={formData.accessToken}
                onChange={(value) => setFormData({ ...formData, accessToken: value })}
                placeholder="shpat_xxxxxxxxxxxxx"
                autoComplete="off"
              />

              <InlineStack gap="200">
                <Button onClick={onClose}>Cancel</Button>
                <Button variant="primary" onClick={handleConnect} loading={connecting}>
                  Connect Shopify
                </Button>
              </InlineStack>
            </>
          )}

          <Divider />

          {/* Dark Mode Toggle */}
          <Box paddingBlock="400">
            <BlockStack gap="300">
              <Text variant="headingMd" fontWeight="semibold">Appearance</Text>
              <InlineStack gap="400" blockAlign="center" wrap={false}>
                <InlineStack gap="200" blockAlign="center">
                  <Icon source={colorScheme === 'light' ? SunIcon : MoonIcon} tone={colorScheme === 'light' ? 'warning' : 'info'} />
                  <Text variant="bodyMd">
                    {colorScheme === 'light' ? 'Light Mode' : 'Dark Mode'}
                  </Text>
                </InlineStack>
                <Button
                  onClick={() => {
                    console.log('🌓 Dark mode toggle clicked! Current:', colorScheme);
                    const newScheme = colorScheme === 'light' ? 'dark' : 'light';
                    console.log('🌓 Switching to:', newScheme);
                    if (typeof setColorScheme === 'function') {
                      setColorScheme(newScheme);
                      // Force localStorage update
                      localStorage.setItem('shopify-color-scheme', newScheme);
                      // Force document attribute update
                      document.documentElement.setAttribute('data-color-scheme', newScheme);
                      console.log('🌓 Dark mode updated successfully!');
                    } else {
                      console.error('❌ setColorScheme is not a function:', typeof setColorScheme);
                    }
                  }}
                  variant="primary"
                  tone={colorScheme === 'light' ? 'subdued' : 'magic'}
                >
                  Switch to {colorScheme === 'light' ? 'Dark' : 'Light'} Mode
                </Button>
              </InlineStack>
            </BlockStack>
          </Box>
        </BlockStack>
      </Modal.Section>
    </Modal>
  );
}

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
    <InlineStack gap="200" blockAlign="center">
      <Icon source={ClockIcon} tone="magic" />
      <Text variant="headingMd" fontWeight="bold" as="span">
        {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
      </Text>
    </InlineStack>
  );
}

function ResetCountdownTimer({ timeUntilReset, onRefresh }) {
  const [time, setTime] = useState(timeUntilReset);

  useEffect(() => {
    setTime(timeUntilReset);
  }, [timeUntilReset]);

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

  const hours = Math.floor(time / 3600);
  const minutes = Math.floor((time % 3600) / 60);
  const seconds = time % 60;

  return (
    <InlineStack gap="200" blockAlign="center">
      <Icon source={RefreshIcon} tone="success" />
      <Text variant="bodyMd" tone="subdued" as="span">
        Resets in: {hours.toString().padStart(2, '0')}:{minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
      </Text>
    </InlineStack>
  );
}

function App({ colorScheme = 'light', setColorScheme = () => {} }) {
  const [view, setView] = useState('landing');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check for OAuth success redirect
    const urlParams = new URLSearchParams(window.location.search);
    const oauthSuccess = urlParams.get('oauth_success');
    const email = urlParams.get('email');
    const waitlist = urlParams.get('waitlist');

    // Handle waitlist redirect (user installed but not approved)
    if (waitlist) {
      console.log('⏳ User on waitlist, showing waitlist view');
      setView('landing');
      const message = urlParams.get('message') || 'Your account is pending approval.';
      setError(message);
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    if (oauthSuccess && email) {
      // OAuth completed! Auto-login the user
      console.log('✅ OAuth success! Auto-logging in user:', email);

      // Try to login or create account automatically
      const autoLogin = async () => {
        try {
          // First try to login
          const loginData = await api.call('/api/login', {
            method: 'POST',
            body: JSON.stringify({ email, password: 'oauth_user' })
          });
          localStorage.setItem('authToken', loginData.token);
          localStorage.setItem('user', JSON.stringify(loginData.user));
          setUser(loginData.user);
          setView('dashboard');

          // Clean URL
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch (err) {
          console.error('Auto-login failed, user needs to login manually:', err);
          setView('auth');
          setError('OAuth successful! Please login with your account.');
        }
      };
      autoLogin();
      return;
    }

    // Normal login check
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

    const handleSubmit = async () => {
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
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}>
        <div style={{
          maxWidth: '500px',
          width: '100%',
          boxSizing: 'border-box',
        }}>
          <Box paddingBlockEnd="600">
            <BlockStack gap="400" align="center">
              <div style={{
                ...gradientStyles.purplePink,
                display: 'inline-block',
                boxShadow: '0 8px 32px rgba(102, 126, 234, 0.4)',
              }}>
                <Icon source={HomeIcon} />
              </div>
              <Text variant="heading2xl" as="h1" alignment="center">
                {isLogin ? 'Welcome Back' : 'Get Started'}
              </Text>
              <Text variant="bodyLg" tone="subdued" alignment="center">
                {isLogin ? 'Sign in to your AutoMerchant account' : 'Create your AutoMerchant account'}
              </Text>
            </BlockStack>
          </Box>

          <Card>
            <BlockStack gap="400">
              {error && (
                <Banner tone="critical">
                  <p>{error}</p>
                </Banner>
              )}

              {!isLogin && (
                <TextField
                  label="Name"
                  type="text"
                  value={formData.name}
                  onChange={(value) => setFormData({ ...formData, name: value })}
                  placeholder="Your name"
                  autoComplete="name"
                />
              )}

              <TextField
                label="Email"
                type="email"
                value={formData.email}
                onChange={(value) => setFormData({ ...formData, email: value })}
                placeholder="your@email.com"
                autoComplete="email"
              />

              <TextField
                label="Password"
                type="password"
                value={formData.password}
                onChange={(value) => setFormData({ ...formData, password: value })}
                placeholder="••••••••"
                autoComplete={isLogin ? "current-password" : "new-password"}
              />

              <Button
                variant="primary"
                size="large"
                fullWidth
                onClick={handleSubmit}
                loading={loading}
              >
                {isLogin ? 'Sign In' : 'Create Account'}
              </Button>

              <Box paddingBlockStart="200">
                <Button variant="plain" onClick={() => setIsLogin(!isLogin)} fullWidth>
                  {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
                </Button>
              </Box>
            </BlockStack>
          </Card>

          <Box paddingBlockStart="400">
            <div style={{ textAlign: 'center' }}>
              <Button variant="plain" onClick={() => setView('landing')}>
                ← Back to home
              </Button>
            </div>
          </Box>
        </div>
      </div>
    );
  };

  const DashboardView = () => {
    const [activeTab, setActiveTab] = useState(0);
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

    const [analysisStatus, setAnalysisStatus] = useState({
      selectedCount: 0,
      limit: 10,
      timeRemaining: 0,
      canAnalyze: true,
      nextAnalysisDue: null,
      manualUsedToday: 0,
      manualRemaining: 10,
      timeUntilReset: 0,
      resetTime: null
    });

    useEffect(() => {
      loadDashboardData();
      checkShopifyConnection();
      loadOrders();
      loadAnalysisStatus();

      // Check for OAuth success parameter
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('oauth_success')) {
        // Show success banner for a few seconds
        setTimeout(() => {
          checkShopifyConnection(); // Re-check connection after OAuth
        }, 1000);
      }
    }, []);

    const loadAnalysisStatus = async () => {
      try {
        const status = await api.call('/api/analysis/status');
        setAnalysisStatus(status);
      } catch (err) {
        console.error('Failed to load analysis status:', err);
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
          setError('Product limit reached! You can select up to 10 products on the Pro plan.');
          setTimeout(() => setError(null), 5000);
        } else {
          setError(err.message);
        }
      }
    };

    const runManualAnalysis = async () => {
      if (analysisStatus.manualRemaining <= 0) {
        setError(`Daily limit reached! You've used all 10 manual analyses today. Resets at midnight.`);
        setTimeout(() => setError(null), 5000);
        return;
      }

      if (analysisStatus.selectedCount === 0) {
        setError('Please select at least one product for analysis');
        setTimeout(() => setError(null), 3000);
        return;
      }

      setAnalyzing(true);
      setError(null);
      try {
        const result = await api.call('/api/analysis/run-now', { method: 'POST' });
        await loadDashboardData();
        await loadAnalysisStatus();
        setSuccessMessage(`Analysis completed! ${result.manualRemaining} manual analyses remaining today.`);
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
        setSuccessMessage('Price updated successfully!');
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

    // Calculate total AI profit for Analytics tab
    const calculateAIProfit = () => {
      if (!stats) return 0;
      return parseFloat(stats.totalAIProfit || 0).toFixed(2);
    };

    const tabs = [
      {
        id: 'dashboard',
        content: (
          <InlineStack gap="200" blockAlign="center">
            <Icon source={HomeIcon} />
            <Text variant="bodyMd" fontWeight="semibold">Dashboard</Text>
          </InlineStack>
        ),
      },
      {
        id: 'analytics',
        content: (
          <InlineStack gap="200" blockAlign="center">
            <Icon source={ChartVerticalFilledIcon} />
            <Text variant="bodyMd" fontWeight="semibold">Analytics</Text>
          </InlineStack>
        ),
      },
      {
        id: 'orders',
        content: (
          <InlineStack gap="200" blockAlign="center">
            <Icon source={CartIcon} />
            <Text variant="bodyMd" fontWeight="semibold">Orders</Text>
          </InlineStack>
        ),
      },
    ];

    return (
      <Page
        title="AutoMerchant Pricing AI"
        titleMetadata={
          <Badge tone="magic">Pro Plan</Badge>
        }
        primaryAction={
          <InlineStack gap="200">
            {analysisStatus.timeRemaining > 0 && activeTab === 0 && (
              <Box padding="200" background="bg-surface-secondary" borderRadius="200">
                <InlineStack gap="200" blockAlign="center">
                  <Text variant="bodySm" tone="subdued">Next Analysis:</Text>
                  <CountdownTimer
                    timeRemaining={Number(analysisStatus.timeRemaining)}
                    onRefresh={loadAnalysisStatus}
                  />
                </InlineStack>
              </Box>
            )}
          </InlineStack>
        }
        secondaryActions={[
          {
            content: checkingConnection ? 'Checking...' : shopifyConnected ? 'Connected' : 'Not Connected',
            icon: shopifyConnected ? CheckIcon : XIcon,
            tone: shopifyConnected ? 'success' : 'critical',
            onAction: () => setShowSettings(true),
          },
          {
            content: 'Settings',
            icon: SettingsIcon,
            onAction: () => setShowSettings(true),
          },
          {
            content: 'Logout',
            icon: ExitIcon,
            onAction: handleLogout,
          },
        ]}
      >
        <CostPriceModal
          isOpen={showCostPriceModal}
          onClose={() => {
            setShowCostPriceModal(false);
            setSelectedProduct(null);
          }}
          product={selectedProduct}
          onSave={() => {
            loadDashboardData();
            setSuccessMessage('Cost price updated successfully!');
            setTimeout(() => setSuccessMessage(null), 3000);
          }}
        />

        <SettingsModal
          isOpen={showSettings}
          onClose={handleSettingsClose}
          onConnect={checkShopifyConnection}
          shopifyConnected={shopifyConnected}
          colorScheme={colorScheme}
          setColorScheme={setColorScheme}
        />

        <Layout>
          <Layout.Section>
            <BlockStack gap="400">
              {error && (
                <Banner tone="critical" onDismiss={() => setError(null)}>
                  <p>{error}</p>
                </Banner>
              )}

              {successMessage && (
                <Banner tone="success" onDismiss={() => setSuccessMessage(null)}>
                  <p>{successMessage}</p>
                </Banner>
              )}

              {!shopifyConnected && activeTab === 0 && (
            <CalloutCard
              title="Shopify Not Connected"
              illustration="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
              primaryAction={{
                content: 'Connect Shopify Now',
                onAction: () => setShowSettings(true),
              }}
            >
              <p>Connect your Shopify store to sync products and enable AI-powered pricing optimization.</p>
            </CalloutCard>
          )}

          <Tabs tabs={tabs} selected={activeTab} onSelect={setActiveTab}>
            <Box paddingBlockStart="400">
              {/* DASHBOARD TAB */}
              {activeTab === 0 && (
                <BlockStack gap="400">
                  <Card>
                    <BlockStack gap="400">
                      <InlineStack align="space-between" blockAlign="center">
                        <BlockStack gap="100">
                          <Text variant="headingLg" as="h2">Products</Text>
                          <Text variant="bodyMd" tone="subdued">
                            {analysisStatus.selectedCount}/{analysisStatus.limit} products selected for AI analysis
                          </Text>
                        </BlockStack>

                        <InlineStack gap="200">
                          <BlockStack gap="100">
                            <Badge tone="magic">
                              {analysisStatus.manualRemaining}/10 manual analyses today
                            </Badge>
                            {analysisStatus.timeUntilReset > 0 && (
                              <ResetCountdownTimer
                                timeUntilReset={Number(analysisStatus.timeUntilReset)}
                                onRefresh={loadAnalysisStatus}
                              />
                            )}
                          </BlockStack>

                          {analysisStatus.timeRemaining > 0 && (
                            <Box padding="200" background="bg-surface-secondary" borderRadius="200">
                              <InlineStack gap="100" blockAlign="center">
                                <Text variant="bodySm" tone="subdued">Next auto:</Text>
                                <CountdownTimer
                                  timeRemaining={Number(analysisStatus.timeRemaining)}
                                  onRefresh={loadAnalysisStatus}
                                />
                              </InlineStack>
                            </Box>
                          )}

                          <Button
                            variant="primary"
                            icon={RefreshIcon}
                            onClick={runManualAnalysis}
                            loading={analyzing}
                            disabled={analysisStatus.manualRemaining <= 0 || analysisStatus.selectedCount === 0}
                          >
                            {analyzing ? 'Analyzing...' :
                             analysisStatus.manualRemaining <= 0 ? 'Limit Reached' :
                             'Analyze Now'}
                          </Button>

                          <Button
                            icon={RefreshIcon}
                            onClick={syncProducts}
                            loading={loading}
                            disabled={!shopifyConnected}
                          >
                            Sync Products
                          </Button>
                        </InlineStack>
                      </InlineStack>
                    </BlockStack>
                  </Card>

                  {products.length === 0 ? (
                    <Card>
                      <EmptyState
                        heading="No products yet"
                        image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                        action={
                          shopifyConnected ? {
                            content: 'Sync from Shopify',
                            onAction: syncProducts,
                            loading: loading,
                          } : {
                            content: 'Connect Shopify',
                            onAction: () => setShowSettings(true),
                          }
                        }
                      >
                        <p>
                          {shopifyConnected
                            ? 'Click "Sync" to import products from your Shopify store'
                            : 'Connect your Shopify store to get started'}
                        </p>
                      </EmptyState>
                    </Card>
                  ) : (
                    <BlockStack gap="300">
                      {products.map((product) => {
                        const costPrice = parseFloat(product.cost_price) || 0;
                        const sellingPrice = parseFloat(product.price);
                        const margin = costPrice > 0 ? (((sellingPrice - costPrice) / sellingPrice) * 100).toFixed(1) : 0;
                        const salesVelocity = parseFloat(product.sales_velocity) || 0;
                        const isSelected = product.selected_for_analysis || false;

                        return (
                          <Card key={product.id}>
                            <BlockStack gap="300">
                              <InlineStack align="space-between" blockAlign="start">
                                <InlineStack gap="300" blockAlign="start">
                                  <Box paddingBlockStart="100">
                                    <Checkbox
                                      checked={isSelected}
                                      onChange={() => toggleProductSelection(product.id, isSelected)}
                                      disabled={!isSelected && analysisStatus.selectedCount >= analysisStatus.limit}
                                    />
                                  </Box>
                                  <BlockStack gap="100">
                                    <Text variant="headingMd" fontWeight="bold">{product.title}</Text>
                                    <InlineStack gap="200">
                                      <Badge>Stock: {product.inventory}</Badge>
                                      {salesVelocity > 0 && (
                                        <Badge tone="success">{salesVelocity.toFixed(2)} sales/day</Badge>
                                      )}
                                    </InlineStack>
                                    {product.total_sales_30d > 0 && (
                                      <Text variant="bodySm" tone="subdued">
                                        {product.total_sales_30d} units sold (30d) • ${parseFloat(product.revenue_30d || 0).toFixed(2)} revenue
                                      </Text>
                                    )}
                                    {product.last_analyzed_at && (
                                      <Badge tone="magic">
                                        Last analyzed: {new Date(product.last_analyzed_at).toLocaleString()}
                                      </Badge>
                                    )}
                                  </BlockStack>
                                </InlineStack>

                                <BlockStack gap="100" align="end">
                                  <Text variant="heading2xl" fontWeight="bold">${sellingPrice.toFixed(2)}</Text>
                                  {costPrice > 0 && (
                                    <Badge tone={margin > 30 ? 'success' : margin > 15 ? 'warning' : 'critical'}>
                                      {margin}% margin
                                    </Badge>
                                  )}
                                </BlockStack>
                              </InlineStack>

                              <Divider />

                              <InlineStack align="space-between" blockAlign="center">
                                {costPrice > 0 ? (
                                  <Text variant="bodyMd" tone="subdued">
                                    Cost: <Text variant="bodyMd" fontWeight="semibold" as="span">${costPrice.toFixed(2)}</Text>
                                    <Text variant="bodySm" tone="subdued" as="span"> (${(sellingPrice - costPrice).toFixed(2)} profit/unit)</Text>
                                  </Text>
                                ) : (
                                  <Banner tone="warning">
                                    <p>No cost price set - AI can't analyze</p>
                                  </Banner>
                                )}

                                <Button
                                  onClick={() => {
                                    setSelectedProduct(product);
                                    setShowCostPriceModal(true);
                                  }}
                                  tone={costPrice > 0 ? undefined : 'critical'}
                                >
                                  {costPrice > 0 ? 'Update Cost' : 'Set Cost Price'}
                                </Button>
                              </InlineStack>
                            </BlockStack>
                          </Card>
                        );
                      })}
                    </BlockStack>
                  )}

                  {products.length > 0 && (
                    <Banner tone="info">
                      <BlockStack gap="200">
                        <Text variant="headingMd" fontWeight="semibold">How Analysis Works:</Text>
                        <BlockStack gap="100">
                          <Text variant="bodySm">• Select up to {analysisStatus.limit} products for AI analysis (Pro plan)</Text>
                          <Text variant="bodySm">• Analysis runs automatically every 30 minutes on selected products</Text>
                          <Text variant="bodySm">• You can run 10 manual analyses per day anytime you want</Text>
                          <Text variant="bodySm">• Manual analysis limit resets at midnight</Text>
                          <Text variant="bodySm">• Make sure to set cost prices before selecting products</Text>
                        </BlockStack>
                      </BlockStack>
                    </Banner>
                  )}

                  {recommendations.length > 0 && (
                    <BlockStack gap="400">
                      <Text variant="headingLg" as="h2">AI Recommendations</Text>
                      {recommendations.map((rec) => (
                        <Card key={rec.id}>
                          <div style={{
                            ...gradientStyles.purplePink,
                            boxShadow: '0 4px 20px rgba(102, 126, 234, 0.3)',
                          }}>
                            <BlockStack gap="400">
                              <InlineStack align="space-between" blockAlign="start">
                                <BlockStack gap="200">
                                  <Text variant="headingLg" fontWeight="bold" as="h3">{rec.title}</Text>
                                  <Text variant="bodyMd" as="p">{rec.reasoning}</Text>
                                </BlockStack>

                                <BlockStack gap="100" align="end">
                                  <Text variant="bodySm" tone="subdued">Current Price</Text>
                                  <Text variant="heading2xl" fontWeight="bold">${parseFloat(rec.current_price).toFixed(2)}</Text>
                                  <Text variant="bodySm" tone="subdued">Recommended Price</Text>
                                  <Text variant="heading3xl" fontWeight="bold" tone="success">
                                    ${parseFloat(rec.recommended_price).toFixed(2)}
                                  </Text>
                                </BlockStack>
                              </InlineStack>

                              <Divider />

                              <InlineStack align="space-between" blockAlign="center">
                                <InlineStack gap="200">
                                  <Badge tone={
                                    rec.urgency === 'CRITICAL' ? 'critical' :
                                    rec.urgency === 'URGENT' ? 'warning' :
                                    rec.urgency === 'HIGH' ? 'attention' : 'success'
                                  }>
                                    {rec.urgency}
                                  </Badge>
                                  <Badge>Confidence: {rec.confidence}%</Badge>
                                </InlineStack>

                                <Button
                                  variant="primary"
                                  tone="success"
                                  icon={CheckIcon}
                                  onClick={() => applyRecommendation(rec.id, rec.product_id, parseFloat(rec.recommended_price))}
                                >
                                  Apply Price
                                </Button>
                              </InlineStack>
                            </BlockStack>
                          </div>
                        </Card>
                      ))}
                    </BlockStack>
                  )}
                </BlockStack>
              )}

              {/* ANALYTICS TAB */}
              {activeTab === 1 && (
                <BlockStack gap="400">
                  <InlineGrid columns={{ xs: 1, sm: 2, md: 3 }} gap="400">
                    <Card>
                      <div style={{...gradientStyles.successGlow}}>
                        <BlockStack gap="200">
                          <Icon source={ChartVerticalFilledIcon} tone="success" />
                          <Text variant="headingMd" fontWeight="semibold">Total AI Profit</Text>
                          <Text variant="heading3xl" fontWeight="bold">${calculateAIProfit()}</Text>
                          <Text variant="bodySm" tone="subdued">Increased revenue from AI recommendations</Text>
                        </BlockStack>
                      </div>
                    </Card>

                    <Card>
                      <div style={{...gradientStyles.infoGlow}}>
                        <BlockStack gap="200">
                          <Icon source={CartIcon} tone="info" />
                          <Text variant="headingMd" fontWeight="semibold">Active Products</Text>
                          <Text variant="heading3xl" fontWeight="bold">{products.length}</Text>
                          <Text variant="bodySm" tone="subdued">Products in your store</Text>
                        </BlockStack>
                      </div>
                    </Card>

                    <Card>
                      <div style={{...gradientStyles.warningGlow}}>
                        <BlockStack gap="200">
                          <Icon source={RefreshIcon} tone="warning" />
                          <Text variant="headingMd" fontWeight="semibold">Recommendations</Text>
                          <Text variant="heading3xl" fontWeight="bold">{recommendations.length}</Text>
                          <Text variant="bodySm" tone="subdued">Pending AI recommendations</Text>
                        </BlockStack>
                      </div>
                    </Card>
                  </InlineGrid>

                  <Card>
                    <BlockStack gap="400">
                      <Text variant="headingLg" as="h2">Performance Overview</Text>
                      <Divider />
                      <BlockStack gap="300">
                        <InlineStack align="space-between">
                          <Text variant="bodyMd" fontWeight="semibold">Analysis Coverage</Text>
                          <Text variant="bodyMd">{analysisStatus.selectedCount}/{analysisStatus.limit} products</Text>
                        </InlineStack>
                        <ProgressBar
                          progress={(analysisStatus.selectedCount / analysisStatus.limit) * 100}
                          tone="primary"
                        />
                      </BlockStack>
                      <BlockStack gap="300">
                        <InlineStack align="space-between">
                          <Text variant="bodyMd" fontWeight="semibold">Daily Manual Analysis</Text>
                          <Text variant="bodyMd">{analysisStatus.manualUsedToday}/10 used</Text>
                        </InlineStack>
                        <ProgressBar
                          progress={(analysisStatus.manualUsedToday / 10) * 100}
                          tone="magic"
                        />
                        {analysisStatus.timeUntilReset > 0 && (
                          <ResetCountdownTimer
                            timeUntilReset={Number(analysisStatus.timeUntilReset)}
                            onRefresh={loadAnalysisStatus}
                          />
                        )}
                      </BlockStack>
                    </BlockStack>
                  </Card>

                  {/* ROI CALCULATOR */}
                  <Card>
                    <BlockStack gap="400">
                      <Text variant="headingLg" as="h2">💰 ROI Calculator</Text>
                      <Text variant="bodyMd" tone="subdued">
                        Calculate your return on investment from using AutoMerchant's AI pricing
                      </Text>
                      <Divider />

                      <InlineGrid columns={{ xs: 1, md: 2 }} gap="600">
                        {/* Input Section */}
                        <BlockStack gap="300">
                          <Text variant="headingMd" fontWeight="semibold">Your Metrics</Text>
                          <BlockStack gap="400">
                            <div>
                              <Text variant="bodyMd" fontWeight="semibold">Current Monthly Revenue</Text>
                              <Text variant="bodySm" tone="subdued" as="p">
                                ${stats ? parseFloat(stats.totalRevenue || 0).toFixed(2) : '0.00'} (from last 30 days)
                              </Text>
                            </div>
                            <div>
                              <Text variant="bodyMd" fontWeight="semibold">Total Products</Text>
                              <Text variant="bodySm" tone="subdued" as="p">
                                {products.length} active products
                              </Text>
                            </div>
                            <div>
                              <Text variant="bodyMd" fontWeight="semibold">AI Recommendations Applied</Text>
                              <Text variant="bodySm" tone="subdued" as="p">
                                {stats ? stats.productsAnalyzed || 0 : 0} products optimized
                              </Text>
                            </div>
                          </BlockStack>
                        </BlockStack>

                        {/* Results Section */}
                        <BlockStack gap="300">
                          <Text variant="headingMd" fontWeight="semibold">Projected Impact</Text>
                          <div style={{...gradientStyles.successGlow}}>
                            <BlockStack gap="300">
                              <BlockStack gap="100">
                                <Text variant="bodySm" tone="subdued" as="p" style={{color: 'rgba(255,255,255,0.8)'}}>
                                  Revenue Increase (Conservative 5%)
                                </Text>
                                <Text variant="heading2xl" fontWeight="bold" style={{color: 'white'}}>
                                  +${stats ? (parseFloat(stats.totalRevenue || 0) * 0.05).toFixed(2) : '0.00'}/mo
                                </Text>
                              </BlockStack>

                              <Divider borderColor="transparent" />

                              <BlockStack gap="100">
                                <Text variant="bodySm" tone="subdued" as="p" style={{color: 'rgba(255,255,255,0.8)'}}>
                                  Actual AI Profit Increase
                                </Text>
                                <Text variant="headingXl" fontWeight="bold" style={{color: 'white'}}>
                                  ${calculateAIProfit()}/mo
                                </Text>
                              </BlockStack>

                              <Divider borderColor="transparent" />

                              <BlockStack gap="100">
                                <Text variant="bodySm" tone="subdued" as="p" style={{color: 'rgba(255,255,255,0.8)'}}>
                                  Annual Projected Revenue
                                </Text>
                                <Text variant="headingLg" fontWeight="bold" style={{color: 'white'}}>
                                  ${stats ? (parseFloat(stats.totalRevenue || 0) * 12 * 1.05).toFixed(2) : '0.00'}/yr
                                </Text>
                              </BlockStack>
                            </BlockStack>
                          </div>
                        </BlockStack>
                      </InlineGrid>

                      <Divider />

                      {/* ROI Breakdown */}
                      <BlockStack gap="300">
                        <Text variant="headingMd" fontWeight="semibold">How We Calculate ROI</Text>
                        <InlineGrid columns={{ xs: 1, md: 3 }} gap="400">
                          <div>
                            <Text variant="bodyMd" fontWeight="semibold">📊 Data-Driven Pricing</Text>
                            <Text variant="bodySm" tone="subdued" as="p">
                              AI analyzes market trends, competitor pricing, and demand patterns to optimize your prices
                            </Text>
                          </div>
                          <div>
                            <Text variant="bodyMd" fontWeight="semibold">💹 Profit Optimization</Text>
                            <Text variant="bodySm" tone="subdued" as="p">
                              Increase margins by 3-8% without losing sales through smart price positioning
                            </Text>
                          </div>
                          <div>
                            <Text variant="bodyMd" fontWeight="semibold">⚡ Real-Time Updates</Text>
                            <Text variant="bodySm" tone="subdued" as="p">
                              Automatic analysis every 30 minutes ensures your prices stay competitive 24/7
                            </Text>
                          </div>
                        </InlineGrid>
                      </BlockStack>

                      <div style={{background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '16px', borderRadius: '12px'}}>
                        <InlineStack align="space-between" blockAlign="center">
                          <BlockStack gap="100">
                            <Text variant="headingMd" fontWeight="bold" style={{color: 'white'}}>
                              Your Estimated Monthly Savings
                            </Text>
                            <Text variant="bodySm" style={{color: 'rgba(255,255,255,0.9)'}}>
                              Time saved from manual pricing + revenue increase
                            </Text>
                          </BlockStack>
                          <Text variant="heading2xl" fontWeight="bold" style={{color: 'white'}}>
                            ${stats ? ((parseFloat(stats.totalRevenue || 0) * 0.05) + 200).toFixed(2) : '200.00'}
                          </Text>
                        </InlineStack>
                      </div>
                    </BlockStack>
                  </Card>

                  {stats && (
                    <Card>
                      <BlockStack gap="400">
                        <Text variant="headingLg" as="h2">Detailed Statistics</Text>
                        <Divider />
                        <InlineGrid columns={{ xs: 1, md: 2 }} gap="400">
                          <BlockStack gap="200">
                            <Text variant="bodyMd" tone="subdued">Total Revenue (30d)</Text>
                            <Text variant="headingXl" fontWeight="bold">${parseFloat(stats.totalRevenue || 0).toFixed(2)}</Text>
                          </BlockStack>
                          <BlockStack gap="200">
                            <Text variant="bodyMd" tone="subdued">Total Orders</Text>
                            <Text variant="headingXl" fontWeight="bold">{stats.totalOrders || 0}</Text>
                          </BlockStack>
                          <BlockStack gap="200">
                            <Text variant="bodyMd" tone="subdued">Average Order Value</Text>
                            <Text variant="headingXl" fontWeight="bold">${parseFloat(stats.avgOrderValue || 0).toFixed(2)}</Text>
                          </BlockStack>
                          <BlockStack gap="200">
                            <Text variant="bodyMd" tone="subdued">Products Analyzed</Text>
                            <Text variant="headingXl" fontWeight="bold">{stats.productsAnalyzed || 0}</Text>
                          </BlockStack>
                        </InlineGrid>
                      </BlockStack>
                    </Card>
                  )}
                </BlockStack>
              )}

              {/* ORDERS TAB */}
              {activeTab === 2 && (
                <BlockStack gap="400">
                  <Card>
                    <BlockStack gap="200">
                      <Text variant="headingLg" as="h2">Recent Orders</Text>
                      <Text variant="bodyMd" tone="subdued">Last 30 days from your Shopify store</Text>
                    </BlockStack>
                  </Card>

                  {!shopifyConnected ? (
                    <Card>
                      <EmptyState
                        heading="Connect Shopify to View Orders"
                        image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                        action={{
                          content: 'Connect Shopify',
                          onAction: () => setShowSettings(true),
                        }}
                      >
                        <p>Connect your Shopify store to see your recent orders and sales data</p>
                      </EmptyState>
                    </Card>
                  ) : orders.length === 0 ? (
                    <Card>
                      <EmptyState
                        heading="No orders yet"
                        image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                      >
                        <p>No orders found in the last 30 days</p>
                      </EmptyState>
                    </Card>
                  ) : (
                    <>
                      <InlineGrid columns={{ xs: 1, sm: 2 }} gap="400">
                        <Card>
                          <div style={{...gradientStyles.successGlow}}>
                            <BlockStack gap="200">
                              <Text variant="bodySm" tone="subdued">Total Orders</Text>
                              <Text variant="heading2xl" fontWeight="bold">{orders.length}</Text>
                            </BlockStack>
                          </div>
                        </Card>
                        <Card>
                          <div style={{...gradientStyles.purplePink}}>
                            <BlockStack gap="200">
                              <Text variant="bodySm" tone="subdued">Total Revenue</Text>
                              <Text variant="heading2xl" fontWeight="bold">
                                ${orders.reduce((sum, o) => sum + parseFloat(o.totalPrice), 0).toFixed(2)}
                              </Text>
                            </BlockStack>
                          </div>
                        </Card>
                      </InlineGrid>

                      <BlockStack gap="300">
                        {orders.map((order) => (
                          <Card key={order.id}>
                            <BlockStack gap="300">
                              <InlineStack align="space-between" blockAlign="start">
                                <BlockStack gap="100">
                                  <Text variant="headingMd" fontWeight="bold">Order #{order.orderNumber}</Text>
                                  <Text variant="bodyMd" tone="subdued">{order.customerName} • {order.email}</Text>
                                  <Text variant="bodySm" tone="subdued">
                                    {new Date(order.createdAt).toLocaleDateString()} at {new Date(order.createdAt).toLocaleTimeString()}
                                  </Text>
                                </BlockStack>

                                <BlockStack gap="100" align="end">
                                  <Text variant="headingXl" fontWeight="bold">${parseFloat(order.totalPrice).toFixed(2)}</Text>
                                  <Text variant="bodyMd" tone="subdued">{order.lineItemsCount} items</Text>
                                </BlockStack>
                              </InlineStack>

                              <Divider />

                              <BlockStack gap="200">
                                {order.items.map((item, idx) => (
                                  <InlineStack key={idx} align="space-between">
                                    <Text variant="bodySm" tone="subdued">{item.title} × {item.quantity}</Text>
                                    <Text variant="bodySm" fontWeight="semibold">
                                      ${(parseFloat(item.price) * item.quantity).toFixed(2)}
                                    </Text>
                                  </InlineStack>
                                ))}
                              </BlockStack>

                              <InlineStack gap="200">
                                <Badge tone={order.financialStatus === 'paid' ? 'success' : 'warning'}>
                                  {order.financialStatus}
                                </Badge>
                                <Badge tone={order.fulfillmentStatus === 'fulfilled' ? 'info' : undefined}>
                                  {order.fulfillmentStatus || 'unfulfilled'}
                                </Badge>
                              </InlineStack>
                            </BlockStack>
                          </Card>
                        ))}
                      </BlockStack>
                    </>
                  )}
                </BlockStack>
              )}
            </Box>
          </Tabs>
            </BlockStack>
          </Layout.Section>
        </Layout>
      </Page>
    );
  };

  const LandingView = () => {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        textAlign: 'center',
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}>
        <div style={{
          maxWidth: '800px',
          width: '100%',
          boxSizing: 'border-box',
        }}>
          <BlockStack gap="600" align="center">
            <div style={{
              ...gradientStyles.purplePink,
              display: 'inline-block',
              boxShadow: '0 12px 48px rgba(102, 126, 234, 0.5)',
            }}>
              <Icon source={HomeIcon} />
            </div>

            <BlockStack gap="400" align="center">
              <div style={{
                maxWidth: '100%',
                wordWrap: 'break-word',
                overflowWrap: 'break-word',
              }}>
                <Text variant="heading4xl" as="h1" alignment="center">
                  Welcome to AutoMerchant
                </Text>
              </div>
              <div style={{
                maxWidth: '100%',
                wordWrap: 'break-word',
                overflowWrap: 'break-word',
              }}>
                <Text variant="heading2xl" as="h2" alignment="center" tone="subdued">
                  AI-Powered Pricing Optimization
                </Text>
              </div>
              <Box paddingBlockStart="400">
                <div style={{
                  maxWidth: '100%',
                  wordWrap: 'break-word',
                  overflowWrap: 'break-word',
                  padding: '0 16px',
                }}>
                  <Text variant="bodyLg" as="p" alignment="center" tone="subdued">
                    Thank you for installing AutoMerchant! Get ready to optimize your product pricing with advanced AI algorithms that analyze sales velocity, inventory levels, and market conditions to maximize your revenue.
                  </Text>
                </div>
              </Box>
            </BlockStack>

            <Box paddingBlockStart="400">
              <div style={{
                maxWidth: '100%',
                boxSizing: 'border-box',
                padding: '0 16px',
              }}>
                <InlineStack gap="300" wrap={true} blockAlign="center" align="center">
                  <WaitlistButton onDevAccess={() => setView('auth')} />
                  <Text variant="bodySm" tone="subdued">
                    Be among the first 100 users
                  </Text>
                </InlineStack>
                <Box paddingBlockStart="200">
                  <Button variant="plain" onClick={() => setView('auth')}>
                    Already have an account? Sign in
                  </Button>
                </Box>
              </div>
            </Box>

            <Box paddingBlockStart="600">
              <div style={{
                maxWidth: '100%',
                boxSizing: 'border-box',
                padding: '0 16px',
              }}>
                <Card>
                  <BlockStack gap="300">
                  <Text variant="headingMd" fontWeight="bold" alignment="center">
                    What you'll get:
                  </Text>
                  <InlineGrid columns={{ xs: 1, sm: 3 }} gap="400">
                    <BlockStack gap="200" align="center">
                      <Icon source={ChartVerticalFilledIcon} tone="magic" />
                      <Text variant="bodyMd" fontWeight="semibold">Smart AI Analysis</Text>
                      <Text variant="bodySm" alignment="center" tone="subdued">
                        Automatic analysis every 30 minutes
                      </Text>
                    </BlockStack>
                    <BlockStack gap="200" align="center">
                      <Icon source={RefreshIcon} tone="success" />
                      <Text variant="bodyMd" fontWeight="semibold">Manual Control</Text>
                      <Text variant="bodySm" alignment="center" tone="subdued">
                        10 manual analyses per day
                      </Text>
                    </BlockStack>
                    <BlockStack gap="200" align="center">
                      <Icon source={HomeIcon} tone="info" />
                      <Text variant="bodyMd" fontWeight="semibold">Pro Plan</Text>
                      <Text variant="bodySm" alignment="center" tone="subdued">
                        Analyze up to 10 products
                      </Text>
                    </BlockStack>
                  </InlineGrid>
                </BlockStack>
              </Card>
              </div>
            </Box>
          </BlockStack>
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
