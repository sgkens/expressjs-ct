
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const urlencoded = require('body-parser').urlencoded;
const path = require('path');
const json = require('body-parser').json;
const join = require('path').join;
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const { body, validationResult } = require('express-validator');

// Import our modules
const Database = require('./database/db');
const Logger = require('./utils/logger');
const auth = require('./middleware/auth');
const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database and logger
const db = new Database();
const logger = new Logger();

// Security middleware
app.use(helmet());

// Rate limiting
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per window
    message: 'Too many login attempts, please try again later',
    skipSuccessfulRequests: true
});

// Middleware
app.use(urlencoded({ extended: true }));
app.use(json());
app.use(express.static(path.join(__dirname, 'public')));

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-super-secret-key-change-this',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // Set to true in production with HTTPS
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// View engine setup
app.set('view engine', 'ejs');
app.set('views', join(__dirname, 'views'));

// Initialize database on startup
db.init().then(() => {
    logger.info('Database initialized successfully');
}).catch(err => {
    logger.error('Database initialization failed:', err);
    process.exit(1);
});

// Routes
// Home page
app.get('/', (req, res) => {
    logger.info(`Home page accessed by IP: ${req.ip}`);
    res.render('index', { user: req.session.user });
});

// Login page
app.get('/login', (req, res) => {
    if (req.session.user) {
        return res.redirect('/dashboard');
    }
    res.render('login', { error: null });
});

// Login POST
app.post('/login', loginLimiter, [
    body('username').trim().isLength({ min: 3 }).escape(),
    body('password').isLength({ min: 6 })
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        logger.warn(`Login validation failed for ${req.body.username}: ${errors.array()}`);
        return res.render('login', { error: 'Invalid input format' });
    }

    const { username, password } = req.body;

    try {
        const user = await db.getUserByUsername(username);

        if (!user || !await bcrypt.compare(password, user.password)) {
            logger.warn(`Failed login attempt for username: ${username} from IP: ${req.ip}`);
            return res.render('login', { error: 'Invalid username or password' });
        }

        req.session.user = {
            id: user.id,
            username: user.username,
            display_name: user.display_name,
            account_type: user.account_type
        };

        logger.info(`User ${username} logged in successfully from IP: ${req.ip}`);
        res.redirect('/dashboard');
    } catch (error) {
        logger.error('Login error:', error);
        res.render('login', { error: 'An error occurred during login' });
    }
});

// Register page
app.get('/register', (req, res) => {
    if (req.session.user) {
        return res.redirect('/dashboard');
    }
    res.render('register', { error: null, success: null });
});

// Register POST
app.post('/register', [
    body('username').trim().isLength({ min: 3 }).isAlphanumeric().escape(),
    body('display_name').trim().isLength({ min: 1 }).escape(),
    body('password').isLength({ min: 6 }),
    body('confirm_password').custom((value, { req }) => {
        if (value !== req.body.password) {
            throw new Error('Passwords do not match');
        }
        return value;
    })
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        logger.warn(`Registration validation failed: ${errors.array()}`);
        return res.render('register', {
            error: errors.array()[0].msg,
            success: null
        });
    }

    const { username, display_name, password } = req.body;

    try {
        // Check if user already exists
        const existingUser = await db.getUserByUsername(username);
        if (existingUser) {
            logger.warn(`Registration attempt with existing username: ${username}`);
            return res.render('register', {
                error: 'Username already exists',
                success: null
            });
        }

        // Hash password
        const hashedPassword = await hash(password, 12);

        // Create user
        await db.createUser(username, hashedPassword, display_name);

        logger.info(`New user registered: ${username} from IP: ${req.ip}`);
        res.render('register', {
            error: null,
            success: 'Account created successfully! You can now login.'
        });
    } catch (error) {
        logger.error('Registration error:', error);
        res.render('register', {
            error: 'An error occurred during registration',
            success: null
        });
    }
});

// Dashboard (protected)
app.get('/dashboard', auth.requireAuth, (req, res) => {
    logger.info(`Dashboard accessed by user: ${req.session.user.username}`);
    res.render('dashboard', { user: req.session.user });
});

// Profile (protected)
app.get('/profile', auth.requireAuth, async (req, res) => {
    try {
        const user = await db.getUserById(req.session.user.id);
        logger.info(`Profile accessed by user: ${req.session.user.username}`);
        res.render('profile', { user, error: null, success: null });
    } catch (error) {
        logger.error('Profile fetch error:', error);
        res.redirect('/dashboard');
    }
});

