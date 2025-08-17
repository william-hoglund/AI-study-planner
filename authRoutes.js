import express from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { connectMongo, mongoReady } from '../utils/db.js';

const router = express.Router();

// Models are defined once per process

const UserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, index: true },
    passwordHash: { type: String, required: true },
    name: { type: String, default: '' },
  },
  { timestamps: true }
);

const User = mongoose.models.User || mongoose.model('User', UserSchema);

function signToken(user) {
  const secret = process.env.JWT_SECRET || 'dev_secret_change_me';
  return jwt.sign(
    { sub: user._id.toString(), email: user.email },
    secret,
    { expiresIn: '7d' }
  );
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    await connectMongo();
  } catch (e) {
    return res.status(503).json({ error: 'Databasen är otillgänglig. Starta MongoDB eller ange MONGODB_URI.' });
  }
  try {
    const { email = '', password = '', name = '' } = req.body || {};

    const e = String(email).trim().toLowerCase();
    const p = String(password);
    if (!e || !p || p.length < 6) {
      return res.status(400).json({ error: 'Email och lösenord (minst 6 tecken) krävs.' });
    }

    const existing = await User.findOne({ email: e }).lean();
    if (existing) return res.status(409).json({ error: 'E‑post är redan registrerad.' });

    const passwordHash = await bcrypt.hash(p, 10);
    const user = await User.create({ email: e, passwordHash, name: String(name || '') });

    const token = signToken(user);
    return res.json({
      ok: true,
      token,
      user: { id: user._id.toString(), email: user.email, name: user.name || '' },
    });
  } catch (err) {
    console.error('[register] error:', err);
    return res.status(500).json({ error: 'Registrering misslyckades.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    await connectMongo();
  } catch (e) {
    return res.status(503).json({ error: 'Databasen är otillgänglig. Starta MongoDB eller ange MONGODB_URI.' });
  }
  try {
    const { email = '', password = '' } = req.body || {};
    const e = String(email).trim().toLowerCase();
    const p = String(password);

    const user = await User.findOne({ email: e });
    if (!user) return res.status(401).json({ error: 'Felaktig e‑post eller lösenord.' });

    const ok = await bcrypt.compare(p, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Felaktig e‑post eller lösenord.' });

    const token = signToken(user);
    return res.json({
      ok: true,
      token,
      user: { id: user._id.toString(), email: user.email, name: user.name || '' },
    });
  } catch (err) {
    console.error('[login] error:', err);
    return res.status(500).json({ error: 'Inloggning misslyckades.' });
  }
});

export default router;
