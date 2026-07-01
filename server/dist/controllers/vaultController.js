"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteFile = exports.uploadFile = exports.getFiles = exports.createFolder = exports.getFolders = void 0;
const db = __importStar(require("../data/dbConnector"));
const azureBlobService_1 = require("../services/azureBlobService");
function getUsernameFromHeader(req) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        if (token.startsWith('mock-jwt-token-')) {
            return token.substring('mock-jwt-token-'.length);
        }
    }
    return null;
}
async function resolveUser(req) {
    const username = getUsernameFromHeader(req);
    if (!username)
        return null;
    return await db.getUserByUsername(username);
}
const getFolders = async (req, res) => {
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
            const filtered = allFolders.filter((f) => f.province.toLowerCase() === userProvince.toLowerCase());
            res.status(200).json(filtered);
            return;
        }
        // Admin/Sys-Admin can see all, filter by query param if specified
        const queryProvince = req.query.province;
        if (queryProvince) {
            const filtered = allFolders.filter((f) => f.province.toLowerCase() === queryProvince.toLowerCase());
            res.status(200).json(filtered);
            return;
        }
        res.status(200).json(allFolders);
    }
    catch (err) {
        console.error("VaultController.getFolders Error:", err);
        res.status(500).json({ message: "Error retrieving vault folders" });
    }
};
exports.getFolders = getFolders;
const createFolder = async (req, res) => {
    return res.status(403).json({
        message: "Manual creation of incident folders is disabled. Incident folders are automatically created when uploading a new invoice."
    });
};
exports.createFolder = createFolder;
const getFiles = async (req, res) => {
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
        const files = await (0, azureBlobService_1.listVaultFiles)(province, incidentNumber);
        res.status(200).json(files);
    }
    catch (err) {
        console.error("VaultController.getFiles Error:", err);
        res.status(500).json({ message: "Error listing vault files" });
    }
};
exports.getFiles = getFiles;
const uploadFile = async (req, res) => {
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
        const documentUrl = await (0, azureBlobService_1.uploadVaultFile)(province, incidentNumber, fileName, fileBuffer, fileType);
        await db.addSystemLog("Upload Vault File", user.username, `Uploaded file '${fileName}' to vault folder '${incidentNumber}' in '${province}'`);
        res.status(201).json({
            success: true,
            name: fileName.replace(/\s+/g, '_'),
            url: documentUrl
        });
    }
    catch (err) {
        console.error("VaultController.uploadFile Error:", err);
        res.status(500).json({ message: "Error uploading vault file" });
    }
};
exports.uploadFile = uploadFile;
const deleteFile = async (req, res) => {
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
        await (0, azureBlobService_1.deleteVaultFile)(province, incidentNumber, fileName);
        await db.addSystemLog("Delete Vault File", user.username, `Deleted file '${fileName}' from vault folder '${incidentNumber}' in '${province}'`);
        res.status(200).json({ success: true, message: "File deleted successfully" });
    }
    catch (err) {
        console.error("VaultController.deleteFile Error:", err);
        res.status(500).json({ message: "Error deleting vault file" });
    }
};
exports.deleteFile = deleteFile;
