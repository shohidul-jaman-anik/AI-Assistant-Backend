// const path = require('path');
// const winston = require('winston');
// const { format } = require('winston');
// const DailyRotateFile = require('winston-daily-rotate-file');
// const { combine, timestamp, label, prettyPrint, printf, colorize } = format;

import path from 'path';
import winston, { format } from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const { combine, timestamp, label, prettyPrint, printf, colorize } = format;

// Custom Formate
const myFormat = printf(({ level, message, label, timestamp }) => {
  // const date = new Date(timestamp)
  // const hour = date.getHours()
  // const minutes = date.getMinutes()
  // const seconds = date.getSeconds()
  // return `${date.toDateString()} ${hour}:${minutes}:${seconds} [${label}] ${level}: ${message}`

  return `${timestamp} [${label}] ${level}: ${message}`;
});

export const logger = winston.createLogger({
  level: 'info',
  format: combine(
    label({ label: 'ASON' }),
    timestamp(),
    // colorize(),
    myFormat,
    prettyPrint(),
  ),
  transports: [
    // new winston.transports.Console(),
    // new winston.transports.File({
    //   filename: path.join(process.cwd(), 'logs', 'winston', 'success.log'),
    //   level: 'info',
    // }),
    new winston.transports.Console(),
    new DailyRotateFile({
      filename: path.join(
        process.cwd(),
        'logs',
        'winston',
        'successes',
        'RH-%DATE%-success.log',
      ),
      datePattern: 'YYYY-MM-DD-HH',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
    }),
  ],
});

export const errorlogger = winston.createLogger({
  level: 'error',
  format: combine(
    label({ label: 'ASON' }),
    timestamp(),
    myFormat,
    prettyPrint(),
  ),
  transports: [
    new winston.transports.Console(),
    new DailyRotateFile({
      filename: path.join(
        process.cwd(),
        'logs',
        'winston',
        'errors',
        'RH-%DATE%-error.log',
      ),
      datePattern: 'YYYY-MM-DD-HH',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
    }),
  ],
});
