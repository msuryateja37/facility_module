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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadInvoice = exports.uploadFile = exports.updateReview = exports.createReview = exports.getReviewById = exports.getReviews = exports.getStats = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const Review_1 = require("../models/Review");
const azureAiService_1 = require("../services/azureAiService");
const azureBlobService_1 = require("../services/azureBlobService");
const db = __importStar(require("../data/dbConnector"));
const getStats = async (req, res) => {
    try {
        const reviews = await Review_1.Review.getAll();
        const total = reviews.length;
        const pendingVerification = reviews.filter(r => r.status === 'Pending Verification').length;
        const verified = reviews.filter(r => r.status === 'Verified').length;
        const ddApproved = reviews.filter(r => r.status === 'DD Approved').length;
        const directorApproved = reviews.filter(r => r.status === 'Director Approved').length;
        const paid = reviews.filter(r => r.status === 'Paid').length;
        const rejected = reviews.filter(r => r.status === 'Returned' || r.status === 'Escalated').length;
        const avgCompliance = total > 0
            ? Math.round(reviews.reduce((acc, curr) => acc + (curr.aiConfidence * 10), 0) / total)
            : 0;
        return res.status(200).json({
            total,
            pendingVerification,
            verified,
            ddApproved,
            directorApproved,
            paid,
            rejected,
            avgCompliance
        });
    }
    catch (err) {
        return res.status(500).json({ message: "Error loading statistics" });
    }
};
exports.getStats = getStats;
const getReviews = async (req, res) => {
    try {
        const page = req.query.page ? parseInt(req.query.page) : undefined;
        const limit = req.query.limit ? parseInt(req.query.limit) : undefined;
        const search = req.query.search || '';
        const status = req.query.status || '';
        // If page is specified, run paginated query
        if (page !== undefined && limit !== undefined) {
            const payload = await Review_1.Review.getPaginated(page, limit, search, status);
            return res.status(200).json(payload);
        }
        const reviews = await Review_1.Review.getAll();
        return res.status(200).json(reviews);
    }
    catch (err) {
        console.error("Error in getReviews controller:", err);
        return res.status(500).json({ message: "Error loading reviews" });
    }
};
exports.getReviews = getReviews;
const getReviewById = async (req, res) => {
    try {
        const review = await Review_1.Review.getById(req.params.id);
        if (review) {
            return res.status(200).json(review);
        }
        else {
            return res.status(404).json({ message: "Review not found" });
        }
    }
    catch (err) {
        return res.status(500).json({ message: "Error loading review details" });
    }
};
exports.getReviewById = getReviewById;
const createReview = async (req, res) => {
    const { serviceProvider, propertyBuilding, billingPeriod, amount, invoiceNumber, invoiceDate, accountNumber, clerkComments } = req.body;
    if (!serviceProvider || !propertyBuilding || !amount) {
        return res.status(400).json({ message: "Missing required fields" });
    }
    try {
        const newReview = await Review_1.Review.create({
            serviceProvider,
            propertyBuilding,
            billingPeriod: billingPeriod || "May 2026",
            amount: Number(amount) || 0,
            status: 'Pending Verification',
            aiConfidence: 10,
            aiSuggestedAllocation: "Utilities - Bulk Supply (6-200-10-11-000 → 99%)",
            invoiceNumber: invoiceNumber || "9000123456",
            invoiceDate: invoiceDate || new Date().toISOString().split('T')[0],
            accountNumber: accountNumber || "1234567890",
            receivedDate: new Date().toISOString().split('T')[0],
            clerkComments: clerkComments || "Al extraction completed • Confidence 95%",
            documents: [
                { name: `Invoice - ${serviceProvider.split(' ')[0]}`, status: "Uploaded" },
                { name: "Sundry Payment Form", status: "Uploaded" },
                { name: "Calculation Sheet", status: "Uploaded" }
            ],
            calculations: [
                { id: 1, description: `${serviceProvider} consumption charges`, qty: "1", price: String(amount), amount: Number(amount) }
            ]
        });
        return res.status(201).json(newReview);
    }
    catch (err) {
        return res.status(500).json({ message: "Error creating review batch" });
    }
};
exports.createReview = createReview;
const updateReview = async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    try {
        const updated = await Review_1.Review.update(id, updates);
        if (updated) {
            return res.status(200).json(updated);
        }
        else {
            return res.status(404).json({ message: "Review not found" });
        }
    }
    catch (err) {
        return res.status(500).json({ message: "Error updating review details" });
    }
};
exports.updateReview = updateReview;
const uploadFile = async (req, res) => {
    const { id } = req.params;
    const { fileName } = req.body;
    try {
        const review = await Review_1.Review.getById(id);
        if (!review) {
            return res.status(404).json({ message: "Review not found" });
        }
        const newDoc = {
            name: fileName || "uploaded_doc.pdf",
            status: 'Uploaded'
        };
        const updatedDocs = [...review.documents, newDoc];
        const updated = await Review_1.Review.update(id, { documents: updatedDocs });
        return res.status(200).json(updated);
    }
    catch (err) {
        return res.status(500).json({ message: "Error uploading mock supporting document" });
    }
};
exports.uploadFile = uploadFile;
const uploadInvoice = async (req, res) => {
    const { fileName, fileType, fileBase64 } = req.body;
    if (!fileName || !fileType || !fileBase64) {
        return res.status(400).json({ message: "Missing required file upload fields" });
    }
    try {
        // Resolve supervisor province vault scope
        const authHeader = req.headers.authorization;
        let username = 'supervisor';
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            if (token.startsWith('mock-jwt-token-')) {
                username = token.substring('mock-jwt-token-'.length);
            }
        }
        const user = await db.getUserByUsername(username);
        const province = user?.province || 'Gauteng';
        // Run AI extraction early to verify province alignment and invoice validity
        const extracted = await (0, azureAiService_1.extractInvoiceData)(fileName, fileType, fileBase64);
        const isValid = extracted.isValidInvoice !== false && String(extracted.isValidInvoice).toLowerCase() !== 'false';
        if (!isValid) {
            return res.status(400).json({
                message: extracted.validationError || "Please upload a correct invoice. The system detected that the uploaded document is not a valid invoice."
            });
        }
        const isSupervisor = user?.assignedRole === 'supervisor';
        const invoiceProvince = extracted.province || 'Gauteng';
        if (isSupervisor && invoiceProvince.toLowerCase() !== province.toLowerCase()) {
            return res.status(400).json({
                message: `AI verification failed: You are assigned to ${province} province, but this invoice belongs to ${invoiceProvince}.`
            });
        }
        // Generate Tracking number: INV-(first 4 letters of province)-(random number)
        const cleanProvince = province.replace(/[^a-zA-Z]/g, '').slice(0, 4).toUpperCase();
        const randomNum = Math.floor(100000 + Math.random() * 900000);
        const trackingNumber = `INV-${cleanProvince}-${randomNum}`;
        // Decode base64 file data
        const base64Data = fileBase64.includes('base64,')
            ? fileBase64.split('base64,')[1]
            : fileBase64;
        const fileBuffer = Buffer.from(base64Data, 'base64');
        // Save locally first for tracking if needed
        const uploadsDir = process.env.HOME
            ? path_1.default.join(process.env.HOME, 'uploads')
            : path_1.default.join(__dirname, '../../uploads');
        if (!fs_1.default.existsSync(uploadsDir)) {
            fs_1.default.mkdirSync(uploadsDir, { recursive: true });
        }
        const uniqueFileName = `${Date.now()}_${fileName.replace(/\s+/g, '_')}`;
        const filePath = path_1.default.join(uploadsDir, uniqueFileName);
        fs_1.default.writeFileSync(filePath, fileBuffer);
        // Upload directly and exclusively to Vault on Azure Blob Storage
        const documentUrl = await (0, azureBlobService_1.uploadVaultFile)(province, trackingNumber, fileName, fileBuffer, fileType);
        // Create a matching Vault Folder in database
        await db.createVaultFolder({
            incidentNumber: trackingNumber,
            province: province,
            description: `Auto-generated vault folder for incident ${trackingNumber}`,
            createdBy: username
        });
        // Create the Review case in DB using the generated tracking ID
        const newReview = await Review_1.Review.create({
            id: trackingNumber,
            serviceProvider: extracted.serviceProvider,
            propertyBuilding: extracted.propertyBuilding,
            billingPeriod: extracted.billingPeriod,
            amount: extracted.amount,
            status: 'Pending Verification',
            aiConfidence: 10,
            aiSuggestedAllocation: `${extracted.serviceProvider.split(' ')[0]} - Operations (6-200-10-11-000 → 98%)`,
            invoiceNumber: extracted.invoiceNumber,
            invoiceDate: extracted.invoiceDate,
            accountNumber: extracted.accountDetails.includes('Acc:')
                ? extracted.accountDetails.split('Acc:')[1].trim().split(' ')[0]
                : (extracted.accountDetails.length > 50 ? extracted.accountDetails.slice(0, 47) + '...' : extracted.accountDetails),
            receivedDate: extracted.receivedDate,
            clerkComments: `AI Generative Extraction completed from file '${fileName}'`,
            supervisorComments: `Generative AI Analysis:\n- Description: ${extracted.description}\n- Bank account details: ${extracted.accountDetails}`,
            documents: [
                { name: fileName, status: "Uploaded", url: documentUrl },
                { name: "Sundry Payment Form", status: "Uploaded" },
                { name: "Calculation Sheet", status: "Uploaded" }
            ],
            calculations: [
                { id: 1, description: extracted.description, qty: "1", price: String(extracted.amount), amount: extracted.amount }
            ],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
        return res.status(201).json({
            success: true,
            review: newReview
        });
    }
    catch (err) {
        console.error("Failed in uploadInvoice controller:", err);
        return res.status(500).json({ message: "Error parsing and uploading invoice details" });
    }
};
exports.uploadInvoice = uploadInvoice;
