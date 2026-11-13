const express = require('express');
const { User } = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

function createAuthRouter(fetchImpl = fetch, UserModel = User) {
  const router = express.Router();
  const JWT_SECRET = process.env.JWT_SECRET;

  function buildAuthResponse(user) {
    const token = jwt.sign(
      { id: user._id },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    return {
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        gender: user.gender
      }
    };
  }

  // @route   POST /api/auth/signup
  // @desc    Register user
  router.post('/signup', async (req, res) => {
    try {
      const { email, password, firstName, lastName, gender } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Please enter all fields' });
      }

      const normalizedEmail = String(email).trim().toLowerCase();
      const existingUser = await UserModel.findOne({ email: normalizedEmail });
      if (existingUser) {
        return res.status(400).json({ error: 'User already exists' });
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const savedUser = await UserModel.create({
        email: normalizedEmail,
        password: hashedPassword,
        firstName,
        lastName,
        gender,
        authProvider: 'local'
      });

      res.status(201).json(buildAuthResponse(savedUser));
    } catch (error) {
      console.error('Signup error:', error);
      res.status(500).json({ error: 'Server error during signup' });
    }
  });

  // @route   POST /api/auth/login
  // @desc    Login user
  router.post('/login', async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Please enter all fields' });
      }

      const normalizedEmail = String(email).trim().toLowerCase();
      const user = await UserModel.findOne({ email: normalizedEmail });
      if (!user) {
        return res.status(400).json({ error: 'Invalid credentials' });
      }

      if (!user.password) {
        return res.status(400).json({ error: 'This account uses Google Sign-In. Please continue with Google.' });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ error: 'Invalid credentials' });
      }

      res.status(200).json(buildAuthResponse(user));
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Server error during login' });
    }
  });

  // @route   POST /api/auth/google
  // @desc    Authenticate with Google ID token
  router.post('/google', async (req, res) => {
    try {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      if (!clientId) {
        return res.status(503).json({ error: 'Google Sign-In is not configured on this server.' });
      }

      const { credential } = req.body || {};
      if (!credential || typeof credential !== 'string') {
        return res.status(400).json({ error: 'Missing Google credential' });
      }

      const tokenInfoUrl = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`;
      const response = await fetchImpl(tokenInfoUrl, { signal: AbortSignal.timeout(10000) });
      if (!response.ok) {
        return res.status(401).json({ error: 'Invalid Google token' });
      }

      const payload = await response.json();
      const isEmailVerified = payload.email_verified === true || payload.email_verified === 'true';
      if (!payload.email || payload.aud !== clientId || !isEmailVerified) {
        return res.status(401).json({ error: 'Google account verification failed' });
      }

      const normalizedEmail = String(payload.email).trim().toLowerCase();
      let user = await UserModel.findOne({ email: normalizedEmail });
      if (!user) {
        user = await UserModel.create({
          email: normalizedEmail,
          firstName: payload.given_name || '',
          lastName: payload.family_name || '',
          googleId: payload.sub,
          authProvider: 'google'
        });
      }

      res.status(200).json(buildAuthResponse(user));
    } catch (error) {
      console.error('Google auth error:', error);
      res.status(500).json({ error: 'Server error during Google sign-in' });
    }
  });

  return router;
}

const defaultRouter = createAuthRouter();
defaultRouter.createAuthRouter = createAuthRouter;
module.exports = defaultRouter;
