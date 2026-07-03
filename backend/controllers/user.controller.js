// Paul
const crypto = require("crypto");
const { promisify } = require("util");

const db = require("../config/db");

const scryptAsync = promisify(crypto.scrypt);

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

function normalizeUserId(userId) {
  const normalizedUserId = Number(userId);

  if (!Number.isInteger(normalizedUserId) || normalizedUserId <= 0) {
    throw createError(400, "valid userId is required");
  }

  return normalizedUserId;
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

async function findUser(req, res, next) {
  try {
    const userId = req.query.userId || req.query.id;
    const email = req.query.email;
    let result;

    if (userId) {
      result = await db.query(
        "SELECT id, email, is_verified, is_admin, is_blocked, created_at FROM users WHERE id = $1",
        [normalizeUserId(userId)]
      );
    } else if (email) {
      result = await db.query(
        "SELECT id, email, is_verified, is_admin, is_blocked, created_at FROM users WHERE email = $1",
        [normalizeEmail(email)]
      );
    } else {
      result = await db.query(
        `SELECT id, email, is_verified, is_admin, is_blocked, created_at
         FROM users
         ORDER BY id ASC
         LIMIT 50`
      );
    }

    res.status(200).json({
      users: result.rows.map(toPublicUser)
    });
  } catch (error) {
    next(error);
  }
}

async function getUserById(req, res, next) {
  try {
    const userId = normalizeUserId(req.params.id);
    const result = await db.query(
      "SELECT id, email, is_verified, is_admin, is_blocked, created_at FROM users WHERE id = $1",
      [userId]
    );
    const user = result.rows[0];

    if (!user) {
      throw createError(404, "user not found");
    }

    res.status(200).json({
      user: toPublicUser(user)
    });
  } catch (error) {
    next(error);
  }
}

async function deleteUser(req, res, next) {
  try {
    const userId = normalizeUserId(req.params.id);

    if (req.user?.id === userId) {
      throw createError(400, "admin cannot delete own account here");
    }

    const result = await db.query(
      `DELETE FROM users
       WHERE id = $1
       RETURNING id, email, is_verified, is_admin, is_blocked, created_at`,
      [userId]
    );
    const user = result.rows[0];

    if (!user) {
      throw createError(404, "user not found");
    }

    res.status(200).json({
      message: "user deleted",
      user: toPublicUser(user)
    });
  } catch (error) {
    next(error);
  }
}

async function setBlockedStatus(req, res, next) {
  try {
    const userId = normalizeUserId(req.params.id);
    const isBlocked = req.blockUser === true;

    if (req.user?.id === userId && isBlocked) {
      throw createError(400, "admin cannot block own account");
    }

    const result = await db.query(
      `UPDATE users
       SET is_blocked = $1
       WHERE id = $2
       RETURNING id, email, is_verified, is_admin, is_blocked, created_at`,
      [isBlocked, userId]
    );
    const user = result.rows[0];

    if (!user) {
      throw createError(404, "user not found");
    }

    res.status(200).json({
      message: isBlocked ? "user blocked" : "user unblocked",
      user: toPublicUser(user)
    });
  } catch (error) {
    next(error);
  }
}

function blockUser(req, res, next) {
  req.blockUser = true;
  return setBlockedStatus(req, res, next);
}

function unblockUser(req, res, next) {
  req.blockUser = false;
  return setBlockedStatus(req, res, next);
}

async function createAdmin(req, res, next) {
  try {
    const email = normalizeEmail(req.body.email);
    const password = req.body.password;

    validatePassword(password);

    const passwordHash = await hashPassword(password);
    const result = await db.query(
      `INSERT INTO users (email, password_hash, is_verified, is_admin, is_blocked)
       VALUES ($1, $2, TRUE, TRUE, FALSE)
       RETURNING id, email, is_verified, is_admin, is_blocked, created_at`,
      [email, passwordHash]
    );

    res.status(201).json({
      message: "admin account created",
      user: toPublicUser(result.rows[0])
    });
  } catch (error) {
    if (error.code === "23505") {
      error.statusCode = 409;
      error.message = "email is already registered";
    }

    next(error);
  }
}

module.exports = {
  blockUser,
  createAdmin,
  deleteUser,
  findUser,
  getUserById,
  unblockUser
};
