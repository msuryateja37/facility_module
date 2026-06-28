import * as db from '../data/dbConnector';
import { UserAccount } from '../data/mockDb';

export class User {
  static async getByUsername(username: string): Promise<UserAccount | null> {
    return db.getUserByUsername(username);
  }

  static async update(username: string, updates: Partial<UserAccount>): Promise<UserAccount | null> {
    return db.updateUser(username, updates);
  }
}
