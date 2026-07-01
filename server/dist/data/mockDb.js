"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
let DB_FILE = path_1.default.join(__dirname, 'db.json');
if (process.env.HOME) {
    DB_FILE = path_1.default.join(process.env.HOME, 'db.json');
}
const DEFAULT_DB = {
    reviews: [
        {
            id: "INV-2025-04812",
            serviceProvider: "City Power (Pty) Ltd",
            propertyBuilding: "Provincial Legislature Building",
            billingPeriod: "April 2026",
            amount: 248350.42,
            status: "Pending Verification",
            aiConfidence: 9,
            aiSuggestedAllocation: "Electricity - Bulk Supply (6-200-10-11-000 → 98%)",
            invoiceNumber: "9001234567",
            invoiceDate: "30/04/2026",
            accountNumber: "1234567890",
            receivedDate: "02/05/2026",
            daysRemaining: 22,
            clerkComments: "Al extraction completed • Confidence 94%",
            documents: [
                { name: "Invoice - City Power (Apr 2026)", status: "Uploaded" },
                { name: "Batch Report - Apr 2026", status: "Uploaded" },
                { name: "Sundry Payment Form", status: "Uploaded" },
                { name: "Calculation Sheet", status: "Uploaded" },
                { name: "Municipal Services Certificate", status: "Uploaded" },
                { name: "Exemption Memorandum (CFO)", status: "Uploaded" }
            ],
            calculations: [
                { id: 1, description: "Electricity consumption main building (kWh)", qty: "48200", price: "4.30", amount: 207260.00 },
                { id: 2, description: "Demand charges (KVA)", qty: "1", price: "31090.42", amount: 31090.42 },
                { id: 3, description: "Network capacity charge", qty: "1", price: "10000.00", amount: 10000.00 }
            ],
            createdAt: "2026-05-02T09:41:00Z",
            updatedAt: "2026-05-02T09:41:00Z"
        },
        {
            id: "INV-2025-04822",
            serviceProvider: "Konica Minolta",
            propertyBuilding: "Director General Offices",
            billingPeriod: "May 2026",
            amount: 28410.75,
            status: "Pending Verification",
            aiConfidence: 10,
            aiSuggestedAllocation: "Printing & Stationery (6-110-15-20-000 → 99%)",
            invoiceNumber: "9009876543",
            invoiceDate: "15/05/2026",
            accountNumber: "8899776655",
            receivedDate: "20/05/2026",
            daysRemaining: 28,
            clerkComments: "Monthly printer lease charges.",
            documents: [
                { name: "Invoice - Konica Minolta (May 2026)", status: "Uploaded" },
                { name: "Sundry Payment Form", status: "Uploaded" },
                { name: "Calculation Sheet", status: "Uploaded" }
            ],
            createdAt: "2026-05-20T11:22:00Z",
            updatedAt: "2026-05-20T11:22:00Z"
        },
        {
            id: "INV-2025-04809",
            serviceProvider: "Rand Water",
            propertyBuilding: "Municipal Annex - Block C",
            billingPeriod: "April 2026",
            amount: 87421.10,
            status: "Verified",
            aiConfidence: 8,
            aiSuggestedAllocation: "Water & Sanitation - Municipal (6-200-10-12-000 → 95%)",
            invoiceNumber: "RW-482294",
            invoiceDate: "28/04/2026",
            accountNumber: "998877665",
            receivedDate: "02/05/2026",
            daysRemaining: 22,
            clerkComments: "Water rates invoice checked against meter log.",
            supervisorComments: "Water meter verified. Rates compliant with municipal tariff structure.",
            documents: [
                { name: "Invoice - Rand Water (Apr 2026)", status: "Uploaded" },
                { name: "Sundry Payment Form", status: "Uploaded" },
                { name: "Calculation Sheet", status: "Uploaded" },
                { name: "Municipal Services Certificate", status: "Uploaded" }
            ],
            createdAt: "2026-05-02T10:15:00Z",
            updatedAt: "2026-05-05T14:30:00Z"
        },
        {
            id: "INV-2025-04787",
            serviceProvider: "Bidvest Facilities",
            propertyBuilding: "Director General Offices",
            billingPeriod: "March 2026",
            amount: 332010.00,
            status: "DD Approved",
            aiConfidence: 9,
            aiSuggestedAllocation: "Cleaning Services - Contracts (6-310-12-05-000 → 97%)",
            invoiceNumber: "BF-990823",
            invoiceDate: "31/03/2026",
            accountNumber: "2233445566",
            receivedDate: "05/04/2026",
            daysRemaining: 10,
            clerkComments: "Quarterly facility cleaning service invoice.",
            supervisorComments: "Service rendered checked. Cleaning logs are complete and approved.",
            ddComments: "Approved for director final release.",
            documents: [
                { name: "Invoice - Bidvest (Mar 2026)", status: "Uploaded" },
                { name: "Sundry Payment Form", status: "Uploaded" },
                { name: "Calculation Sheet", status: "Uploaded" }
            ],
            createdAt: "2026-04-05T09:00:00Z",
            updatedAt: "2026-04-10T11:00:00Z"
        },
        {
            id: "INV-2025-04798",
            serviceProvider: "Telkom SA SOC",
            propertyBuilding: "Provincial Legislature Building",
            billingPeriod: "April 2026",
            amount: 14882.55,
            status: "Returned",
            aiConfidence: 7,
            aiSuggestedAllocation: "Telecommunications - Voice (6-150-10-02-000 → 92%)",
            invoiceNumber: "TEL-8893742",
            invoiceDate: "30/04/2026",
            accountNumber: "5544332211",
            receivedDate: "02/05/2026",
            daysRemaining: 22,
            clerkComments: "Telephone billing for Legislature Block B.",
            documents: [
                { name: "Invoice - Telkom (Apr 2026)", status: "Uploaded" }
            ],
            createdAt: "2026-05-02T12:00:00Z",
            updatedAt: "2026-05-02T12:00:00Z"
        },
        {
            id: "INV-2025-04770",
            serviceProvider: "Eskom Holdings SOC Ltd",
            propertyBuilding: "Regional Depot",
            billingPeriod: "March 2026",
            amount: 1204988.30,
            status: "Paid",
            aiConfidence: 10,
            aiSuggestedAllocation: "Electricity - Bulk Supply (6-200-10-11-000 → 99%)",
            invoiceNumber: "ESK-900344",
            invoiceDate: "31/03/2026",
            accountNumber: "4455667788",
            receivedDate: "01/04/2026",
            daysRemaining: 0,
            clerkComments: "High-voltage consumption charge.",
            supervisorComments: "Verified meter data against invoice. Approved.",
            ddComments: "Approved.",
            directorComments: "Expenditure authorized under PFMA.",
            documents: [
                { name: "Invoice - Eskom (Mar 2026)", status: "Uploaded" },
                { name: "Sundry Payment Form", status: "Uploaded" },
                { name: "Calculation Sheet", status: "Uploaded" }
            ],
            paymentForm: {
                invoiceNumber: "ESK-900344",
                invoiceDate: "2026-03-31",
                invoiceAmount: 1204988.30,
                supplierName: "Eskom Holdings SOC Ltd",
                accountNumber: "4455667788",
                bankName: "Standard Bank",
                signatureName: "T. Mokoena",
                signatureDate: "2026-04-15"
            },
            createdAt: "2026-04-01T08:30:00Z",
            updatedAt: "2026-04-15T10:00:00Z"
        }
    ],
    archiveLogs: [
        {
            id: "ARC-001",
            reviewId: "INV-2025-04770",
            facilityName: "Eskom Holdings SOC Ltd (Regional Depot)",
            archivedBy: "IC_Officer",
            archivedDate: "2026-04-16T15:20:00Z",
            boxNumber: "BOX-2026-B02",
            shelfNumber: "SHELF-D-01",
            status: "Archived Successfully"
        }
    ],
    systemLogs: [
        {
            id: "LOG-001",
            timestamp: "2026-06-27T10:00:00Z",
            action: "User Login",
            user: "admin",
            details: "Thabo Mokoena (All Roles) authenticated."
        }
    ],
    users: [
        { username: "admin", password: "admin", firstName: "Sipho", lastName: "Khumalo", email: "sipho.khumalo@dlrrd.gov.za", phoneNumber: "+27 82 111 2222", officeLocation: "DLRRD Pretoria Head Office, 184 Jeff Masemola Street", designation: "Facilities Administrator", assignedRole: "admin", province: "Gauteng" },
        { username: "supervisor", password: "super123", firstName: "Thabo", lastName: "Mokoena", email: "thabo.mokoena@dlrrd.gov.za", phoneNumber: "+27 84 333 4444", officeLocation: "Compliance Operations Centre, Pretoria Main Building", designation: "Facilities Supervisor", assignedRole: "supervisor", province: "Gauteng" }
    ],
    vaultFolders: [
        { id: "FLD-1001", incidentNumber: "INC-2026-0001", province: "Gauteng", description: "Water pipe leakage at regional facility", createdAt: "2026-06-28T10:00:00Z", createdBy: "supervisor" },
        { id: "FLD-1002", incidentNumber: "INC-2026-0002", province: "Gauteng", description: "Electrical power failure in main chamber", createdAt: "2026-06-29T11:30:00Z", createdBy: "supervisor" },
        { id: "FLD-1003", incidentNumber: "INC-2026-0003", province: "Western Cape", description: "HVAC maintenance requirements", createdAt: "2026-06-30T09:00:00Z", createdBy: "admin" }
    ]
};
class MockDb {
    constructor() {
        this.data = DEFAULT_DB;
        this.load();
    }
    load() {
        try {
            if (fs_1.default.existsSync(DB_FILE)) {
                const fileContent = fs_1.default.readFileSync(DB_FILE, 'utf-8');
                this.data = JSON.parse(fileContent);
                if (!this.data.users || this.data.users.length !== 2 || !this.data.users[0].officeLocation) {
                    this.data.users = DEFAULT_DB.users;
                    this.save();
                }
                if (!this.data.vaultFolders) {
                    this.data.vaultFolders = DEFAULT_DB.vaultFolders;
                    this.save();
                }
            }
            else {
                this.save();
            }
        }
        catch (e) {
            console.error("Failed to load mock DB, using default.", e);
            this.data = DEFAULT_DB;
        }
    }
    save() {
        try {
            fs_1.default.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
        }
        catch (e) {
            console.error("Failed to save mock DB.", e);
        }
    }
    // Reviews
    getReviews() {
        return [...this.data.reviews].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    getReviewById(id) {
        return this.data.reviews.find(r => r.id === id);
    }
    createReview(review) {
        const randomSuffix = Math.floor(100000 + Math.random() * 900000);
        const id = review.id || `INV-2025-${randomSuffix}`;
        const newReview = {
            ...review,
            id,
            daysRemaining: 30,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        this.data.reviews.push(newReview);
        this.save();
        this.addSystemLog("Create Case", "admin", `Created new invoice case for ${review.serviceProvider} - ${review.propertyBuilding} (${id})`);
        return newReview;
    }
    updateReview(id, updates) {
        const idx = this.data.reviews.findIndex(r => r.id === id);
        if (idx !== -1) {
            this.data.reviews[idx] = {
                ...this.data.reviews[idx],
                ...updates,
                updatedAt: new Date().toISOString()
            };
            this.save();
            this.addSystemLog("Update Case", "admin", `Updated status/details for ${id} to ${updates.status || this.data.reviews[idx].status}`);
            return this.data.reviews[idx];
        }
        return null;
    }
    // Archival logs
    getArchiveLogs() {
        return this.data.archiveLogs;
    }
    createArchiveLog(log) {
        const id = `ARC-0${this.data.archiveLogs.length + 1}`;
        const newLog = {
            ...log,
            id,
            archivedDate: new Date().toISOString()
        };
        this.data.archiveLogs.push(newLog);
        this.save();
        this.addSystemLog("Archive Case", "admin", `Archived case ${log.reviewId} in box ${log.boxNumber}`);
        return newLog;
    }
    // System logs
    getSystemLogs() {
        return this.data.systemLogs;
    }
    addSystemLog(action, user, details) {
        const id = `LOG-0${this.data.systemLogs.length + 1}`;
        const newLog = {
            id,
            timestamp: new Date().toISOString(),
            action,
            user,
            details
        };
        this.data.systemLogs.unshift(newLog); // Newest first
        this.save();
        return newLog;
    }
    // Users
    getUsers() {
        return this.data.users || [];
    }
    getUserByUsername(username) {
        return (this.data.users || []).find(u => u.username === username) || null;
    }
    updateUser(username, updates) {
        const idx = this.data.users.findIndex(u => u.username === username);
        if (idx !== -1) {
            this.data.users[idx] = {
                ...this.data.users[idx],
                ...updates
            };
            this.save();
            return this.data.users[idx];
        }
        return null;
    }
    getVaultFolders() {
        if (!this.data.vaultFolders) {
            this.data.vaultFolders = DEFAULT_DB.vaultFolders || [];
        }
        return [...this.data.vaultFolders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    createVaultFolder(folder) {
        const randomSuffix = Math.floor(100000 + Math.random() * 900000);
        const id = `FLD-${randomSuffix}`;
        const newFolder = {
            ...folder,
            id,
            createdAt: new Date().toISOString()
        };
        if (!this.data.vaultFolders) {
            this.data.vaultFolders = [];
        }
        this.data.vaultFolders.push(newFolder);
        this.save();
        return newFolder;
    }
    getPaginatedReviews(page, limit, search, status) {
        const reviews = this.getReviews();
        const filtered = reviews.filter(r => {
            const matchStatus = !status || status === 'All' || r.status === status;
            const matchSearch = !search ||
                r.id.toLowerCase().includes(search.toLowerCase()) ||
                r.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
                r.serviceProvider.toLowerCase().includes(search.toLowerCase()) ||
                r.billingPeriod.toLowerCase().includes(search.toLowerCase()) ||
                r.propertyBuilding.toLowerCase().includes(search.toLowerCase());
            return matchStatus && matchSearch;
        });
        const offset = (page - 1) * limit;
        const paginated = filtered.slice(offset, offset + limit);
        const totalPages = Math.ceil(filtered.length / limit);
        return {
            reviews: paginated,
            total: filtered.length,
            page,
            totalPages
        };
    }
}
exports.db = new MockDb();
