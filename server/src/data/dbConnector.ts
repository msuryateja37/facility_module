import mssql from 'mssql';
import dotenv from 'dotenv';
import { db as mockDb } from './mockDb';

dotenv.config();

const config: mssql.config = {
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

let pool: mssql.ConnectionPool | null = null;
let isSqlConnected = false;

export async function initDb() {
  if (!config.server || !config.database) {
    console.log("SQL Configuration parameters missing. Falling back to local JSON database.");
    return;
  }
  try {
    console.log(`Connecting to Azure SQL Server: ${config.server}...`);
    pool = await mssql.connect(config);
    isSqlConnected = true;
    console.log("Connected to Azure SQL Server successfully!");
    await createTablesIfNotExist();
  } catch (err) {
    console.error("Failed to connect to Azure SQL Server. Falling back to local JSON database.", err);
  }
}

async function createTablesIfNotExist() {
  if (!pool) return;
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
        assignedRole VARCHAR(100) NOT NULL,
        province VARCHAR(100) NULL
      )
    `);

    // Alter Users table to add province if missing (for existing tables)
    await pool.request().query(`
      IF EXISTS (SELECT * FROM sysobjects WHERE name='Users' AND xtype='U')
      BEGIN
        IF COL_LENGTH('Users', 'province') IS NULL
          ALTER TABLE Users ADD province VARCHAR(100) NULL
      END
    `);

    // Table VaultFolders
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='VaultFolders' AND xtype='U')
      CREATE TABLE VaultFolders (
        id VARCHAR(50) PRIMARY KEY,
        incidentNumber VARCHAR(100) NOT NULL UNIQUE,
        province VARCHAR(100) NOT NULL,
        description NVARCHAR(500),
        createdAt VARCHAR(50) NOT NULL,
        createdBy VARCHAR(100) NOT NULL
      )
    `);

    // Seed default users if table is empty or has non-consolidated user records
    const userCheck = await pool.request().query(`SELECT COUNT(*) as count FROM Users`);
    if (userCheck.recordset[0].count !== 2) {
      console.log("Consolidating system roles to Supervisor and Admin in Azure SQL...");
      await pool.request().query("DELETE FROM Users"); // Clear old records
      const defaultUsers = [
        { username: "admin", password: "admin", firstName: "Sipho", lastName: "Khumalo", email: "sipho.khumalo@dlrrd.gov.za", phoneNumber: "+27 82 111 2222", officeLocation: "DLRRD Pretoria Head Office, 184 Jeff Masemola Street", designation: "Facilities Administrator", assignedRole: "admin", province: "Gauteng" },
        { username: "supervisor", password: "super123", firstName: "Thabo", lastName: "Mokoena", email: "thabo.mokoena@dlrrd.gov.za", phoneNumber: "+27 84 333 4444", officeLocation: "Compliance Operations Centre, Pretoria Main Building", designation: "Facilities Supervisor", assignedRole: "supervisor", province: "Gauteng" }
      ];
      for (const u of defaultUsers) {
        await pool.request()
          .input('username', mssql.VarChar, u.username)
          .input('password', mssql.VarChar, u.password || '')
          .input('firstName', mssql.VarChar, u.firstName)
          .input('lastName', mssql.VarChar, u.lastName)
          .input('email', mssql.VarChar, u.email)
          .input('phoneNumber', mssql.VarChar, u.phoneNumber)
          .input('officeLocation', mssql.VarChar, u.officeLocation)
          .input('designation', mssql.VarChar, u.designation)
          .input('assignedRole', mssql.VarChar, u.assignedRole)
          .input('province', mssql.VarChar, u.province)
          .query(`
            INSERT INTO Users (username, password, firstName, lastName, email, phoneNumber, officeLocation, designation, assignedRole, province)
            VALUES (@username, @password, @firstName, @lastName, @email, @phoneNumber, @officeLocation, @designation, @assignedRole, @province)
          `);
      }
    } else {
      // Ensure province is populated for existing seeded users
      await pool.request().query(`
        UPDATE Users SET province = 'Gauteng' WHERE province IS NULL
      `);
    }

    // Seed default reviews if table is empty
    const reviewCheck = await pool.request().query(`SELECT COUNT(*) as count FROM Reviews`);
    if (reviewCheck.recordset[0].count === 0) {
      console.log("Seeding default reviews to Azure SQL...");
      const defaultReviews = mockDb.getReviews();
      for (const r of defaultReviews) {
        await pool.request()
          .input('id', mssql.VarChar, r.id)
          .input('serviceProvider', mssql.VarChar, r.serviceProvider)
          .input('propertyBuilding', mssql.VarChar, r.propertyBuilding)
          .input('billingPeriod', mssql.VarChar, r.billingPeriod)
          .input('amount', mssql.Float, r.amount)
          .input('status', mssql.VarChar, r.status)
          .input('aiConfidence', mssql.Int, r.aiConfidence)
          .input('aiSuggestedAllocation', mssql.VarChar, r.aiSuggestedAllocation)
          .input('invoiceNumber', mssql.VarChar, r.invoiceNumber)
          .input('invoiceDate', mssql.VarChar, r.invoiceDate)
          .input('accountNumber', mssql.VarChar, r.accountNumber)
          .input('receivedDate', mssql.VarChar, r.receivedDate)
          .input('daysRemaining', mssql.Int, r.daysRemaining)
          .input('clerkComments', mssql.NVarChar, r.clerkComments || '')
          .input('supervisorComments', mssql.NVarChar, r.supervisorComments || '')
          .input('ddComments', mssql.NVarChar, r.ddComments || '')
          .input('directorComments', mssql.NVarChar, r.directorComments || '')
          .input('documents', mssql.NVarChar, JSON.stringify(r.documents))
          .input('calculations', mssql.NVarChar, JSON.stringify(r.calculations || []))
          .input('paymentForm', mssql.NVarChar, JSON.stringify(r.paymentForm || null))
          .input('createdAt', mssql.VarChar, r.createdAt)
          .input('updatedAt', mssql.VarChar, r.updatedAt)
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
  } catch (err) {
    console.error("Error creating database tables", err);
  }
}

