export interface Property {
  id: number;
  name: string;
  address: string;
  type: string;
  bedrooms: number;
  bathrooms: number;
  area: string;
  rentAmount: number;
  currency: string;
  images: string[];
  amenities: string[];
  status: string;
  landlord: string;
  description?: string;
  region?: string;
  district?: string;
}
