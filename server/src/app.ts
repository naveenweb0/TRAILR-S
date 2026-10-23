import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import authRoutes from './routes/auth.routes.js';
import destinationRoutes from './routes/destination.routes.js';
import schoolRoutes from './routes/school.routes.js';
import adminRoutes from './routes/admin.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import uploadRoutes from './routes/upload.routes.js';
import { errorHandler } from './utils/errors.js';
import { prisma } from './prisma.js';

export const app = express();

app.use(helmet());
app.use(
  cors({
    origin: '*',
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Comprehensive Health check (handles /health, /healthz, /api/health, /api/v1/health)
const healthHandler = async (req: express.Request, res: express.Response) => {
  let dbStatus = 'disconnected';
  let dbLatencyMs = -1;

  try {
    const start = Date.now();
    await prisma.$queryRawUnsafe('SELECT 1');
    dbLatencyMs = Date.now() - start;
    dbStatus = 'connected';
  } catch (error: any) {
    dbStatus = `error: ${error.message || 'database unreachable'}`;
  }

  const isHealthy = dbStatus === 'connected';
  const statusCode = isHealthy ? 200 : 503;

  res.status(statusCode).json({
    status: isHealthy ? 'ok' : 'degraded',
    service: "TRAILR'S / SCHOOLDEST B2B School Destination Booking Platform API",
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    database: {
      status: dbStatus,
      latencyMs: dbLatencyMs >= 0 ? dbLatencyMs : undefined,
    },
    memory: {
      rssMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
      heapUsedMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    },
  });
};

app.get('/health', healthHandler);
app.get('/healthz', healthHandler);
app.get('/api/health', healthHandler);
app.get('/api/v1/health', healthHandler);

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/destinations', destinationRoutes);
app.use('/api/v1/school', schoolRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/upload', uploadRoutes);

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    error: {
      message: `Route not found: ${req.method} ${req.originalUrl}`,
      statusCode: 404,
    },
  });
});

// Global error handler
app.use(errorHandler);
