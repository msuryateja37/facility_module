import { BlobServiceClient } from '@azure/storage-blob';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'facility-management-vault';

export async function uploadBlob(
  fileName: string, 
  fileBuffer: Buffer, 
  mimeType: string
): Promise<string> {
  // If connection string is missing, log it and return local static file path as fallback
  if (!connectionString) {
    console.warn("Azure Blob: AZURE_STORAGE_CONNECTION_STRING is missing. Falling back to local disk URL.");
    return `/uploads/${fileName}`;
  }

  try {
    console.log(`Azure Blob: Initializing upload for ${fileName}...`);
    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
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
  } catch (err) {
    console.error("Azure Blob: Failed to upload file to Blob Storage. Falling back to local disk URL.", err);
    return `/uploads/${fileName}`;
  }
}
