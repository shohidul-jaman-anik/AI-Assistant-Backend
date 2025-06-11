import http from 'http';
import mongoose from 'mongoose';
import config from './config/index.js';
import app from './index.js'; // Make sure this exists and exports an Express app
import { errorlogger, logger } from './src/shared/logger.js';
import { RedisClient } from './src/shared/redis.js';

process.on('uncaughtException', error => {
  errorlogger.error('Uncaught Exception detected:', error);
  process.exit(1);
});

let server;
mongoose.set('strictQuery', true);
mongoose.set('bufferCommands', false);
async function main() {
  try {
    await RedisClient.connect();
    logger.info('✅ Redis is connected successfully');

    await mongoose.connect(config.database_local);
    logger.info('✅ MongoDB connected successfully');

    server = http.createServer(app).listen(config.port, () => {
      logger.info(`🚀 Server listening on port ${config.port}`);
    });
  } catch (error) {
    errorlogger.error(`❌ Failed to connect: ${error}`);
    process.exit(1);
  }

  process.on('unhandledRejection', error => {
    errorlogger.error('❗ Unhandled Rejection:', error);
    if (server) server.close(() => process.exit(1));
    else process.exit(1);
  });
}

main();

process.on('SIGTERM', () => {
  logger.info('Signal Termination is received');
  if (server) {
    server.close();
  }
});
