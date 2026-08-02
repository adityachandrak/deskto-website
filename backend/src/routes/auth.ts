import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/database';
import { authenticate, AuthRequest, JWT_SECRET } from '../middleware/auth';
import { authLimiter, refreshLimiter } from '../middleware/rateLimit';
import { validationResult, body, param, query as validatorQuery } from 'express-validator';
import { User } from '../models/types';

const router = Router();
const ACCESS_TOKEN_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || '15m') as SignOptions['expiresIn'];
const REFRESH_TOKEN_EXPIRES_IN = (process.env.REFRESH_TOKEN_EXPIRES_IN || '7d') as SignOptions['expiresIn'];
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_DURATION_MS = 10 * 60 * 1000;

// A dummy hash to compare against when no user is found, so a login attempt
// against a nonexistent account takes the same time as one against a real
// account with a wrong password — otherwise the response timing (and the
// skipped bcrypt call) leaks which identifiers are registered.
const DUMMY_PASSWORD_HASH = '$2a$12$C6UzMDM.H6dfI/f/IKcEeO6cLPB1QWnbmwWLo1YAwbY7g7X.Z3Kn.';

const STRONG_PASSWORD = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

function signTokens(user: { id: string; email: string; role: string }) {
  const accessToken = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRES_IN }
  );
  const refreshToken = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES_IN });
  return { accessToken, refreshToken };
}

async function storeRefreshToken(userId: string, token: string) {
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
  await query('INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)', [userId, token, expiresAt]);
}

// Register
router.post('/register',
  authLimiter,
  [
    body('email').isEmail().normalizeEmail(),
    body('password').matches(STRONG_PASSWORD).withMessage('Password needs 8+ characters with upper, lower, number, and symbol'),
    body('firstName').trim().notEmpty().withMessage('First name is required'),
    body('phone').optional().isMobilePhone('any').withMessage('Invalid phone number'),
    body('lastName').optional().trim()
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password, firstName, lastName, phone, role, adminCode } = req.body;

      let finalRole = 'customer';
      if (role === 'admin') {
        const requiredCode = process.env.ADMIN_SIGNUP_CODE;
        if (!requiredCode) {
          return res.status(503).json({ error: 'Admin self-signup is currently disabled' });
        }
        if (adminCode !== requiredCode) {
          return res.status(400).json({ error: 'Invalid admin signup code' });
        }
        finalRole = 'admin';
      } else if (role === 'staff') {
        // Staff accounts are created by an administrator (Admin Dashboard →
        // Staff → Add Staff), never through public self-registration — see
        // POST /admin/staff. This closes what was previously an
        // unauthenticated path to a staff-level account with access to
        // every customer's orders and contact details.
        return res.status(400).json({ error: 'Staff accounts are created by an administrator. Ask DESKTO to set up your account.' });
      }

      // Check if user exists
      const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
      if (existing.rows.length > 0) {
        return res.status(400).json({ error: 'Email already registered' });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 12);

      // Create user
      const result = await query(
        `INSERT INTO users (email, phone, password_hash, first_name, last_name, role)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, email, first_name, last_name, role, status, created_at`,
        [email, phone, passwordHash, firstName, lastName, finalRole]
      );

      const user = result.rows[0];

      const { accessToken, refreshToken } = signTokens(user);
      await storeRefreshToken(user.id, refreshToken);

      res.status(201).json({
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
          status: user.status,
          createdAt: user.created_at
        },
        accessToken,
        refreshToken
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Registration failed' });
    }
  }
);

