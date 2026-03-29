'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { createClient } from '@/lib/supabase-client';
import { useRealtimeSubscription } from '@/hooks';
import { useAppStore } from '@/store';
import { LocationSearch } from '@/components/map/LocationSearch';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Select,
  SeverityBadge,
  LoadingSpinner,
} from '@/components/ui';
import { Disaster, InfrastructurePoint, INDIAN_STATES } from '@/types';

const DisasterMap = dynamic(
  () => import('@/components/map/DisasterMap').then((mod) => mod.DisasterMap),
  { ssr: false, loading: () => <div className="h-[400px] bg-slate-100 rounded-lg flex items-center justify-center"><LoadingSpinner /></div> }
);

export default function PublicDashboard() {
  const {
    disasters,
    alerts,
    infrastructurePoints,
    affectedAreas,
    userLocation,
    selectedState,
    setDisasters,
    setAlerts,
    setInfrastructurePoints,
    setAffectedAreas,
    setUserLocation,
    setSelectedState,
    isConnected,
  } = useAppStore();

  const [isLoading, setIsLoading] = useState(true);
  const [mapCenter, setMapCenter] = useState<[number, number]>([20.5937, 78.9629]);

  useRealtimeSubscription();

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    const supabase = createClient();

    let disasterQuery = supabase
      .from('disasters')
      .select('*')
      .eq('status', 'active')
      .order('severity', { ascending: false });

    if (selectedState) {
      disasterQuery = disasterQuery.contains('affected_states', [selectedState]);
    }

    const { data: disasterData } = await disasterQuery;
    if (disasterData) {
      setDisasters(disasterData);

      if (disasterData.length > 0) {
        const disasterIds = disasterData.map((d: Disaster) => d.id);
        const { data: areaData } = await supabase
          .from('affected_areas')
          .select('*')
          .in('disaster_id', disasterIds);

        if (areaData) {
          setAffectedAreas(areaData);
        }

        const { data: infraData } = await supabase
          .from('infrastructure_points')
          .select('*')
          .in('disaster_id', disasterIds)
          .eq('status', 'active');

        if (infraData) {
          setInfrastructurePoints(infraData);
        }
      }
    }

    let alertQuery = supabase
      .from('alerts')
      .select('*')
      .eq('is_active', true)
      .order('severity', { ascending: false });

    if (selectedState) {
      alertQuery = alertQuery.contains('affected_states', [selectedState]);
    }

    const { data: alertData } = await alertQuery;
    if (alertData) {
      setAlerts(alertData);
    }

    setIsLoading(false);
  }, [
    selectedState,
    setDisasters,
    setAffectedAreas,
    setInfrastructurePoints,
    setAlerts,
  ]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchData();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [fetchData]);

  const handleLocationSelect = (lat: number, lng: number, displayName: string) => {
    setUserLocation({ lat, lng, displayName });
    setMapCenter([lat, lng]);

    for (const state of INDIAN_STATES) {
      if (displayName.includes(state)) {
        setSelectedState(state);
        break;
      }
    }
  };

  const handleStateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const state = e.target.value;
    setSelectedState(state || null);
  };

  const stateOptions = INDIAN_STATES.map((state) => ({
    value: state,
    label: state,
  }));

  const infrastructureByType = infrastructurePoints.reduce((acc, point) => {
    acc[point.type] = acc[point.type] || [];
    acc[point.type].push(point);
    return acc;
  }, {} as Record<string, InfrastructurePoint[]>);

  const typeLabels: Record<string, string> = {
    closed_road: 'Closed Roads',
    evacuation_zone: 'Evacuation Zones',
    supply_center: 'Supply Centers',
    help_center: 'Help Centers',
    shelter: 'Shelters',
    hospital: 'Hospitals',
    ngo: 'NGOs',
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-bold text-slate-900">Post Disaster Alert System</h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <span
                className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}
              />
              <span className={isConnected ? 'text-green-700' : 'text-red-700'}>
                {isConnected ? 'Live' : 'Offline'}
              </span>
            </div>
            <Link
              href="/admin/login"
              className="text-sm text-slate-600 hover:text-slate-900"
            >
              Admin
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Location Search */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <LocationSearch
            onLocationSelect={handleLocationSelect}
            placeholder="Search your location..."
          />
          <Select
            placeholder="Or select a state"
            options={stateOptions}
            value={selectedState || ''}
            onChange={handleStateChange}
          />
        </div>

        {userLocation && (
          <p className="text-sm text-slate-600">
            Showing results for: {userLocation.displayName}
          </p>
        )}

        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-4 rounded-lg border-l-4 ${
                  alert.severity === 'critical'
                    ? 'bg-red-50 border-red-500'
                    : alert.severity === 'high'
                    ? 'bg-orange-50 border-orange-500'
                    : alert.severity === 'medium'
                    ? 'bg-amber-50 border-amber-500'
                    : 'bg-blue-50 border-blue-500'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-slate-900">{alert.title}</h3>
                      <SeverityBadge severity={alert.severity} />
                    </div>
                    <p className="text-slate-700">{alert.message}</p>
                    <p className="text-xs text-slate-500 mt-2">
                      {new Date(alert.issued_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <>
            {/* Map */}
            <Card>
              <CardContent className="p-0">
                <div className="h-[400px]">
                  <DisasterMap
                    center={mapCenter}
                    zoom={selectedState ? 7 : 5}
                    infrastructurePoints={infrastructurePoints}
                    affectedAreas={affectedAreas}
                    userLocation={userLocation ? [userLocation.lat, userLocation.lng] : undefined}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Disasters */}
              <Card>
                <CardHeader>
                  <CardTitle>Active Disasters ({disasters.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {disasters.length === 0 ? (
                    <p className="text-slate-500 text-center py-4">No active disasters</p>
                  ) : (
                    <div className="space-y-3">
                      {disasters.map((disaster) => (
                        <div key={disaster.id} className="p-3 bg-slate-50 rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-slate-900">{disaster.title}</span>
                            <SeverityBadge severity={disaster.severity} />
                          </div>
                          <p className="text-sm text-slate-600">{disaster.description}</p>
                          <p className="text-xs text-slate-500 mt-1 capitalize">{disaster.type}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Resources */}
              <Card>
                <CardHeader>
                  <CardTitle>Resources</CardTitle>
                </CardHeader>
                <CardContent>
                  {infrastructurePoints.length === 0 ? (
                    <p className="text-slate-500 text-center py-4">No resources marked</p>
                  ) : (
                    <div className="space-y-3">
                      {Object.entries(infrastructureByType).slice(0, 4).map(([type, points]) => (
                        <div key={type}>
                          <h4 className="font-medium text-slate-900 text-sm mb-1">
                            {typeLabels[type]} ({points.length})
                          </h4>
                          {points.slice(0, 2).map((point) => (
                            <div key={point.id} className="text-sm text-slate-600 ml-2">
                              {point.name}
                              {point.contact_info && <span className="text-slate-500"> - {point.contact_info}</span>}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Emergency Contacts */}
              <Card>
                <CardHeader>
                  <CardTitle>Emergency Numbers</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between p-2 bg-red-50 rounded">
                      <span className="font-medium text-black">National Emergency</span>
                      <a href="tel:112" className="text-red-600 font-bold">112</a>
                    </div>
                    <div className="flex justify-between p-2 bg-slate-50 rounded">
                      <span className="text-black">Ambulance</span>
                      <a href="tel:108" className="text-slate-900 font-medium">108</a>
                    </div>
                    <div className="flex justify-between p-2 bg-slate-50 rounded">
                      <span className="text-black">Police</span>
                      <a href="tel:100" className="text-slate-900 font-medium">100</a>
                    </div>
                    <div className="flex justify-between p-2 bg-slate-50 rounded">
                      <span className="text-black">Fire</span>
                      <a href="tel:101" className="text-slate-900 font-medium">101</a>
                    </div>
                    <div className="flex justify-between p-2 bg-slate-50 rounded">
                      <span className="text-black">Disaster Management</span>
                      <a href="tel:1078" className="text-slate-900 font-medium">1078</a>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Map Legend */}
            <div className="flex flex-wrap gap-4 text-sm text-slate-600">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span>Closed Road</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-orange-500" />
                <span>Evacuation</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span>Supplies</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span>Help Center</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-violet-500" />
                <span>Shelter</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-pink-500" />
                <span>Hospital</span>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
