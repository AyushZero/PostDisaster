export type UserRole = 'admin' | 'user';

export type DisasterType = 'earthquake' | 'flood';

export type DisasterStatus = 'active' | 'resolved';

export type SeverityLevel = 'low' | 'medium' | 'high' | 'critical';

export type InfrastructureType = 
  | 'closed_road' 
  | 'evacuation_zone' 
  | 'supply_center' 
  | 'help_center' 
  | 'shelter' 
  | 'hospital' 
  | 'ngo';

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

export type EmergencyContactType = 
  | 'ambulance' 
  | 'police' 
  | 'fire' 
  | 'disaster_helpline' 
  | 'emergency';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  assigned_state: string | null;
  full_name: string | null;
  created_at: string;
}

export interface Disaster {
  id: string;
  type: DisasterType;
  title: string;
  description: string;
  severity: SeverityLevel;
  affected_states: string[];
  start_date: string;
  end_date: string | null;
  status: DisasterStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface AffectedArea {
  id: string;
  disaster_id: string;
  name: string;
  coordinates: GeoJSON.Polygon | GeoJSON.MultiPolygon;
  severity_level: SeverityLevel;
  description: string | null;
  created_at: string;
}

export interface InfrastructurePoint {
  id: string;
  disaster_id: string;
  type: InfrastructureType;
  name: string;
  latitude: number;
  longitude: number;
  address: string | null;
  contact_info: string | null;
  status: 'active' | 'inactive';
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Alert {
  id: string;
  disaster_id: string;
  title: string;
  message: string;
  severity: AlertSeverity;
  affected_states: string[];
  issued_by: string;
  issued_at: string;
  expires_at: string | null;
  is_active: boolean;
}

export interface EmergencyContact {
  id: string;
  type: EmergencyContactType;
  name: string;
  number: string;
  region: string | null;
  description: string | null;
  is_national: boolean;
}

export interface CSVDisasterRow {
  area_name: string;
  severity: string;
  description?: string;
  latitude?: string;
  longitude?: string;
}

export const INDIAN_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry',
] as const;

export type IndianState = typeof INDIAN_STATES[number];
