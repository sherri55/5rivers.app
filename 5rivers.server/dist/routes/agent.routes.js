"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const asyncHandler_1 = require("../utils/asyncHandler");
const auth_middleware_1 = require("../middleware/auth.middleware");
const errorHandler_1 = require("../middleware/errorHandler");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.requireAuth);
/**
 * POST /api/agent/chat
 * Body: { message: string }
 * Response: { reply: string, toolCalls?: Array<{ name, args, result }> }
 *
 * Passes the user's JWT to the agent so it operates with their org context.
 */
router.post('/agent/chat', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { message, images } = req.body ?? {};
    if (!message || typeof message !== 'string' || !message.trim()) {
        throw (0, errorHandler_1.badRequest)('message is required');
    }
    // Dynamic import to avoid hard dependency on the agent package
    const { processMessage } = await Promise.resolve().then(() => __importStar(require('../../../5rivers.app.agent/dist/index.js')));
    const token = req.headers.authorization?.slice(7)?.trim();
    if (!token)
        throw (0, errorHandler_1.badRequest)('Missing auth token');
    const userId = req.user.userId;
    const response = await processMessage('web', userId, message.trim(), token, images);
    res.json({
        reply: response.text,
        toolCalls: response.toolCalls,
    });
}));
router.post('/agent/clear', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { resetConversation } = await Promise.resolve().then(() => __importStar(require('../../../5rivers.app.agent/dist/index.js')));
    resetConversation('web', req.user.userId);
    res.json({ ok: true });
}));
exports.default = router;
