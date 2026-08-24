export default function handler(req, res) {
  res.status(200).json({
    status: "ok",
    service: "hackathon-node-backend",
    endpoints: [
      "/api/health",
      "/api/chat/messages",
      "/api/chat/upload"
    ]
  });
}