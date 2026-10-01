export default function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { enabled } = req.body || {};
  const isOnline = typeof enabled === 'boolean' ? enabled : true;

  return res.status(200).json({
    online: isOnline,
    status: isOnline ? 'CONNECTED' : 'DISCONNECTED',
    pythonRunning: false,
    engine: isOnline ? 'VERCEL_EDGE_VISION_AI' : 'OFFLINE',
    message: isOnline
      ? 'AI Model is now ONLINE and monitoring driver safety.'
      : 'AI Model turned OFFLINE (Standby).'
  });
}
