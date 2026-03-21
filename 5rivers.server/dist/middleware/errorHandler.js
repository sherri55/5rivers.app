"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppError = void 0;
exports.notFound = notFound;
exports.unauthorized = unauthorized;
exports.forbidden = forbidden;
exports.badRequest = badRequest;
exports.errorHandler = errorHandler;
const config_1 = require("../config");
class AppError extends Error {
    statusCode;
    code;
    constructor(message, statusCode = 500, code) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.name = 'AppError';
    }
}
exports.AppError = AppError;
function notFound(message = 'Resource not found') {
    return new AppError(message, 404, 'NOT_FOUND');
}
function unauthorized(message = 'Unauthorized') {
    return new AppError(message, 401, 'UNAUTHORIZED');
}
function forbidden(message = 'Forbidden') {
    return new AppError(message, 403, 'FORBIDDEN');
}
function badRequest(message = 'Bad request') {
    return new AppError(message, 400, 'BAD_REQUEST');
}
function errorHandler(err, _req, res, _next) {
    const statusCode = err instanceof AppError ? err.statusCode : 500;
    const code = err instanceof AppError ? err.code : 'INTERNAL_ERROR';
    const message = statusCode === 500 && config_1.config.isProduction
        ? 'Internal server error'
        : err.message;
    res.status(statusCode).json({ error: { code, message } });
}
