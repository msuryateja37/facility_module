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
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const morgan_1 = __importDefault(require("morgan"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const db = __importStar(require("./data/dbConnector"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const reviewRoutes_1 = __importDefault(require("./routes/reviewRoutes"));
const archiveRoutes_1 = __importDefault(require("./routes/archiveRoutes"));
const logRoutes_1 = __importDefault(require("./routes/logRoutes"));
const aiRoutes_1 = __importDefault(require("./routes/aiRoutes"));
const vaultRoutes_1 = __importDefault(require("./routes/vaultRoutes"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5500;
// Ensure uploads folder exists in base server directory
const uploadsDir = process.env.HOME
    ? path_1.default.join(process.env.HOME, 'uploads')
    : path_1.default.join(__dirname, '../uploads');
if (!fs_1.default.existsSync(uploadsDir)) {
    fs_1.default.mkdirSync(uploadsDir, { recursive: true });
}
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use((0, morgan_1.default)('dev'));
// Serve uploaded files statically
app.use('/uploads', express_1.default.static(uploadsDir));
// Register MVC Routers
app.use('/api', authRoutes_1.default);
app.use('/api', reviewRoutes_1.default);
app.use('/api', archiveRoutes_1.default);
app.use('/api', logRoutes_1.default);
app.use('/api', aiRoutes_1.default);
app.use('/api', vaultRoutes_1.default);
// Serve health status
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: "healthy", timestamp: new Date() });
});
// ─── Production: serve compiled Vite frontend ───────────────────────────────
// In Azure deployment the Vite build is placed at dist-server/public/
// (see the packaging step in the CI/CD workflow).
const clientBuildDir = path_1.default.join(__dirname, 'public');
if (fs_1.default.existsSync(clientBuildDir)) {
    app.use(express_1.default.static(clientBuildDir));
    // SPA fallback — all non-API GET requests return index.html
    app.use((req, res, next) => {
        const isApi = req.path.startsWith('/api');
        const isUploads = req.path.startsWith('/uploads');
        const hasExtension = path_1.default.extname(req.path) !== '';
        if (req.method === 'GET' && !isApi && !isUploads && !hasExtension) {
            res.sendFile(path_1.default.join(clientBuildDir, 'index.html'));
        }
        else {
            next();
        }
    });
}
// Initialize database connection & start server
const startServer = async () => {
    await db.initDb();
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
};
startServer().catch(err => {
    console.error("Critical error starting Express backend server", err);
});
