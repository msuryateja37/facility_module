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
    console.log("--- AZURE SQL CONNECTION TEST ---");
    console.log("Server:   ", config.server);
    console.log("Database: ", config.database);
    console.log("User:     ", config.user);
    console.log("Port:     ", config.port);
    console.log("Password: ", config.password ? "(set)" : "(empty)");
    try {
        console.log("\nConnecting to SQL Server...");
        const pool = await mssql_1.default.connect(config);
        console.log("✅ SUCCESS: Connected to Azure SQL successfully!");
        console.log("Querying database version...");
        const res = await pool.request().query("SELECT @@VERSION as version");
        console.log("✅ Version Result:\n", res.recordset[0].version);
        await pool.close();
        console.log("\nTest completed successfully.");
        process.exit(0);
    }
    catch (err) {
        console.error("\n❌ CONNECTION FAILED!");
        console.error(err);
        process.exit(1);
    }
}
test();
