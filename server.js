// Servidor principal (Node) que atende API e arquivos estaticos.
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { DatabaseSync } = require("node:sqlite");

const port = process.env.PORT || 3000;
const baseDir = __dirname;
const distDir = path.join(baseDir, "MVP", "dist");
const basePathEnv = process.env.BASE_PATH || "";
const basePath = basePathEnv
  ? `/${basePathEnv.replace(/^\/+|\/+$/g, "")}`
  : "";
const basePaths = [basePath, "/efish"].filter((value, index, arr) => value && arr.indexOf(value) === index);
const dataDir = path.join(baseDir, "data");
const uploadDir = path.join(dataDir, "uploads");
const dbPath = path.join(dataDir, "app.db");
const cookieName = "efish_session";
const sessionTtlMs = 1000 * 60 * 60 * 24 * 7;
const adminEmails = new Set(["mateusrogerio777@gmail.com"]);
const allowedOrigins = new Set(
  (process.env.CORS_ORIGINS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
);

const loadEnvFile = (filePath) => {
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, "utf8");
  raw.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const idx = trimmed.indexOf("=");
    if (idx <= 0) return;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  });
};

loadEnvFile(path.join(baseDir, "MVP", ".env"));

fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(uploadDir, { recursive: true });
const db = new DatabaseSync(dbPath);

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS skus (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    value TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS eans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    value TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT,
    name TEXT NOT NULL,
    description TEXT,
    price_cents INTEGER NOT NULL,
    category TEXT,
    main_image_url TEXT,
    image_urls TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL,
    cnpj TEXT,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS bling_tokens (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    token_type TEXT,
    scope TEXT,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS bling_oauth_states (
    state TEXT PRIMARY KEY,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_number TEXT NOT NULL,
    status TEXT NOT NULL,
    payload TEXT NOT NULL,
    created_at TEXT NOT NULL,
    approved_at TEXT,
    sent_at TEXT,
    bling_id TEXT,
    error_message TEXT
  );
`);

const userColumns = db.prepare("PRAGMA table_info(users)").all().map((row) => row.name);
if (!userColumns.includes("cnpj")) {
  db.prepare("ALTER TABLE users ADD COLUMN cnpj TEXT").run();
}
if (!userColumns.includes("status")) {
  db.prepare("ALTER TABLE users ADD COLUMN status TEXT").run();
  db.prepare("UPDATE users SET status = 'ACTIVE' WHERE status IS NULL OR status = ''").run();
}

const productColumns = db
  .prepare("PRAGMA table_info(products)")
  .all()
  .map((row) => row.name);
if (!productColumns.includes("slug")) {
  db.prepare("ALTER TABLE products ADD COLUMN slug TEXT").run();
}

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".avif": "image/avif",
  ".svg": "image/svg+xml",
  ".webp": "image/webp"
};

const normalizeEmail = (value) => String(value || "").trim().toLowerCase();
const normalizeCnpj = (value) => String(value || "").replace(/\D/g, "");
const normalizeDoc = (value) => String(value || "").replace(/\D/g, "");
const isAdminEmail = (value) => adminEmails.has(normalizeEmail(value));
const maxUploadBytes = 5 * 1024 * 1024;
const uploadMimeToExt = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
  "image/avif": "avif"
};

const parseDataUrl = (value) => {
  const match = /^data:([a-zA-Z0-9.+/-]+);base64,([A-Za-z0-9+/=]+)$/.exec(
    String(value || "")
  );
  if (!match) return null;
  return { mime: match[1], data: match[2] };
};

const extractColor = (description) => {
  const match = String(description || "").match(/Cor:\s*([^|]+)/i);
  return match ? match[1].trim() : "";
};

const buildProductName = (name, description) => {
  const trimmed = String(name || "").trim();
  if (trimmed.includes("|")) return trimmed;
  const color = extractColor(description);
  return color ? `${trimmed} | ${color}` : trimmed;
};

const slugify = (value) => {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-")
    .toLowerCase();
};

const ensureUniqueSlug = (baseSlug, excludeId) => {
  let slug = baseSlug;
  let counter = 2;
  while (slug) {
    const row = db
      .prepare("SELECT id FROM products WHERE slug = ?")
      .get(slug);
    if (!row || (excludeId && row.id === excludeId)) return slug;
    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }
  return baseSlug;
};

const getRequestBasePath = (pathname) => {
  for (const prefix of basePaths) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      return prefix;
    }
  }
  return "";
};

const hashPassword = (password) => {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
};

const verifyPassword = (password, stored) => {
  const [salt, hash] = String(stored || "").split(":");
  if (!salt || !hash) return false;
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  const hashBuf = Buffer.from(hash, "hex");
  const derivedBuf = Buffer.from(derived, "hex");
  if (hashBuf.length !== derivedBuf.length) return false;
  return crypto.timingSafeEqual(hashBuf, derivedBuf);
};

const parseCookies = (req) => {
  const header = req.headers.cookie;
  if (!header) return {};
  return header.split(";").reduce((acc, part) => {
    const [name, ...rest] = part.trim().split("=");
    if (!name) return acc;
    acc[name] = decodeURIComponent(rest.join("="));
    return acc;
  }, {});
};

const isSecureRequest = (req) => {
  const forwarded = String(req.headers["x-forwarded-proto"] || "").toLowerCase();
  if (forwarded) return forwarded === "https";
  return Boolean(req.socket && req.socket.encrypted);
};

const serializeCookie = (name, value, options = {}) => {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  if (options.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`);
  if (options.path) parts.push(`Path=${options.path}`);
  if (options.httpOnly) parts.push("HttpOnly");
  if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);
  if (options.secure) parts.push("Secure");
  return parts.join("; ");
};

