import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import httpStatus from 'http-status';
// import config from './config';
import globalErrorHandler from './src/app/middlewares/globalErrorHandler/globalErrorHandler.js';
import router from './src/app/routes/index.js';
// import { logger } from './src/shared/logger';
import cookieParser from 'cookie-parser';
import passport from 'passport';
import { applySecurityMiddleware } from './config/security.js';
import './src/app/middlewares/resetUsage/resetUsage.js';
import passportConfig from './src/app/modules/social-login/config/passport.js';

// Load environment variables
dotenv.config();

const app = express();

// Middleware
// ✅ Use body-parser raw() FIRST for Stripe webhook before any JSON parsing
app.use(
  '/api/v1/subscription/webhook',
  express.raw({ type: 'application/json' }),
);

const corsConfig = {
  origin: [
    'https://ason-web.netlify.app',
    'https://www.asonai.com',
    'https://asonai.com',
    'http://localhost:3000',
  ],
  credentials: true,
  methods: ['GET', 'POST', 'DELETE', 'PUT', 'PATCH'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
  ],
  preflightContinue: false,
  optionsSuccessStatus: 204,
};
app.use(cors(corsConfig));
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.disable('x-powered-by');

// Enable trust proxy (For Rate-Limit)
app.set('trust proxy', 'loopback');

// Apply all security-related middleware
applySecurityMiddleware(app);

// Initialize passport (no session)
passportConfig(passport);
app.use(passport.initialize());

// API routes
app.use('/api/v1', router);

// Root endpoint
app.get('/', (req, res) => {
  res.send('ASON is working! YaY!');
});

app.get('/api/user', (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.json(req.user || null);
});

// Global error handler middleware
app.use(globalErrorHandler);

// 404 Handler
app.use((req, res) => {
  res.status(httpStatus.NOT_FOUND).json({
    success: false,
    message: 'Not found',
    errorMessages: [
      {
        path: req.originalUrl,
        message: 'Api not found',
      },
    ],
  });
});

export default app;
