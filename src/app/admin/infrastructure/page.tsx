'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-client';
import { Card, CardContent, Button, Badge } from '@/components/ui';
import { InfrastructurePoint, Disaster } from '@/types';

const typeLabels: Record<string, string> = {
  closed_road: 'Closed Road',
  evacuation_zone: 'Evacuation Zone',
  supply_center: 'Supply Center',
  help_center: 'Help Center',
  shelter: 'Shelter',
  hospital: 'Hospital',
  ngo: 'NGO',
};

const typeColors: Record<string, 'danger' | 'warning' | 'success' | 'info' | 'default'> = {
  closed_road: 'danger',
  evacuation_zone: 'warning',
  supply_center: 'success',
  help_center: 'info',
  shelter: 'info',
  hospital: 'danger',
  ngo: 'success',
};

export default function InfrastructurePage() {
  const [points, setPoints] = useState<(InfrastructurePoint & { disaster?: Disaster })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    const fetchPoints = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('infrastructure_points')
        .select('*, disasters(*)')
        .order('created_at', { ascending: false });

      if (data) {
        setPoints(data.map((p: any) => ({ ...p, disaster: p.disasters })));
      }
      setIsLoading(false);
    };

    fetchPoints();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this point?')) return;

    const supabase = createClient();
    const { error } = await supabase.from('infrastructure_points').delete().eq('id', id);

    if (!error) {
      setPoints((prev) => prev.filter((p) => p.id !== id));
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    const supabase = createClient();
    const { error } = await supabase
      .from('infrastructure_points')
      .update({ status: newStatus })
      .eq('id', id);

    if (!error) {
      setPoints((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: newStatus as 'active' | 'inactive' } : p))
      );
    }
  };

  const filteredPoints = filterType === 'all' 
    ? points 
    : points.filter((p) => p.type === filterType);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Infrastructure Points</h1>
          <p className="text-slate-600">Manage shelters, hospitals, roads and more</p>
        </div>
        <Link href="/admin/infrastructure/new">
          <Button>Add Infrastructure</Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={filterType === 'all' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setFilterType('all')}
        >
          All
        </Button>
        {Object.entries(typeLabels).map(([type, label]) => (
          <Button
            key={type}
            variant={filterType === type ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setFilterType(type)}
          >
            {label}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-slate-500">Loading...</p>
        </div>
      ) : filteredPoints.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-slate-500 mb-4">No infrastructure points added yet</p>
            <Link href="/admin/infrastructure/new">
              <Button>Add Your First Point</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPoints.map((point) => (
            <Card key={point.id}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-slate-900">{point.name}</h3>
                  <Badge variant={typeColors[point.type]}>{typeLabels[point.type]}</Badge>
                </div>
                
                {point.address && (
                  <p className="text-sm text-slate-600 mb-2">{point.address}</p>
                )}
                
                {point.contact_info && (
                  <p className="text-sm text-slate-600 mb-2">Contact: {point.contact_info}</p>
                )}

                {point.disaster && (
                  <p className="text-xs text-slate-500 mb-2">
                    Disaster: {point.disaster.title}
                  </p>
                )}

                <div className="flex items-center justify-between mt-4">
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      point.status === 'active'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {point.status}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleStatus(point.id, point.status)}
                    >
                      {point.status === 'active' ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDelete(point.id)}
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
