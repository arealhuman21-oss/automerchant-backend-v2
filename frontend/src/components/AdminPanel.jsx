import { useState, useEffect } from 'react';
import { Plus, Trash2, Check, LogOut, Copy, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const API_URL = process.env.REACT_APP_API_URL || '/api';

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
    shopDomain: ''
  });
  const [copiedLink, setCopiedLink] = useState(null);

  // Users state
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    loadApps();
    loadUsers();
  }, []);

  const loadApps = async () => {
    setLoadingApps(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch(`${API_URL}/admin/apps`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to load apps');

      const data = await response.json();
      setApps(data.apps || []);
    } catch (error) {
      console.error('Error loading apps:', error);
    } finally {
      setLoadingApps(false);
    }
  };

  const handleAddApp = async (e) => {
    e.preventDefault();

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch(`${API_URL}/admin/apps`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newApp)
      });

      if (!response.ok) throw new Error('Failed to add app');

      const data = await response.json();
      setApps([data.app, ...apps]);
      setShowAddApp(false);
      setNewApp({ appName: '', clientId: '', clientSecret: '', shopDomain: '' });

      // Copy install link to clipboard and show success
      navigator.clipboard.writeText(data.installLink);
      alert(`✅ App added successfully!\n\nOAuth Install Link copied to clipboard:\n\n${data.installLink}\n\nSend this link to your customer to install the app on their Shopify store.`);
    } catch (error) {
      alert('Error adding app: ' + error.message);
    }
  };

  const handleDeleteApp = async (id) => {
    if (!window.confirm('Are you sure you want to delete this app?')) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch(`${API_URL}/admin/apps/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to delete app');

      setApps(apps.filter(app => app.id !== id));
    } catch (error) {
      alert('Error deleting app: ' + error.message);
    }
  };

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch(`${API_URL}/admin/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to load users');

      const data = await response.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleApproveUser = async (id) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch(`${API_URL}/admin/users/${id}/approve`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to approve user');

      setUsers(users.map(user =>
        user.id === id ? { ...user, approved: true } : user
      ));
    } catch (error) {
      alert('Error approving user: ' + error.message);
    }
  };

  const handleRemoveUser = async (id) => {
    if (!window.confirm('Are you sure you want to remove this user?')) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch(`${API_URL}/admin/users/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to remove user');

      setUsers(users.filter(user => user.id !== id));
    } catch (error) {
      alert('Error removing user: ' + error.message);
    }
  };

  const copyInstallLink = (app) => {
    const userEmail = prompt('Enter user email to link this shop installation:');
    if (!userEmail) {
      alert('User email is required to generate install link');
      return;
    }

    const installLink = `https://automerchant.vercel.app/api/shopify/install?shop=${app.shop_domain}&app_id=${app.id}&user_email=${encodeURIComponent(userEmail)}`;
    navigator.clipboard.writeText(installLink);
    setCopiedLink(app.id);
    setTimeout(() => setCopiedLink(null), 2000);
    alert(`Install link copied!\n\nSend this to: ${userEmail}\n\nLink: ${installLink}`);
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
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition"
                    >
                      Add App
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddApp(false)}
                      className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
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

                        {/* OAuth Install Link Display */}
                        <div className="bg-slate-900 border border-slate-600 rounded-lg p-3 mb-3">
                          <p className="text-xs font-medium text-gray-400 mb-1">OAuth Install Link (send to customer):</p>
                          <div className="flex items-center space-x-2">
                            <code className="flex-1 text-xs text-purple-300 bg-slate-950 px-2 py-1 rounded overflow-x-auto">
                              https://automerchant.vercel.app/api/shopify/install?shop={app.shop_domain}&app_id={app.id}
                            </code>
                            <button
                              onClick={() => {
                                const link = `https://automerchant.vercel.app/api/shopify/install?shop=${app.shop_domain}&app_id=${app.id}`;
                                navigator.clipboard.writeText(link);
                                setCopiedLink(app.id);
                                setTimeout(() => setCopiedLink(null), 2000);
                              }}
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

                        <div className="flex space-x-2">
                          <button
                            onClick={() => copyInstallLink(app)}
                            className="flex items-center space-x-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition"
                          >
                            <Copy className="w-4 h-4" />
                            <span>Copy Link with User Email</span>
                          </button>
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
            <h2 className="text-2xl font-bold text-white">Waitlist Users</h2>

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
                              Approved
                            </span>
                          )}
                        </div>
                        <div className="space-y-1 text-sm text-gray-400">
                          <p><span className="font-medium text-gray-300">Email:</span> {user.email}</p>
                          <p><span className="font-medium text-gray-300">Joined:</span> {new Date(user.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        {!user.approved && (
                          <button
                            onClick={() => handleApproveUser(user.id)}
                            className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition"
                            title="Approve user"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleRemoveUser(user.id)}
                          className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
                          title="Remove user"
                        >
                          <Trash2 className="w-4 h-4" />
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
                    <p><span className="text-purple-400">•</span> Redirect URL: <code className="bg-slate-700 px-2 py-1 rounded">https://automerchant.vercel.app/api/shopify/callback</code></p>
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
                  <h3 className="text-xl font-bold text-white mb-2">Generate Install Link</h3>
                  <p className="text-gray-300 mb-3">Click <span className="text-blue-400 font-medium">Copy Install Link</span> next to the app.</p>
                  <div className="bg-slate-900 p-4 rounded-lg text-sm text-gray-300 space-y-2">
                    <p><span className="text-purple-400">•</span> You'll be prompted to enter the customer's email</p>
                    <p><span className="text-purple-400">•</span> The install link will be copied to your clipboard</p>
                    <p><span className="text-purple-400">•</span> The shop will be automatically linked to the customer's account</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 4 */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold">4</div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white mb-2">Send Link to Customer</h3>
                  <p className="text-gray-300 mb-3">Email the install link to your customer with instructions.</p>
                  <div className="bg-slate-900 p-4 rounded-lg text-sm text-gray-300">
                    <p className="font-medium text-white mb-2">Email Template:</p>
                    <div className="bg-slate-800 p-3 rounded border border-slate-600">
                      <p className="text-gray-400 italic">Hi [Customer],</p>
                      <p className="text-gray-400 italic mt-2">Thanks for signing up! Click this link to install AutoMerchant on your Shopify store:</p>
                      <p className="text-blue-400 italic mt-2">[INSTALL LINK]</p>
                      <p className="text-gray-400 italic mt-2">After installation, you'll be able to start optimizing your product pricing.</p>
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
                  <h3 className="text-xl font-bold text-white mb-2">Customer Installs App</h3>
                  <p className="text-gray-300 mb-3">Customer clicks the link and authorizes the app on Shopify.</p>
                  <div className="bg-slate-900 p-4 rounded-lg text-sm text-gray-300 space-y-2">
                    <p><span className="text-purple-400">•</span> They'll see Shopify's authorization page</p>
                    <p><span className="text-purple-400">•</span> After clicking "Install", their shop is connected</p>
                    <p><span className="text-purple-400">•</span> The access token is stored in your database</p>
                    <p><span className="text-purple-400">•</span> They're redirected to the dashboard</p>
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
                <p><span className="text-blue-400">•</span> Always include the customer's email when generating install links</p>
                <p><span className="text-blue-400">•</span> The shop domain must match exactly what's in the Shopify Partner app settings</p>
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
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminPanel;
