"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initDb = initDb;
exports.getReviews = getReviews;
exports.getReviewById = getReviewById;
exports.createReview = createReview;
exports.updateReview = updateReview;
exports.getArchiveLogs = getArchiveLogs;
exports.createArchiveLog = createArchiveLog;
exports.getSystemLogs = getSystemLogs;
exports.addSystemLog = addSystemLog;
exports.getUserByUsername = getUserByUsername;
exports.updateUser = updateUser;
const mssql_1 = __importDefault(require("mssql"));
const dotenv_1 = __importDefault(require("dotenv"));
const mockDb_1 = require("./mockDb");
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
    connectionTimeout: 5000,
    requestTimeout: 5000
};
let pool = null;
let isSqlConnected = false;
async function initDb() {
    if (!config.server || !config.database) {
        console.log("SQL Configuration parameters missing. Falling back to local JSON database.");
        return;
    }
    try {
        console.log(`Connecting to Azure SQL Server: ${config.server}...`);
        pool = await mssql_1.default.connect(config);
        isSqlConnected = true;
        console.log("Connected to Azure SQL Server successfully!");
        await createTablesIfNotExist();
    }
    catch (err) {
        console.error("Failed to connect to Azure SQL Server. Falling back to local JSON database.", err);
    }
}
async function createTablesIfNotExist() {
    if (!pool)
        return;
    try {
        // Table Reviews
        await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Reviews' AND xtype='U')
      CREATE TABLE Reviews (
        id VARCHAR(50) PRIMARY KEY,
        serviceProvider VARCHAR(255),
        propertyBuilding VARCHAR(255),
        billingPeriod VARCHAR(50),
        amount FLOAT,
        status VARCHAR(50),
        aiConfidence INT,
        aiSuggestedAllocation VARCHAR(255),
        invoiceNumber VARCHAR(50),
        invoiceDate VARCHAR(50),
        accountNumber VARCHAR(50),
        receivedDate VARCHAR(50),
        daysRemaining INT,
        clerkComments NVARCHAR(MAX),
        supervisorComments NVARCHAR(MAX),
        ddComments NVARCHAR(MAX),
        directorComments NVARCHAR(MAX),
        documents NVARCHAR(MAX),
        calculations NVARCHAR(MAX),
        paymentForm NVARCHAR(MAX),
        createdAt VARCHAR(50),
        updatedAt VARCHAR(50)
      )
    `);
        // Table ArchiveLogs
        await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ArchiveLogs' AND xtype='U')
      CREATE TABLE ArchiveLogs (
        id VARCHAR(50) PRIMARY KEY,
        reviewId VARCHAR(50),
        facilityName VARCHAR(255),
        archivedBy VARCHAR(255),
        archivedDate VARCHAR(50),
        boxNumber VARCHAR(50),
        shelfNumber VARCHAR(50),
        status VARCHAR(50)
      )
    `);
        // Table SystemLogs
        await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='SystemLogs' AND xtype='U')
      CREATE TABLE SystemLogs (
        id VARCHAR(50) PRIMARY KEY,
        timestamp VARCHAR(50),
        action VARCHAR(255),
        [user] VARCHAR(255),
        details NVARCHAR(MAX)
      )
    `);
        // Drop table Users if it has old schema (missing officeLocation)
        await pool.request().query(`
      IF EXISTS (SELECT * FROM sysobjects WHERE name='Users' AND xtype='U')
      BEGIN
        IF COL_LENGTH('Users', 'officeLocation') IS NULL
          DROP TABLE Users
      END
    `);
        // Table Users
        await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Users' AND xtype='U')
      CREATE TABLE Users (
        username VARCHAR(100) PRIMARY KEY,
        password VARCHAR(100) NOT NULL,
        firstName VARCHAR(100) NOT NULL,
        lastName VARCHAR(100) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phoneNumber VARCHAR(50) NOT NULL,
        officeLocation VARCHAR(255) NOT NULL,
        designation VARCHAR(255) NOT NULL,
        assignedRole VARCHAR(100) NOT NULL
      )
    `);
        // Seed default users if table is empty or has non-consolidated user records
        const userCheck = await pool.request().query(`SELECT COUNT(*) as count FROM Users`);
        if (userCheck.recordset[0].count !== 2) {
            console.log("Consolidating system roles to Supervisor and Admin in Azure SQL...");
            await pool.request().query("DELETE FROM Users"); // Clear old records
            const defaultUsers = [
                { username: "admin", password: "admin", firstName: "Sipho", lastName: "Khumalo", email: "sipho.khumalo@dlrrd.gov.za", phoneNumber: "+27 82 111 2222", officeLocation: "DLRRD Pretoria Head Office, 184 Jeff Masemola Street", designation: "Facilities Administrator", assignedRole: "admin" },
                { username: "supervisor", password: "super123", firstName: "Thabo", lastName: "Mokoena", email: "thabo.mokoena@dlrrd.gov.za", phoneNumber: "+27 84 333 4444", officeLocation: "Compliance Operations Centre, Pretoria Main Building", designation: "Facilities Supervisor", assignedRole: "supervisor" }
            ];
            for (const u of defaultUsers) {
                await pool.request()
                    .input('username', mssql_1.default.VarChar, u.username)
                    .input('password', mssql_1.default.VarChar, u.password || '')
                    .input('firstName', mssql_1.default.VarChar, u.firstName)
                    .input('lastName', mssql_1.default.VarChar, u.lastName)
                    .input('email', mssql_1.default.VarChar, u.email)
                    .input('phoneNumber', mssql_1.default.VarChar, u.phoneNumber)
                    .input('officeLocation', mssql_1.default.VarChar, u.officeLocation)
                    .input('designation', mssql_1.default.VarChar, u.designation)
                    .input('assignedRole', mssql_1.default.VarChar, u.assignedRole)
                    .query(`
            INSERT INTO Users (username, password, firstName, lastName, email, phoneNumber, officeLocation, designation, assignedRole)
            VALUES (@username, @password, @firstName, @lastName, @email, @phoneNumber, @officeLocation, @designation, @assignedRole)
          `);
            }
        }
        // Seed default reviews if table is empty
        const reviewCheck = await pool.request().query(`SELECT COUNT(*) as count FROM Reviews`);
        if (reviewCheck.recordset[0].count === 0) {
            console.log("Seeding default reviews to Azure SQL...");
            const defaultReviews = mockDb_1.db.getReviews();
            for (const r of defaultReviews) {
                await pool.request()
                    .input('id', mssql_1.default.VarChar, r.id)
                    .input('serviceProvider', mssql_1.default.VarChar, r.serviceProvider)
                    .input('propertyBuilding', mssql_1.default.VarChar, r.propertyBuilding)
                    .input('billingPeriod', mssql_1.default.VarChar, r.billingPeriod)
                    .input('amount', mssql_1.default.Float, r.amount)
                    .input('status', mssql_1.default.VarChar, r.status)
                    .input('aiConfidence', mssql_1.default.Int, r.aiConfidence)
                    .input('aiSuggestedAllocation', mssql_1.default.VarChar, r.aiSuggestedAllocation)
                    .input('invoiceNumber', mssql_1.default.VarChar, r.invoiceNumber)
                    .input('invoiceDate', mssql_1.default.VarChar, r.invoiceDate)
                    .input('accountNumber', mssql_1.default.VarChar, r.accountNumber)
                    .input('receivedDate', mssql_1.default.VarChar, r.receivedDate)
                    .input('daysRemaining', mssql_1.default.Int, r.daysRemaining)
                    .input('clerkComments', mssql_1.default.NVarChar, r.clerkComments || '')
                    .input('supervisorComments', mssql_1.default.NVarChar, r.supervisorComments || '')
                    .input('ddComments', mssql_1.default.NVarChar, r.ddComments || '')
                    .input('directorComments', mssql_1.default.NVarChar, r.directorComments || '')
                    .input('documents', mssql_1.default.NVarChar, JSON.stringify(r.documents))
                    .input('calculations', mssql_1.default.NVarChar, JSON.stringify(r.calculations || []))
                    .input('paymentForm', mssql_1.default.NVarChar, JSON.stringify(r.paymentForm || null))
                    .input('createdAt', mssql_1.default.VarChar, r.createdAt)
                    .input('updatedAt', mssql_1.default.VarChar, r.updatedAt)
                    .query(`
            INSERT INTO Reviews (
              id, serviceProvider, propertyBuilding, billingPeriod, amount, status,
              aiConfidence, aiSuggestedAllocation, invoiceNumber, invoiceDate,
              accountNumber, receivedDate, daysRemaining, clerkComments, supervisorComments,
              ddComments, directorComments, documents, calculations, paymentForm, createdAt, updatedAt
            ) VALUES (
              @id, @serviceProvider, @propertyBuilding, @billingPeriod, @amount, @status,
              @aiConfidence, @aiSuggestedAllocation, @invoiceNumber, @invoiceDate,
              @accountNumber, @receivedDate, @daysRemaining, @clerkComments, @supervisorComments,
              @ddComments, @directorComments, @documents, @calculations, @paymentForm, @createdAt, @updatedAt
            )
          `);
            }
        }
        console.log("SQL Tables verified and ready.");
    }
    catch (err) {
        console.error("Error creating database tables", err);
    }
}
async function getReviews() {
    if (isSqlConnected && pool) {
        try {
            const res = await pool.request().query("SELECT * FROM Reviews ORDER BY createdAt DESC");
            return res.recordset.map(row => ({
                ...row,
                documents: JSON.parse(row.documents || '[]'),
                calculations: JSON.parse(row.calculations || '[]'),
                paymentForm: JSON.parse(row.paymentForm || 'null')
            }));
        }
        catch (err) {
            console.error("SQL query error, using local fallback", err);
        }
    }
    return mockDb_1.db.getReviews();
}
async function getReviewById(id) {
    if (isSqlConnected && pool) {
        try {
            const res = await pool.request()
                .input('id', mssql_1.default.VarChar, id)
                .query("SELECT TOP 1 * FROM Reviews WHERE id = @id");
            if (res.recordset.length > 0) {
                const row = res.recordset[0];
                return {
                    ...row,
                    documents: JSON.parse(row.documents || '[]'),
                    calculations: JSON.parse(row.calculations || '[]'),
                    paymentForm: JSON.parse(row.paymentForm || 'null')
                };
            }
            return null;
        }
        catch (err) {
            console.error("SQL query error, using local fallback", err);
        }
    }
    return mockDb_1.db.getReviewById(id);
}
async function createReview(review) {
    const reviews = await getReviews();
    const id = review.id || `INV-2025-0${reviews.length + 4810}`;
    const now = new Date().toISOString();
    const newReview = {
        id,
        ...review,
        createdAt: now,
        updatedAt: now
    };
    if (isSqlConnected && pool) {
        try {
            await pool.request()
                .input('id', mssql_1.default.VarChar, id)
                .input('serviceProvider', mssql_1.default.VarChar, review.serviceProvider)
                .input('propertyBuilding', mssql_1.default.VarChar, review.propertyBuilding)
                .input('billingPeriod', mssql_1.default.VarChar, review.billingPeriod || "May 2026")
                .input('amount', mssql_1.default.Float, review.amount)
                .input('status', mssql_1.default.VarChar, review.status || 'Pending Verification')
                .input('aiConfidence', mssql_1.default.Int, review.aiConfidence || 10)
                .input('aiSuggestedAllocation', mssql_1.default.VarChar, review.aiSuggestedAllocation || '')
                .input('invoiceNumber', mssql_1.default.VarChar, review.invoiceNumber || '')
                .input('invoiceDate', mssql_1.default.VarChar, review.invoiceDate || '')
                .input('accountNumber', mssql_1.default.VarChar, review.accountNumber || '')
                .input('receivedDate', mssql_1.default.VarChar, review.receivedDate || now)
                .input('daysRemaining', mssql_1.default.Int, review.daysRemaining || 30)
                .input('clerkComments', mssql_1.default.NVarChar, review.clerkComments || '')
                .input('supervisorComments', mssql_1.default.NVarChar, review.supervisorComments || '')
                .input('ddComments', mssql_1.default.NVarChar, review.ddComments || '')
                .input('directorComments', mssql_1.default.NVarChar, review.directorComments || '')
                .input('documents', mssql_1.default.NVarChar, JSON.stringify(review.documents || []))
                .input('calculations', mssql_1.default.NVarChar, JSON.stringify(review.calculations || []))
                .input('paymentForm', mssql_1.default.NVarChar, JSON.stringify(review.paymentForm || null))
                .input('createdAt', mssql_1.default.VarChar, now)
                .input('updatedAt', mssql_1.default.VarChar, now)
                .query(`
          INSERT INTO Reviews (
            id, serviceProvider, propertyBuilding, billingPeriod, amount, status,
            aiConfidence, aiSuggestedAllocation, invoiceNumber, invoiceDate,
            accountNumber, receivedDate, daysRemaining, clerkComments, supervisorComments,
            ddComments, directorComments, documents, calculations, paymentForm, createdAt, updatedAt
          ) VALUES (
            @id, @serviceProvider, @propertyBuilding, @billingPeriod, @amount, @status,
            @aiConfidence, @aiSuggestedAllocation, @invoiceNumber, @invoiceDate,
            @accountNumber, @receivedDate, @daysRemaining, @clerkComments, @supervisorComments,
            @ddComments, @directorComments, @documents, @calculations, @paymentForm, @createdAt, @updatedAt
          )
        `);
            await addSystemLog("Create Case", "admin", `Created new invoice case for ${review.serviceProvider} (${id})`);
            return newReview;
        }
        catch (err) {
            console.error("SQL create error, using local fallback", err);
        }
    }
    return mockDb_1.db.createReview(review);
}
async function updateReview(id, updates) {
    if (isSqlConnected && pool) {
        try {
            const existing = await getReviewById(id);
            if (existing) {
                const merged = { ...existing, ...updates, updatedAt: new Date().toISOString() };
                await pool.request()
                    .input('id', mssql_1.default.VarChar, id)
                    .input('serviceProvider', mssql_1.default.VarChar, merged.serviceProvider)
                    .input('propertyBuilding', mssql_1.default.VarChar, merged.propertyBuilding)
                    .input('billingPeriod', mssql_1.default.VarChar, merged.billingPeriod)
                    .input('amount', mssql_1.default.Float, merged.amount)
                    .input('status', mssql_1.default.VarChar, merged.status)
                    .input('aiConfidence', mssql_1.default.Int, merged.aiConfidence)
                    .input('aiSuggestedAllocation', mssql_1.default.VarChar, merged.aiSuggestedAllocation)
                    .input('invoiceNumber', mssql_1.default.VarChar, merged.invoiceNumber)
                    .input('invoiceDate', mssql_1.default.VarChar, merged.invoiceDate)
                    .input('accountNumber', mssql_1.default.VarChar, merged.accountNumber)
                    .input('receivedDate', mssql_1.default.VarChar, merged.receivedDate)
                    .input('daysRemaining', mssql_1.default.Int, merged.daysRemaining)
                    .input('clerkComments', mssql_1.default.NVarChar, merged.clerkComments || '')
                    .input('supervisorComments', mssql_1.default.NVarChar, merged.supervisorComments || '')
                    .input('ddComments', mssql_1.default.NVarChar, merged.ddComments || '')
                    .input('directorComments', mssql_1.default.NVarChar, merged.directorComments || '')
                    .input('documents', mssql_1.default.NVarChar, JSON.stringify(merged.documents || []))
                    .input('calculations', mssql_1.default.NVarChar, JSON.stringify(merged.calculations || []))
                    .input('paymentForm', mssql_1.default.NVarChar, JSON.stringify(merged.paymentForm || null))
                    .input('updatedAt', mssql_1.default.VarChar, merged.updatedAt)
                    .query(`
            UPDATE Reviews SET
              serviceProvider = @serviceProvider,
              propertyBuilding = @propertyBuilding,
              billingPeriod = @billingPeriod,
              amount = @amount,
              status = @status,
              aiConfidence = @aiConfidence,
              aiSuggestedAllocation = @aiSuggestedAllocation,
              invoiceNumber = @invoiceNumber,
              invoiceDate = @invoiceDate,
              accountNumber = @accountNumber,
              receivedDate = @receivedDate,
              daysRemaining = @daysRemaining,
              clerkComments = @clerkComments,
              supervisorComments = @supervisorComments,
              ddComments = @ddComments,
              directorComments = @directorComments,
              documents = @documents,
              calculations = @calculations,
              paymentForm = @paymentForm,
              updatedAt = @updatedAt
            WHERE id = @id
          `);
                await addSystemLog("Update Case", "admin", `Updated status/details for ${id} to ${merged.status}`);
                return merged;
            }
        }
        catch (err) {
            console.error("SQL update error, using local fallback", err);
        }
    }
    return mockDb_1.db.updateReview(id, updates);
}
async function getArchiveLogs() {
    if (isSqlConnected && pool) {
        try {
            const res = await pool.request().query("SELECT * FROM ArchiveLogs ORDER BY archivedDate DESC");
            return res.recordset;
        }
        catch (err) {
            console.error("SQL query error, using local fallback", err);
        }
    }
    return mockDb_1.db.getArchiveLogs();
}
async function createArchiveLog(log) {
    const logs = await getArchiveLogs();
    const id = `ARC-0${logs.length + 1}`;
    const archivedDate = new Date().toISOString();
    const newLog = { ...log, id, archivedDate };
    if (isSqlConnected && pool) {
        try {
            await pool.request()
                .input('id', mssql_1.default.VarChar, id)
                .input('reviewId', mssql_1.default.VarChar, log.reviewId)
                .input('facilityName', mssql_1.default.VarChar, log.facilityName)
                .input('archivedBy', mssql_1.default.VarChar, log.archivedBy)
                .input('archivedDate', mssql_1.default.VarChar, archivedDate)
                .input('boxNumber', mssql_1.default.VarChar, log.boxNumber)
                .input('shelfNumber', mssql_1.default.VarChar, log.shelfNumber)
                .input('status', mssql_1.default.VarChar, log.status)
                .query(`
          INSERT INTO ArchiveLogs (id, reviewId, facilityName, archivedBy, archivedDate, boxNumber, shelfNumber, status)
          VALUES (@id, @reviewId, @facilityName, @archivedBy, @archivedDate, @boxNumber, @shelfNumber, @status)
        `);
            await addSystemLog("Archive Case", "admin", `Archived case ${log.reviewId} in box ${log.boxNumber}`);
            return newLog;
        }
        catch (err) {
            console.error("SQL create log error, using local fallback", err);
        }
    }
    return mockDb_1.db.createArchiveLog(log);
}
async function getSystemLogs() {
    if (isSqlConnected && pool) {
        try {
            const res = await pool.request().query("SELECT * FROM SystemLogs ORDER BY timestamp DESC");
            return res.recordset;
        }
        catch (err) {
            console.error("SQL query error, using local fallback", err);
        }
    }
    return mockDb_1.db.getSystemLogs();
}
async function addSystemLog(action, user, details) {
    const logs = await getSystemLogs();
    const id = `LOG-0${logs.length + 1}`;
    const timestamp = new Date().toISOString();
    const newLog = { id, timestamp, action, user, details };
    if (isSqlConnected && pool) {
        try {
            await pool.request()
                .input('id', mssql_1.default.VarChar, id)
                .input('timestamp', mssql_1.default.VarChar, timestamp)
                .input('action', mssql_1.default.VarChar, action)
                .input('user', mssql_1.default.VarChar, user)
                .input('details', mssql_1.default.NVarChar, details)
                .query(`
          INSERT INTO SystemLogs (id, timestamp, action, [user], details)
          VALUES (@id, @timestamp, @action, @user, @details)
        `);
            return newLog;
        }
        catch (err) {
            console.error("SQL add log error, using local fallback", err);
        }
    }
    return mockDb_1.db.addSystemLog(action, user, details);
}
async function getUserByUsername(username) {
    if (isSqlConnected && pool) {
        try {
            const res = await pool.request()
                .input('username', mssql_1.default.VarChar, username)
                .query("SELECT TOP 1 * FROM Users WHERE username = @username");
            if (res.recordset.length > 0) {
                return res.recordset[0];
            }
            return null;
        }
        catch (err) {
            console.error("SQL query users error, using local fallback", err);
        }
    }
    return mockDb_1.db.getUserByUsername(username);
}
async function updateUser(username, updates) {
    if (isSqlConnected && pool) {
        try {
            const req = pool.request().input('username', mssql_1.default.VarChar, username);
            let setClauses = [];
            if (updates.firstName !== undefined) {
                req.input('firstName', mssql_1.default.VarChar, updates.firstName);
                setClauses.push('firstName = @firstName');
            }
            if (updates.lastName !== undefined) {
                req.input('lastName', mssql_1.default.VarChar, updates.lastName);
                setClauses.push('lastName = @lastName');
            }
            if (updates.email !== undefined) {
                req.input('email', mssql_1.default.VarChar, updates.email);
                setClauses.push('email = @email');
            }
            if (updates.phoneNumber !== undefined) {
                req.input('phoneNumber', mssql_1.default.VarChar, updates.phoneNumber);
                setClauses.push('phoneNumber = @phoneNumber');
            }
            if (updates.officeLocation !== undefined) {
                req.input('officeLocation', mssql_1.default.VarChar, updates.officeLocation);
                setClauses.push('officeLocation = @officeLocation');
            }
            if (setClauses.length > 0) {
                await req.query(`UPDATE Users SET ${setClauses.join(', ')} WHERE username = @username`);
            }
            const updatedRes = await pool.request()
                .input('username', mssql_1.default.VarChar, username)
                .query("SELECT TOP 1 * FROM Users WHERE username = @username");
            return updatedRes.recordset[0] || null;
        }
        catch (err) {
            console.error("SQL update user error, using local fallback", err);
        }
    }
    return mockDb_1.db.updateUser(username, updates);
}
