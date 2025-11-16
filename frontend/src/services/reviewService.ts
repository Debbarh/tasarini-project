import { apiClient } from "@/integrations/api/client";

export interface Review {
  id: string;
  tourist_point: string;
  tourist_point_name?: string;
  reviewer: string;
  reviewer_detail?: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
  };
  rating: number;
  comment: string;
  created_at: string;
  updated_at: string;
}

export interface CreateReviewData {
  tourist_point: string;
  rating: number;
  comment: string;
}

export interface UpdateReviewData {
  rating?: number;
  comment?: string;
}

class ReviewService {
  private readonly endpoint = 'poi/reviews';

  /**
   * Get all reviews for a specific tourist point
   */
  async getReviewsForPOI(touristPointId: string): Promise<Review[]> {
    return apiClient.get<Review[]>(this.endpoint, {
      tourist_point_id: touristPointId,
    });
  }

  /**
   * Get a single review by ID
   */
  async getReview(reviewId: string): Promise<Review> {
    return apiClient.get<Review>(`${this.endpoint}/${reviewId}`);
  }

  /**
   * Create a new review
   */
  async createReview(data: CreateReviewData): Promise<Review> {
    return apiClient.post<Review>(this.endpoint, data);
  }

  /**
   * Update an existing review
   */
  async updateReview(reviewId: string, data: UpdateReviewData): Promise<Review> {
    return apiClient.patch<Review>(`${this.endpoint}/${reviewId}`, data);
  }

  /**
   * Delete a review
   */
  async deleteReview(reviewId: string): Promise<void> {
    return apiClient.delete<void>(`${this.endpoint}/${reviewId}`);
  }

  /**
   * Get reviews by the current user
   */
  async getMyReviews(): Promise<Review[]> {
    return apiClient.get<Review[]>(this.endpoint);
  }
}

export const reviewService = new ReviewService();
