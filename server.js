/**
 * WellTune — server.js
 * Single-file Express + MySQL backend
 * ─────────────────────────────────────
 * npm install express mysql2 bcryptjs jsonwebtoken cors dotenv
 */

require("dotenv").config();
const express  = require("express");
const mysql    = require("mysql2/promise");
const bcrypt   = require("bcryptjs");
const jwt      = require("jsonwebtoken");
const cors     = require("cors");

const app  = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || "welltune_dev_secret_change_me";

// ─── Middleware ──────────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173", credentials: true }));
app.use(express.json());

// ─── DB Pool ─────────────────────────────────────────────────────────────────
const pool = mysql.createPool({
  host:     process.env.DB_HOST     || "localhost",
  port:     process.env.DB_PORT     || 3306,
  user:     process.env.DB_USER     || "welltune",
  password: process.env.DB_PASS     || "welltune_pass",
  database: process.env.DB_NAME     || "welltune",
  waitForConnections: true,
  connectionLimit: 10,
});

// ─── Auth middleware ──────────────────────────────────────────────────────────
function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: "No token" });
  const token = header.split(" ")[1];
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

// ─── Moderation: keyword filter ──────────────────────────────────────────────
const BLOCKED = ["hate", "slur", "stupid", "idiot", "loser", "trash", "worthless", "die", "kill yourself", "kys"];
function moderate(text) {
  const lower = text.toLowerCase();
  return BLOCKED.some((w) => lower.includes(w));
}

// ═════════════════════════════════════════════════════════════════════════════
// AUTH
// ═════════════════════════════════════════════════════════════════════════════

// POST /api/auth/signup
app.post("/api/auth/signup", async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password)
    return res.status(400).json({ error: "All fields required" });
  try {
    const hash = await bcrypt.hash(password, 10);
    const [result] = await pool.execute(
      "INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
      [username, email, hash]
    );
    const token = jwt.sign({ id: result.insertId, username }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, user: { id: result.insertId, username, email } });
  } catch (e) {
    if (e.code === "ER_DUP_ENTRY") return res.status(409).json({ error: "Username or email taken" });
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/auth/login
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const [[user]] = await pool.execute("SELECT * FROM users WHERE email = ?", [email]);
    if (!user) return res.status(401).json({ error: "Invalid credentials" });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: "Invalid credentials" });
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, user: { id: user.id, username: user.username, email: user.email } });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/auth/me
app.get("/api/auth/me", auth, async (req, res) => {
  const [[user]] = await pool.execute(
    "SELECT id, username, email, bio, avatar_url, created_at FROM users WHERE id = ?",
    [req.user.id]
  );
  res.json(user);
});

// ═════════════════════════════════════════════════════════════════════════════
// SURVEY
// ═════════════════════════════════════════════════════════════════════════════

// POST /api/survey
app.post("/api/survey", auth, async (req, res) => {
  const { goal, experience, days_per_week } = req.body;
  await pool.execute(
    `INSERT INTO surveys (user_id, goal, experience, days_per_week)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE goal=VALUES(goal), experience=VALUES(experience), days_per_week=VALUES(days_per_week)`,
    [req.user.id, goal, experience, days_per_week]
  );
  res.json({ ok: true });
});

// GET /api/survey
app.get("/api/survey", auth, async (req, res) => {
  const [[row]] = await pool.execute("SELECT * FROM surveys WHERE user_id = ?", [req.user.id]);
  res.json(row || null);
});

// ═════════════════════════════════════════════════════════════════════════════
// PLAYLISTS
// ═════════════════════════════════════════════════════════════════════════════

// GET /api/playlists  — public feed (optionally filtered by category)
app.get("/api/playlists", auth, async (req, res) => {
  const { category } = req.query;
  let sql = `
    SELECT p.*, u.username,
           (SELECT COUNT(*) FROM comments c WHERE c.playlist_id = p.id) AS comment_count
    FROM playlists p
    JOIN users u ON u.id = p.user_id
    WHERE p.is_public = 1`;
  const params = [];
  if (category) { sql += " AND p.category = ?"; params.push(category); }
  sql += " ORDER BY p.created_at DESC LIMIT 50";
  const [rows] = await pool.execute(sql, params);
  res.json(rows);
});

