// Vercel Serverless API — Health Check v2
// Used: /api/health

export default function handler(req, res) {
  res.status(200).json({
    status: "ok",
    app: "CSEC Compass",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
}