const getCorsHeaders = (req) => {
  const origin = req.headers.origin;
  if (!origin) return {};
  if (allowedOrigins.size > 0 && !allowedOrigins.has(origin)) {
    return {};
  }
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Credentials": "true",
    Vary: "Origin"
  };
};

const sendJson = (req, res, status, data, extraHeaders = {}) => {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...getCorsHeaders(req),
    ...extraHeaders
  });
  res.end(JSON.stringify(data));
};

const readJsonBody = (req, maxBytes = 1_000_000) =>
  new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > maxBytes) {
        req.destroy();
        reject(new Error("Payload too large"));
      }
    });
    req.on("end", () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(error);
      }
    });
  });

const toIso = () => new Date().toISOString();

const createSession = (userId) => {
  const sessionId = crypto.randomBytes(32).toString("hex");
  const createdAt = toIso();
  const expiresAt = new Date(Date.now() + sessionTtlMs).toISOString();
  db.prepare("DELETE FROM sessions WHERE user_id = ?").run(userId);
  db.prepare(
    "INSERT INTO sessions (id, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)"
  ).run(sessionId, userId, createdAt, expiresAt);
  return { sessionId, expiresAt };
};

const getSessionUser = (req) => {
  const cookies = parseCookies(req);
  const sessionId = cookies[cookieName];
  if (!sessionId) return null;
  const row = db
    .prepare(
      `SELECT s.id as session_id, s.expires_at, u.id as user_id, u.name, u.email, u.role, u.cnpj, u.status
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.id = ?`
    )
    .get(sessionId);
  if (!row) return null;
  if (Date.parse(row.expires_at) <= Date.now()) {
    db.prepare("DELETE FROM sessions WHERE id = ?").run(sessionId);
    return null;
  }
  let role = row.role;
  let status = row.status || "ACTIVE";
  if (isAdminEmail(row.email)) {
    if (role !== "ADMIN") {
      role = "ADMIN";
      db.prepare("UPDATE users SET role = ? WHERE id = ?").run(role, row.user_id);
    }
    if (status !== "ACTIVE") {
      status = "ACTIVE";
      db.prepare("UPDATE users SET status = ? WHERE id = ?").run(status, row.user_id);
    }
  }
  return {
    id: String(row.user_id),
    name: row.name,
    email: row.email,
    cnpj: row.cnpj || "",
    role,
    status
  };
};

const makeSessionCookie = (req, sessionId) =>
  serializeCookie(cookieName, sessionId, {
    httpOnly: true,
    sameSite: "Lax",
    secure: isSecureRequest(req),
    path: "/",
    maxAge: Math.floor(sessionTtlMs / 1000)
  });

const clearSessionCookie = (req) =>
  serializeCookie(cookieName, "", {
    httpOnly: true,
    sameSite: "Lax",
    secure: isSecureRequest(req),
    path: "/",
    maxAge: 0
  });

const requireAuth = (req, res) => {
  const user = getSessionUser(req);
  if (!user) {
    sendJson(req, res, 401, { message: "Nao autenticado." });
    return null;
  }
  return user;
};

const requireAdmin = (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return null;
  if (user.status && user.status !== "ACTIVE") {
    sendJson(req, res, 403, { message: "Cadastro pendente." });
    return null;
  }
  if (user.role !== "ADMIN") {
    sendJson(req, res, 403, { message: "Sem permissao." });
    return null;
  }
  return user;
};

const requireActiveUser = (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return null;
  if (user.status && user.status !== "ACTIVE") {
    sendJson(req, res, 403, { message: "Cadastro pendente." });
    return null;
  }
  return user;
};

const getBlingConfig = () => {
  const clientId = process.env.BLING_CLIENT_ID || "";
  const clientSecret = process.env.BLING_CLIENT_SECRET || "";
  const redirectUri = process.env.BLING_REDIRECT_URI || "";
  return { clientId, clientSecret, redirectUri };
};

const getStoredBlingToken = () =>
  db.prepare("SELECT * FROM bling_tokens WHERE id = 1").get();

const saveBlingToken = (token) => {
  const payload = {
    access_token: token.access_token,
    refresh_token: token.refresh_token,
    expires_at: token.expires_at,
    token_type: token.token_type || "bearer",
    scope: token.scope || "",
    created_at: toIso()
  };
  db.prepare(
    `INSERT INTO bling_tokens (id, access_token, refresh_token, expires_at, token_type, scope, created_at)
     VALUES (1, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       access_token = excluded.access_token,
       refresh_token = excluded.refresh_token,
       expires_at = excluded.expires_at,
       token_type = excluded.token_type,
       scope = excluded.scope,
       created_at = excluded.created_at`
  ).run(
    payload.access_token,
    payload.refresh_token,
    payload.expires_at,
    payload.token_type,
    payload.scope,
    payload.created_at
  );
};

const storeOauthState = (state) => {
  db.prepare("INSERT INTO bling_oauth_states (state, created_at) VALUES (?, ?)")
    .run(state, toIso());
};

const consumeOauthState = (state) => {
  const row = db
    .prepare("SELECT state, created_at FROM bling_oauth_states WHERE state = ?")
    .get(state);
  if (!row) return false;
  const createdAt = Date.parse(row.created_at);
  db.prepare("DELETE FROM bling_oauth_states WHERE state = ?").run(state);
  return Date.now() - createdAt < 10 * 60 * 1000;
};

