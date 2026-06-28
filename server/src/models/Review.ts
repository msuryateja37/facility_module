import * as db from '../data/dbConnector';

export class Review {
  static async getAll(): Promise<any[]> {
    return db.getReviews();
  }

  static async getById(id: string): Promise<any | null> {
    return db.getReviewById(id);
  }

  static async create(reviewData: any): Promise<any> {
    return db.createReview(reviewData);
  }

  static async update(id: string, updates: any): Promise<any | null> {
    return db.updateReview(id, updates);
  }
}
