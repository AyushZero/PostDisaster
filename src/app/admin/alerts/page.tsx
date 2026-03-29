'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-client';
import { Card, CardContent, Button, SeverityBadge } from '@/components/ui';
import { Alert, Disaster } from '@/types';

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<(Alert & { disaster?: Disaster })[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAlerts = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('alerts')
        .select('*, disasters(*)')
        .order('issued_at', { ascending: false });

      if (data) {
        setAlerts(data.map((a) => ({ ...a, disaster: a.disasters })));
      }
      setIsLoading(false);
    };

    fetchAlerts();
  }, []);

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    const supabase = createClient();
    const { error } = await supabase
      .from('alerts')
      .update({ is_active: !currentStatus })
      .eq('id', id);

    if (!error) {
      setAlerts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, is_active: !currentStatus } : a))
      );
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this alert?')) return;

    const supabase = createClient();
    const { error } = await supabase.from('alerts').delete().eq('id', id);

    if (!error) {
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Alerts</h1>
          <p className="text-slate-600">Manage emergency alerts</p>
        </div>
        <Link href="/admin/alerts/new">
          <Button>Issue New Alert</Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-slate-500">Loading...</p>
        </div>
      ) : alerts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-slate-500 mb-4">No alerts issued yet</p>
            <Link href="/admin/alerts/new">
              <Button>Issue Your First Alert</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {alerts.map((alert) => (
            <Card key={alert.id}>
              <CardContent className="py-4">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-slate-900">{alert.title}</h3>
                      <SeverityBadge severity={alert.severity} />
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs ${
                          alert.is_active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {alert.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 mb-2">{alert.message}</p>
                    <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                      {alert.disaster && (
                        <span>Disaster: {alert.disaster.title}</span>
                      )}
                      <span>States: {alert.affected_states.join(', ')}</span>
                      <span>
                        Issued: {new Date(alert.issued_at).toLocaleString()}
                      </span>
                      {alert.expires_at && (
                        <span>
                          Expires: {new Date(alert.expires_at).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant={alert.is_active ? 'outline' : 'primary'}
                      size="sm"
                      onClick={() => handleToggleActive(alert.id, alert.is_active)}
                    >
                      {alert.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDelete(alert.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
