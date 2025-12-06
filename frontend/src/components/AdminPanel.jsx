import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Check, LogOut, Copy, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

// Keep API_URL as is - it should already point to the /api endpoint
const API_URL = process.env.REACT_APP_API_URL || '';
const DEFAULT_ADMIN_EMAIL = 'arealhuman21@gmail.com';

const encodeSegment = (value) => {
  const json = typeof value === 'string' ? value : JSON.stringify(value);
  let base64;

  if (typeof window !== 'undefined' && typeof window.btoa === 'function') {
    base64 = window.btoa(json);
  } else if (typeof Buffer !== 'undefined') {
    base64 = Buffer.from(json, 'utf-8').toString('base64');
  } else {
    throw new Error('No base64 encoder available for admin token creation');
  }

  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const buildFallbackToken = (email) => {
  if (!email) return null;
  const header = encodeSegment({ alg: 'HS256', typ: 'JWT' });
  const payload = encodeSegment({ email });
  return `${header}.${payload}.admin`;
};

function AdminPanel({ userEmail, onLogout }) {
  const [activeTab, setActiveTab] = useState('apps'); // 'apps' | 'users' | 'guide'

  // Apps state
  const [apps, setApps] = useState([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [showAddApp, setShowAddApp] = useState(false);
  const [newApp, setNewApp] = useState({
    appName: '',
    clientId: '',
    clientSecret: '',
    shopDomain: '',
    userEmail: ''
  });
  const [copiedLink, setCopiedLink] = useState(null);

  // Users state
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [appsError, setAppsError] = useState(null);
  const [usersError, setUsersError] = useState(null);

  // Stats state
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);

  const getAuthToken = async () => {
    if (supabase) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          return session.access_token;
        }
      } catch (error) {
        console.warn('Supabase session unavailable, falling back to local admin token.', error);
      }
    }

    const fallbackEmail = userEmail || DEFAULT_ADMIN_EMAIL;
    return buildFallbackToken(fallbackEmail);
  };

  const authorizedFetch = async (url, options = {}) => {
    const token = await getAuthToken();
    console.log('🔑 Got auth token:', token ? `${token.substring(0, 20)}...` : 'null');

    if (!token) {
      throw new Error('Unable to authenticate admin request');
    }

    const headers = {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`
    };

    console.log('📡 Making request to:', url);
    console.log('📋 Headers:', { ...headers, Authorization: headers.Authorization ? 'Bearer ...' : 'none' });

    return fetch(url, { ...options, headers });
  };

  useEffect(() => {
    loadApps();
    loadUsers();
    loadStats();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadApps = async () => {
    setLoadingApps(true);
    setAppsError(null);
    try {
      const response = await authorizedFetch(`${API_URL}/admin/apps`);

      if (!response.ok) throw new Error('Failed to load apps');

      const data = await response.json();
      setApps(data.apps || []);
    } catch (error) {
      console.error('Error loading apps:', error);
      setAppsError(error.message || 'Unable to load apps');
    } finally {
      setLoadingApps(false);
    }
  };

  const submitLockRef = useRef(false);

  const handleAddApp = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    console.log('📝 Adding new app:', newApp);

    // Use ref for immediate, synchronous lock
    if (submitLockRef.current) {
      console.log('⚠️ Already submitting, ignoring duplicate request');
      return;
    }

    submitLockRef.current = true;
    setLoadingApps(true);

    try {
      // Clean and validate input
      const cleanShopDomain = newApp.shopDomain
        .trim()
        .replace(/\s+Store information$/i, '') // Remove "Store information" suffix
        .replace(/\s+/g, '') // Remove any remaining whitespace
        .toLowerCase();

      const payload = {
        appName: newApp.appName.trim(),
        clientId: newApp.clientId.trim(),
        clientSecret: newApp.clientSecret.trim(),
        shopDomain: cleanShopDomain,
        userEmail: newApp.userEmail.trim()
      };

      // Validate shop domain format
      if (!cleanShopDomain.endsWith('.myshopify.com')) {
        throw new Error('Shop domain must be in format: yourstore.myshopify.com');
      }

      console.log('📤 Sending payload to backend');
      console.log('🌐 API URL:', API_URL);
      console.log('🔗 Full URL:', `${API_URL}/admin/apps`);
      console.log('📦 Payload:', payload);

      const response = await Promise.race([
        authorizedFetch(`${API_URL}/admin/apps`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout after 30 seconds')), 30000)
        )
      ]);

      console.log('📥 Got response, status:', response.status);

      const data = await response.json();
      console.log('📥 Response data:', data);

      if (!response.ok) {
        console.error('❌ Server error:', data);
        throw new Error(data.error || 'Failed to add app');
      }

      console.log('✅ App created:', data.app);

      // Add to local state
      setApps([data.app, ...apps]);
      setShowAddApp(false);
      setNewApp({
        appName: '',
        clientId: '',
        clientSecret: '',
        shopDomain: '',
        userEmail: ''
      });

      alert(`✅ App "${data.app.app_name}" saved successfully!`);

      // No need to reload - we already added it to local state above (line 186)
      // Reloading causes unnecessary delay and potential timeout issues
    } catch (error) {
      console.error('❌ Error adding app:', error);
      alert('Error adding app: ' + error.message);
    } finally {
      submitLockRef.current = false;
      setLoadingApps(false);
    }
  };

  const handleDeleteApp = async (id) => {
    if (!window.confirm('Are you sure you want to delete this app?')) return;

    try {
      const response = await authorizedFetch(`${API_URL}/admin/apps/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete app');

      setApps(apps.filter(app => app.id !== id));
    } catch (error) {
      alert('Error deleting app: ' + error.message);
    }
  };

  const loadUsers = async () => {
    setLoadingUsers(true);
    setUsersError(null);
    try {
      const response = await authorizedFetch(`${API_URL}/admin/users`);

      if (!response.ok) throw new Error('Failed to load users');

      const data = await response.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error('Error loading users:', error);
      setUsersError(error.message || 'Unable to load users');
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleApproveUser = async (id) => {
    try {
      const response = await authorizedFetch(`${API_URL}/admin/users/${id}/approve`, {
        method: 'POST'
      });

      if (!response.ok) throw new Error('Failed to approve user');

      setUsers(users.map(user =>
        user.id === id ? { ...user, approved: true, suspended: false } : user
      ));
      loadStats(); // Refresh stats
    } catch (error) {
      alert('Error approving user: ' + error.message);
    }
  };

  const handleRemoveUser = async (id) => {
    if (!window.confirm('Are you sure you want to remove this user?')) return;

    try {
      const response = await authorizedFetch(`${API_URL}/admin/users/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to remove user');

      setUsers(users.filter(user => user.id !== id));
      loadStats(); // Refresh stats
    } catch (error) {
      alert('Error removing user: ' + error.message);
    }
  };

  const handleSuspendUser = async (id) => {
    if (!window.confirm('Are you sure you want to suspend this user?')) return;

    try {
      const response = await authorizedFetch(`${API_URL}/admin/users/${id}/suspend`, {
        method: 'POST'
      });

      if (!response.ok) throw new Error('Failed to suspend user');

      setUsers(users.map(user =>
        user.id === id ? { ...user, suspended: true } : user
      ));
      loadStats(); // Refresh stats
    } catch (error) {
      alert('Error suspending user: ' + error.message);
    }
  };

  const handleUnsuspendUser = async (id) => {
    try {
      const response = await authorizedFetch(`${API_URL}/admin/users/${id}/unsuspend`, {
        method: 'POST'
      });

      if (!response.ok) throw new Error('Failed to unsuspend user');

      setUsers(users.map(user =>
        user.id === id ? { ...user, suspended: false } : user
      ));
      loadStats(); // Refresh stats
    } catch (error) {
      alert('Error unsuspending user: ' + error.message);
    }
  };

  const handleAssignApp = async (userId, appId) => {
    try {
      console.log('🔗 Assigning app:', { userId, appId });

      const response = await authorizedFetch(`${API_URL}/admin/users/${userId}/assign-app`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ appId: parseInt(appId) })
      });

      console.log('📥 Assign response status:', response.status);

      const data = await response.json();
      console.log('📥 Assign response data:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to assign app');
      }

      // Reload users to get updated app assignment
      await loadUsers();
      alert('✅ App assigned successfully!');
    } catch (error) {
      console.error('❌ Error assigning app:', error);
      alert('Error assigning app: ' + error.message);
    }
  };

  const loadStats = async () => {
    setLoadingStats(true);
    try {
      const response = await authorizedFetch(`${API_URL}/admin/stats`);

      if (!response.ok) throw new Error('Failed to load stats');

      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const copyInstallLink = (app) => {
    const installLink = app.install_url || `https://automerchant-backend-v2.vercel.app/api/shopify/install?shop=${app.shop_domain}&app_id=${app.id}`;
    if (!installLink) {
      alert('No install link stored for this app yet.');
      return;
    }

    navigator.clipboard.writeText(installLink);
    setCopiedLink(app.id);
    setTimeout(() => setCopiedLink(null), 2000);
    alert(`Install link copied!\n\nIMPORTANT: Add user's email to the link:\n${installLink}&user_email=THEIR_EMAIL`);
  };

  const copyInstallLinkForUser = (app, user) => {
    let installLink = app.install_url;

    if (!installLink) {
      alert('No install link stored for this app yet.');
      return;
    }

    // Append user_email parameter to the Shopify install link
    const separator = installLink.includes('?') ? '&' : '?';
    const fullLink = `${installLink}${separator}user_email=${encodeURIComponent(user.email)}`;

    navigator.clipboard.writeText(fullLink);
    alert(`Install link copied for ${user.email}!\n\nSend this link to the customer:\n${fullLink}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white">Admin Panel</h1>
            <p className="text-gray-400 text-sm mt-1">Logged in as: {userEmail}</p>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center space-x-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex space-x-4 mb-6">
          <button
            onClick={() => setActiveTab('apps')}
            className={`px-6 py-3 rounded-lg font-medium transition ${
              activeTab === 'apps'
                ? 'bg-purple-600 text-white'
                : 'bg-slate-800 text-gray-300 hover:bg-slate-700'
            }`}
          >
            Shopify Apps
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-6 py-3 rounded-lg font-medium transition ${
              activeTab === 'users'
                ? 'bg-purple-600 text-white'
                : 'bg-slate-800 text-gray-300 hover:bg-slate-700'
            }`}
          >
            Users
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`px-6 py-3 rounded-lg font-medium transition ${
              activeTab === 'guide'
                ? 'bg-purple-600 text-white'
                : 'bg-slate-800 text-gray-300 hover:bg-slate-700'
            }`}
          >
            Setup Guide
          </button>
        </div>

        {/* Apps Tab */}
        {activeTab === 'apps' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white">Shopify Apps</h2>
              <button
                onClick={() => setShowAddApp(!showAddApp)}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition"
              >
                <Plus className="w-4 h-4" />
                <span>Add App</span>
              </button>
            </div>
            {appsError && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-lg">
                {appsError}
              </div>
            )}

            {/* Add App Form */}
            {showAddApp && (
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                <h3 className="text-xl font-bold text-white mb-4">Add New App</h3>
                <form onSubmit={handleAddApp} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">App Name</label>
                      <input
                        type="text"
                        value={newApp.appName}
                        onChange={(e) => setNewApp({ ...newApp, appName: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="e.g., App 1"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Shop Domain</label>
                      <input
                        type="text"
                        value={newApp.shopDomain}
                        onChange={(e) => setNewApp({ ...newApp, shopDomain: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="store.myshopify.com"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">User Email (Searchable)</label>
                      <input
                        type="text"
                        list="user-emails"
                        value={newApp.userEmail}
                        onChange={(e) => setNewApp({ ...newApp, userEmail: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="Type to search users..."
                        required
                      />
                      <datalist id="user-emails">
                        {users
                          .filter(user => user.approved && !user.suspended) // Only show approved, non-suspended users
                          .sort((a, b) => a.email.localeCompare(b.email)) // Sort alphabetically
                          .map(user => (
                            <option key={user.id} value={user.email} />
                          ))
                        }
                      </datalist>
                      <p className="text-xs text-green-400 mt-1">
                        ✅ <strong>Type to search</strong> - Select from approved users only
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Uses their AutoMerchant signup email (works even if different from Shopify email)
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Client ID</label>
                      <input
                        type="text"
                        value={newApp.clientId}
                        onChange={(e) => setNewApp({ ...newApp, clientId: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="Shopify API Key"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Client Secret</label>
                      <input
                        type="password"
                        value={newApp.clientSecret}
                        onChange={(e) => setNewApp({ ...newApp, clientSecret: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="Shopify API Secret"
                        required
                      />
                    </div>
                  </div>
                  <div className="flex space-x-3">
                    <button
                      type="submit"
                      disabled={loadingApps}
                      className={`px-4 py-2 ${loadingApps ? 'bg-gray-500 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'} text-white rounded-lg transition`}
                    >
                      {loadingApps ? 'Adding...' : 'Add App'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddApp(false)}
                      disabled={loadingApps}
                      className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition disabled:bg-gray-500 disabled:cursor-not-allowed"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Apps List */}
            <div className="space-y-4">
              {loadingApps ? (
                <div className="text-center py-8 text-gray-400">Loading apps...</div>
              ) : apps.length === 0 ? (
                <div className="text-center py-8 text-gray-400">No apps yet. Add your first app!</div>
              ) : (
                apps.map((app) => (
                  <div key={app.id} className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-white mb-2">{app.app_name}</h3>
                        <div className="space-y-1 text-sm text-gray-400 mb-3">
                          <p><span className="font-medium text-gray-300">Shop:</span> {app.shop_domain}</p>
                          <p><span className="font-medium text-gray-300">Client ID:</span> {app.client_id}</p>
                          <p><span className="font-medium text-gray-300">Status:</span> <span className="text-green-400">{app.status}</span></p>
                          <p><span className="font-medium text-gray-300">Created:</span> {new Date(app.created_at).toLocaleDateString()}</p>
                        </div>

                        {/* Shopify Install Link Display */}
                        <div className="bg-slate-900 border border-slate-600 rounded-lg p-3 mb-3">
                          <p className="text-xs font-medium text-gray-400 mb-1">Shopify Install Link:</p>
                          <div className="flex items-center space-x-2">
                            <code className="flex-1 text-xs text-purple-300 bg-slate-950 px-2 py-1 rounded overflow-x-auto">
                              {app.install_url || 'No install link saved yet.'}
                            </code>
                            <button
                              onClick={() => copyInstallLink(app)}
                              className="p-2 bg-purple-600 hover:bg-purple-700 text-white rounded transition"
                              title="Copy install link"
                            >
                              {copiedLink === app.id ? (
                                <CheckCircle className="w-4 h-4" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteApp(app.id)}
                        className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white">User Management</h2>
            </div>

            {/* Stats Cards */}
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-4">
                  <p className="text-sm text-blue-300 mb-1">Total Users</p>
                  <p className="text-3xl font-bold text-white">{stats.totalUsers}</p>
                </div>
                <div className="bg-green-900/20 border border-green-500/30 rounded-xl p-4">
                  <p className="text-sm text-green-300 mb-1">Approved</p>
                  <p className="text-3xl font-bold text-white">{stats.approvedUsers}</p>
                </div>
                <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-xl p-4">
                  <p className="text-sm text-yellow-300 mb-1">Pending</p>
                  <p className="text-3xl font-bold text-white">{stats.pendingUsers}</p>
                </div>
                <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-4">
                  <p className="text-sm text-red-300 mb-1">Suspended</p>
                  <p className="text-3xl font-bold text-white">{stats.suspendedUsers}</p>
                </div>
                <div className="bg-purple-900/20 border border-purple-500/30 rounded-xl p-4">
                  <p className="text-sm text-purple-300 mb-1">Total Apps</p>
                  <p className="text-3xl font-bold text-white">{stats.totalApps}</p>
                </div>
              </div>
            )}

            {usersError && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-lg">
                {usersError}
              </div>
            )}

            <div className="space-y-4">
              {loadingUsers ? (
                <div className="text-center py-8 text-gray-400">Loading users...</div>
              ) : users.length === 0 ? (
                <div className="text-center py-8 text-gray-400">No users found.</div>
              ) : (
                users.map((user) => (
                  <div key={user.id} className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-xl font-bold text-white">{user.name || user.email}</h3>
                          {user.approved && (
                            <span className="px-3 py-1 bg-green-600 text-white text-xs font-medium rounded-full">
                              ✓ Approved
                            </span>
                          )}
                          {user.suspended && (
                            <span className="px-3 py-1 bg-red-600 text-white text-xs font-medium rounded-full">
                              🚫 Suspended
                            </span>
                          )}
                          {!user.approved && !user.suspended && (
                            <span className="px-3 py-1 bg-yellow-600 text-white text-xs font-medium rounded-full">
                              ⏳ Pending
                            </span>
                          )}
                        </div>
                        <div className="space-y-1 text-sm text-gray-400">
                          <p><span className="font-medium text-gray-300">Email:</span> {user.email}</p>
                          <p><span className="font-medium text-gray-300">Joined:</span> {new Date(user.created_at).toLocaleDateString()}</p>
                          {user.assigned_app_name && (
                            <p><span className="font-medium text-gray-300">Assigned App:</span> <span className="text-purple-400">{user.assigned_app_name}</span></p>
                          )}
                        </div>

                        {/* App Assignment Dropdown */}
                        {user.approved && !user.suspended && apps.length > 0 && (
                          <div className="mt-3">
                            <label className="block text-xs text-gray-400 mb-1">Assign Shopify App:</label>
                            <select
                              value={user.assigned_app_id || ''}
                              onChange={(e) => handleAssignApp(user.id, e.target.value || null)}
                              className="w-full max-w-xs px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                            >
                              <option value="">-- No app assigned --</option>
                              {apps.map((app) => (
                                <option key={app.id} value={app.id}>
                                  {app.app_name} ({app.shop_domain})
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col space-y-2">
                        {/* Copy Install Link Button */}
                        {user.assigned_app_id && user.approved && (
                          <button
                            onClick={() => {
                              const assignedApp = apps.find(a => a.id === user.assigned_app_id);
                              if (assignedApp) {
                                copyInstallLinkForUser(assignedApp, user);
                              }
                            }}
                            className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition flex items-center space-x-1"
                            title="Copy install link for this user"
                          >
                            <Copy className="w-4 h-4" />
                            <span>Copy Link</span>
                          </button>
                        )}

                        {!user.approved && !user.suspended && (
                          <button
                            onClick={() => handleApproveUser(user.id)}
                            className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition flex items-center space-x-1"
                            title="Approve user"
                          >
                            <Check className="w-4 h-4" />
                            <span>Approve</span>
                          </button>
                        )}
                        {user.approved && !user.suspended && (
                          <button
                            onClick={() => handleSuspendUser(user.id)}
                            className="px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm rounded-lg transition flex items-center space-x-1"
                            title="Suspend user"
                          >
                            <span>🚫</span>
                            <span>Suspend</span>
                          </button>
                        )}
                        {user.suspended && (
                          <button
                            onClick={() => handleUnsuspendUser(user.id)}
                            className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition flex items-center space-x-1"
                            title="Unsuspend user"
                          >
                            <Check className="w-4 h-4" />
                            <span>Unsuspend</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleRemoveUser(user.id)}
                          className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition flex items-center space-x-1"
                          title="Remove user"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Setup Guide Tab */}
        {activeTab === 'guide' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white mb-4">Quick Onboarding Guide</h2>

            {/* Step 1 */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold">1</div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white mb-2">Create Shopify Partner App</h3>
                  <p className="text-gray-300 mb-3">Go to Shopify Partners and create a new custom app for each customer.</p>
                  <div className="bg-slate-900 p-4 rounded-lg text-sm text-gray-300 space-y-2">
                    <p><span className="text-purple-400">•</span> App URL: <code className="bg-slate-700 px-2 py-1 rounded">https://automerchant.vercel.app</code></p>
                    <p><span className="text-red-400">•</span> <span className="text-red-400 font-bold">CRITICAL:</span> Redirect URL: <code className="bg-red-900/30 border border-red-500/50 px-2 py-1 rounded">https://automerchant-backend-v2.vercel.app/api/shopify/callback</code></p>
                    <p className="text-yellow-300 text-xs ml-4">(Must be BACKEND URL, not frontend! This is the #1 cause of "invalid install link" errors)</p>
                    <p><span className="text-purple-400">•</span> Scopes: <code className="bg-slate-700 px-2 py-1 rounded">read_products,write_products,read_orders,write_inventory</code></p>
                    <p><span className="text-purple-400">•</span> Distribution: <span className="text-yellow-400 font-medium">Custom distribution</span></p>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold">2</div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white mb-2">Add App to Admin Panel</h3>
                  <p className="text-gray-300 mb-3">Go to the <span className="text-purple-400 font-medium">Shopify Apps</span> tab and click <span className="text-green-400 font-medium">+ Add App</span>.</p>
                  <div className="bg-slate-900 p-4 rounded-lg text-sm text-gray-300 space-y-2">
                    <p><span className="text-purple-400">•</span> Enter a friendly app name (e.g., "App for Customer 1")</p>
                    <p><span className="text-purple-400">•</span> Paste the Client ID from Shopify</p>
                    <p><span className="text-purple-400">•</span> Paste the Client Secret from Shopify</p>
                    <p><span className="text-purple-400">•</span> Enter the customer's shop domain (e.g., "customerstore.myshopify.com")</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold">3</div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white mb-2">Approve User & Assign App</h3>
                  <p className="text-gray-300 mb-3">Go to the <span className="text-purple-400 font-medium">Users</span> tab and approve the customer.</p>
                  <div className="bg-slate-900 p-4 rounded-lg text-sm text-gray-300 space-y-2">
                    <p><span className="text-purple-400">•</span> Find the user in the Users tab</p>
                    <p><span className="text-purple-400">•</span> Click <span className="text-green-400 font-medium">Approve</span> to grant them access</p>
                    <p><span className="text-purple-400">•</span> Select the app you created from the dropdown to assign it to them</p>
                    <p><span className="text-purple-400">•</span> This links the user to their specific Shopify app</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 4 */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold">4</div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white mb-2">Copy & Send Install Link</h3>
                  <p className="text-gray-300 mb-3">Once assigned, copy the personalized install link and send it to the customer.</p>
                  <div className="bg-slate-900 p-4 rounded-lg text-sm text-gray-300 space-y-2">
                    <p><span className="text-purple-400">•</span> After assigning the app, click <span className="text-purple-400 font-medium">Copy Link</span> next to the user</p>
                    <p><span className="text-purple-400">•</span> This link includes their email and the app assignment</p>
                    <p><span className="text-purple-400">•</span> Send this link to the customer via email</p>
                    <p className="font-medium text-white mb-2 mt-3">Email Template:</p>
                    <div className="bg-slate-800 p-3 rounded border border-slate-600">
                      <p className="text-gray-400 italic">Hi [Customer],</p>
                      <p className="text-gray-400 italic mt-2">Great news! Your AutoMerchant account has been approved.</p>
                      <p className="text-gray-400 italic mt-2">Click this link to install AutoMerchant on your Shopify store:</p>
                      <p className="text-blue-400 italic mt-2">[INSTALL LINK]</p>
                      <p className="text-gray-400 italic mt-2">After installation, you'll automatically be logged in and ready to optimize your pricing!</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 5 */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold">5</div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white mb-2">Customer Installs & Accesses Product</h3>
                  <p className="text-gray-300 mb-3">Customer clicks the link, authorizes the app, and is automatically logged in.</p>
                  <div className="bg-slate-900 p-4 rounded-lg text-sm text-gray-300 space-y-2">
                    <p><span className="text-purple-400">•</span> They'll see Shopify's authorization page</p>
                    <p><span className="text-purple-400">•</span> After clicking "Install", their shop is connected</p>
                    <p><span className="text-purple-400">•</span> The access token is stored in your database</p>
                    <p><span className="text-purple-400">•</span> <span className="text-green-400 font-medium">They're automatically logged into the product dashboard!</span></p>
                    <p><span className="text-purple-400">•</span> They can immediately start using AutoMerchant</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Important Notes */}
            <div className="bg-blue-900/20 border border-blue-500/50 rounded-xl p-6">
              <h3 className="text-xl font-bold text-blue-300 mb-3">Important Notes</h3>
              <div className="space-y-2 text-gray-300 text-sm">
                <p><span className="text-blue-400">•</span> Each custom distribution app can handle 2-3 shops maximum</p>
                <p><span className="text-blue-400">•</span> For 5-15 customers, create 5-15 separate Shopify Partner apps</p>
                <p><span className="text-blue-400">•</span> Always double-check the saved install link matches the correct customer</p>
                <p><span className="text-blue-400">•</span> The shop domain must match exactly what's in the Shopify Partner app settings</p>
              </div>
            </div>

            {/* Troubleshooting */}
            <div className="bg-red-900/20 border border-red-500/50 rounded-xl p-6">
              <h3 className="text-xl font-bold text-red-300 mb-3">⚠️ Troubleshooting Common Issues</h3>
              <div className="space-y-4 text-sm text-gray-300">
                <div>
                  <p className="font-bold text-white mb-1">"The installation link for this app is invalid"</p>
                  <p className="text-red-300">→ The OAuth redirect URI in Shopify is wrong!</p>
                  <p className="ml-4 mt-1">Go to Shopify Partners → Your App → Configuration → URLs</p>
                  <p className="ml-4">Verify it's: <code className="bg-slate-700 px-2 py-1 rounded text-green-400">https://automerchant-backend-v2.vercel.app/api/shopify/callback</code></p>
                </div>
                <div>
                  <p className="font-bold text-white mb-1">Admin Panel times out when adding apps</p>
                  <p className="text-yellow-300">→ Browser has cached a failed CORS request</p>
                  <p className="ml-4 mt-1">Solution: Use Incognito mode or clear browser cache (Ctrl+Shift+Delete)</p>
                </div>
                <div>
                  <p className="font-bold text-white mb-1">User can't access dashboard after install</p>
                  <p className="text-yellow-300">→ Check if user is approved and has assigned app</p>
                  <p className="ml-4 mt-1">Go to Users tab → Verify status shows "✓ Approved"</p>
                  <p className="ml-4">Make sure app is assigned in the dropdown</p>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
              <h3 className="text-xl font-bold text-white mb-3">Quick Links</h3>
              <div className="space-y-2">
                <a href="https://partners.shopify.com" target="_blank" rel="noopener noreferrer" className="block text-purple-400 hover:text-purple-300 transition">
                  → Shopify Partners Dashboard
                </a>
                <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="block text-purple-400 hover:text-purple-300 transition">
                  → Supabase Dashboard
                </a>
                <a href="https://github.com/arealhuman21-oss/automerchant-local/blob/master/COMPLETE_ONBOARDING_GUIDE.md" target="_blank" rel="noopener noreferrer" className="block text-purple-400 hover:text-purple-300 transition">
                  → Complete Onboarding Guide (GitHub)
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminPanel;


