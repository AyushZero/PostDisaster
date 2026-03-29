'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-client';
import { useAuth } from '@/hooks';
import { Card, CardContent, CardHeader, CardTitle, Button, SeverityBadge, StatusBadge } from '@/components/ui';
import { Disaster } from '@/types';

export default function DisastersPage() {
  const { user } = useAuth();
  const [disasters, setDisasters] = useState<Disaster[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDisasters = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('disasters')
        .select('*')
        .order('created_at', { ascending: false });

      if (data) {
        setDisasters(data);
      }
      setIsLoading(false);
    };

    fetchDisasters();
  }, []);

  const handleStatusChange = async (id: string, status: 'active' | 'resolved') => {
    const supabase = createClient();
    const { error } = await supabase
      .from('disasters')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (!error) {
      setDisasters((prev) =>
        prev.map((d) => (d.id === id ? { ...d, status } : d))
      );
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this disaster?')) return;

    const supabase = createClient();
    const { error } = await supabase.from('disasters').delete().eq('id', id);

    if (!error) {
      setDisasters((prev) => prev.filter((d) => d.id !== id));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Disasters</h1>
          <p className="text-slate-600">Manage disaster events</p>
        </div>
        <Link href="/admin/disasters/new">
          <Button>Add Disaster</Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-slate-500">Loading...</p>
        </div>
      ) : disasters.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-slate-500 mb-4">No disasters reported yet</p>
            <Link href="/admin/disasters/new">
              <Button>Add Your First Disaster</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {disasters.map((disaster) => (
            <Card key={disaster.id}>
              <CardContent className="py-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-slate-900">{disaster.title}</h3>
                      <SeverityBadge severity={disaster.severity} />
                      <StatusBadge status={disaster.status} />
                    </div>
                    <p className="text-sm text-slate-600 mb-2">{disaster.description}</p>
                    <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                      <span className="capitalize">Type: {disaster.type}</span>
                      <span>States: {disaster.affected_states.join(', ')}</span>
                      <span>
                        Started: {new Date(disaster.start_date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link href={`/admin/disasters/${disaster.id}`}>
                      <Button variant="outline" size="sm">Edit</Button>
                    </Link>
                    <Link href={`/admin/infrastructure/new?disaster=${disaster.id}`}>
                      <Button variant="outline" size="sm">Add Infrastructure</Button>
                    </Link>
                    {disaster.status === 'active' ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleStatusChange(disaster.id, 'resolved')}
                      >
                        Mark Resolved
                      </Button>
                    ) : (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleStatusChange(disaster.id, 'active')}
                      >
                        Reactivate
                      </Button>
                    )}
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDelete(disaster.id)}
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
