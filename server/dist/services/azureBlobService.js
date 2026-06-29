"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadBlob = uploadBlob;
const storage_blob_1 = require("@azure/storage-blob");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
async function uploadBlob(fileName, fileBuffer, mimeType) {
    let connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'facility-management-vault';
    // If connection string is missing, log it and return local static file path as fallback
    if (!connectionString) {
        console.warn("Azure Blob: AZURE_STORAGE_CONNECTION_STRING is missing. Falling back to local disk URL.");
        return `/uploads/${fileName}`;
    }
    // Automatically repair connection string if EndpointSuffix is missing
    if (!connectionString.includes('EndpointSuffix=')) {
        connectionString = connectionString.trim();
        if (!connectionString.endsWith(';')) {
            connectionString += ';';
        }
        connectionString += 'EndpointSuffix=core.windows.net';
        console.log("Azure Blob: Appended missing EndpointSuffix to connection string.");
    }
    try {
        console.log(`Azure Blob: Initializing upload for ${fileName}...`);
        const blobServiceClient = storage_blob_1.BlobServiceClient.fromConnectionString(connectionString);
        const containerClient = blobServiceClient.getContainerClient(containerName);
        // Create container private by default (no anonymous access needed)
        await containerClient.createIfNotExists();
        // Make sure we store invoices in 'invoice' folder in the blob
        const blobName = `invoice/${fileName}`;
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);
        console.log(`Azure Blob: Uploading file buffer to ${blobName}...`);
        await blockBlobClient.upload(fileBuffer, fileBuffer.length, {
            blobHTTPHeaders: {
                blobContentType: mimeType
            }
        });
        // Generate a secure SAS URL valid for 24 hours to view private blob directly in browser
        const sasUrl = await blockBlobClient.generateSasUrl({
            permissions: storage_blob_1.BlobSASPermissions.parse("r"), // read only
            expiresOn: new Date(new Date().valueOf() + 24 * 3600 * 1000) // 24 hours
        });
        console.log(`Azure Blob: Successfully uploaded file. SAS URL: ${sasUrl}`);
        return sasUrl;
    }
    catch (err) {
        console.error("Azure Blob: Failed to upload file to Blob Storage. Falling back to local disk URL.", err);
        return `/uploads/${fileName}`;
    }
}
