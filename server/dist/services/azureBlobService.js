"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadBlob = uploadBlob;
const storage_blob_1 = require("@azure/storage-blob");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'facility-management-vault';
async function uploadBlob(fileName, fileBuffer, mimeType) {
    // If connection string is missing, log it and return local static file path as fallback
    if (!connectionString) {
        console.warn("Azure Blob: AZURE_STORAGE_CONNECTION_STRING is missing. Falling back to local disk URL.");
        return `/uploads/${fileName}`;
    }
    try {
        console.log(`Azure Blob: Initializing upload for ${fileName}...`);
        const blobServiceClient = storage_blob_1.BlobServiceClient.fromConnectionString(connectionString);
        const containerClient = blobServiceClient.getContainerClient(containerName);
        // Create container if it does not exist with public access (blob) to serve files directly
        await containerClient.createIfNotExists({
            access: 'blob'
        });
        // Make sure we store invoices in 'invoice' folder in the blob
        const blobName = `invoice/${fileName}`;
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);
        console.log(`Azure Blob: Uploading file buffer to ${blobName}...`);
        await blockBlobClient.upload(fileBuffer, fileBuffer.length, {
            blobHTTPHeaders: {
                blobContentType: mimeType
            }
        });
        console.log(`Azure Blob: Successfully uploaded file. Public URL: ${blockBlobClient.url}`);
        return blockBlobClient.url;
    }
    catch (err) {
        console.error("Azure Blob: Failed to upload file to Blob Storage. Falling back to local disk URL.", err);
        return `/uploads/${fileName}`;
    }
}
