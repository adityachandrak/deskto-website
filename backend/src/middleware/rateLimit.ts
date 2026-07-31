import rateLimit from 'express-rate-limit';

// Login/register had no throttling at all — unlimited-speed password
// guessing and unlimited signup-code guessing were both possible. Keyed on
// IP (express-rate-limit's default) since these endpoints run before any
// user identity is known.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please wait a few minutes and try again.' },
});

// Refresh is called automatically by the frontend on 401s, so it needs a
// higher ceiling than login/register, but still bounded.
export const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please wait a few minutes and try again.' },
});
