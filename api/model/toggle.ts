let isOnline = true;

export default function handler(req: any, res: any) {
  if (req.method === 'POST') {
    const { enabled } = req.body || {};
    if (typeof enabled === 'boolean') {
      isOnline = enabled;
    } else {
      isOnline = !isOnline;
    }
  }

  res.status(200).json({
    online: isOnline,
    status: isOnline ? 'CONNECTED' : 'DISCONNECTED',
    pythonRunning: false,
    engine: isOnline ? 'INTELLIGENT_EDGE_VISION' : 'OFFLINE',
    message: isOnline ? 'AI Model is ONLINE.' : 'AI Model turned OFFLINE (Standby).'
  });
}
