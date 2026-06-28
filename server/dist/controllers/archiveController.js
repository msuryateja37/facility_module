"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createArchiveLog = exports.getArchiveLogs = void 0;
const Archive_1 = require("../models/Archive");
const getArchiveLogs = async (req, res) => {
    try {
        const logs = await Archive_1.Archive.getAll();
        return res.status(200).json(logs);
    }
    catch (err) {
        return res.status(500).json({ message: "Error loading archival logs" });
    }
};
exports.getArchiveLogs = getArchiveLogs;
const createArchiveLog = async (req, res) => {
    const { reviewId, facilityName, boxNumber, shelfNumber } = req.body;
    if (!reviewId || !facilityName || !boxNumber || !shelfNumber) {
        return res.status(400).json({ message: "Missing required fields" });
    }
    try {
        const newLog = await Archive_1.Archive.create({
            reviewId,
            facilityName,
            archivedBy: "IC_Officer_Admin",
            boxNumber,
            shelfNumber,
            status: "Archived Successfully"
        });
        return res.status(201).json(newLog);
    }
    catch (err) {
        return res.status(500).json({ message: "Error registering archival box" });
    }
};
exports.createArchiveLog = createArchiveLog;
