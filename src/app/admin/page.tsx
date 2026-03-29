'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-client';
import { useAuth, useRealtimeSubscription } from '@/hooks';
import { useAppStore } from '@/store';
import { Card, CardContent, CardHeader, CardTitle, Button, SeverityBadge, StatusBadge } from '@/components/ui';
import { Disaster, Alert } from '@/types';

export default function AdminDashboard() {
  const { user } = useAuth();
  const { disasters, alerts, setDisasters, setAlerts, isConnected } = useAppStore();
  const [stats, setStats] = useState({
    activeDisasters: 0,
    totalAlerts: 0,
    infrastructurePoints: 0,
  });

  useRealtimeSubscription();

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();

      // Fetch disasters for admin's state
      const { data: disasterData } = await supabase
        .from('disasters')
        .select('*')
        .contains('affected_states', user?.assigned_state ? [user.assigned_state] : [])
        .order('created_at', { ascending: false });

      if (disasterData) {
        setDisasters(disasterData);
        setStats((prev) => ({
          ...prev,
          activeDisasters: disasterData.filter((d: Disaster) => d.status === 'active').length,
        }));
      }

      // Fetch alerts
      const { data: alertData } = await supabase
        .from('alerts')
        .select('*')
        .eq('is_active', true)
        .order('issued_at', { ascending: false });

      if (alertData) {
        setAlerts(alertData);
        setStats((prev) => ({ ...prev, totalAlerts: alertData.length }));
      }

      // Fetch infrastructure count
      const { count } = await supabase
        .from('infrastructure_points')
        .select('*', { count: 'exact', head: true });

      setStats((prev) => ({ ...prev, infrastructurePoints: count || 0 }));
    };

    if (user) {
      fetchData();
    }
  }, [user, setDisasters, setAlerts]);

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <div className="flex items-center gap-2 text-sm">
        <span
          className={`w-2 h-2 rounded-full ${
            isConnected ? 'bg-green-500' : 'bg-red-500'
          }`}
        />
        <span className={isConnected ? 'text-green-700' : 'text-red-700'}>
          {isConnected ? 'Real-time connected' : 'Disconnected'}
        </span>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Active Disasters</p>
                <p className="text-3xl font-bold text-slate-900">{stats.activeDisasters}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Active Alerts</p>
                <p className="text-3xl font-bold text-slate-900">{stats.totalAlerts}</p>
              </div>
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Infrastructure Points</p>
                <p className="text-3xl font-bold text-slate-900">{stats.infrastructurePoints}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Link href="/admin/disasters/new">
              <Button>Add New Disaster</Button>
            </Link>
            <Link href="/admin/alerts/new">
              <Button variant="secondary">Issue Alert</Button>
            </Link>
            <Link href="/admin/infrastructure/new">
              <Button variant="outline">Add Infrastructure</Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Recent Disasters */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Disasters</CardTitle>
          <Link href="/admin/disasters">
            <Button variant="ghost" size="sm">View All</Button>
          </Link>
        </CardHeader>
        <CardContent>
          {disasters.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No disasters reported yet</p>
          ) : (
            <div className="space-y-4">
              {disasters.slice(0, 5).map((disaster) => (
                <div
                  key={disaster.id}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-lg"
                >
                  <div>
                    <h4 className="font-medium text-slate-900">{disaster.title}</h4>
                    <p className="text-sm text-slate-600 capitalize">
                      {disaster.type} - {disaster.affected_states.join(', ')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <SeverityBadge severity={disaster.severity} />
                    <StatusBadge status={disaster.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Alerts */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Alerts</CardTitle>
          <Link href="/admin/alerts">
            <Button variant="ghost" size="sm">View All</Button>
          </Link>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No alerts issued yet</p>
          ) : (
            <div className="space-y-4">
              {alerts.slice(0, 5).map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-lg"
                >
                  <div>
                    <h4 className="font-medium text-slate-900">{alert.title}</h4>
                    <p className="text-sm text-slate-600">{alert.message.substring(0, 100)}...</p>
                  </div>
                  <SeverityBadge severity={alert.severity} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
