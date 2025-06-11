import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import helmet from 'helmet';
import httpStatus from 'http-status';
import toobusy from 'toobusy-js';
// import config from './config';
import globalErrorHandler from './src/app/middlewares/globalErrorHandler/globalErrorHandler.js';
import router from './src/app/routes/index.js';
// import { logger } from './src/shared/logger';
import cookieParser from 'cookie-parser';
import passport from 'passport';
import './src/app/middlewares/resetUsage/resetUsage.js';
import passportConfig from './src/app/modules/social-login/config/passport.js';

// Load environment variables
dotenv.config();

const app = express();

// ✅ Use body-parser raw() FIRST for Stripe webhook before any JSON parsing
app.use(
  '/api/v1/subscription/webhook',
  express.raw({ type: 'application/json' }),
);

// Middleware
app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
// app.use(bodyParser.urlencoded({ extended: true }));
app.disable('x-powered-by');

// Enable trust proxy (For Rate-Limit)
app.set('trust proxy', 'loopback');

// Helmet middleware for security headers
app.use(helmet());

const corsConfig = {
  origin: ['https://ason-web.netlify.app', 'http://localhost:3000'],
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

// Additional Helmet security configurations
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",
        'cdnjs.cloudflare.com',
        'js.stripe.com',
        'cdn.jsdelivr.net',
      ],
      styleSrc: ["'self'", "'unsafe-inline'", 'fonts.googleapis.com'],
      fontSrc: ["'self'", 'fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
      blockAllMixedContent: [],
      frameAncestors: ["'none'"],
    },
  }),
);
app.use(helmet.referrerPolicy({ policy: 'same-origin' }));
app.use(helmet.frameguard({ action: 'deny' }));
app.use(helmet.noSniff());
app.use(helmet.xssFilter());
app.use(helmet.hidePoweredBy());
app.disable('etag');

// Prevent DOS attacks with toobusy
app.use((req, res, next) => {
  if (toobusy()) {
    res.status(503).send('Server too busy!');
  } else {
    next();
  }
});

// Initialize passport (no session)
passportConfig(passport);
app.use(passport.initialize());

app.get('/api/user', (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.json(req.user || null);
});

// API routes
app.use('/api/v1', router);

// Global error handler middleware
app.use(globalErrorHandler);

// Root endpoint
app.get('/', (req, res) => {
  res.send('ASON is working! YaY!');
});

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
