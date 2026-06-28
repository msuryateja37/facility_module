"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSystemLogs = void 0;
const SystemLog_1 = require("../models/SystemLog");
const getSystemLogs = async (req, res) => {
    try {
        const logs = await SystemLog_1.SystemLog.getAll();
        return res.status(200).json(logs);
    }
    catch (err) {
        return res.status(500).json({ message: "Error loading system logs" });
    }
};
exports.getSystemLogs = getSystemLogs;
