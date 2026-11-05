import express from 'express';
import { OAuth2Client } from 'google-auth-library';
import QRCode from 'qrcode';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { createStore } from './store.js';
import { validateResponse, csvCell } from './validation.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const random = () => randomBytes(32).toString('hex');
const hash = value => createHash('sha256').update(value || '').digest('hex');
function cookie(req, name) {
  const item = (req.headers.cookie || '').split(';').map(v => v.trim()).find(v => v.startsWith(`${name}=`));
  return item ? item.slice(name.length + 1) : '';
}

export function createApp(options = {}) {
  const env = options.env || process.env;
  const publicUrl = (env.PUBLIC_URL || `http://localhost:${env.PORT || 3015}${env.ARSENAL_ROUTE || ''}`).replace(/\/+$/, '');
  const url = new URL(publicUrl);
  if (!['http:', 'https:'].includes(url.protocol) || url.search || url.hash || url.username || url.password) throw new Error('PUBLIC_URL inválida.');
  if (env.ARSENAL_ROUTE && url.protocol !== 'https:') throw new Error('Configure PUBLIC_URL com o endereço HTTPS do A.R.S.E.N.A.L.');
  const basePath = url.pathname.replace(/\/+$/, '');
  const config = { publicUrl, basePath, googleClientId: env.GOOGLE_CLIENT_ID?.trim() || '' };
  const admins = new Set((env.ADMIN_EMAILS || '').split(',').map(v => v.trim().toLowerCase()).filter(Boolean));
  const questionnaire = JSON.parse(readFileSync(resolve(root, 'config/questionnaire.json'), 'utf8'));
  const store = options.store || createStore(resolve(root, env.DATA_DIR || 'data'));
  const oauth = new OAuth2Client(config.googleClientId);
  const verify = options.verifyGoogle || (async credential => {
    const ticket = await oauth.verifyIdToken({ idToken: credential, audience: config.googleClientId });
    return ticket.getPayload();
  });
  const app = express();
  app.disable('x-powered-by');
  const cookieOptions = { httpOnly: true, sameSite: 'lax', secure: url.protocol === 'https:', path: basePath || '/' };
  const sessionCookie = `medicao_${hash(basePath).slice(0, 8)}`;
  const challengeCookie = `${sessionCookie}_login`;
  const attempts = new Map();
  app.use((req, res, next) => {
    if (env.ARSENAL_PROXY_TOKEN && req.get('x-arsenal-proxy-token') !== env.ARSENAL_PROXY_TOKEN) return res.status(403).json({ error: 'Acesse pelo endereço público do app.' });
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
      'Content-Security-Policy': "default-src 'self'; script-src 'self' https://accounts.google.com/gsi/client; style-src 'self' 'unsafe-inline' https://accounts.google.com/gsi/style; frame-src https://accounts.google.com; connect-src 'self' https://accounts.google.com; img-src 'self' data:; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
    });
    if (basePath && (req.url === basePath || req.url.startsWith(`${basePath}/`))) req.url = req.url.slice(basePath.length) || '/';
    if (req.path.startsWith('/api/')) res.set('Cache-Control', 'no-store');
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.get('origin') !== url.origin) return res.status(403).json({ error: 'Origem da requisição inválida.' });
    next();
  });
  app.use(express.json({ limit: '32kb' }));
  app.use('/api', (req, res, next) => {
    store.prune();
    req.session = store.session(hash(cookie(req, sessionCookie)));
    next();
  });
  function authenticated(req, res, next) {
    if (!req.session) return res.status(401).json({ error: 'Entre com sua conta Google para continuar.' });
    if (req.method !== 'GET' && req.get('x-csrf-token') !== req.session.csrf) return res.status(403).json({ error: 'Sessão inválida. Recarregue a página.' });
    next();
  }
  function admin(req, res, next) {
    if (!admins.has(req.session.email.toLowerCase())) return res.status(403).json({ error: 'Acesso restrito aos administradores.' });
    next();
  }
  const receipt = row => row ? { id: row.id, createdAt: row.created_at } : null;
  app.get('/api/config', (req, res) => res.json({ ...config, questionnaire }));
  app.get('/api/qr', async (req, res) => {
    res.type('png').send(await QRCode.toBuffer(`${publicUrl}/`, { width: 480, margin: 3, color: { dark: '#123b37', light: '#ffffff' } }));
  });
  app.get('/api/auth/challenge', (req, res) => {
    if (!config.googleClientId) return res.status(503).json({ error: 'O login Google ainda precisa ser configurado pela equipe.' });
    const key = hash(req.socket.remoteAddress);
    const now = Date.now();
    for (const [key, entry] of attempts) if (entry.until < now) attempts.delete(key);
    const entry = attempts.get(key) || { count: 0, until: now + 60000 };
    if (++entry.count > 40) return res.status(429).json({ error: 'Muitas tentativas. Aguarde um minuto.' });
    attempts.set(key, entry);
    const token = random(), nonce = random();
    const previous = cookie(req, challengeCookie);
    if (previous) store.db.prepare('DELETE FROM challenges WHERE token = ?').run(hash(previous));
    store.db.prepare('INSERT INTO challenges VALUES (?, ?, ?)').run(hash(token), nonce, now + 300000);
    res.cookie(challengeCookie, token, { ...cookieOptions, maxAge: 300000 });
    res.json({ nonce });
  });
  app.post('/api/auth/google', async (req, res) => {
    if (!config.googleClientId) return res.status(503).json({ error: 'Login Google não configurado.' });
    const token = hash(cookie(req, challengeCookie));
    const challenge = store.db.prepare('SELECT * FROM challenges WHERE token = ? AND expires > ?').get(token, Date.now());
    store.db.prepare('DELETE FROM challenges WHERE token = ?').run(token);
    res.clearCookie(challengeCookie, cookieOptions);
    if (!challenge || typeof req.body?.credential !== 'string') return res.status(401).json({ error: 'Login expirado. Recarregue e tente novamente.' });
    let identity;
    try { identity = await verify(req.body.credential); } catch { return res.status(401).json({ error: 'Não foi possível validar sua conta Google. Tente novamente.' }); }
    if (!identity?.sub || !identity.email || identity.email_verified !== true || identity.nonce !== challenge.nonce) return res.status(401).json({ error: 'Credencial Google inválida ou e-mail não verificado.' });
    if (req.session) store.db.prepare('DELETE FROM sessions WHERE token = ?').run(req.session.token);
    const session = random(), csrf = random();
    store.db.prepare('INSERT INTO sessions VALUES (?, ?, ?, ?, ?, ?)').run(hash(session), identity.sub, identity.email, identity.name || '', csrf, Date.now() + 8 * 3600000);
    res.cookie(sessionCookie, session, { ...cookieOptions, maxAge: 8 * 3600000 });
    res.json({ ok: true });
  });
  app.get('/api/me', authenticated, (req, res) => res.json({ name: req.session.name, email: req.session.email, csrf: req.session.csrf, admin: admins.has(req.session.email.toLowerCase()), receipt: receipt(store.response(req.session.subject)) }));
  app.post('/api/auth/logout', authenticated, (req, res) => {
    store.db.prepare('DELETE FROM sessions WHERE token = ?').run(req.session.token);
    res.clearCookie(sessionCookie, cookieOptions).json({ ok: true });
  });
  app.post('/api/responses', authenticated, (req, res) => {
    if (store.response(req.session.subject)) return res.status(409).json({ error: 'Sua resposta já foi registrada.', receipt: receipt(store.response(req.session.subject)) });
    const { errors, value } = validateResponse(req.body || {}, questionnaire);
    if (Object.keys(errors).length) return res.status(400).json({ error: 'Revise os campos indicados.', fields: errors });
    const id = randomUUID(), now = new Date().toISOString();
    store.db.prepare('INSERT INTO responses VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(req.session.subject, id, req.session.email, value.name, value.company, questionnaire.version, JSON.stringify(value.answers), now, now);
    res.status(201).json({ receipt: { id, createdAt: now } });
  });
  app.get('/api/admin/responses', authenticated, admin, (req, res) => {
    res.json({ responses: store.responses().map(({ subject, ...row }) => ({ ...row, answers: JSON.parse(row.answers) })) });
  });
  app.get('/api/admin/export', authenticated, admin, (req, res) => {
    const questions = questionnaire.sections.flatMap(s => s.questions);
    const rows = store.responses();
    const known = new Set(questions.map(q => q.id));
    const historical = [...new Set(rows.flatMap(row => Object.keys(JSON.parse(row.answers))))].filter(id => !known.has(id));
    const keys = [...questions.map(q => q.id), ...historical];
    const header = ['Protocolo', 'Data', 'Nome', 'E-mail', 'Empresa', 'Versão', 'Consentimento', ...questions.map(q => q.label), ...historical.map(id => `Campo anterior: ${id}`)];
    const lines = [header, ...rows.map(row => {
      const answers = JSON.parse(row.answers);
      return [row.id, row.created_at, row.name, row.email, row.company, row.version, row.consent_at, ...keys.map(id => answers[id])];
    })];
    res.set('Content-Disposition', 'attachment; filename="respostas-medicao.csv"').type('text/csv').send('\uFEFF' + lines.map(line => line.map(csvCell).join(',')).join('\r\n'));
  });
  app.get('/', (req, res) => {
    const base = `${basePath || ''}/`.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
    const html = readFileSync(resolve(root, 'public/index.html'), 'utf8').replace('<head>', `<head><base href="${base}">`);
    res.set('Cache-Control', 'no-store').type('html').send(html);
  });
  app.use(express.static(resolve(root, 'public'), { index: false }));
  app.use('/api', (req, res) => res.status(404).json({ error: 'Rota não encontrada.' }));
  app.use((error, req, res, next) => {
    if (error.type === 'entity.too.large') return res.status(413).json({ error: 'Conteúdo muito grande.' });
    if (error instanceof SyntaxError && 'body' in error) return res.status(400).json({ error: 'Conteúdo inválido.' });
    console.error('Falha interna:', error.message);
    res.status(500).json({ error: 'Não foi possível concluir. Tente novamente.' });
  });
  return { app, store, config };
}