export async function getReviews(): Promise<any[]> {
  if (isSqlConnected && pool) {
    try {
      const res = await pool.request().query("SELECT * FROM Reviews ORDER BY createdAt DESC");
      return res.recordset.map(row => ({
        ...row,
        documents: JSON.parse(row.documents || '[]'),
        calculations: JSON.parse(row.calculations || '[]'),
        paymentForm: JSON.parse(row.paymentForm || 'null')
      }));
    } catch (err) {
      console.error("SQL query error, using local fallback", err);
    }
  }
  return mockDb.getReviews();
}

export async function getReviewById(id: string): Promise<any> {
  if (isSqlConnected && pool) {
    try {
      const res = await pool.request()
        .input('id', mssql.VarChar, id)
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
    } catch (err) {
      console.error("SQL query error, using local fallback", err);
    }
  }
  return mockDb.getReviewById(id);
}

export async function createReview(review: any): Promise<any> {
  const randomSuffix = Math.floor(100000 + Math.random() * 900000);
  const id = review.id || `INV-2025-${randomSuffix}`;
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
        .input('id', mssql.VarChar, id)
        .input('serviceProvider', mssql.VarChar, review.serviceProvider)
        .input('propertyBuilding', mssql.VarChar, review.propertyBuilding)
        .input('billingPeriod', mssql.VarChar, review.billingPeriod || "May 2026")
        .input('amount', mssql.Float, review.amount)
        .input('status', mssql.VarChar, review.status || 'Pending Verification')
        .input('aiConfidence', mssql.Int, review.aiConfidence || 10)
        .input('aiSuggestedAllocation', mssql.VarChar, review.aiSuggestedAllocation || '')
        .input('invoiceNumber', mssql.VarChar, review.invoiceNumber || '')
        .input('invoiceDate', mssql.VarChar, review.invoiceDate || '')
        .input('accountNumber', mssql.VarChar, review.accountNumber || '')
        .input('receivedDate', mssql.VarChar, review.receivedDate || now)
        .input('daysRemaining', mssql.Int, review.daysRemaining || 30)
        .input('clerkComments', mssql.NVarChar, review.clerkComments || '')
        .input('supervisorComments', mssql.NVarChar, review.supervisorComments || '')
        .input('ddComments', mssql.NVarChar, review.ddComments || '')
        .input('directorComments', mssql.NVarChar, review.directorComments || '')
        .input('documents', mssql.NVarChar, JSON.stringify(review.documents || []))
        .input('calculations', mssql.NVarChar, JSON.stringify(review.calculations || []))
        .input('paymentForm', mssql.NVarChar, JSON.stringify(review.paymentForm || null))
        .input('createdAt', mssql.VarChar, now)
        .input('updatedAt', mssql.VarChar, now)
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
    } catch (err) {
      console.error("SQL create error, using local fallback", err);
    }
  }
  return mockDb.createReview(review);
}

