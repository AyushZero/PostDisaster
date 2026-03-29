'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { createClient } from '@/lib/supabase-client';
import { useAuth, useRealtimeSubscription } from '@/hooks';
import { useAppStore } from '@/store';
import { Card, CardContent, CardHeader, CardTitle, SeverityBadge, Button } from '@/components/ui';
import { Disaster, Alert } from '@/types';

const DisasterMap = dynamic(
  () => import('@/components/map/DisasterMap').then((mod) => mod.DisasterMap),
  { ssr: false, loading: () => <div className="h-[400px] bg-slate-100 rounded-lg flex items-center justify-center">Loading map...</div> }
);

export default function UserDashboard() {
  const { user } = useAuth();
  const { disasters, alerts, setDisasters, setAlerts } = useAppStore();
  const [isLoading, setIsLoading] = useState(true);

  useRealtimeSubscription();

  useEffect(() => {
    const fetchData = useCallback(async () => {
      setIsLoading(true);
      const supabase = createClient();

      // Fetch active disasters
      const { data: disasterData } = await supabase
        .from('disasters')
        .select('*')
        .eq('status', 'active')
        .order('severity', { ascending: false });

      if (disasterData) {
        setDisasters(disasterData);
      }

      // Fetch active alerts
      const { data: alertData } = await supabase
        .from('alerts')
        .select('*')
        .eq('is_active', true)
        .order('severity', { ascending: false });

      if (alertData) {
        setAlerts(alertData);
      }

      setIsLoading(false);
    }, [setDisasters, setAlerts]);

    fetchData();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-600 mt-1">Active disasters and alerts in your area</p>
      </div>

      {isLoading ? (
        <div className="text-center py-8">Loading dashboard...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Disaster Map</CardTitle>
              </CardHeader>
              <CardContent>
                <DisasterMap />
              </CardContent>
            </Card>
          </div>

          {/* Sidebar Stats */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Active Disasters</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900">{disasters.length}</div>
                <p className="text-slate-600 text-sm mt-2">Ongoing disaster events</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Active Alerts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900">{alerts.length}</div>
                <p className="text-slate-600 text-sm mt-2">Current warnings and alerts</p>
              </CardContent>
            </Card>

            <Link href="/user/dashboard/contacts">
              <Button className="w-full">Emergency Contacts</Button>
            </Link>
          </div>
        </div>
      )}

      {/* Active Disasters */}
      {disasters.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Active Disasters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {disasters.slice(0, 5).map((disaster: Disaster) => (
                <div key={disaster.id} className="border-b pb-4 last:border-b-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900">{disaster.title}</h3>
                      <p className="text-sm text-slate-600 mt-1">{disaster.description}</p>
                      <p className="text-sm text-slate-500 mt-2">
                        {disaster.type.charAt(0).toUpperCase() + disaster.type.slice(1)} • {disaster.affected_states.join(', ')}
                      </p>
                    </div>
                    <SeverityBadge severity={disaster.severity} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Alerts */}
      {alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Active Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {alerts.slice(0, 5).map((alert: Alert) => (
                <div key={alert.id} className="border-b pb-4 last:border-b-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900">{alert.title}</h3>
                      <p className="text-sm text-slate-600 mt-1">{alert.message}</p>
                      <p className="text-sm text-slate-500 mt-2">{alert.affected_states.join(', ')}</p>
                    </div>
                    <SeverityBadge severity={alert.severity} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
