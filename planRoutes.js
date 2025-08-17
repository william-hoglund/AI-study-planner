import express from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { connectMongo } from '../utils/db.js';

const router = express.Router();


const PlanSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: true },
    title: { type: String, required: true },
    plan: { type: String, default: '' }, // text summary
    structured: { type: [mongoose.Schema.Types.Mixed], default: [] }, // events array
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

const Plan = mongoose.models.Plan || mongoose.model('Plan', PlanSchema);

function auth(req, res, next) {
  try {
    const hdr = req.headers.authorization || '';
    const [, token] = hdr.split(' ');
    if (!token) return res.status(401).json({ error: 'Saknar token' });
    const secret = process.env.JWT_SECRET || 'dev_secret_change_me';
    const payload = jwt.verify(token, secret);
    req.userId = payload.sub;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Ogiltig eller utgången token' });
  }
}

function mapPlan(doc) {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : doc;
  return {
    id: obj._id.toString(),
    title: obj.title,
    plan: obj.plan || '',
    structured: Array.isArray(obj.structured) ? obj.structured : [],
    meta: obj.meta || {},
    createdAt: obj.createdAt || obj.created_at || new Date(),
    updatedAt: obj.updatedAt || obj.updated_at || new Date(),
  };
}

// GET /api/plans
router.get('/', auth, async (req, res) => {
  try { await connectMongo(); } catch (e) { return res.status(503).json({ error: 'Databasen är otillgänglig.' }); }
  const plans = await Plan.find({ user: req.userId }).sort({ createdAt: -1 }).lean();
  return res.json({ ok: true, items: plans.map(mapPlan) });
});

// POST /api/plans
router.post('/', auth, async (req, res) => {
  try {
    await connectMongo();
    const { title = '', plan = '', structured = [], meta = {} } = req.body || {};
    if (!String(title).trim()) return res.status(400).json({ error: 'Titel krävs' });
    const doc = await Plan.create({
      user: req.userId,
      title: String(title).trim(),
      plan: String(plan || ''),
      structured: Array.isArray(structured) ? structured : [],
      meta: meta && typeof meta === 'object' ? meta : {},
    });
    return res.status(201).json({ ok: true, item: mapPlan(doc) });
  } catch (err) {
    console.error('[plans POST] error:', err);
    return res.status(500).json({ error: 'Kunde inte spara planen' });
  }
});

// PUT /api/plans/:id
router.put('/:id', auth, async (req, res) => {
  try {
    await connectMongo();
    const { id } = req.params;
    const { title, plan, structured, meta } = req.body || {};
    const doc = await Plan.findOne({ _id: id, user: req.userId });
    if (!doc) return res.status(404).json({ error: 'Planen hittades inte' });

    if (typeof title === 'string') doc.title = title.trim();
    if (typeof plan === 'string') doc.plan = plan;
    if (Array.isArray(structured)) doc.structured = structured;
    if (meta && typeof meta === 'object') doc.meta = meta;

    await doc.save();
    return res.json({ ok: true, item: mapPlan(doc) });
  } catch (err) {
    console.error('[plans PUT] error:', err);
    return res.status(500).json({ error: 'Kunde inte uppdatera planen' });
  }
});

// DELETE /api/plans/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    await connectMongo();
    const { id } = req.params;
    const doc = await Plan.findOneAndDelete({ _id: id, user: req.userId });
    if (!doc) return res.status(404).json({ error: 'Planen hittades inte' });
    return res.json({ ok: true, item: mapPlan(doc) });
  } catch (err) {
    console.error('[plans DELETE] error:', err);
    return res.status(500).json({ error: 'Kunde inte ta bort planen' });
  }
});

export default router;
