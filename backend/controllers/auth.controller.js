// Paul
const crypto = require("crypto");
const { promisify } = require("util");

const db = require("../config/db");
const { sendMail } = require("../config/mail");

const scryptAsync = promisify(crypto.scrypt);

const SESSION_COOKIE_NAME = "gentleman_session";
const SESSION_DAYS = 7;
const SESSION_MAX_AGE_MS = SESSION_DAYS * 24 * 60 * 60 * 1000;
const MAGIC_CODE_MINUTES = 10;
const magicCodes = new Map();

function createError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function normalizeEmail(email) {
  if (!email || typeof email !== "string") {
    throw createError(400, "email is required");
  }

  const normalizedEmail = email.trim().toLowerCase();
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailPattern.test(normalizedEmail)) {
    throw createError(400, "email is invalid");
  }

  return normalizedEmail;
}

function validatePassword(password) {
  if (!password || typeof password !== "string") {
    throw createError(400, "password is required");
  }

  if (password.length < 8) {
    throw createError(400, "password must contain at least 8 characters");
  }
}

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = await scryptAsync(password, salt, 64);

  return `${salt}:${hash.toString("hex")}`;
}

async function checkPassword(password, storedPasswordHash) {
  if (!storedPasswordHash || !storedPasswordHash.includes(":")) {
    return false;
  }

  const [salt, savedHash] = storedPasswordHash.split(":");
  const hash = await scryptAsync(password, salt, 64);
  const newHash = Buffer.from(hash.toString("hex"), "hex");
  const oldHash = Buffer.from(savedHash, "hex");

  if (newHash.length !== oldHash.length) {
    return false;
  }

  return crypto.timingSafeEqual(newHash, oldHash);
}

function getJwtSecret() {
  return process.env.JWT_SECRET || process.env.SESSION_SECRET || "dev_secret_change_me";
}

function toBase64Url(value) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function fromBase64Url(value) {
  const paddedValue = value.padEnd(value.length + ((4 - (value.length % 4)) % 4), "=");
  const base64Value = paddedValue.replace(/-/g, "+").replace(/_/g, "/");

  return Buffer.from(base64Value, "base64").toString("utf8");
}

function createSignature(data) {
  return crypto
    .createHmac("sha256", getJwtSecret())
    .update(data)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function secureCompare(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function signToken(payload, expiresInSeconds) {
  const header = {
    alg: "HS256",
    typ: "JWT"
  };

  const now = Math.floor(Date.now() / 1000);
  const tokenPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds
  };

  const encodedHeader = toBase64Url(JSON.stringify(header));
  const encodedPayload = toBase64Url(JSON.stringify(tokenPayload));
  const data = `${encodedHeader}.${encodedPayload}`;
  const signature = createSignature(data);

  return `${data}.${signature}`;
}

function verifyToken(token) {
  if (!token || typeof token !== "string") {
    throw createError(401, "token is required");
  }

  const parts = token.split(".");

  if (parts.length !== 3) {
    throw createError(401, "token is invalid");
  }

  const [encodedHeader, encodedPayload, signature] = parts;
  const expectedSignature = createSignature(`${encodedHeader}.${encodedPayload}`);

  if (!secureCompare(signature, expectedSignature)) {
    throw createError(401, "token is invalid");
  }

  let payload;

  try {
    payload = JSON.parse(fromBase64Url(encodedPayload));
  } catch (error) {
    throw createError(401, "token is invalid");
  }

  const now = Math.floor(Date.now() / 1000);

  if (payload.exp && payload.exp < now) {
    throw createError(401, "token is expired");
  }

  return payload;
}

function getCookieValue(req, cookieName) {
  const cookieHeader = req.headers.cookie;

  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(";").map((cookie) => cookie.trim());
  const cookie = cookies.find((entry) => entry.startsWith(`${cookieName}=`));

  if (!cookie) {
    return null;
  }

  return decodeURIComponent(cookie.substring(cookieName.length + 1));
}

function getBearerToken(req) {
  const authorizationHeader = req.headers.authorization;

  if (!authorizationHeader?.startsWith("Bearer ")) {
    return null;
  }

  return authorizationHeader.substring(7);
}

function getTokenFromRequest(req) {
  return getCookieValue(req, SESSION_COOKIE_NAME) || getBearerToken(req);
}

function getCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_MAX_AGE_MS,
    path: "/"
  };
}