// GET /api/playlists/mine  — current user's playlists
app.get("/api/playlists/mine", auth, async (req, res) => {
  const [rows] = await pool.execute(
    "SELECT * FROM playlists WHERE user_id = ? ORDER BY created_at DESC",
    [req.user.id]
  );
  res.json(rows);
});

// GET /api/playlists/recommended  — SQL-based: match user goal -> category
app.get("/api/playlists/recommended", auth, async (req, res) => {
  const [[survey]] = await pool.execute("SELECT goal FROM surveys WHERE user_id = ?", [req.user.id]);
  if (!survey) return res.json([]);
  const [rows] = await pool.execute(
    `SELECT p.*, u.username FROM playlists p
     JOIN users u ON u.id = p.user_id
     WHERE p.is_public = 1 AND p.category = ? AND p.user_id != ?
     ORDER BY p.created_at DESC LIMIT 10`,
    [survey.goal, req.user.id]
  );
  res.json(rows);
});

// GET /api/playlists/:id
app.get("/api/playlists/:id", auth, async (req, res) => {
  const [[playlist]] = await pool.execute(
    "SELECT p.*, u.username FROM playlists p JOIN users u ON u.id=p.user_id WHERE p.id=?",
    [req.params.id]
  );
  if (!playlist) return res.status(404).json({ error: "Not found" });
  const [steps] = await pool.execute(
    "SELECT * FROM steps WHERE playlist_id=? ORDER BY position",
    [req.params.id]
  );
  const [comments] = await pool.execute(
    `SELECT c.*, u.username FROM comments c
     JOIN users u ON u.id=c.user_id
     WHERE c.playlist_id=? AND c.flagged=0
     ORDER BY c.created_at ASC`,
    [req.params.id]
  );
  res.json({ ...playlist, steps, comments });
});

// POST /api/playlists
app.post("/api/playlists", auth, async (req, res) => {
  const { title, description, category, is_public, steps } = req.body;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [result] = await conn.execute(
      "INSERT INTO playlists (user_id, title, description, category, is_public) VALUES (?,?,?,?,?)",
      [req.user.id, title, description || null, category, is_public ?? 1]
    );
    const pid = result.insertId;
    if (Array.isArray(steps) && steps.length) {
      for (let i = 0; i < steps.length; i++) {
        const s = steps[i];
        await conn.execute(
          "INSERT INTO steps (playlist_id, position, title, duration_sec, instruction) VALUES (?,?,?,?,?)",
          [pid, i, s.title, s.duration_sec || 60, s.instruction || null]
        );
      }
    }
    await conn.commit();
    res.json({ id: pid });
  } catch (e) {
    await conn.rollback();
    res.status(500).json({ error: "Could not create playlist" });
  } finally {
    conn.release();
  }
});

// PUT /api/playlists/:id
app.put("/api/playlists/:id", auth, async (req, res) => {
  const { title, description, category, is_public, steps } = req.body;
  const [[pl]] = await pool.execute("SELECT id FROM playlists WHERE id=? AND user_id=?", [req.params.id, req.user.id]);
  if (!pl) return res.status(403).json({ error: "Forbidden" });
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute(
      "UPDATE playlists SET title=?, description=?, category=?, is_public=? WHERE id=?",
      [title, description || null, category, is_public ?? 1, req.params.id]
    );
    await conn.execute("DELETE FROM steps WHERE playlist_id=?", [req.params.id]);
    if (Array.isArray(steps) && steps.length) {
      for (let i = 0; i < steps.length; i++) {
        const s = steps[i];
        await conn.execute(
          "INSERT INTO steps (playlist_id, position, title, duration_sec, instruction) VALUES (?,?,?,?,?)",
          [req.params.id, i, s.title, s.duration_sec || 60, s.instruction || null]
        );
      }
    }
    await conn.commit();
    res.json({ ok: true });
  } catch {
    await conn.rollback();
    res.status(500).json({ error: "Could not update" });
  } finally {
    conn.release();
  }
});

// DELETE /api/playlists/:id
app.delete("/api/playlists/:id", auth, async (req, res) => {
  const [result] = await pool.execute(
    "DELETE FROM playlists WHERE id=? AND user_id=?",
    [req.params.id, req.user.id]
  );
  if (!result.affectedRows) return res.status(403).json({ error: "Forbidden" });
  res.json({ ok: true });
});

// ═════════════════════════════════════════════════════════════════════════════
// MOOD LOGS
// ═════════════════════════════════════════════════════════════════════════════