// Login
router.post('/login',
  authLimiter,
  [
    body('identifier').notEmpty().withMessage('Email or phone is required'),
    body('password').notEmpty().withMessage('Password is required')
  ],
  async (req: Request, res: Response) => {
    try {
      const { identifier, password } = req.body;
      const normalizedIdentifier = String(identifier).trim();

      // Find user by email or phone
      const result = await query(
        `SELECT id, email, password_hash, first_name, last_name, role, status,
                failed_login_attempts, locked_until
         FROM users
         WHERE LOWER(email) = LOWER($1) OR phone = $1`,
        [normalizedIdentifier]
      );

      const user = result.rows[0];

      // Always run bcrypt.compare — against the real hash if the user
      // exists, against a fixed dummy hash otherwise — so a request for an
      // unregistered identifier takes the same time and returns the same
      // response as one for a registered identifier with the wrong
      // password. Without this, the response timing (and the fact that an
      // unknown identifier skips bcrypt entirely) lets an attacker
      // enumerate which emails/phones have accounts.
      const validPassword = await bcrypt.compare(password, user ? user.password_hash : DUMMY_PASSWORD_HASH);

      if (!user || !validPassword) {
        if (user) {
          const attempts = (user.failed_login_attempts || 0) + 1;
          const shouldLock = attempts >= MAX_LOGIN_ATTEMPTS;
          await query(
            `UPDATE users SET failed_login_attempts = $1, locked_until = $2,
                    status = CASE WHEN $3 THEN 'locked' ELSE status END
              WHERE id = $4`,
            [attempts, shouldLock ? new Date(Date.now() + LOCK_DURATION_MS) : user.locked_until, shouldLock, user.id]
          );
        }
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Only reveal a lock to someone who has already proven they know the
      // correct password — otherwise "locked" vs "invalid credentials"
      // becomes another way to enumerate which accounts exist.
      const isLocked = user.status === 'locked' && user.locked_until && new Date(user.locked_until) > new Date();
      if (isLocked) {
        return res.status(423).json({ error: 'Account locked due to repeated failed attempts. Try again later.' });
      }

      // Correct password: clear any failed-attempt/lock state (including a
      // stale lock whose window has already passed).
      if (user.failed_login_attempts || user.status === 'locked') {
        await query(
          `UPDATE users SET failed_login_attempts = 0, locked_until = NULL,
                  status = CASE WHEN status = 'locked' THEN 'active' ELSE status END
            WHERE id = $1`,
          [user.id]
        );
      }

      const { accessToken, refreshToken } = signTokens(user);
      await storeRefreshToken(user.id, refreshToken);

      res.json({
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role
        },
        accessToken,
        refreshToken
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  }
);

// Get Current User
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT id, email, phone, first_name, last_name, role, status, created_at
       FROM users WHERE id = $1`,
      [req.user!.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    res.json({
      id: user.id,
      email: user.email,
      phone: user.phone,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      status: user.status,
      createdAt: user.created_at
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Refresh Token
router.post('/refresh', refreshLimiter, async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    // Verify token
    const decoded = jwt.verify(refreshToken, JWT_SECRET) as { id: string };

    // Check if token exists and not revoked
    const tokenResult = await query(
      'SELECT * FROM refresh_tokens WHERE token = $1 AND user_id = $2 AND revoked = FALSE AND expires_at > NOW()',
      [refreshToken, decoded.id]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    // Get user
    const userResult = await query(
      'SELECT id, email, role FROM users WHERE id = $1 AND status = $2',
      [decoded.id, 'active']
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    const user = userResult.rows[0];

    // Rotate: revoke the token that was just used and issue a new one, so a
    // stolen refresh token only has a single use before it stops working —
    // previously the same token stayed valid, unlimited-use, for its full
    // 7-day life.
    await query('UPDATE refresh_tokens SET revoked = TRUE WHERE token = $1', [refreshToken]);
    const { accessToken, refreshToken: newRefreshToken } = signTokens(user);
    await storeRefreshToken(user.id, newRefreshToken);

    res.json({ accessToken, refreshToken: newRefreshToken });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// Logout
router.post('/logout', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      await query(
        'UPDATE refresh_tokens SET revoked = TRUE WHERE token = $1 AND user_id = $2',
        [refreshToken, req.user!.id]
      );
    }

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

export default router;