const exchangeBlingToken = async ({ code, refreshToken }) => {
  const { clientId, clientSecret, redirectUri } = getBlingConfig();
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Bling OAuth nao configurado.");
  }
  const tokenUrl = "https://bling.com.br/Api/v3/oauth/token";
  const params = new URLSearchParams();
  if (code) {
    params.set("grant_type", "authorization_code");
    params.set("code", code);
    params.set("redirect_uri", redirectUri);
  } else {
    params.set("grant_type", "refresh_token");
    params.set("refresh_token", refreshToken);
  }
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: params.toString()
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Falha ao obter token do Bling.");
  }
  return response.json();
};

const getBlingAccessToken = async () => {
  const token = getStoredBlingToken();
  if (!token) return null;
  const expiresAt = Date.parse(token.expires_at);
  if (Number.isFinite(expiresAt) && expiresAt - Date.now() > 60 * 1000) {
    return token.access_token;
  }
  const refreshed = await exchangeBlingToken({ refreshToken: token.refresh_token });
  const newExpires = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();
  saveBlingToken({
    access_token: refreshed.access_token,
    refresh_token: refreshed.refresh_token || token.refresh_token,
    expires_at: newExpires,
    token_type: refreshed.token_type,
    scope: refreshed.scope
  });
  return refreshed.access_token;
};

const blingApiFetch = async (endpoint, params) => {
  const accessToken = await getBlingAccessToken();
  if (!accessToken) {
    const error = new Error("Bling nao conectado.");
    error.status = 401;
    throw error;
  }
  const url = new URL(`https://api.bling.com.br/Api/v3${endpoint}`);
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    url.searchParams.set(key, String(value));
  });
  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!response.ok) {
    const text = await response.text();
    const error = new Error(text || "Erro ao consultar Bling.");
    error.status = response.status;
    throw error;
  }
  return response.json();
};

