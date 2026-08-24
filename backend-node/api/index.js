import express from "express";
import { randomUUID } from "crypto";

const app = express();
app.use(express.json({ limit: "20mb" }));

const allowedOrigin = process.env.FRONTEND_URL || "*";
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", allowedOrigin);
  res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  next();
});

// Temporary storage for the first serverless version.
// For production persistence, move messages to Firestore/another database.
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

app.post("/api/chat/upload", (_req, res) => {
  res.status(501).json({ error: "File uploads need persistent object storage and are not enabled in this Vercel serverless backend yet." });
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message || "Internal server error" });
});

export default app;