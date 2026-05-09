const { MongoClient } = require('mongodb');

class StoreConfigError extends Error {
  constructor(message = 'Lang5K MongoDB is not configured.') {
    super(message);
    this.statusCode = 503;
  }
}

let clientPromise;

function storeConfig() {
  const uri = (process.env.MONGODB_URI || process.env.LANG5K_MONGODB_URI || '').trim();
  const dbName = (process.env.LANG5K_MONGODB_DB || 'lang5k').trim();
  if (!uri) throw new StoreConfigError();
  return { uri, dbName };
}

async function db() {
  const { uri, dbName } = storeConfig();
  if (!clientPromise) {
    clientPromise = new MongoClient(uri, { maxPoolSize: 5 }).connect();
  }
  const client = await clientPromise;
  return client.db(dbName);
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function nowIso() {
  return new Date().toISOString();
}

async function collection(name) {
  return (await db()).collection(name);
}

async function getAccount(email) {
  return collection('accounts').then(col => col.findOne({ email: normalizeEmail(email) }, { projection: { _id: 0 } }));
}

async function saveAccount(email, account) {
  const cleanEmail = normalizeEmail(email);
  const col = await collection('accounts');
  await col.updateOne(
    { email: cleanEmail },
    {
      $set: { ...account, email: cleanEmail, updatedAt: account.updatedAt || nowIso() },
      $setOnInsert: { createdAt: account.createdAt || nowIso() }
    },
    { upsert: true }
  );
}

async function saveLoginCode(email, purpose, codeHash, ttlSeconds) {
  const cleanEmail = normalizeEmail(email);
  const col = await collection('login_codes');
  await col.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  await col.createIndex({ email: 1, purpose: 1 }, { unique: true });
  await col.updateOne(
    { email: cleanEmail, purpose },
    {
      $set: {
        codeHash,
        email: cleanEmail,
        purpose,
        createdAt: nowIso(),
        expiresAt: new Date(Date.now() + ttlSeconds * 1000)
      }
    },
    { upsert: true }
  );
}

async function getLoginCode(email, purpose) {
  const col = await collection('login_codes');
  const row = await col.findOne({
    email: normalizeEmail(email),
    purpose,
    expiresAt: { $gt: new Date() }
  }, { projection: { _id: 0 } });
  return row;
}

async function deleteLoginCode(email, purpose) {
  const col = await collection('login_codes');
  await col.deleteOne({ email: normalizeEmail(email), purpose });
}

async function checkRateLimit(key, limit, windowSeconds) {
  const col = await collection('rate_limits');
  await col.createIndex({ key: 1 }, { unique: true });
  await col.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  const now = new Date();
  const expiresAt = new Date(Date.now() + windowSeconds * 1000);
  const result = await col.findOneAndUpdate(
    { key },
    {
      $inc: { count: 1 },
      $setOnInsert: { createdAt: now, expiresAt }
    },
    { upsert: true, returnDocument: 'after' }
  );
  const count = result?.value?.count || result?.count || 1;
  return count <= limit;
}

async function getEntitlement(email) {
  return collection('entitlements').then(col => col.findOne({ email: normalizeEmail(email) }, { projection: { _id: 0 } }));
}

async function saveEntitlement(email, entitlement) {
  const cleanEmail = normalizeEmail(email);
  const col = await collection('entitlements');
  await col.createIndex({ email: 1 }, { unique: true });
  await col.createIndex({ stripeSessionId: 1 });
  await col.updateOne(
    { email: cleanEmail },
    {
      $set: { ...entitlement, email: cleanEmail, updatedAt: entitlement.updatedAt || nowIso() },
      $setOnInsert: { createdAt: entitlement.createdAt || nowIso() }
    },
    { upsert: true }
  );
}

async function appendEvent(type, event, maxEvents = 5000) {
  const col = await collection('events');
  await col.createIndex({ type: 1, at: -1 });
  await col.insertOne({ ...event, type, at: event.at || nowIso() });
  const extra = await col
    .find({ type }, { projection: { _id: 1 } })
    .sort({ at: -1 })
    .skip(maxEvents)
    .toArray();
  if (extra.length) await col.deleteMany({ _id: { $in: extra.map(row => row._id) } });
}

async function recordEntitlementEvent(event) {
  const col = await collection('entitlement_events');
  await col.createIndex({ email: 1, at: -1 });
  await col.createIndex({ stripeSessionId: 1 });
  await col.createIndex({ stripeEventId: 1 });
  await col.insertOne({ ...event, at: event.at || nowIso() });
}

async function recordCheckoutEntitlement(session, meta = {}) {
  const email = normalizeEmail(session.customer_details?.email || session.customer_email || '');
  if (!email) return null;
  const now = nowIso();
  const eventCreated = Number(meta.stripeEventCreated || session.created || Math.floor(Date.now() / 1000));
  const eventType = meta.stripeEventType || 'checkout.session.completed';
  const existing = await getEntitlement(email);
  if (existing?.lastStripeEventCreated && eventCreated < existing.lastStripeEventCreated) {
    await recordEntitlementEvent({
      eventType: 'entitlement.stale_checkout_ignored',
      email,
      stripeSessionId: session.id,
      stripeEventId: meta.stripeEventId || '',
      stripeEventCreated: eventCreated,
      currentStatus: existing.status,
      at: now
    });
    return existing;
  }
  const paymentIntent = typeof session.payment_intent === 'string' ? null : session.payment_intent;
  const charge = typeof paymentIntent?.latest_charge === 'string' ? null : paymentIntent?.latest_charge;
  const entitlement = {
    email,
    status: 'active',
    product: 'russian',
    stripeCustomerId: typeof session.customer === 'string' ? session.customer : '',
    stripeSessionId: session.id,
    stripePaymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id || '',
    stripeChargeId: charge?.id || '',
    lastStripeEvent: eventType,
    lastStripeEventCreated: eventCreated,
    updatedAt: now,
    createdAt: existing?.createdAt || now
  };
  await saveEntitlement(email, entitlement);
  await saveAccount(email, {
    email,
    updatedAt: now,
    createdAt: (await getAccount(email))?.createdAt || now
  });
  await recordEntitlementEvent({
    eventType: 'entitlement.active',
    email,
    stripeSessionId: session.id,
    stripePaymentIntentId: entitlement.stripePaymentIntentId,
    stripeChargeId: entitlement.stripeChargeId,
    stripeEventId: meta.stripeEventId || '',
    stripeEventCreated: eventCreated,
    at: now
  });
  await appendEvent('billing', { eventType: 'entitlement.active', email, sessionId: session.id, at: now });
  return entitlement;
}

async function updateEntitlementByEmail(email, patch) {
  const existing = await getEntitlement(email);
  if (!existing) return null;
  if (patch.lastStripeEventCreated && existing.lastStripeEventCreated && patch.lastStripeEventCreated < existing.lastStripeEventCreated) {
    await recordEntitlementEvent({
      eventType: 'entitlement.stale_update_ignored',
      email: normalizeEmail(email),
      incomingStatus: patch.status || '',
      currentStatus: existing.status || '',
      stripeEventId: patch.stripeEventId || '',
      stripeEventCreated: patch.lastStripeEventCreated,
      at: nowIso()
    });
    return existing;
  }
  const updated = { ...existing, ...patch, updatedAt: nowIso() };
  await saveEntitlement(email, updated);
  await recordEntitlementEvent({
    eventType: `entitlement.${patch.status || 'updated'}`,
    email: normalizeEmail(email),
    stripeEventId: patch.stripeEventId || '',
    stripeEventCreated: patch.lastStripeEventCreated || null,
    at: updated.updatedAt
  });
  return updated;
}

async function updateEntitlementByStripeReference(reference, patch) {
  const clauses = [];
  if (reference.stripePaymentIntentId) clauses.push({ stripePaymentIntentId: reference.stripePaymentIntentId });
  if (reference.stripeCustomerId) clauses.push({ stripeCustomerId: reference.stripeCustomerId });
  if (reference.stripeChargeId) clauses.push({ stripeChargeId: reference.stripeChargeId });
  if (reference.stripeSessionId) clauses.push({ stripeSessionId: reference.stripeSessionId });
  if (!clauses.length) return null;
  const col = await collection('entitlements');
  const existing = await col.findOne({ $or: clauses }, { projection: { _id: 0 } });
  if (!existing) return null;
  if (patch.lastStripeEventCreated && existing.lastStripeEventCreated && patch.lastStripeEventCreated < existing.lastStripeEventCreated) {
    await recordEntitlementEvent({
      eventType: 'entitlement.stale_update_ignored',
      email: existing.email,
      incomingStatus: patch.status || '',
      currentStatus: existing.status || '',
      stripeEventId: patch.stripeEventId || '',
      stripeEventCreated: patch.lastStripeEventCreated,
      at: nowIso()
    });
    return existing;
  }
  const updated = { ...existing, ...patch, updatedAt: nowIso() };
  await saveEntitlement(existing.email, updated);
  await recordEntitlementEvent({
    eventType: `entitlement.${patch.status || 'updated'}`,
    email: existing.email,
    stripeEventId: patch.stripeEventId || '',
    stripeEventCreated: patch.lastStripeEventCreated || null,
    at: updated.updatedAt
  });
  return updated;
}

async function recordStripeWebhookEvent(event) {
  if (!event || !event.id) return true;
  const col = await collection('stripe_events');
  await col.createIndex({ id: 1 }, { unique: true });
  await col.createIndex({ type: 1, createdAt: -1 });
  try {
    await col.insertOne({
      id: event.id,
      type: event.type || '',
      stripeCreated: event.created || null,
      status: 'processing',
      attempts: 1,
      createdAt: nowIso(),
      updatedAt: nowIso()
    });
    return true;
  } catch (error) {
    if (error && error.code === 11000) {
      const existing = await col.findOne({ id: event.id });
      if (existing?.status === 'processed') return false;
      await col.updateOne(
        { id: event.id },
        {
          $set: { status: 'processing', type: event.type || existing?.type || '', updatedAt: nowIso(), lastError: '' },
          $inc: { attempts: 1 }
        }
      );
      return true;
    }
    throw error;
  }
}

async function markStripeWebhookEventProcessed(eventId) {
  const col = await collection('stripe_events');
  await col.updateOne({ id: eventId }, { $set: { status: 'processed', processedAt: nowIso(), updatedAt: nowIso(), lastError: '' } });
}

async function markStripeWebhookEventFailed(eventId, error) {
  const col = await collection('stripe_events');
  await col.updateOne(
    { id: eventId },
    { $set: { status: 'failed', updatedAt: nowIso(), lastError: String(error?.message || error || '').slice(0, 500) } }
  );
}

async function saveProgressSnapshot(email, language, progress) {
  const payload = {
    email: normalizeEmail(email),
    language,
    progress,
    updatedAt: nowIso()
  };
  const col = await collection('progress_snapshots');
  await col.createIndex({ email: 1, language: 1 }, { unique: true });
  await col.updateOne(
    { email: payload.email, language },
    { $set: payload, $setOnInsert: { createdAt: nowIso() } },
    { upsert: true }
  );
  return payload;
}

async function getProgressSnapshot(email, language) {
  const col = await collection('progress_snapshots');
  return col.findOne({ email: normalizeEmail(email), language }, { projection: { _id: 0 } });
}

async function recordAnalyticsEvent(event) {
  const { type, ...rest } = event || {};
  return appendEvent('analytics', { ...rest, eventType: type || 'unknown', at: nowIso() });
}

async function getAdminMetrics() {
  const database = await db();
  const entitlements = database.collection('entitlements');
  const progress = database.collection('progress_snapshots');
  const events = database.collection('events');
  const stripeEvents = database.collection('stripe_events');
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const [
    activeCustomers,
    refundedCustomers,
    disputedCustomers,
    progressAccounts,
    analytics24h,
    billing24h,
    stripeWebhookEvents,
    latestBilling,
    latestAnalytics
  ] = await Promise.all([
    entitlements.countDocuments({ status: 'active' }),
    entitlements.countDocuments({ status: 'refunded' }),
    entitlements.countDocuments({ status: 'disputed' }),
    progress.countDocuments({}),
    events.countDocuments({ type: 'analytics', at: { $gte: since24h } }),
    events.countDocuments({ type: 'billing', at: { $gte: since24h } }),
    stripeEvents.countDocuments({}),
    events.find({ type: 'billing' }, { projection: { _id: 0 } }).sort({ at: -1 }).limit(5).toArray(),
    events.find({ type: 'analytics' }, { projection: { _id: 0 } }).sort({ at: -1 }).limit(8).toArray()
  ]);
  return {
    configured: true,
    activeCustomers,
    refundedCustomers,
    disputedCustomers,
    progressAccounts,
    analytics24h,
    billing24h,
    stripeWebhookEvents,
    latestBilling,
    latestAnalytics
  };
}

module.exports = {
  StoreConfigError,
  checkRateLimit,
  deleteLoginCode,
  getAccount,
  getAdminMetrics,
  getEntitlement,
  getLoginCode,
  getProgressSnapshot,
  markStripeWebhookEventFailed,
  markStripeWebhookEventProcessed,
  recordAnalyticsEvent,
  recordCheckoutEntitlement,
  recordEntitlementEvent,
  recordStripeWebhookEvent,
  saveAccount,
  saveEntitlement,
  saveLoginCode,
  saveProgressSnapshot,
  updateEntitlementByEmail,
  updateEntitlementByStripeReference
};
