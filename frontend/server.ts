import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  app.use(express.json({ limit: "10mb" }));

  const extractJsonPayload = (text: string) => {
    const fenced = text.match(/```json\s*([\s\S]*?)```/i)?.[1];
    const raw = fenced || text.match(/\{[\s\S]*\}/)?.[0] || text;
    const parsed = JSON.parse(raw);
    return {
      message: typeof parsed?.message === "string" ? parsed.message : "Assistant completed the request.",
      changes: Array.isArray(parsed?.changes) ? parsed.changes : [],
    };
  };

  const buildAssistantPrompt = (body: any) => `You are a senior coding agent embedded inside a VS Code style editor.
You can inspect the full loaded workspace and return multiple file changes.
Only return JSON.

Selected provider profile: ${body.providerLabel}
Provider operating style: ${body.providerOperatingStyle}

Mode: ${body.mode}
Mode guidance: ${body.modeGuidance}
Scope: ${body.scope}
Scope guidance: ${body.scopeGuidance}
Workspace mode: ${body.workspaceMode}
Workspace root: ${body.workspaceRoot}
GitHub connected: ${body.githubConnected ? "yes" : "no"}

Workspace tree:
${body.treeSummary}

Open tabs:
${body.openTabsSummary || "- none"}

Sample file contents:
${body.sampleFiles}

User request:
${body.userPrompt}

Return JSON with this shape:
{
  "message": string,
  "changes": [{ "path": string, "content": string, "note"?: string }]
}
Paths must be relative to the workspace root. Return an empty changes array if no code edit is needed.`;

  const runGeminiAssistant = async (prompt: string) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured.");
    }
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || "gemini-3.1-pro-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            message: { type: Type.STRING },
            changes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  path: { type: Type.STRING },
                  content: { type: Type.STRING },
                  note: { type: Type.STRING },
                },
                required: ["path", "content"],
              },
            },
          },
          required: ["message", "changes"],
        },
      },
    });
    return {
      payload: extractJsonPayload(response.text || "{}"),
      engine: "gemini",
      model: process.env.GEMINI_MODEL || "gemini-3.1-pro-preview",
    };
  };

  const runOpenAIAssistant = async (prompt: string) => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not configured.");
    }
    const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [
          { role: "system", content: "You are an expert coding assistant. Return only valid JSON." },
          { role: "user", content: prompt },
        ],
      }),
    });
    if (!response.ok) {
      throw new Error(`OpenAI request failed with status ${response.status}`);
    }
    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content || "{}";
    return {
      payload: extractJsonPayload(text),
      engine: "openai",
      model,
    };
  };

  const runAnthropicAssistant = async (prompt: string) => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY is not configured.");
    }
    const model = process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-latest";
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        system: "You are an expert coding assistant. Return only valid JSON.",
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!response.ok) {
      throw new Error(`Anthropic request failed with status ${response.status}`);
    }
    const data = await response.json();
    const text = data?.content?.map((entry: any) => entry?.text || "").join("\n") || "{}";
    return {
      payload: extractJsonPayload(text),
      engine: "anthropic",
      model,
    };
  };

  const runDeepSeekAssistant = async (prompt: string) => {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      throw new Error("DEEPSEEK_API_KEY is not configured.");
    }
    const model = process.env.DEEPSEEK_MODEL || "deepseek-chat";
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [
          { role: "system", content: "You are an expert coding assistant. Return only valid JSON." },
          { role: "user", content: prompt },
        ],
      }),
    });
    if (!response.ok) {
      throw new Error(`DeepSeek request failed with status ${response.status}`);
    }
    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content || "{}";
    return {
      payload: extractJsonPayload(text),
      engine: "deepseek",
      model,
    };
  };

  const resolveAssistantRunner = (provider: string) => {
    if (provider === "claude" && process.env.ANTHROPIC_API_KEY) return { runner: runAnthropicAssistant, fallback: false };
    if (provider === "chatgpt" && process.env.OPENAI_API_KEY) return { runner: runOpenAIAssistant, fallback: false };
    if (provider === "gemini" && process.env.GEMINI_API_KEY) return { runner: runGeminiAssistant, fallback: false };
    if (provider === "deepseek" && process.env.DEEPSEEK_API_KEY) return { runner: runDeepSeekAssistant, fallback: false };
    if (provider === "cursor" && process.env.OPENAI_API_KEY) return { runner: runOpenAIAssistant, fallback: false };
    if (process.env.GEMINI_API_KEY) return { runner: runGeminiAssistant, fallback: provider !== "gemini" };
    if (process.env.OPENAI_API_KEY) return { runner: runOpenAIAssistant, fallback: provider !== "chatgpt" && provider !== "cursor" };
    if (process.env.ANTHROPIC_API_KEY) return { runner: runAnthropicAssistant, fallback: provider !== "claude" };
    if (process.env.DEEPSEEK_API_KEY) return { runner: runDeepSeekAssistant, fallback: provider !== "deepseek" };
    throw new Error("No supported AI provider key is configured on the server.");
  };

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/auth/login", (req, res) => {
    res.json({ token: "mock-jwt-token", user: { id: 1, name: "Test User", email: req.body.email } });
  });

  app.post("/api/auth/signup", (req, res) => {
    res.json({ token: "mock-jwt-token", user: { id: 1, name: req.body.name, email: req.body.email } });
  });

  app.get("/api/dashboard", (req, res) => {
    res.json({
      activeUsers: 124,
      codeSnippets: 89,
      securityAlerts: 3,
      activeSessions: 42
    });
  });

  app.get("/api/alerts", (req, res) => {
    res.json([
      { id: 1, type: "Vulnerability", severity: "High", message: "SQL Injection detected in auth.js", time: "10 mins ago" },
      { id: 2, type: "Anomaly", severity: "Medium", message: "Multiple failed logins from IP 192.168.1.5", time: "1 hour ago" },
      { id: 3, type: "System", severity: "Low", message: "Database backup completed", time: "2 hours ago" }
    ]);
  });

  app.get("/api/sessions", (req, res) => {
    res.json([
      { id: 1, user: "Alice", ip: "192.168.1.10", device: "MacBook Pro", riskScore: 12 },
      { id: 2, user: "Bob", ip: "10.0.0.5", device: "Windows PC", riskScore: 85 },
      { id: 3, user: "Charlie", ip: "172.16.0.20", device: "iPhone", riskScore: 5 }
    ]);
  });

  app.post("/api/scan/run", (req, res) => {
    const { code } = req.body;
    const vulnerabilities = [];
    if (code && code.includes("SELECT * FROM users WHERE username = '\" + username + \"'")) {
      vulnerabilities.push({ id: 1, vulnerability: "SQL Injection", severity: "Critical", file: "main.js", line: 12, description: "Unsanitized input used in SQL query." });
    }
    if (code && code.includes("password = 'hardcoded_secret'")) {
      vulnerabilities.push({ id: 2, vulnerability: "Hardcoded Secret", severity: "High", file: "config.js", line: 5, description: "Sensitive information hardcoded in source." });
    }
    
    if (vulnerabilities.length === 0) {
      vulnerabilities.push({ id: 3, vulnerability: "None", severity: "Low", file: "-", line: "-", description: "No obvious vulnerabilities found in this quick scan." });
    }

    res.json({ results: vulnerabilities });
  });

  app.post("/api/editor/assist", async (req, res) => {
    try {
      const prompt = buildAssistantPrompt(req.body);
      const { runner, fallback } = resolveAssistantRunner(req.body.provider);
      const result = await runner(prompt);
      res.json({
        ...result.payload,
        engine: result.engine,
        model: result.model,
        fallbackUsed: fallback,
      });
    } catch (error: any) {
      res.status(500).json({
        error: error?.message || "Assistant request failed.",
      });
    }
  });

  // WebSocket for Code Collaboration
  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("join-workspace", (workspaceId) => {
      socket.join(workspaceId);
      console.log(`Socket ${socket.id} joined workspace ${workspaceId}`);
    });

    socket.on("code-change", ({ workspaceId, code }) => {
      socket.to(workspaceId).emit("code-update", code);
    });

    socket.on("cursor-move", ({ workspaceId, cursor, user }) => {
      socket.to(workspaceId).emit("cursor-update", { cursor, user });
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
