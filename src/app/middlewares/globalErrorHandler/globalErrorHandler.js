const zod = require('zod');
const { ZodError } = require('zod');
const ApiError = require("../../../errors/ApiError");
const { handleCastError } = require("../../../errors/handleCastError");
const { handleValidationError } = require("../../../errors/handleValidationError");
const { handleZodError } = require("../../../errors/handleZodError");
const config = require('../../../../config');
const { errorlogger } = require('../../../shared/logger');



const globalErrorHandler = (error, req, res, next) => {
    if (config.env === 'development') {
        console.log('🟢 globalErrorHandler ~', error);
    } else {
        errorlogger.error('🔴 globalErrorHandler ~', error);
    }

    let statusCode = 500;
    let message = 'Something went wrong!';
    let errorMessages = [];

    if (error && error.name === 'ValidationError') {
        const simplifiedError = handleValidationError(error);
        statusCode = simplifiedError.statusCode;
        message = simplifiedError.message;
        errorMessages = simplifiedError.errorMessages;
    } else if (error instanceof ZodError) {
        const simplifiedError = handleZodError(error);
        statusCode = simplifiedError.statusCode;
        message = simplifiedError.message;
        errorMessages = simplifiedError.errorMessages;
    } else if (error && error.name === 'CastError') {
        const simplifiedError = handleCastError(error);
        statusCode = simplifiedError.statusCode;
        message = simplifiedError.message;
        errorMessages = simplifiedError.errorMessages;
    } else if (error instanceof ApiError) {
        statusCode = error ? error.statusCode : statusCode;
        message = error ? error.message : message;
        errorMessages = error && error.message ? [{ path: '', message: error.message }] : [];
    } else if (error instanceof Error) {
        message = error ? error.message : message;
        errorMessages = error && error.message ? [{ path: '', message: error.message }] : [];
    }

    res.status(statusCode).json({
        status: false,
        message,
        errorMessages,
        stack: config.env !== 'production' ? (error ? error.stack : undefined) : undefined,
    });
};

module.exports = globalErrorHandler;