export async function updateReview(id: string, updates: any): Promise<any> {
  if (isSqlConnected && pool) {
    try {
      const existing = await getReviewById(id);
      if (existing) {
        const merged = { ...existing, ...updates, updatedAt: new Date().toISOString() };
        await pool.request()
          .input('id', mssql.VarChar, id)
          .input('serviceProvider', mssql.VarChar, merged.serviceProvider)
          .input('propertyBuilding', mssql.VarChar, merged.propertyBuilding)
          .input('billingPeriod', mssql.VarChar, merged.billingPeriod)
          .input('amount', mssql.Float, merged.amount)
          .input('status', mssql.VarChar, merged.status)
          .input('aiConfidence', mssql.Int, merged.aiConfidence)
          .input('aiSuggestedAllocation', mssql.VarChar, merged.aiSuggestedAllocation)
          .input('invoiceNumber', mssql.VarChar, merged.invoiceNumber)
          .input('invoiceDate', mssql.VarChar, merged.invoiceDate)
          .input('accountNumber', mssql.VarChar, merged.accountNumber)
          .input('receivedDate', mssql.VarChar, merged.receivedDate)
          .input('daysRemaining', mssql.Int, merged.daysRemaining)
          .input('clerkComments', mssql.NVarChar, merged.clerkComments || '')
          .input('supervisorComments', mssql.NVarChar, merged.supervisorComments || '')
          .input('ddComments', mssql.NVarChar, merged.ddComments || '')
          .input('directorComments', mssql.NVarChar, merged.directorComments || '')
          .input('documents', mssql.NVarChar, JSON.stringify(merged.documents || []))
          .input('calculations', mssql.NVarChar, JSON.stringify(merged.calculations || []))
          .input('paymentForm', mssql.NVarChar, JSON.stringify(merged.paymentForm || null))
          .input('updatedAt', mssql.VarChar, merged.updatedAt)
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
    } catch (err) {
      console.error("SQL update error, using local fallback", err);
    }
  }
  return mockDb.updateReview(id, updates);
}

export async function getArchiveLogs(): Promise<any[]> {
  if (isSqlConnected && pool) {
    try {
      const res = await pool.request().query("SELECT * FROM ArchiveLogs ORDER BY archivedDate DESC");
      return res.recordset;
    } catch (err) {
      console.error("SQL query error, using local fallback", err);
    }
  }
  return mockDb.getArchiveLogs();
}

export async function createArchiveLog(log: any): Promise<any> {
  const logs = await getArchiveLogs();
  const id = `ARC-0${logs.length + 1}`;
  const archivedDate = new Date().toISOString();
  const newLog = { ...log, id, archivedDate };
  if (isSqlConnected && pool) {
    try {
      await pool.request()
        .input('id', mssql.VarChar, id)
        .input('reviewId', mssql.VarChar, log.reviewId)
        .input('facilityName', mssql.VarChar, log.facilityName)
        .input('archivedBy', mssql.VarChar, log.archivedBy)
        .input('archivedDate', mssql.VarChar, archivedDate)
        .input('boxNumber', mssql.VarChar, log.boxNumber)
        .input('shelfNumber', mssql.VarChar, log.shelfNumber)
        .input('status', mssql.VarChar, log.status)
        .query(`
          INSERT INTO ArchiveLogs (id, reviewId, facilityName, archivedBy, archivedDate, boxNumber, shelfNumber, status)
          VALUES (@id, @reviewId, @facilityName, @archivedBy, @archivedDate, @boxNumber, @shelfNumber, @status)
        `);
      await addSystemLog("Archive Case", "admin", `Archived case ${log.reviewId} in box ${log.boxNumber}`);
      return newLog;
    } catch (err) {
      console.error("SQL create log error, using local fallback", err);
    }
  }
  return mockDb.createArchiveLog(log);
}

export async function getSystemLogs(): Promise<any[]> {
  if (isSqlConnected && pool) {
    try {
      const res = await pool.request().query("SELECT * FROM SystemLogs ORDER BY timestamp DESC");
      return res.recordset;
    } catch (err) {
      console.error("SQL query error, using local fallback", err);
    }
  }
  return mockDb.getSystemLogs();
}

export async function addSystemLog(action: string, user: string, details: string): Promise<any> {
  const logs = await getSystemLogs();
  const id = `LOG-0${logs.length + 1}`;
  const timestamp = new Date().toISOString();
  const newLog = { id, timestamp, action, user, details };
  if (isSqlConnected && pool) {
    try {
      await pool.request()
        .input('id', mssql.VarChar, id)
        .input('timestamp', mssql.VarChar, timestamp)
        .input('action', mssql.VarChar, action)
        .input('user', mssql.VarChar, user)
        .input('details', mssql.NVarChar, details)
        .query(`
          INSERT INTO SystemLogs (id, timestamp, action, [user], details)
          VALUES (@id, @timestamp, @action, @user, @details)
        `);
      return newLog;
    } catch (err) {
      console.error("SQL add log error, using local fallback", err);
    }
  }
  return mockDb.addSystemLog(action, user, details);
}

export async function getUserByUsername(username: string): Promise<any> {
  if (isSqlConnected && pool) {
    try {
      const res = await pool.request()
        .input('username', mssql.VarChar, username)
        .query("SELECT TOP 1 * FROM Users WHERE username = @username");
      if (res.recordset.length > 0) {
        return res.recordset[0];
      }
      return null;
    } catch (err) {
      console.error("SQL query users error, using local fallback", err);
    }
  }
  return mockDb.getUserByUsername(username);
}

export async function updateUser(username: string, updates: any): Promise<any> {
  if (isSqlConnected && pool) {
    try {
      const req = pool.request().input('username', mssql.VarChar, username);
      let setClauses = [];
      
      if (updates.firstName !== undefined) {
        req.input('firstName', mssql.VarChar, updates.firstName);
        setClauses.push('firstName = @firstName');
      }
      if (updates.lastName !== undefined) {
        req.input('lastName', mssql.VarChar, updates.lastName);
        setClauses.push('lastName = @lastName');
      }
      if (updates.email !== undefined) {
        req.input('email', mssql.VarChar, updates.email);
        setClauses.push('email = @email');
      }
      if (updates.phoneNumber !== undefined) {
        req.input('phoneNumber', mssql.VarChar, updates.phoneNumber);
        setClauses.push('phoneNumber = @phoneNumber');
      }
      if (updates.officeLocation !== undefined) {
        req.input('officeLocation', mssql.VarChar, updates.officeLocation);
        setClauses.push('officeLocation = @officeLocation');
      }
      if (updates.province !== undefined) {
        req.input('province', mssql.VarChar, updates.province);
        setClauses.push('province = @province');
      }
      
      if (setClauses.length > 0) {
        await req.query(`UPDATE Users SET ${setClauses.join(', ')} WHERE username = @username`);
      }
      
      const updatedRes = await pool.request()
        .input('username', mssql.VarChar, username)
        .query("SELECT TOP 1 * FROM Users WHERE username = @username");
      return updatedRes.recordset[0] || null;
    } catch (err) {
      console.error("SQL update user error, using local fallback", err);
    }
  }
  return mockDb.updateUser(username, updates);
}

export async function getVaultFolders(): Promise<any[]> {
  if (isSqlConnected && pool) {
    try {
      const res = await pool.request().query("SELECT * FROM VaultFolders ORDER BY createdAt DESC");
      return res.recordset;
    } catch (err) {
      console.error("SQL query vault folders error, using local fallback", err);
    }
  }
  return mockDb.getVaultFolders();
}

export async function createVaultFolder(folder: any): Promise<any> {
  const randomSuffix = Math.floor(100000 + Math.random() * 900000);
  const id = folder.id || `FLD-${randomSuffix}`;
  const now = new Date().toISOString();
  const newFolder = {
    id,
    ...folder,
    createdAt: now
  };
  if (isSqlConnected && pool) {
    try {
      await pool.request()
        .input('id', mssql.VarChar, id)
        .input('incidentNumber', mssql.VarChar, folder.incidentNumber)
        .input('province', mssql.VarChar, folder.province)
        .input('description', mssql.NVarChar, folder.description || '')
        .input('createdAt', mssql.VarChar, now)
        .input('createdBy', mssql.VarChar, folder.createdBy)
        .query(`
          INSERT INTO VaultFolders (id, incidentNumber, province, description, createdAt, createdBy)
          VALUES (@id, @incidentNumber, @province, @description, @createdAt, @createdBy)
        `);
      return newFolder;
    } catch (err) {
      console.error("SQL create vault folder error, using local fallback", err);
    }
  }
  return mockDb.createVaultFolder(folder);
}

export async function getVaultFolderByIncident(incidentNumber: string): Promise<any> {
  if (isSqlConnected && pool) {
    try {
      const res = await pool.request()
        .input('incidentNumber', mssql.VarChar, incidentNumber)
        .query("SELECT TOP 1 * FROM VaultFolders WHERE incidentNumber = @incidentNumber");
      if (res.recordset.length > 0) {
        return res.recordset[0];
      }
      return null;
    } catch (err) {
      console.error("SQL query vault folder by incident error, using local fallback", err);
    }
  }
  return mockDb.getVaultFolders().find((f: any) => f.incidentNumber === incidentNumber) || null;
}

export async function getPaginatedReviews(
  page: number, 
  limit: number, 
  search: string, 
  status: string
): Promise<{ reviews: any[], total: number, page: number, totalPages: number }> {
  if (isSqlConnected && pool) {
    try {
      const offset = (page - 1) * limit;
      let whereClause = "WHERE 1=1";
      const request = pool.request();

      if (status && status !== 'All') {
        request.input('status', mssql.VarChar, status);
        whereClause += " AND status = @status";
      }

      if (search) {
        request.input('search', mssql.VarChar, `%${search}%`);
        whereClause += " AND (id LIKE @search OR invoiceNumber LIKE @search OR serviceProvider LIKE @search OR billingPeriod LIKE @search OR propertyBuilding LIKE @search)";
      }

      // Count Query
      const countRes = await request.query(`SELECT COUNT(*) as count FROM Reviews ${whereClause}`);
      const total = countRes.recordset[0].count;

      // Select Query with Pagination
      request.input('offset', mssql.Int, offset);
      request.input('limit', mssql.Int, limit);
      
      const selectRes = await request.query(`
        SELECT * FROM Reviews 
        ${whereClause} 
        ORDER BY createdAt DESC 
        OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
      `);

      const reviews = selectRes.recordset.map(row => ({
        ...row,
        documents: JSON.parse(row.documents || '[]'),
        calculations: JSON.parse(row.calculations || '[]'),
        paymentForm: JSON.parse(row.paymentForm || 'null')
      }));

      const totalPages = Math.ceil(total / limit);

      return {
        reviews,
        total,
        page,
        totalPages
      };
    } catch (err) {
      console.error("SQL query getPaginatedReviews error, using local fallback", err);
    }
  }
  return mockDb.getPaginatedReviews(page, limit, search, status);
}
