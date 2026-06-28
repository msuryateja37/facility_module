import { Request, Response } from 'express';
import { Archive } from '../models/Archive';

export const getArchiveLogs = async (req: Request, res: Response) => {
  try {
    const logs = await Archive.getAll();
    return res.status(200).json(logs);
  } catch (err) {
    return res.status(500).json({ message: "Error loading archival logs" });
  }
};

export const createArchiveLog = async (req: Request, res: Response) => {
  const { reviewId, facilityName, boxNumber, shelfNumber } = req.body;
  if (!reviewId || !facilityName || !boxNumber || !shelfNumber) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    const newLog = await Archive.create({
      reviewId,
      facilityName,
      archivedBy: "IC_Officer_Admin",
      boxNumber,
      shelfNumber,
      status: "Archived Successfully"
    });

    return res.status(201).json(newLog);
  } catch (err) {
    return res.status(500).json({ message: "Error registering archival box" });
  }
};
