"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mssql_1 = __importDefault(require("mssql"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const config = {
    server: process.env.DB_SERVER || '',
    database: process.env.DB_DATABASE || '',
    user: process.env.DB_USER || '',
    password: process.env.DB_PASSWORD || '',
    port: parseInt(process.env.DB_PORT || '1433'),
    options: {
        encrypt: true,
        trustServerCertificate: true,
        enableArithAbort: true
    },
    connectionTimeout: 8000,
    requestTimeout: 8000
};
async function test() {
    console.log("--- AZURE SQL USERS TABLE DIAGNOSTIC ---");
    try {
        const pool = await mssql_1.default.connect(config);
        console.log("✅ Connected to Azure SQL successfully!");
        // Check if table exists
        const tableCheck = await pool.request().query(`
      SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Users'
    `);
        if (tableCheck.recordset.length === 0) {
            console.log("❌ ERROR: Users table does NOT exist in the database!");
        }
        else {
            console.log("✅ Users table exists. Querying users...");
            const res = await pool.request().query("SELECT username, password, assignedRole FROM Users");
            console.log("Users in Database:");
            console.table(res.recordset);
        }
        await pool.close();
        process.exit(0);
    }
    catch (err) {
        console.error("❌ Diagnostic query failed!");
        console.error(err);
        process.exit(1);
    }
}
test();
