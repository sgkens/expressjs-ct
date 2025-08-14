// middleware/auth.js
const Logger = require('../utils/logger');

class AuthMiddleware {
    constructor() {
        this.logger = new Logger();
    }

    requireAuth(req, res, next) {
        if (!req.session || !req.session.user) {
            this.logger.security('Unauthorized access attempt', {
                url: req.url,
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });
            return res.redirect('/login?redirect=' + encodeURIComponent(req.originalUrl));
        }

        this.logger.debug('Authenticated user accessing protected route', {
            username: req.session.user.username,
            url: req.url,
            ip: req.ip
        });

        next();
    }

    requireAdmin(req, res, next) {
        if (!req.session || !req.session.user) {
            this.logger.security('Unauthorized admin access attempt - no session', {
                url: req.url,
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });
            return res.redirect('/login');
        }

        if (req.session.user.account_type !== 'admin') {
            this.logger.security('Unauthorized admin access attempt - insufficient privileges', {
                username: req.session.user.username,
                accountType: req.session.user.account_type,
                url: req.url,
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });
            return res.status(403).render('error', {
                error: 'Access denied. Administrator privileges required.'
            });
        }

        this.logger.debug('Admin user accessing admin route', {
            username: req.session.user.username,
            url: req.url,
            ip: req.ip
        });

        next();
    }

    requireGuest(req, res, next) {
        if (req.session && req.session.user) {
            this.logger.debug('Authenticated user redirected from guest-only route', {
                username: req.session.user.username,
                url: req.url
            });
            return res.redirect('/dashboard');
        }
        next();
    }

    // Middleware to add user info to all templates
    addUserToLocals(req, res, next) {
        res.locals.user = req.session ? req.session.user : null;
        res.locals.isAdmin = res.locals.user && res.locals.user.account_type === 'admin';
        next();
    }

    // Session security middleware
    sessionSecurity(req, res, next) {
        // Regenerate session ID periodically for security
        if (req.session && req.session.user) {
            const now = Date.now();
            const sessionAge = now - (req.session.createdAt || now);
            const maxAge = 60 * 60 * 1000; // 1 hour

            if (sessionAge > maxAge) {
                req.session.regenerate((err) => {
                    if (err) {
                        this.logger.error('Session regeneration failed:', err);
                        return res.redirect('/login');
                    }
                    req.session.createdAt = now;
                    this.logger.debug('Session regenerated for security', {
                        username: req.session.user.username
                    });
                    next();
                });
            } else {
                next();
            }
        } else {
            next();
        }
    }

    // Rate limiting middleware for sensitive operations
    sensitiveOpLimiter(maxAttempts = 3, windowMs = 15 * 60 * 1000) {
        const attempts = new Map();

        return (req, res, next) => {
            const key = req.ip + (req.session?.user?.id || 'anonymous');
            const now = Date.now();

            if (!attempts.has(key)) {
                attempts.set(key, { count: 0, resetTime: now + windowMs });
            }

            const userAttempts = attempts.get(key);

            if (now > userAttempts.resetTime) {
                userAttempts.count = 0;
                userAttempts.resetTime = now + windowMs;
            }

            if (userAttempts.count >= maxAttempts) {
                this.logger.security('Rate limit exceeded for sensitive operation', {
                    ip: req.ip,
                    username: req.session?.user?.username,
                    attempts: userAttempts.count,
                    url: req.url
                });

                return res.status(429).render('error', {
                    error: 'Too many attempts. Please try again later.'
                });
            }

            userAttempts.count++;
            next();
        };
    }
}

// Create singleton instance
const authMiddleware = new AuthMiddleware();

const requireAuth = authMiddleware.requireAuth.bind(authMiddleware);
const requireAdmin = authMiddleware.requireAdmin.bind(authMiddleware);
const requireGuest = authMiddleware.requireGuest.bind(authMiddleware);
const addUserToLocals = authMiddleware.addUserToLocals.bind(authMiddleware);
const sessionSecurity = authMiddleware.sessionSecurity.bind(authMiddleware);
const sensitiveOpLimiter = authMiddleware.sensitiveOpLimiter.bind(authMiddleware);

module.exports = {
    requireAuth,
    requireAdmin,
    requireGuest,
    addUserToLocals,
    sessionSecurity,
    sensitiveOpLimiter
};