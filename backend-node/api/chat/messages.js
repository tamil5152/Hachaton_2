import { randomUUID } from "crypto";

let messages = [];

function cors(req, res) {
  const origin = process.env.FRONTEND_URL || "*";
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return true;
  }
  return false;
}

export default function handler(req, res) {
  if (cors(req, res)) return;

  if (req.method === "GET") {
    return res.status(200).json([...messages].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)));
  }

  if (req.method === "POST") {
    const body = req.body || {};
    const message = {
      id: randomUUID(),
      authorUid: body.authorUid || null,
      authorName: typeof body.authorName === "string" && body.authorName.trim() ? body.authorName.trim() : "Team Member",
      authorPhotoURL: body.authorPhotoURL || null,
      type: body.type || "text",
      text: body.text || null,
      mediaUrl: body.mediaUrl || null,
      previewUrl: body.previewUrl || null,
      fileName: body.fileName || null,
      mimeType: body.mimeType || null,
      fileSize: body.fileSize || null,
      createdAt: new Date().toISOString()
    };
    messages.push(message);
    return res.status(201).json(message);
  }

  res.setHeader("Allow", "GET, POST, OPTIONS");
  return res.status(405).json({ error: "Method not allowed" });
}