export default function handler(req: any, res: any) {
  res.status(200).json({
    status: 'ok',
    environment: 'vercel-edge',
    modelOnline: true,
    pythonBackendRunning: false,
    engine: 'INTELLIGENT_EDGE_VISION'
  });
}