function setSessionCookie(res, user) {
  const token = signToken(
    {
      type: "session",
      userId: user.id,
      email: user.email,
      isAdmin: user.is_admin
    },
    SESSION_MAX_AGE_MS / 1000
  );

  res.cookie(SESSION_COOKIE_NAME, token, getCookieOptions());
}

function clearSessionCookie(res) {
  res.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/"
  });
}

function toPublicUser(user) {
  return {
    id: user.id,
    email: user.email,
    isVerified: user.is_verified,
    isAdmin: user.is_admin,
    isBlocked: user.is_blocked,
    createdAt: user.created_at
  };
}

function toSessionUser(user) {
  return {
    id: user.id,
    email: user.email,
    isVerified: user.is_verified,
    isAdmin: user.is_admin,
    isBlocked: user.is_blocked
  };
}

async function findUserByEmail(email, includePasswordHash = false) {
  const fields = includePasswordHash
    ? "id, email, password_hash, is_verified, is_admin, is_blocked, created_at"
    : "id, email, is_verified, is_admin, is_blocked, created_at";

  const result = await db.query(`SELECT ${fields} FROM users WHERE email = $1`, [email]);

  return result.rows[0] || null;
}

async function findUserById(userId) {
  const result = await db.query(
    "SELECT id, email, is_verified, is_admin, is_blocked, created_at FROM users WHERE id = $1",
    [userId]
  );

  return result.rows[0] || null;
}

function getAppBaseUrl() {
  return process.env.APP_BASE_URL || "http://localhost:3000";
}

function createVerificationToken(user) {
  return signToken(
    {
      type: "email_verification",
      userId: user.id,
      email: user.email
    },
    24 * 60 * 60
  );
}

async function sendVerificationMail(user) {
  const token = createVerificationToken(user);
  const verificationUrl = `${getAppBaseUrl()}/api/auth/verify?token=${encodeURIComponent(token)}`;

  await sendMail({
    to: user.email,
    subject: "Gentleman Shop - E-Mail bestaetigen",
    text: `Bitte bestaetige deine E-Mail-Adresse: ${verificationUrl}`,
    html: `
      <h2>Gentleman Shop</h2>
      <p>Bitte bestaetige deine E-Mail-Adresse.</p>
      <p><a href="${verificationUrl}">E-Mail bestaetigen</a></p>
      <p>Der Link ist 24 Stunden gueltig.</p>
    `
  });
}

function createMagicLinkToken(user, jti) {
  return signToken(
    {
      type: "magic_login",
      userId: user.id,
      email: user.email,
      jti
    },
    MAGIC_CODE_MINUTES * 60
  );
}

async function sendMagicCodeMail(user, code, magicUrl) {
  await sendMail({
    to: user.email,
    subject: "Gentleman Shop - Magic Login",
    text: `Dein Login-Code lautet: ${code}\n\nOder melde dich direkt ueber diesen Link an: ${magicUrl}\n\nCode und Link sind ${MAGIC_CODE_MINUTES} Minuten gueltig und koennen nur einmal verwendet werden.`,
    html: `
      <h2>Gentleman Shop</h2>
      <p>Dein einmaliger Login-Code lautet:</p>
      <h1>${code}</h1>
      <p>Oder melde dich direkt an:</p>
      <p><a href="${magicUrl}">Jetzt anmelden</a></p>
      <p>Code und Link sind ${MAGIC_CODE_MINUTES} Minuten gueltig und koennen nur einmal verwendet werden.</p>
    `
  });
}

