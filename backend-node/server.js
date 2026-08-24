import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT || 9090);
const uploadDir = path.join(__dirname, "uploads");
fs.mkdirSync(uploadDir, { recursive: true });

const allowedOrigin = process.env.FRONTEND_URL || "*";
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", allowedOrigin);
  res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});
app.use(express.json({ limit: "20mb" }));
app.use("/uploads", express.static(uploadDir));

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const safe = (file.originalname || "attachment").replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, randomUUID() + "-" + safe);
  }
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

const messages = [];

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "hackathon-node-backend" });
});

app.get("/api/chat/messages", (_req, res) => {
  res.json([...messages].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)));
});

app.post("/api/chat/messages", (req, res) => {
  const body = req.body || {};
  const message = {
    id: randomUUID(),
    authorUid: body.authorUid || null,
    authorName: typeof body.authorName === "string" && body.authorName.trim() ? body.authorName.trim() : "Team Member",
    authorPhotoURL: body.authorPhotoURL || null,
    type: typeof body.type === "string" && body.type.trim() ? body.type.trim() : "text",
    text: body.text || null,
    mediaUrl: body.mediaUrl || null,
    previewUrl: body.previewUrl || null,
    fileName: body.fileName || null,
    mimeType: body.mimeType || null,
    fileSize: body.fileSize || null,
    createdAt: new Date().toISOString()
  };
  messages.push(message);
  res.status(201).json(message);
});

app.post("/api/chat/upload", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "File is required." });
  const baseUrl = process.env.PUBLIC_BASE_URL || (req.protocol + "://" + req.get("host"));
  res.status(201).json({
    fileName: req.file.originalname,
    url: baseUrl + "/uploads/" + req.file.filename,
    mimeType: req.file.mimetype || "application/octet-stream",
    fileSize: req.file.size
  });
});

app.post("/api/chat/seed", (_req, res) => {
  if (messages.length === 0) {
    const now = Date.now();
    messages.push(
      { id: randomUUID(), authorUid: "system-admin", authorName: "Workspace Admin", authorPhotoURL: null, type: "text", text: "Team chat is ready.", mediaUrl: null, previewUrl: null, fileName: null, mimeType: null, fileSize: null, createdAt: new Date(now - 60000).toISOString() }
    );
  }
  res.json(messages);
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message || "Internal server error" });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log("Node backend running on port " + PORT);
});