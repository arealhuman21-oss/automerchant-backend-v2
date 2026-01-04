const jwt = require('jsonwebtoken');
const { JWT_SECRET, ADMIN_SECRET } = require('../config/environment');
const { supabaseService } = require('../config/database');

function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!JWT_SECRET) {
      console.error('❌ CRITICAL: JWT_SECRET is not configured!');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) {
        return res.status(403).json({ error: 'Invalid or expired token' });
      }
      req.user = user;
      next();
    });
  } catch (error) {
    console.error('❌ Auth middleware error:', error);
    return res.status(500).json({ error: 'Authentication error' });
  }
}

// Admin authentication middleware
async function authenticateAdmin(req, res, next) {
  // First, authenticate the user token
  authenticateToken(req, res, async () => {
    try {
      // Check if user is in admin whitelist
      // Use supabaseService for admin auth checks (needs to query admin tables)
      const { data: adminUser, error } = await supabaseService
        .from('admin_users')
        .select('id, email, role')
        .eq('user_id', req.user.userId)
        .eq('active', true)
        .single();

      if (error || !adminUser) {
        // Alternative: Check if user email is in admin whitelist
        const { data: emailAdmin, error: emailError } = await supabaseService
          .from('users')
          .select('id, email, admin_level')
          .eq('id', req.user.userId)
          .eq('admin_level', 'admin')
          .single();

        if (emailError || !emailAdmin) {
          return res.status(403).json({ error: 'Admin access required' });
        }
      }

      // User is authenticated as admin
      req.admin = req.user;
      next();
    } catch (error) {
      console.error('Admin auth error:', error);
      return res.status(403).json({ error: 'Admin access required' });
    }
  });
}

module.exports = { authenticateToken, authenticateAdmin };