function removeExpiredMagicCodes() {
  const now = Date.now();

  for (const [email, entry] of magicCodes.entries()) {
    if (entry.expiresAt <= now) {
      magicCodes.delete(email);
    }
  }
}

async function createSessionForUser(res, user) {
  setSessionCookie(res, user);

  return {
    user: toPublicUser(user),
    session: {
      type: "cookie",
      cookieName: SESSION_COOKIE_NAME,
      expiresInDays: SESSION_DAYS
    }
  };
}

async function getUserFromSession(req) {
  const token = getTokenFromRequest(req);

  if (!token) {
    return null;
  }

  const payload = verifyToken(token);

  if (payload.type !== "session") {
    throw createError(401, "session token is invalid");
  }

  const user = await findUserById(payload.userId);

  if (!user) {
    throw createError(401, "user not found");
  }

  if (user.is_blocked) {
    throw createError(403, "user is blocked");
  }

  return toSessionUser(user);
}

async function register(req, res, next) {
  try {
    const email = normalizeEmail(req.body.email);
    const password = req.body.password;

    validatePassword(password);

    const existingUser = await findUserByEmail(email);

    if (existingUser) {
      throw createError(409, "email is already registered");
    }

    const passwordHash = await hashPassword(password);
    const result = await db.query(
      `INSERT INTO users (email, password_hash)
       VALUES ($1, $2)
       RETURNING id, email, is_verified, is_admin, is_blocked, created_at`,
      [email, passwordHash]
    );
    const user = result.rows[0];

    await sendVerificationMail(user);

    res.status(201).json({
      message: "registration successful. Please verify your email.",
      user: toPublicUser(user)
    });
  } catch (error) {
    if (error.code === "23505") {
      error.statusCode = 409;
      error.message = "email is already registered";
    }

    next(error);
  }
}

async function verifyEmail(req, res, next) {
  try {
    const token = req.query.token || req.body.token;
    const payload = verifyToken(token);

    if (payload.type !== "email_verification") {
      throw createError(400, "verification token is invalid");
    }

    const result = await db.query(
      `UPDATE users
       SET is_verified = TRUE
       WHERE id = $1
       RETURNING id, email, is_verified, is_admin, is_blocked, created_at`,
      [payload.userId]
    );
    const user = result.rows[0];

    if (!user) {
      throw createError(404, "user not found");
    }

    res.status(200).json({
      message: "email verified successfully",
      user: toPublicUser(user)
    });
  } catch (error) {
    next(error);
  }
}

async function resendVerification(req, res, next) {
  try {
    const email = normalizeEmail(req.body.email);
    const user = await findUserByEmail(email);

    if (!user) {
      throw createError(404, "user not found");
    }

    if (user.is_verified) {
      return res.status(200).json({
        message: "email is already verified",
        user: toPublicUser(user)
      });
    }

    await sendVerificationMail(user);

    return res.status(200).json({
      message: "verification email sent"
    });
  } catch (error) {
    return next(error);
  }
}

async function login(req, res, next) {
  try {
    const email = normalizeEmail(req.body.email);
    const password = req.body.password;

    if (!password || typeof password !== "string") {
      throw createError(400, "password is required");
    }

    const user = await findUserByEmail(email, true);

    if (!user || !(await checkPassword(password, user.password_hash))) {
      throw createError(401, "email or password is wrong");
    }

    if (user.is_blocked) {
      throw createError(403, "user is blocked");
    }

    if (!user.is_verified) {
      throw createError(403, "email is not verified");
    }

    const sessionData = await createSessionForUser(res, user);

    res.status(200).json({
      message: "login successful",
      ...sessionData
    });
  } catch (error) {
    next(error);
  }
}

