import { Request, Response } from 'express';
import * as db from '../data/dbConnector';
import { listVaultFiles, uploadVaultFile, deleteVaultFile } from '../services/azureBlobService';

function getUsernameFromHeader(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    if (token.startsWith('mock-jwt-token-')) {
      return token.substring('mock-jwt-token-'.length);
    }
  }
  return null;
}

async function resolveUser(req: Request) {
  const username = getUsernameFromHeader(req);
  if (!username) return null;
  return await db.getUserByUsername(username);
}

export const getFolders = async (req: Request, res: Response) => {
  try {
    const user = await resolveUser(req);
    if (!user) {
      res.status(401).json({ message: "Unauthorized credentials" });
      return;
    }

    const allFolders = await db.getVaultFolders();
    const isSupervisor = user.assignedRole === 'supervisor';

    if (isSupervisor) {
      // Supervisor sees only their province's folders
      const userProvince = user.province || 'Gauteng';
      const filtered = allFolders.filter((f: any) => f.province.toLowerCase() === userProvince.toLowerCase());
      res.status(200).json(filtered);
      return;
    }

    // Admin/Sys-Admin can see all, filter by query param if specified
    const queryProvince = req.query.province as string;
    if (queryProvince) {
      const filtered = allFolders.filter((f: any) => f.province.toLowerCase() === queryProvince.toLowerCase());
      res.status(200).json(filtered);
      return;
    }

    res.status(200).json(allFolders);
  } catch (err: any) {
    console.error("VaultController.getFolders Error:", err);
    res.status(500).json({ message: "Error retrieving vault folders" });
  }
};

export const createFolder = async (req: Request, res: Response) => {
  return res.status(403).json({ 
    message: "Manual creation of incident folders is disabled. Incident folders are automatically created when uploading a new invoice." 
  });
};

export const getFiles = async (req: Request, res: Response) => {
  try {
    const user = await resolveUser(req);
    if (!user) {
      res.status(401).json({ message: "Unauthorized credentials" });
      return;
    }

    const { province, incidentNumber } = req.params;
    const isSupervisor = user.assignedRole === 'supervisor';
    if (isSupervisor) {
      const userProvince = user.province || 'Gauteng';
      if (province.toLowerCase() !== userProvince.toLowerCase()) {
        res.status(403).json({ message: "Permission denied for this province" });
        return;
      }
    }

    const files = await listVaultFiles(province, incidentNumber);
    res.status(200).json(files);
  } catch (err: any) {
    console.error("VaultController.getFiles Error:", err);
    res.status(500).json({ message: "Error listing vault files" });
  }
};

export const uploadFile = async (req: Request, res: Response) => {
  try {
    const user = await resolveUser(req);
    if (!user) {
      res.status(401).json({ message: "Unauthorized credentials" });
      return;
    }

    const { province, incidentNumber } = req.params;
    const { fileName, fileType, fileBase64 } = req.body;

    if (!fileName || !fileType || !fileBase64) {
      res.status(400).json({ message: "Missing required file upload fields" });
      return;
    }

    const isSupervisor = user.assignedRole === 'supervisor';
    if (isSupervisor) {
      const userProvince = user.province || 'Gauteng';
      if (province.toLowerCase() !== userProvince.toLowerCase()) {
        res.status(403).json({ message: "Permission denied for this province" });
        return;
      }
    }

    const base64Data = fileBase64.includes('base64,') 
      ? fileBase64.split('base64,')[1] 
      : fileBase64;
    const fileBuffer = Buffer.from(base64Data, 'base64');

    const documentUrl = await uploadVaultFile(
      province,
      incidentNumber,
      fileName,
      fileBuffer,
      fileType
    );

    await db.addSystemLog("Upload Vault File", user.username, `Uploaded file '${fileName}' to vault folder '${incidentNumber}' in '${province}'`);

    res.status(201).json({
      success: true,
      name: fileName.replace(/\s+/g, '_'),
      url: documentUrl
    });
  } catch (err: any) {
    console.error("VaultController.uploadFile Error:", err);
    res.status(500).json({ message: "Error uploading vault file" });
  }
};

export const deleteFile = async (req: Request, res: Response) => {
  try {
    const user = await resolveUser(req);
    if (!user) {
      res.status(401).json({ message: "Unauthorized credentials" });
      return;
    }

    const { province, incidentNumber, fileName } = req.params;

    const isSupervisor = user.assignedRole === 'supervisor';
    if (isSupervisor) {
      const userProvince = user.province || 'Gauteng';
      if (province.toLowerCase() !== userProvince.toLowerCase()) {
        res.status(403).json({ message: "Permission denied for this province" });
        return;
      }
    }

    await deleteVaultFile(province, incidentNumber, fileName);
    await db.addSystemLog("Delete Vault File", user.username, `Deleted file '${fileName}' from vault folder '${incidentNumber}' in '${province}'`);

    res.status(200).json({ success: true, message: "File deleted successfully" });
  } catch (err: any) {
    console.error("VaultController.deleteFile Error:", err);
    res.status(500).json({ message: "Error deleting vault file" });
  }
};
