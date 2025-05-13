// import path from 'path';
// import winston, { format } from 'winston';
// import DailyRotateFile from 'winston-daily-rotate-file';

// const { combine, timestamp, label, prettyPrint, printf, colorize } = format;

// // Custom Formate
// const myFormat = printf(({ level, message, label, timestamp }) => {
//   // const date = new Date(timestamp)
//   // const hour = date.getHours()
//   // const minutes = date.getMinutes()
//   // const seconds = date.getSeconds()
//   // return `${date.toDateString()} ${hour}:${minutes}:${seconds} [${label}] ${level}: ${message}`

//   return `${timestamp} [${label}] ${level}: ${message}`;
// });

// export const logger = winston.createLogger({
//   level: 'info',
//   format: combine(
//     label({ label: 'ASON' }),
//     timestamp(),
//     // colorize(),
//     myFormat,
//     prettyPrint(),
//   ),
//   transports: [
//     // new winston.transports.Console(),
//     // new winston.transports.File({
//     //   filename: path.join(process.cwd(), 'logs', 'winston', 'success.log'),
//     //   level: 'info',
//     // }),
//     new winston.transports.Console(),
//     new DailyRotateFile({
//       filename: path.join(
//         process.cwd(),
//         'logs',
//         'winston',
//         'successes',
//         'RH-%DATE%-success.log',
//       ),
//       datePattern: 'YYYY-MM-DD-HH',
//       zippedArchive: true,
//       maxSize: '20m',
//       maxFiles: '14d',
//     }),
//   ],
// });

// export const errorlogger = winston.createLogger({
//   level: 'error',
//   format: combine(
//     label({ label: 'ASON' }),
//     timestamp(),
//     myFormat,
//     prettyPrint(),
//   ),
//   transports: [
//     new winston.transports.Console(),
//     new DailyRotateFile({
//       filename: path.join(
//         process.cwd(),
//         'logs',
//         'winston',
//         'errors',
//         'RH-%DATE%-error.log',
//       ),
//       datePattern: 'YYYY-MM-DD-HH',
//       zippedArchive: true,
//       maxSize: '20m',
//       maxFiles: '14d',
//     }),
//   ],
// });

// import { Client } from '@elastic/elasticsearch';
// import path from 'path';
// import winston, { format } from 'winston';
// import DailyRotateFile from 'winston-daily-rotate-file';
// import { ElasticsearchTransport } from 'winston-elasticsearch';

// const { combine, timestamp, label, json } = format;

// // Elasticsearch Client
// const esClient = new Client({
//   node: 'http://localhost:9200', // Replace with your Elasticsearch node
// });

// // Elasticsearch Transport
// const esTransport = new ElasticsearchTransport({
//   level: 'info',
//   client: esClient,
//   indexPrefix: 'ason-logs',
//   flushInterval: 2000,
//   transformer: logData => ({
//     '@timestamp': logData.timestamp,
//     severity: logData.level,
//     message: logData.message,
//     fields: logData.meta || {},
//   }),
// });

// // Base format
// const baseFormat = combine(
//   label({ label: 'ASON' }),
//   timestamp(),
//   json(), // Structured JSON format for ELK/Grafana
// );

// // Success logger
// export const logger = winston.createLogger({
//   level: 'info',
//   format: baseFormat,
//   transports: [
//     new winston.transports.Console(), // Console transport for local development
//     new DailyRotateFile({
//       // DailyRotateFile transport for file logging
//       filename: path.join(
//         process.cwd(),
//         'logs',
//         'winston',
//         'successes',
//         'RH-%DATE%-success.log',
//       ),
//       datePattern: 'YYYY-MM-DD-HH',
//       zippedArchive: true,
//       maxSize: '20m',
//       maxFiles: '14d',
//     }),
//     esTransport, // Elasticsearch transport
//   ],
// });

// // Error logger
// export const errorlogger = winston.createLogger({
//   level: 'error',
//   format: baseFormat,
//   transports: [
//     new winston.transports.Console(),
//     new DailyRotateFile({
//       filename: path.join(
//         process.cwd(),
//         'logs',
//         'winston',
//         'errors',
//         'RH-%DATE%-error.log',
//       ),
//       datePattern: 'YYYY-MM-DD-HH',
//       zippedArchive: true,
//       maxSize: '20m',
//       maxFiles: '14d',
//     }),
//     esTransport,
//   ],
// });
// esTransport.on('error', (err) => {
//   console.error('❌ Elasticsearch Transport Error:', err);
// });

// export const httpLogStream = {
//   write: (message) => {
//     logger.info(message.trim());
//   },
// };

import { Client } from '@elastic/elasticsearch';
import path from 'path';
import winston, { format } from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { ElasticsearchTransport } from 'winston-elasticsearch';

const { combine, timestamp, label, prettyPrint, printf } = format;

const myFormat = printf(({ level, message, label, timestamp }) => {
  return `${timestamp} [${label}] ${level}: ${message}`;
});

// Elasticsearch Client
const esClient = new Client({
  node: 'http://elasticsearch:9200', // MUST match docker container name
  compatibility: true,
});

// Check connection
esClient
  .ping({}, { requestTimeout: 1000 })
  .then(() => console.log('✅ Connected to Elasticsearch'))
  .catch(err => console.error('❌ Cannot connect to Elasticsearch:', err));

// Elasticsearch Transport
const esTransport = new ElasticsearchTransport({
  level: 'info',
  client: esClient,
  indexPrefix: 'ason-logs',
  flushInterval: 2000,
  transformer: logData => ({
    '@timestamp': logData.timestamp,
    severity: logData.level,
    message: logData.message,
    fields: logData.meta || {},
  }),
});

// Base format
const baseFormat = combine(
  label({ label: 'ASON Core Service' }),
  timestamp(),
  myFormat,
  prettyPrint(),
);

// Success logger
export const logger = winston.createLogger({
  level: 'info',
  format: baseFormat,
  transports: [
    new winston.transports.Console(),
    new DailyRotateFile({
      filename: path.join(
        process.cwd(),
        'logs',
        'successes',
        'RH-%DATE%-success.log',
      ),
      datePattern: 'YYYY-MM-DD-HH',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
    }),
    esTransport,
  ],
});

// Error logger
export const errorlogger = winston.createLogger({
  level: 'error',
  format: baseFormat,
  transports: [
    new winston.transports.Console(),
    new DailyRotateFile({
      filename: path.join(
        process.cwd(),
        'logs',
        'errors',
        'RH-%DATE%-error.log',
      ),
      datePattern: 'YYYY-MM-DD-HH',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
    }),
    esTransport,
  ],
});

