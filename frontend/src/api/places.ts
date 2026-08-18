import { apiClient } from "./client";

export type BusinessCategory =
  | "RESTAURANT"
  | "CAFE"
  | "GROCERY"
  | "GAS_STATION"
  | "RETAIL"
  | "HEALTHCARE"
  | "ENTERTAINMENT"
  | "LODGING"
  | "OTHER";

export const CATEGORY_LABELS: Record<BusinessCategory, string> = {
  RESTAURANT: "餐厅",
  CAFE: "咖啡厅",
  GROCERY: "超市",
  GAS_STATION: "加油站",
  RETAIL: "零售",
  HEALTHCARE: "医疗",
  ENTERTAINMENT: "娱乐",
  LODGING: "住宿",
  OTHER: "其他",
};

export interface BusinessSummary {
  id: string;
  name: string;
  category: BusinessCategory;
  description: string;
  address: string;
  lat: number;
  lon: number;
  ownerId: string;
  averageRating: number | null;
  reviewCount: number;
}

export interface Review {
  id: string;
  businessId: string;
  rating: number;
  comment: string;
  createdAt: string;
  updatedAt: string;
  user: { id: string; name: string };
}

export interface BusinessDetail extends BusinessSummary {
  owner: { id: string; name: string };
  reviews: Review[];
}

export interface Bounds {
  minLat: number;
  minLon: number;
  maxLat: number;
  maxLon: number;
}

export async function listBusinesses(
  bounds: Bounds,
  filters?: { category?: BusinessCategory; q?: string },
): Promise<BusinessSummary[]> {
  const { data } = await apiClient.get<{ businesses: BusinessSummary[] }>("/businesses", {
    params: { ...bounds, ...filters },
  });
  return data.businesses;
}

export async function getBusiness(id: string): Promise<BusinessDetail> {
  const { data } = await apiClient.get<{ business: BusinessDetail }>(`/businesses/${id}`);
  return data.business;
}

export interface BusinessInput {
  name: string;
  category: BusinessCategory;
  description: string;
  address: string;
}

export async function createBusiness(input: BusinessInput): Promise<BusinessSummary> {
  const { data } = await apiClient.post<{ business: BusinessSummary }>("/businesses", input);
  return data.business;
}

export async function updateBusiness(id: string, input: BusinessInput): Promise<BusinessSummary> {
  const { data } = await apiClient.put<{ business: BusinessSummary }>(`/businesses/${id}`, input);
  return data.business;
}

export async function deleteBusiness(id: string): Promise<void> {
  await apiClient.delete(`/businesses/${id}`);
}

export async function upsertReview(
  businessId: string,
  input: { rating: number; comment: string },
): Promise<Review> {
  const { data } = await apiClient.post<{ review: Review }>(`/businesses/${businessId}/reviews`, input);
  return data.review;
}

export async function deleteReview(businessId: string, reviewId: string): Promise<void> {
  await apiClient.delete(`/businesses/${businessId}/reviews/${reviewId}`);
}

export async function getBusinessSummary(businessId: string): Promise<string | null> {
  const { data } = await apiClient.get<{ summary: string | null }>(`/businesses/${businessId}/summary`);
  return data.summary;
}
