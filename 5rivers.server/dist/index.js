"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const config_1 = require("./config");
const connection_1 = require("./db/connection");
const server = app_1.default.listen(config_1.config.port, () => {
    console.log(`5rivers.server listening on http://localhost:${config_1.config.port}`);
});
async function shutdown() {
    await (0, connection_1.closePool)();
    server.close(() => process.exit(0));
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
