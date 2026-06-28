import { Request, Response } from 'express';
import { SystemLog } from '../models/SystemLog';

export const getSystemLogs = async (req: Request, res: Response) => {
  try {
    const logs = await SystemLog.getAll();
    return res.status(200).json(logs);
  } catch (err) {
    return res.status(500).json({ message: "Error loading system logs" });
  }
};
