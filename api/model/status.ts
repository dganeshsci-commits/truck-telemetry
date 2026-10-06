export default function handler(req: any, res: any) {
  res.status(200).json({
    online: true,
    status: 'CONNECTED',
    pythonRunning: false,
    engine: 'INTELLIGENT_EDGE_VISION',
    fps: 10,
    timestamp: Date.now()
  });
}
