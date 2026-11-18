export interface KostPhoto {
  id: string;
  photo_url: string;
  is_cover: boolean;
  caption?: string;
}

export interface KostFacilities {
  has_ac?: boolean;
  has_private_bath?: boolean;
  has_wifi?: boolean;
  is_24_hours?: boolean;
  motor_parking?: boolean;
  car_parking?: boolean;
  electricity_type?: string;
  has_bed?: boolean;
  has_wardrobe?: boolean;
  has_desk?: boolean;
  has_water_heater?: boolean;
  has_fan?: boolean;
  has_shared_kitchen?: boolean;
  has_drying_area?: boolean;
  extra_tags?: string[];
}

export interface KostListing {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  kost_type: "putra" | "putri" | "campur" | "pasutri";
  price_monthly: number;
  payment_periods: string[];
  available_rooms: number;
  address: string;
  district: string;
  region: string;
  lat: number;
  lng: number;
  whatsapp_number: string;
  is_featured: boolean;
  description: string;
  rating: number;
  reviews_count: number;
  photos: KostPhoto[];
  facilities: KostFacilities;
  created_at: string;
  _d?: number; // Calculated distance in meters
}

export interface Landmark {
  id: string;
  name: string;
  short: string;
  lat: number;
  lng: number;
}
