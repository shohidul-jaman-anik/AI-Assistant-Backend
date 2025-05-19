import http from 'http';
import mongoose from 'mongoose';
import app from './app'; // Make sure this exists and exports an Express app
import config from './config';
import { errorlogger, logger } from './shared/logger';
import { RedisClient, subscribeToEvents } from './shared/redis';

process.on('uncaughtException', error => {
  errorlogger.error('Uncaught Exception detected:', error);
  process.exit(1);
});

let server;

// Database connection
mongoose
  .connect(config.database_local, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => logger.info('Database connection successfully'))
  .catch(err => {
    logger.info('Error connecting to the database:', err);
    process.exit(1); // Exit the application on database connection error
  });

async function main() {
  try {
    await RedisClient.connect().then(() => {
      subscribeToEvents();
    });

    // This line is redundant if already connected above, but keeping as per your original
    await mongoose.connect(config.database_local);

    server = http.createServer(app).listen(config.port, () => {
      logger.info(`Application listening on port ${config.port}`);
    });

    logger.info('Database is Connected Successfully');
  } catch (error) {
    errorlogger.error(`Failed to connect Database: ${error}`);
  }

  process.on('unhandledRejection', error => {
    errorlogger.error('Unhandled Rejection detected:', error);

    if (server) {
      server.close(() => {
        errorlogger.error(error);
        process.exit(1);
      });
    } else {
      process.exit(1);
    }
  });
}

main();

process.on('SIGTERM', () => {
  logger.info('Signal Termination is received');
  if (server) {
    server.close();
  }
});
