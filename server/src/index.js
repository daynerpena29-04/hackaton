import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { initDatabase } from './db/database.js';
import apiRouter from './routes/api.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'Sistema Central de Gestión Operativa del Campus - Campuslands',
    timestamp: new Date().toISOString()
  });
});

// Mount API routes
app.use('/api', apiRouter);

// Centralized error handling middleware
app.use((err, req, res, next) => {
  console.error(`[API ERROR] ${req.method} ${req.url}:`, err.message);

  const statusCode = err.statusCode || (err.code?.startsWith('RULE_') ? 400 : 500);

  res.status(statusCode).json({
    error: err.message || 'Error interno del servidor',
    code: err.code || 'INTERNAL_SERVER_ERROR',
    conflictingReservation: err.conflictingReservation || null,
    details: err.details || null
  });
});

// Initialize database and start server
try {
  initDatabase();
  app.listen(PORT, () => {
    console.log(`===========================================================`);
    console.log(`🚀 SERVIDOR OPERATIVO CAMPUSLANDS INICIADO`);
    console.log(`📡 URL API: http://localhost:${PORT}/api`);
    console.log(`🏥 Health check: http://localhost:${PORT}/health`);
    console.log(`===========================================================`);
  });
} catch (error) {
  console.error('Error fatal al inicializar la base de datos o iniciar el servidor:', error);
  process.exit(1);
}