// Update profile
app.post('/profile', auth.requireAuth, [
    body('display_name').trim().isLength({ min: 1 }).escape(),
    body('current_password').optional({ checkFalsy: true }),
    body('new_password').optional({ checkFalsy: true }).isLength({ min: 6 }),
    body('confirm_password').optional({ checkFalsy: true }).custom((value, { req }) => {
        if (req.body.new_password && value !== req.body.new_password) {
            throw new Error('Passwords do not match');
        }
        return value;
    })
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const user = await db.getUserById(req.session.user.id);
        return res.render('profile', {
            user,
            error: errors.array()[0].msg,
            success: null
        });
    }

    const { display_name, current_password, new_password } = req.body;

    try {
        const user = await db.getUserById(req.session.user.id);

        // Update display name
        await db.updateUserProfile(req.session.user.id, display_name);
        req.session.user.display_name = display_name;

        // Update password if provided
        if (current_password && new_password) {
            const passwordMatch = await compare(current_password, user.password);
            if (!passwordMatch) {
                return res.render('profile', {
                    user,
                    error: 'Current password is incorrect',
                    success: null
                });
            }

            const hashedPassword = await hash(new_password, 12);
            await db.updateUserPassword(req.session.user.id, hashedPassword);
            logger.info(`Password updated for user: ${req.session.user.username}`);
        }

        logger.info(`Profile updated for user: ${req.session.user.username}`);
        const updatedUser = await db.getUserById(req.session.user.id);
        res.render('profile', {
            user: updatedUser,
            error: null,
            success: 'Profile updated successfully!'
        });
    } catch (error) {
        logger.error('Profile update error:', error);
        const user = await db.getUserById(req.session.user.id);
        res.render('profile', {
            user,
            error: 'An error occurred while updating profile',
            success: null
        });
    }
});

// Settings (protected)
app.get('/settings', auth.requireAuth, (req, res) => {
    logger.info(`Settings accessed by user: ${req.session.user.username}`);
    res.render('settings', { user: req.session.user });
});

// Admin panel (admin only)
app.get('/admin', auth.requireAuth, auth.requireAdmin, async (req, res) => {
    try {
        const users = await db.getAllUsers();
        logger.info(`Admin panel accessed by user: ${req.session.user.username}`);
        res.render('admin', { user: req.session.user, users });
    } catch (error) {
        logger.error('Admin panel error:', error);
        res.redirect('/dashboard');
    }
});

// Logout
app.post('/logout', (req, res) => {
    const username = req.session.user ? req.session.user.username : 'unknown';
    req.session.destroy(() => {
        logger.info(`User ${username} logged out`);
        res.redirect('/');
    });
});


// Additional server routes for admin functionality
// Add these routes to server.js after the existing routes:

/*
// Admin user management routes
app.put('/admin/users/:id', auth.requireAuth, auth.requireAdmin, [
  body('account_type').isIn(['user', 'admin'])
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: 'Invalid account type' });
  }

  const userId = req.params.id;
  const { account_type } = req.body;

  try {
    // Prevent users from changing their own account type
    if (parseInt(userId) === req.session.user.id) {
      return res.status(400).json({ 
        success: false, 
        error: 'Cannot modify your own account type' 
      });
    }

    await db.updateUserAccountType(userId, account_type);
    logger.info(`Admin ${req.session.user.username} changed user ${userId} account type to ${account_type}`);
    
    res.json({ success: true, message: 'User account type updated successfully' });
  } catch (error) {
    logger.error('Admin user update error:', error);
    res.status(500).json({ success: false, error: 'Failed to update user' });
  }
});

app.delete('/admin/users/:id', auth.requireAuth, auth.requireAdmin, async (req, res) => {
  const userId = req.params.id;

  try {
    // Prevent users from deleting their own account through admin panel
    if (parseInt(userId) === req.session.user.id) {
      return res.status(400).json({ 
        success: false, 
        error: 'Cannot delete your own account' 
      });
    }

    // Get user info before deletion for logging
    const userToDelete = await db.getUserById(userId);
    if (!userToDelete) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    await db.deleteUser(userId);
    logger.info(`Admin ${req.session.user.username} deleted user: ${userToDelete.username}`);
    
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    logger.error('Admin user deletion error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete user' });
  }
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const dbHealth = await db.healthCheck();
    const uptime = process.uptime();
    
    logger.debug('Health check requested');
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: `${Math.floor(uptime / 60)} minutes`,
      database: dbHealth,
      version: '1.0.0'
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});
*/

// 404 handler
app.use((req, res) => {
    logger.warn(`404 - Page not found: ${req.url} from IP: ${req.ip}`);
    res.status(404).render('404');
});

// Error handler
app.use((err, req, res, next) => {
    logger.error('Unhandled error:', err);
    res.status(500).render('error', { error: 'Something went wrong!' });
});

app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
});

module.exports = app;