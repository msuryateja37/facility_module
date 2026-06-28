import * as db from '../data/dbConnector';

export class Archive {
  static async getAll(): Promise<any[]> {
    return db.getArchiveLogs();
  }

  static async create(archiveData: any): Promise<any> {
    return db.createArchiveLog(archiveData);
  }
}
