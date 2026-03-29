import { create } from 'zustand';
import { User, Disaster, Alert, InfrastructurePoint, EmergencyContact, AffectedArea } from '@/types';

interface AppState {
  // User state
  user: User | null;
  setUser: (user: User | null) => void;

  // Disasters state
  disasters: Disaster[];
  setDisasters: (disasters: Disaster[]) => void;
  addDisaster: (disaster: Disaster) => void;
  updateDisaster: (disaster: Disaster) => void;
  removeDisaster: (id: string) => void;

  // Alerts state
  alerts: Alert[];
  setAlerts: (alerts: Alert[]) => void;
  addAlert: (alert: Alert) => void;
  removeAlert: (id: string) => void;

  // Infrastructure state
  infrastructurePoints: InfrastructurePoint[];
  setInfrastructurePoints: (points: InfrastructurePoint[]) => void;
  addInfrastructurePoint: (point: InfrastructurePoint) => void;
  updateInfrastructurePoint: (point: InfrastructurePoint) => void;
  removeInfrastructurePoint: (id: string) => void;

  // Affected areas state
  affectedAreas: AffectedArea[];
  setAffectedAreas: (areas: AffectedArea[]) => void;
  addAffectedArea: (area: AffectedArea) => void;

  // Emergency contacts state
  emergencyContacts: EmergencyContact[];
  setEmergencyContacts: (contacts: EmergencyContact[]) => void;

  // User location state
  userLocation: { lat: number; lng: number; displayName: string } | null;
  setUserLocation: (location: { lat: number; lng: number; displayName: string } | null) => void;

  // Selected state filter (for users)
  selectedState: string | null;
  setSelectedState: (state: string | null) => void;

  // Loading states
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;

  // Real-time connection status
  isConnected: boolean;
  setIsConnected: (connected: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  // User
  user: null,
  setUser: (user) => set({ user }),

  // Disasters
  disasters: [],
  setDisasters: (disasters) => set({ disasters }),
  addDisaster: (disaster) =>
    set((state) => ({ disasters: [...state.disasters, disaster] })),
  updateDisaster: (disaster) =>
    set((state) => ({
      disasters: state.disasters.map((d) => (d.id === disaster.id ? disaster : d)),
    })),
  removeDisaster: (id) =>
    set((state) => ({
      disasters: state.disasters.filter((d) => d.id !== id),
    })),

  // Alerts
  alerts: [],
  setAlerts: (alerts) => set({ alerts }),
  addAlert: (alert) =>
    set((state) => ({ alerts: [alert, ...state.alerts] })),
  removeAlert: (id) =>
    set((state) => ({
      alerts: state.alerts.filter((a) => a.id !== id),
    })),

  // Infrastructure
  infrastructurePoints: [],
  setInfrastructurePoints: (points) => set({ infrastructurePoints: points }),
  addInfrastructurePoint: (point) =>
    set((state) => ({
      infrastructurePoints: [...state.infrastructurePoints, point],
    })),
  updateInfrastructurePoint: (point) =>
    set((state) => ({
      infrastructurePoints: state.infrastructurePoints.map((p) =>
        p.id === point.id ? point : p
      ),
    })),
  removeInfrastructurePoint: (id) =>
    set((state) => ({
      infrastructurePoints: state.infrastructurePoints.filter((p) => p.id !== id),
    })),

  // Affected areas
  affectedAreas: [],
  setAffectedAreas: (areas) => set({ affectedAreas: areas }),
  addAffectedArea: (area) =>
    set((state) => ({ affectedAreas: [...state.affectedAreas, area] })),

  // Emergency contacts
  emergencyContacts: [],
  setEmergencyContacts: (contacts) => set({ emergencyContacts: contacts }),

  // User location
  userLocation: null,
  setUserLocation: (location) => set({ userLocation: location }),

  // Selected state
  selectedState: null,
  setSelectedState: (state) => set({ selectedState: state }),

  // Loading
  isLoading: false,
  setIsLoading: (loading) => set({ isLoading: loading }),

  // Connection
  isConnected: true,
  setIsConnected: (connected) => set({ isConnected: connected }),
}));
