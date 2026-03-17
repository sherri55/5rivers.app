"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mssql_1 = __importDefault(require("mssql"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const config_1 = require("../config");
async function main() {
    const schemaPath = path_1.default.join(__dirname, 'schema.sql');
    const schema = fs_1.default.readFileSync(schemaPath, 'utf8');
    const pool = await mssql_1.default.connect(config_1.config.databaseUrl);
    try {
        await pool.request().query(schema);
        console.log('Schema applied successfully.');
    }
    finally {
        await pool.close();
    }
}
main().catch((err) => {
    console.error(err);
    process.exit(1);
});
