export interface PropertyOwner {
  id: number;
  fullName: string;
  email: string;
  phoneNumber: string;
}

export interface Property {
  id: number;
  name: string;
  type: string | null;
  address: string | null;
  region: string | null;
  district: string | null;
  zipcode: string | null;
  numberOfRooms: number;
  description: string | null;
  imageUrl: string | null;
  price: number;
  currency: string;
  createdAt: string;
  ownerId: number;
  owner: PropertyOwner | null;
}