const blingApiPost = async (endpoint, payload) => {
  const accessToken = await getBlingAccessToken();
  if (!accessToken) {
    const error = new Error("Bling nao conectado.");
    error.status = 401;
    throw error;
  }
  const response = await fetch(`https://api.bling.com.br/Api/v3${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const text = await response.text();
    const error = new Error(text || "Erro ao enviar dados ao Bling.");
    error.status = response.status;
    throw error;
  }
  return response.json();
};

const resolveBlingContact = async (client) => {
  const doc = normalizeDoc(client?.cnpjCpf);
  const nome = String(client?.nome || "Cliente");
  const email = String(client?.email || "");
  try {
    const params = { pagina: 1, limite: 1 };
    if (doc) params.numeroDocumento = doc;
    else if (email) params.email = email;
    else if (nome) params.nome = nome;
    const response = await blingApiFetch("/contatos", params);
    const found = Array.isArray(response?.data?.data) ? response.data.data[0] : null;
    if (found?.id && found?.nome) {
      return { id: Number(found.id), nome: String(found.nome) };
    }
  } catch {
    // ignorar falha de consulta
  }
  const payload = {
    nome,
    tipoPessoa: doc.length === 14 ? "J" : "F",
    numeroDocumento: doc || undefined,
    email: email || undefined
  };
  try {
    const created = await blingApiPost("/contatos", payload);
    const createdId = created?.data?.id ? Number(created.data.id) : null;
    if (createdId) {
      return { id: createdId, nome: String(created?.data?.nome || nome) };
    }
  } catch {
    // ignorar falha de criacao
  }
  return payload;
};

const buildBlingOrderPayload = async (budget) => {
  const today = new Date().toISOString().slice(0, 10);
  const contato = await resolveBlingContact(budget?.cliente);
  const itens = (budget?.itens || []).map((item, index) => ({
    codigo: String(item?.produto?.id || item?.produto?.nome || `ITEM-${index + 1}`),
    descricao: String(item?.produto?.nome || `Item ${index + 1}`),
    quantidade: Number(item?.quantidade || 0),
    valor: Number(item?.produto?.preco || 0),
    valorLista: Number(item?.produto?.preco || 0)
  }));
  const formaPagamentoId = Number(process.env.BLING_FORMA_PAGAMENTO_ID);
  const parcelas = Number.isFinite(formaPagamentoId)
    ? [
        {
          id: 0,
          dataVencimento: today,
          valor: Number(budget?.total || 0),
          formaPagamento: { id: formaPagamentoId }
        }
      ]
    : undefined;
  return {
    numeroLoja: String(budget?.numeroPedido || ""),
    data: today,
    dataSaida: today,
    dataPrevista: today,
    contato,
    itens,
    ...(parcelas ? { parcelas } : {}),
    observacoes: String(budget?.observacoes || "")
  };
};

const listSkus = (limit) =>
  db
    .prepare("SELECT id, value, created_at FROM skus ORDER BY id ASC LIMIT ?")
    .all(limit);
const insertSku = (value) => {
  const createdAt = toIso();
  const info = db
    .prepare("INSERT INTO skus (value, created_at) VALUES (?, ?)")
    .run(value, createdAt);
  return { id: Number(info.lastInsertRowid), value, createdAt };
};
const deleteSku = (id) =>
  db.prepare("DELETE FROM skus WHERE id = ?").run(id).changes > 0;

const listEans = (limit) =>
  db
    .prepare("SELECT id, value, created_at FROM eans ORDER BY id ASC LIMIT ?")
    .all(limit);
const insertEan = (value) => {
  const createdAt = toIso();
  const info = db
    .prepare("INSERT INTO eans (value, created_at) VALUES (?, ?)")
    .run(value, createdAt);
  return { id: Number(info.lastInsertRowid), value, createdAt };
};
const deleteEan = (id) =>
  db.prepare("DELETE FROM eans WHERE id = ?").run(id).changes > 0;

const listProducts = (limit) =>
  db
    .prepare(
      "SELECT id, slug, name, description, price_cents, category, main_image_url, image_urls, created_at, updated_at FROM products ORDER BY id ASC LIMIT ?"
    )
    .all(limit)
    .map((row) => toProductResponse(row));

const getProductByIdentifier = (identifier) => {
  if (!identifier) return null;
  const slugRow = db
    .prepare(
      "SELECT id, slug, name, description, price_cents, category, main_image_url, image_urls, created_at, updated_at FROM products WHERE slug = ?"
    )
    .get(identifier);
  if (slugRow) return slugRow;
  const numericId = Number(identifier);
  if (!Number.isFinite(numericId)) return null;
  return db
    .prepare(
      "SELECT id, slug, name, description, price_cents, category, main_image_url, image_urls, created_at, updated_at FROM products WHERE id = ?"
    )
    .get(numericId);
};
const insertProduct = (payload) => {
  const createdAt = toIso();
  const updatedAt = createdAt;
  const name = buildProductName(payload.name, payload.description);
  const slug = ensureUniqueSlug(slugify(name));
  const info = db
    .prepare(
      "INSERT INTO products (slug, name, description, price_cents, category, main_image_url, image_urls, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .run(
      slug,
      name,
      payload.description ?? "",
      payload.priceCents,
      payload.category ?? "",
      payload.mainImageUrl ?? "",
      JSON.stringify(payload.imageUrls ?? []),
      createdAt,
      updatedAt
    );
  return toProductResponse({
    id: Number(info.lastInsertRowid),
    slug,
    name,
    description: payload.description ?? "",
    price_cents: payload.priceCents,
    category: payload.category ?? "",
    main_image_url: payload.mainImageUrl ?? "",
    image_urls: JSON.stringify(payload.imageUrls ?? []),
    created_at: createdAt,
    updated_at: updatedAt
  });
};

const updateProduct = (id, payload) => {
  const current = getProductByIdentifier(id);
  if (!current) return null;
  const updatedAt = toIso();
  const name = buildProductName(payload.name, payload.description ?? current.description);
  const slug = ensureUniqueSlug(slugify(name), current.id);
  const info = db
    .prepare(
      "UPDATE products SET slug = ?, name = ?, description = ?, price_cents = ?, category = ?, main_image_url = ?, image_urls = ?, updated_at = ? WHERE id = ?"
    )
    .run(
      slug,
      name,
      payload.description ?? "",
      payload.priceCents,
      payload.category ?? "",
      payload.mainImageUrl ?? "",
      JSON.stringify(payload.imageUrls ?? []),
      updatedAt,
      current.id
    );
  if (info.changes === 0) return null;
  return getProductByIdentifier(slug) || getProductByIdentifier(current.id);
};

const toProductResponse = (row) => ({
  id: row.slug || row.id,
  name: row.name,
  description: row.description ?? "",
  priceCents: row.price_cents,
  price: row.price_cents / 100,
  category: row.category ?? "",
  mainImageUrl: row.main_image_url ?? "",
  imageUrls: row.image_urls ? JSON.parse(row.image_urls) : [],
  createdAt: row.created_at,
  updatedAt: row.updated_at
});
const deleteProduct = (id) =>
  db.prepare("DELETE FROM products WHERE id = ?").run(id).changes > 0;

const decodePath = (value) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const resolveSafePath = (rootDir, requestPath) => {
  const decoded = decodePath(requestPath);
  const clean = path.normalize(decoded).replace(/^(\.\.(\/|\\|$))+/, "");
  const finalPath = path.join(rootDir, clean);
  if (!finalPath.startsWith(rootDir)) return null;
  return finalPath;
};

const serveFile = (res, filePath) => {
  if (!filePath) {
    res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    return res.end("Caminho inválido");
  }

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === "ENOENT") {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        return res.end("Arquivo não encontrado");
      }
      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      return res.end("Erro interno do servidor");
    }

    const ext = path.extname(filePath).toLowerCase();
    const mimeType = mimeTypes[ext] || "application/octet-stream";

    res.writeHead(200, {
      "Content-Type": mimeType,
      "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=31536000"
    });
    res.end(content);
  });
};

const stripBasePath = (pathname) => {
  for (const prefix of basePaths) {
    if (pathname === prefix) return "/";
    if (pathname.startsWith(`${prefix}/`)) return pathname.slice(prefix.length);
  }
  return pathname;
};

const server = http.createServer(async (req, res) => {
  const baseUrl = `http://${req.headers.host || "localhost"}`;
  const url = new URL(req.url || "/", baseUrl);
  const cleanUrl = stripBasePath(url.pathname);

  if (cleanUrl.startsWith("/api/") && req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      ...getCorsHeaders(req)
    });
    return res.end();
  }

  if (cleanUrl === "/api/status") {
    return sendJson(req, res, 200, {
      ok: true,
      message: "Servidor ativo e pronto para o workspace",
      timestamp: new Date().toISOString()
    });
  }

  if (cleanUrl === "/api/auth/register" && req.method === "POST") {
    try {
      const body = await readJsonBody(req);
      const name = String(body.name || "").trim();
      const email = normalizeEmail(body.email);
      const password = String(body.password || "");
      const cnpj = normalizeCnpj(body.cnpj);
      if (!name || !email || !password) {
        return sendJson(req, res, 400, { message: "Dados invalidos." });
      }
      if (!cnpj || cnpj.length !== 14) {
        return sendJson(req, res, 400, { message: "CNPJ invalido." });
      }
      const exists = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
      if (exists) {
        return sendJson(req, res, 409, { message: "Email ja cadastrado." });
      }
      const role = isAdminEmail(email) ? "ADMIN" : "CLIENT";
      const status = isAdminEmail(email) ? "ACTIVE" : "PENDING";
      const passwordHash = hashPassword(password);
      const info = db
        .prepare(
          "INSERT INTO users (name, email, password_hash, role, cnpj, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
        )
        .run(name, email, passwordHash, role, cnpj, status, toIso());
      const userId = Number(info.lastInsertRowid);
      const session = createSession(userId);
      const cookie = makeSessionCookie(req, session.sessionId);
      return sendJson(
        req,
        res,
        201,
        { user: { id: String(userId), name, email, cnpj, role, status } },
        { "Set-Cookie": cookie }
      );
    } catch {
      return sendJson(req, res, 400, { message: "JSON invalido." });
    }
  }

  if (cleanUrl === "/api/auth/login" && req.method === "POST") {
    try {
      const body = await readJsonBody(req);
      const email = normalizeEmail(body.email);
      const password = String(body.password || "");
      if (!email || !password) {
        return sendJson(req, res, 400, { message: "Credenciais invalidas." });
      }
      const row = db
        .prepare(
          "SELECT id, name, email, password_hash, role, cnpj, status FROM users WHERE email = ?"
        )
        .get(email);
      if (!row || !verifyPassword(password, row.password_hash)) {
        return sendJson(req, res, 401, { message: "Credenciais invalidas." });
      }
      let role = row.role;
      let status = row.status || "ACTIVE";
      if (isAdminEmail(row.email) && role !== "ADMIN") {
        role = "ADMIN";
        db.prepare("UPDATE users SET role = ? WHERE id = ?").run(role, row.id);
      }
      if (isAdminEmail(row.email) && status !== "ACTIVE") {
        status = "ACTIVE";
        db.prepare("UPDATE users SET status = ? WHERE id = ?").run(status, row.id);
      }
      if (status === "REJECTED") {
        return sendJson(req, res, 403, { message: "Cadastro recusado." });
      }
      const session = createSession(row.id);
      const cookie = makeSessionCookie(req, session.sessionId);
      return sendJson(
        req,
        res,
        200,
        {
          user: {
            id: String(row.id),
            name: row.name,
            email: row.email,
            cnpj: row.cnpj || "",
            role,
            status
          }
        },
        { "Set-Cookie": cookie }
      );
    } catch {
      return sendJson(req, res, 400, { message: "JSON invalido." });
    }
  }

  if (cleanUrl === "/api/auth/me" && req.method === "GET") {
    const user = getSessionUser(req);
    if (!user) {
      return sendJson(req, res, 401, { message: "Nao autenticado." });
    }
    return sendJson(req, res, 200, { user });
  }

  if (cleanUrl === "/api/auth/logout" && req.method === "POST") {
    const cookies = parseCookies(req);
    const sessionId = cookies[cookieName];
    if (sessionId) {
      db.prepare("DELETE FROM sessions WHERE id = ?").run(sessionId);
    }
    const cookie = clearSessionCookie(req);
    return sendJson(req, res, 200, { ok: true }, { "Set-Cookie": cookie });
  }

  if (cleanUrl === "/api/bling/status" && req.method === "GET") {
    const user = requireAdmin(req, res);
    if (!user) return;
    const token = getStoredBlingToken();
    const connected = Boolean(token && token.access_token);
    return sendJson(req, res, 200, {
      connected,
      expiresAt: token?.expires_at || null
    });
  }

  if (cleanUrl === "/api/bling/connect" && req.method === "GET") {
    const user = requireAdmin(req, res);
    if (!user) return;
    const { clientId, redirectUri } = getBlingConfig();
    if (!clientId || !redirectUri) {
      return sendJson(req, res, 500, { message: "Bling nao configurado." });
    }
    const state = crypto.randomBytes(16).toString("hex");
    storeOauthState(state);
    const authUrl = new URL("https://www.bling.com.br/Api/v3/oauth/authorize");
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    res.writeHead(302, { Location: authUrl.toString() });
    return res.end();
  }

  if (cleanUrl === "/api/bling/callback" && req.method === "GET") {
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    if (!code || !state) {
      return sendJson(req, res, 400, { message: "Parametros invalidos." });
    }
    if (!consumeOauthState(state)) {
      return sendJson(req, res, 400, { message: "State invalido." });
    }
    try {
      const token = await exchangeBlingToken({ code });
      const expiresAt = new Date(Date.now() + token.expires_in * 1000).toISOString();
      saveBlingToken({
        access_token: token.access_token,
        refresh_token: token.refresh_token,
        expires_at: expiresAt,
        token_type: token.token_type,
        scope: token.scope
      });
      const prefix = getRequestBasePath(url.pathname);
      const redirectTarget = `${prefix}/dashboard`;
      res.writeHead(302, { Location: redirectTarget });
      return res.end();
    } catch (error) {
      return sendJson(req, res, 500, {
        message: error.message || "Falha ao conectar com o Bling."
      });
    }
  }

  if (cleanUrl === "/api/bling/clients" && req.method === "GET") {
    const user = requireAdmin(req, res);
    if (!user) return;
    try {
      const pagina = Number(url.searchParams.get("pagina") || 1);
      const limite = Number(url.searchParams.get("limite") || 100);
      const data = await blingApiFetch("/contatos", { pagina, limite });
      return sendJson(req, res, 200, { data });
    } catch (error) {
      return sendJson(req, res, error.status || 500, {
        message: error.message || "Falha ao consultar clientes."
      });
    }
  }

  if (cleanUrl === "/api/bling/products" && req.method === "GET") {
    const user = requireAdmin(req, res);
    if (!user) return;
    try {
      const pagina = Number(url.searchParams.get("pagina") || 1);
      const limite = Number(url.searchParams.get("limite") || 100);
      const data = await blingApiFetch("/produtos", { pagina, limite });
      return sendJson(req, res, 200, { data });
    } catch (error) {
      return sendJson(req, res, error.status || 500, {
        message: error.message || "Falha ao consultar produtos."
      });
    }
  }

  if (cleanUrl === "/api/bling/sellers" && req.method === "GET") {
    const user = requireAdmin(req, res);
    if (!user) return;
    try {
      const pagina = Number(url.searchParams.get("pagina") || 1);
      const limite = Number(url.searchParams.get("limite") || 100);
      const data = await blingApiFetch("/vendedores", { pagina, limite });
      return sendJson(req, res, 200, { data });
    } catch (error) {
      return sendJson(req, res, error.status || 500, {
        message: error.message || "Falha ao consultar vendedores."
      });
    }
  }

  if (cleanUrl === "/api/bling/stock" && req.method === "GET") {
    const user = requireAdmin(req, res);
    if (!user) return;
    try {
      const pagina = Number(url.searchParams.get("pagina") || 1);
      const limite = Number(url.searchParams.get("limite") || 100);
      const data = await blingApiFetch("/estoques/saldos", { pagina, limite });
      return sendJson(req, res, 200, { data });
    } catch (error) {
      return sendJson(req, res, error.status || 500, {
        message: error.message || "Falha ao consultar estoque."
      });
    }
  }

  if (cleanUrl === "/api/bling/orders" && req.method === "GET") {
    const user = requireAdmin(req, res);
    if (!user) return;
    try {
      const pagina = Number(url.searchParams.get("pagina") || 1);
      const limite = Number(url.searchParams.get("limite") || 100);
      const data = await blingApiFetch("/pedidos/vendas", { pagina, limite });
      return sendJson(req, res, 200, { data });
    } catch (error) {
      return sendJson(req, res, error.status || 500, {
        message: error.message || "Falha ao consultar pedidos."
      });
    }
  }

  if (cleanUrl === "/api/orders" && req.method === "POST") {
    const user = requireActiveUser(req, res);
    if (!user) return;
    try {
      const body = await readJsonBody(req, 2_000_000);
      const orderNumber = String(body?.numeroPedido || "").trim();
      const items = Array.isArray(body?.itens) ? body.itens : [];
      if (!orderNumber || items.length === 0) {
        return sendJson(req, res, 400, { message: "Pedido invalido." });
      }
      const createdAt = toIso();
      const payload = JSON.stringify(body);
      const info = db
        .prepare(
          "INSERT INTO orders (order_number, status, payload, created_at) VALUES (?, ?, ?, ?)"
        )
        .run(orderNumber, "PENDING", payload, createdAt);
      return sendJson(req, res, 201, {
        order: { id: Number(info.lastInsertRowid), orderNumber, status: "PENDING" }
      });
    } catch {
      return sendJson(req, res, 400, { message: "JSON invalido." });
    }
  }

  if (cleanUrl === "/api/orders" && req.method === "GET") {
    const user = requireAdmin(req, res);
    if (!user) return;
    const status = String(url.searchParams.get("status") || "").toUpperCase();
    const rows = status
      ? db
          .prepare(
            "SELECT id, order_number, status, payload, created_at, approved_at, sent_at, bling_id, error_message FROM orders WHERE status = ? ORDER BY created_at DESC"
          )
          .all(status)
      : db
          .prepare(
            "SELECT id, order_number, status, payload, created_at, approved_at, sent_at, bling_id, error_message FROM orders ORDER BY created_at DESC"
          )
          .all();
    const orders = rows.map((row) => ({
      id: String(row.id),
      orderNumber: row.order_number,
      status: row.status,
      createdAt: row.created_at,
      approvedAt: row.approved_at,
      sentAt: row.sent_at,
      blingId: row.bling_id,
      errorMessage: row.error_message,
      payload: JSON.parse(row.payload)
    }));
    return sendJson(req, res, 200, { orders });
  }

  if (cleanUrl.startsWith("/api/orders/") && req.method === "POST") {
    const user = requireAdmin(req, res);
    if (!user) return;
    const parts = cleanUrl.split("/").filter(Boolean);
    if (parts.length !== 4 || (parts[3] !== "approve" && parts[3] !== "reject")) {
      return sendJson(req, res, 404, { message: "Rota invalida." });
    }
    const id = Number(parts[2]);
    if (!Number.isFinite(id)) {
      return sendJson(req, res, 400, { message: "ID invalido." });
    }
    const row = db
      .prepare(
        "SELECT id, status, payload FROM orders WHERE id = ?"
      )
      .get(id);
    if (!row) {
      return sendJson(req, res, 404, { message: "Pedido nao encontrado." });
    }
    if (row.status !== "PENDING") {
      return sendJson(req, res, 400, { message: "Pedido ja processado." });
    }
    if (parts[3] === "reject") {
      db.prepare(
        "UPDATE orders SET status = ?, approved_at = ?, error_message = NULL WHERE id = ?"
      ).run("REJECTED", toIso(), id);
      return sendJson(req, res, 200, { ok: true });
    }
    try {
      const budget = JSON.parse(row.payload);
      const payload = await buildBlingOrderPayload(budget);
      const result = await blingApiPost("/pedidos/vendas", payload);
      const blingId = result?.data?.id ? String(result.data.id) : null;
      const approvedAt = toIso();
      db.prepare(
        "UPDATE orders SET status = ?, approved_at = ?, sent_at = ?, bling_id = ?, error_message = NULL WHERE id = ?"
      ).run("SENT", approvedAt, approvedAt, blingId, id);
      return sendJson(req, res, 200, { ok: true, blingId });
    } catch (error) {
      db.prepare(
        "UPDATE orders SET status = ?, approved_at = ?, error_message = ? WHERE id = ?"
      ).run("FAILED", toIso(), error.message || "Falha ao enviar.", id);
      return sendJson(req, res, error.status || 500, {
        message: error.message || "Falha ao enviar pedido ao Bling."
      });
    }
  }

  if (cleanUrl === "/api/admin/registrations" && req.method === "GET") {
    const user = requireAdmin(req, res);
    if (!user) return;
    const rows = db
      .prepare(
        "SELECT id, name, email, cnpj, created_at FROM users WHERE status = 'PENDING' ORDER BY created_at DESC"
      )
      .all();
    const registrations = rows.map((row) => ({
      id: String(row.id),
      name: row.name,
      email: row.email,
      cnpj: row.cnpj || "",
      createdAt: row.created_at
    }));
    return sendJson(req, res, 200, { registrations });
  }

  if (cleanUrl.startsWith("/api/admin/registrations/") && req.method === "POST") {
    const user = requireAdmin(req, res);
    if (!user) return;
    const parts = cleanUrl.split("/").filter(Boolean);
    if (parts.length !== 5) {
      return sendJson(req, res, 404, { message: "Rota invalida." });
    }
    const id = Number(parts[3]);
    const action = parts[4];
    if (!Number.isFinite(id)) {
      return sendJson(req, res, 400, { message: "ID invalido." });
    }
    if (action !== "approve" && action !== "reject") {
      return sendJson(req, res, 400, { message: "Acao invalida." });
    }
    const newStatus = action === "approve" ? "ACTIVE" : "REJECTED";
    const info = db
      .prepare("UPDATE users SET status = ? WHERE id = ?")
      .run(newStatus, id);
    if (info.changes === 0) {
      return sendJson(req, res, 404, { message: "Cadastro nao encontrado." });
    }
    if (newStatus === "REJECTED") {
      db.prepare("DELETE FROM sessions WHERE user_id = ?").run(id);
    }
    return sendJson(req, res, 200, { ok: true, status: newStatus });
  }

  if (cleanUrl === "/api/uploads" && req.method === "POST") {
    const user = requireAdmin(req, res);
    if (!user) return;
    try {
      const body = await readJsonBody(req, 12_000_000);
      const parsed = parseDataUrl(body.dataUrl);
      if (!parsed) {
        return sendJson(req, res, 400, { message: "Imagem invalida." });
      }
      const ext = uploadMimeToExt[parsed.mime];
      if (!ext) {
        return sendJson(req, res, 400, { message: "Formato nao suportado." });
      }
      const buffer = Buffer.from(parsed.data, "base64");
      if (!buffer.length || buffer.length > maxUploadBytes) {
        return sendJson(req, res, 400, { message: "Arquivo muito grande." });
      }
      const filename = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}.${ext}`;
      const targetPath = resolveSafePath(uploadDir, filename);
      if (!targetPath) {
        return sendJson(req, res, 400, { message: "Caminho invalido." });
      }
      fs.writeFileSync(targetPath, buffer);
      const prefix = getRequestBasePath(url.pathname);
      const urlPath = `${prefix}/uploads/${filename}`;
      const proto = isSecureRequest(req) ? "https" : "http";
      const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost";
      const fullUrl = `${proto}://${host}${urlPath}`;
      return sendJson(req, res, 201, { url: fullUrl, path: urlPath });
    } catch {
      return sendJson(req, res, 400, { message: "Upload invalido." });
    }
  }

  if (cleanUrl === "/api/skus") {
    if (req.method === "GET") {
      const limit = Math.min(
        500,
        Math.max(1, Number(url.searchParams.get("limit") || 200))
      );
      return sendJson(req, res, 200, { skus: listSkus(limit) });
    }
    if (req.method === "POST") {
      try {
        const body = await readJsonBody(req);
        const value = String(body.value || "").trim();
        if (!value) return sendJson(req, res, 400, { message: "SKU invalido." });
        return sendJson(req, res, 201, { sku: insertSku(value) });
      } catch {
        return sendJson(req, res, 400, { message: "JSON invalido." });
      }
    }
  }

  if (cleanUrl.startsWith("/api/skus/") && req.method === "DELETE") {
    const id = Number(cleanUrl.split("/").pop());
    if (!Number.isFinite(id)) return sendJson(req, res, 400, { message: "ID invalido." });
    const ok = deleteSku(id);
    return sendJson(req, res, ok ? 200 : 404, { ok });
  }

  if (cleanUrl === "/api/eans") {
    if (req.method === "GET") {
      const limit = Math.min(
        500,
        Math.max(1, Number(url.searchParams.get("limit") || 200))
      );
      return sendJson(req, res, 200, { eans: listEans(limit) });
    }
    if (req.method === "POST") {
      try {
        const body = await readJsonBody(req);
        const value = String(body.value || "").trim();
        if (!value) return sendJson(req, res, 400, { message: "EAN invalido." });
        return sendJson(req, res, 201, { ean: insertEan(value) });
      } catch {
        return sendJson(req, res, 400, { message: "JSON invalido." });
      }
    }
  }

  if (cleanUrl.startsWith("/api/eans/") && req.method === "DELETE") {
    const id = Number(cleanUrl.split("/").pop());
    if (!Number.isFinite(id)) return sendJson(req, res, 400, { message: "ID invalido." });
    const ok = deleteEan(id);
    return sendJson(req, res, ok ? 200 : 404, { ok });
  }

  if (cleanUrl === "/api/products") {
    if (req.method === "GET") {
      const user = requireActiveUser(req, res);
      if (!user) return;
      const limit = Math.min(
        500,
        Math.max(1, Number(url.searchParams.get("limit") || 200))
      );
      return sendJson(req, res, 200, { products: listProducts(limit) });
    }
    if (req.method === "POST") {
      const user = requireAdmin(req, res);
      if (!user) return;
      try {
        const body = await readJsonBody(req);
        const name = String(body.name || "").trim();
        const description = String(body.description || "").trim();
        const category = String(body.category || "").trim();
        const mainImageUrl = String(body.mainImageUrl || "").trim();
        const imageUrls = Array.isArray(body.imageUrls)
          ? body.imageUrls.map((urlValue) => String(urlValue || "").trim()).filter(Boolean)
          : [];
        const price = Number(body.price);
        if (!name) return sendJson(req, res, 400, { message: "Nome invalido." });
        if (!Number.isFinite(price) || price <= 0) {
          return sendJson(req, res, 400, { message: "Preco invalido." });
        }
        const product = insertProduct({
          name,
          description,
          priceCents: Math.round(price * 100),
          category,
          mainImageUrl,
          imageUrls
        });
        return sendJson(req, res, 201, { product });
      } catch {
        return sendJson(req, res, 400, { message: "JSON invalido." });
      }
    }
  }

  if (cleanUrl.startsWith("/api/products/") && req.method === "GET") {
    const user = requireActiveUser(req, res);
    if (!user) return;
    const id = Number(cleanUrl.split("/").pop());
    if (!Number.isFinite(id)) return sendJson(req, res, 400, { message: "ID invalido." });
    const row = getProductByIdentifier(cleanUrl.split("/").pop());
    if (!row) return sendJson(req, res, 404, { message: "Produto nao encontrado." });
    return sendJson(req, res, 200, { product: toProductResponse(row) });
  }

  if (cleanUrl.startsWith("/api/products/") && req.method === "PUT") {
    const user = requireAdmin(req, res);
    if (!user) return;
    const identifier = cleanUrl.split("/").pop();
    const current = getProductByIdentifier(identifier);
    if (!current) return sendJson(req, res, 404, { message: "Produto nao encontrado." });
    try {
      const body = await readJsonBody(req);
      const name = String(body.name ?? current.name ?? "").trim();
      const description = String(body.description ?? current.description ?? "").trim();
      const category = String(body.category ?? current.category ?? "").trim();
      const mainImageUrl = String(body.mainImageUrl ?? current.main_image_url ?? "").trim();
      const imageUrls = Array.isArray(body.imageUrls)
        ? body.imageUrls.map((urlValue) => String(urlValue || "").trim()).filter(Boolean)
        : current.image_urls
          ? JSON.parse(current.image_urls)
          : [];
      const priceInput = body.price ?? body.priceCents;
      const priceValue = Number(priceInput);
      if (!name) return sendJson(req, res, 400, { message: "Nome invalido." });
      if (!Number.isFinite(priceValue) || priceValue <= 0) {
        return sendJson(req, res, 400, { message: "Preco invalido." });
      }
      const priceCents =
        body.priceCents !== undefined && Number.isFinite(Number(body.priceCents))
          ? Math.round(Number(body.priceCents))
          : Math.round(priceValue * 100);
      const updated = updateProduct(identifier, {
        name,
        description,
        priceCents,
        category,
        mainImageUrl,
        imageUrls
      });
      if (!updated) return sendJson(req, res, 404, { message: "Produto nao encontrado." });
      return sendJson(req, res, 200, { product: toProductResponse(updated) });
    } catch {
      return sendJson(req, res, 400, { message: "JSON invalido." });
    }
  }

  if (cleanUrl.startsWith("/api/products/") && req.method === "DELETE") {
    const user = requireAdmin(req, res);
    if (!user) return;
    const identifier = cleanUrl.split("/").pop();
    const current = getProductByIdentifier(identifier);
    if (!current) return sendJson(req, res, 404, { message: "Produto nao encontrado." });
    const ok = deleteProduct(current.id);
    return sendJson(req, res, ok ? 200 : 404, { ok });
  }

  if (cleanUrl.startsWith("/uploads/")) {
    const uploadPath = resolveSafePath(
      uploadDir,
      cleanUrl.replace(/^\/uploads\//, "")
    );
    return serveFile(res, uploadPath);
  }

  if (cleanUrl === "/dashboard.html") {
    const user = requireAdmin(req, res);
    if (!user) return;
    const dashboardPath = path.join(distDir, "dashboard.html");
    return serveFile(res, dashboardPath);
  }

  if (
    cleanUrl === "/vite.svg" ||
    cleanUrl === "/Logo.png" ||
    cleanUrl === "/duo-logo.png" ||
    cleanUrl.startsWith("/assets/") ||
    cleanUrl.startsWith("/pre_order_imagens/")
  ) {
    const distPath = resolveSafePath(distDir, cleanUrl.replace(/^\//, ""));
    return serveFile(res, distPath);
  }

  if (cleanUrl === "/duo-catalog" || cleanUrl === "/duo-catalog/") {
    const duoIndex = resolveSafePath(distDir, "index.html");
    return serveFile(res, duoIndex);
  }

  if (cleanUrl.startsWith("/duo-catalog/")) {
    const duoIndex = resolveSafePath(distDir, "index.html");
    return serveFile(res, duoIndex);
  }

  const appIndex = resolveSafePath(distDir, "index.html");
  return serveFile(res, appIndex);
});

server.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});
