import * as db from '../data/dbConnector';

export class SystemLog {
  static async getAll(): Promise<any[]> {
    return db.getSystemLogs();
  }

  static async log(action: string, user: string, details: string): Promise<any> {
    return db.addSystemLog(action, user, details);
  }
}