async function requestMagicLogin(req, res, next) {
  try {
    const email = normalizeEmail(req.body.email);
    const user = await findUserByEmail(email);

    if (!user) {
      throw createError(404, "user not found");
    }

    if (user.is_blocked) {
      throw createError(403, "user is blocked");
    }

    if (!user.is_verified) {
      throw createError(403, "email is not verified");
    }

    removeExpiredMagicCodes();

    const code = String(crypto.randomInt(0, 1000000)).padStart(6, "0");
    const jti = crypto.randomBytes(16).toString("hex");
    const expiresAt = Date.now() + MAGIC_CODE_MINUTES * 60 * 1000;

    magicCodes.set(email, {
      code,
      jti,
      userId: user.id,
      expiresAt
    });

    const magicToken = createMagicLinkToken(user, jti);
    const magicUrl = `${getAppBaseUrl()}/api/auth/magic/login?token=${encodeURIComponent(magicToken)}`;

    await sendMagicCodeMail(user, code, magicUrl);

    res.status(200).json({
      message: "magic login code sent",
      expiresInMinutes: MAGIC_CODE_MINUTES
    });
  } catch (error) {
    next(error);
  }
}

async function verifyMagicLogin(req, res, next) {
  try {
    const email = normalizeEmail(req.body.email);
    const code = String(req.body.code || "").trim();
    const savedCode = magicCodes.get(email);

    if (!savedCode) {
      throw createError(401, "magic login code is invalid");
    }

    if (savedCode.expiresAt <= Date.now()) {
      magicCodes.delete(email);
      throw createError(401, "magic login code is expired");
    }

    if (savedCode.code !== code) {
      throw createError(401, "magic login code is invalid");
    }

    const user = await findUserById(savedCode.userId);

    if (!user) {
      throw createError(404, "user not found");
    }

    if (user.is_blocked) {
      throw createError(403, "user is blocked");
    }

    if (!user.is_verified) {
      throw createError(403, "email is not verified");
    }

    magicCodes.delete(email);

    const sessionData = await createSessionForUser(res, user);

    res.status(200).json({
      message: "magic login successful",
      ...sessionData
    });
  } catch (error) {
    next(error);
  }
}

async function verifyMagicLoginLink(req, res) {
  const appBaseUrl = getAppBaseUrl();

  try {
    const payload = verifyToken(req.query.token);

    if (payload.type !== "magic_login") {
      throw createError(401, "magic login link is invalid");
    }

    const entry = magicCodes.get(payload.email);

    // Einmalig: Eintrag muss existieren und zur jti des Links passen (Code oder Link nur einmal nutzbar)
    if (!entry || entry.jti !== payload.jti) {
      throw createError(401, "magic login link is invalid or already used");
    }

    if (entry.expiresAt <= Date.now()) {
      magicCodes.delete(payload.email);
      throw createError(401, "magic login link is expired");
    }

    const user = await findUserById(entry.userId);

    if (!user) {
      throw createError(404, "user not found");
    }

    if (user.is_blocked) {
      throw createError(403, "user is blocked");
    }

    if (!user.is_verified) {
      throw createError(403, "email is not verified");
    }

    magicCodes.delete(payload.email);
    setSessionCookie(res, user);

    return res.redirect(`${appBaseUrl}/index.html`);
  } catch (error) {
    return res.redirect(`${appBaseUrl}/pages/auth/magic-login.html?error=link`);
  }
}

async function getSession(req, res) {
  res.status(200).json({
    authenticated: true,
    user: req.user
  });
}

async function logout(req, res) {
  clearSessionCookie(res);

  res.status(200).json({
    message: "logout successful"
  });
}

async function authenticate(req, res, next) {
  try {
    const user = await getUserFromSession(req);

    if (!user) {
      throw createError(401, "authentication required");
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

async function optionalAuth(req, res, next) {
  try {
    const user = await getUserFromSession(req);

    if (user) {
      req.user = user;
    }

    next();
  } catch (error) {
    clearSessionCookie(res);
    next();
  }
}

module.exports = {
  authenticate,
  getSession,
  login,
  logout,
  optionalAuth,
  register,
  requestMagicLogin,
  resendVerification,
  verifyEmail,
  verifyMagicLogin,
  verifyMagicLoginLink
};