// POST /api/mood
app.post("/api/mood", auth, async (req, res) => {
  const { playlist_id, mood, note } = req.body;
  await pool.execute(
    "INSERT INTO mood_logs (user_id, playlist_id, mood, note) VALUES (?,?,?,?)",
    [req.user.id, playlist_id, mood, note || null]
  );
  res.json({ ok: true });
});

// GET /api/mood  — last 30 logs for current user
app.get("/api/mood", auth, async (req, res) => {
  const [rows] = await pool.execute(
    `SELECT m.*, p.title AS playlist_title FROM mood_logs m
     JOIN playlists p ON p.id=m.playlist_id
     WHERE m.user_id=? ORDER BY m.logged_at DESC LIMIT 30`,
    [req.user.id]
  );
  res.json(rows);
});

// ═════════════════════════════════════════════════════════════════════════════
// SOCIAL — FOLLOWS
// ═════════════════════════════════════════════════════════════════════════════

// POST /api/follow/:id
app.post("/api/follow/:id", auth, async (req, res) => {
  if (req.params.id == req.user.id) return res.status(400).json({ error: "Cannot follow yourself" });
  await pool.execute(
    "INSERT IGNORE INTO follows (follower_id, followee_id) VALUES (?,?)",
    [req.user.id, req.params.id]
  );
  res.json({ ok: true });
});

// DELETE /api/follow/:id
app.delete("/api/follow/:id", auth, async (req, res) => {
  await pool.execute(
    "DELETE FROM follows WHERE follower_id=? AND followee_id=?",
    [req.user.id, req.params.id]
  );
  res.json({ ok: true });
});

// GET /api/follow/status/:id  — am I following this user?
app.get("/api/follow/status/:id", auth, async (req, res) => {
  const [[row]] = await pool.execute(
    "SELECT 1 AS following FROM follows WHERE follower_id=? AND followee_id=?",
    [req.user.id, req.params.id]
  );
  res.json({ following: !!row });
});

// GET /api/users/:id/followers
app.get("/api/users/:id/followers", auth, async (req, res) => {
  const [rows] = await pool.execute(
    `SELECT u.id, u.username FROM follows f
     JOIN users u ON u.id=f.follower_id WHERE f.followee_id=?`,
    [req.params.id]
  );
  res.json(rows);
});

// GET /api/users/:id/following
app.get("/api/users/:id/following", auth, async (req, res) => {
  const [rows] = await pool.execute(
    `SELECT u.id, u.username FROM follows f
     JOIN users u ON u.id=f.followee_id WHERE f.follower_id=?`,
    [req.params.id]
  );
  res.json(rows);
});

// GET /api/users/:id/playlists  — public playlists for a user profile
app.get("/api/users/:id/playlists", auth, async (req, res) => {
  const [rows] = await pool.execute(
    "SELECT * FROM playlists WHERE user_id=? AND is_public=1 ORDER BY created_at DESC",
    [req.params.id]
  );
  res.json(rows);
});

// ═════════════════════════════════════════════════════════════════════════════
// COMMENTS
// ═════════════════════════════════════════════════════════════════════════════

// POST /api/playlists/:id/comments
app.post("/api/playlists/:id/comments", auth, async (req, res) => {
  const { body } = req.body;
  if (!body || !body.trim()) return res.status(400).json({ error: "Comment cannot be empty" });
  const flagged = moderate(body) ? 1 : 0;
  if (flagged) return res.status(422).json({ error: "Your comment contains disallowed content. Please keep things kind!" });
  const [result] = await pool.execute(
    "INSERT INTO comments (playlist_id, user_id, body, flagged) VALUES (?,?,?,?)",
    [req.params.id, req.user.id, body.trim(), 0]
  );
  res.json({ id: result.insertId, body: body.trim(), username: req.user.username, flagged: 0 });
});

// DELETE /api/comments/:id  — own comment only
app.delete("/api/comments/:id", auth, async (req, res) => {
  const [result] = await pool.execute(
    "DELETE FROM comments WHERE id=? AND user_id=?",
    [req.params.id, req.user.id]
  );
  if (!result.affectedRows) return res.status(403).json({ error: "Forbidden" });
  res.json({ ok: true });
});

// ─── Start ───────────────────────────────────────────────────────────────────
app.listen(PORT, () => console.log(`🌿 WellTune API running on http://localhost:${PORT}`));
