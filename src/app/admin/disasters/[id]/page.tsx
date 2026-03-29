'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import dynamic from 'next/dynamic';
import { createClient } from '@/lib/supabase-client';
import { useAuth } from '@/hooks';
import {
  Button,
  Input,
  Select,
  Textarea,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  LoadingSpinner,
} from '@/components/ui';
import { INDIAN_STATES, Disaster, AffectedArea, SeverityLevel } from '@/types';

const DrawingMap = dynamic(
  () => import('@/components/map/DrawingMap').then((mod) => mod.DrawingMap),
  { ssr: false, loading: () => <div className="h-[400px] bg-slate-100 rounded-lg flex items-center justify-center">Loading map...</div> }
);

const disasterSchema = z.object({
  title: z.string().min(3, 'Title is required'),
  type: z.enum(['earthquake', 'flood']),
  description: z.string().min(10, 'Description is required'),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  affected_states: z.array(z.string()).min(1, 'Select at least one state'),
  start_date: z.string().min(1, 'Start date is required'),
  status: z.enum(['active', 'resolved']),
});

type DisasterFormData = z.infer<typeof disasterSchema>;

interface DrawnArea {
  id?: string;
  coordinates: [number, number][];
  severity: SeverityLevel;
  name: string;
}

export default function EditDisasterPage() {
  const router = useRouter();
  const params = useParams();
  const disasterId = params.id as string;
  const { user } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingAreas, setExistingAreas] = useState<AffectedArea[]>([]);
  const [newAreas, setNewAreas] = useState<DrawnArea[]>([]);
  const [currentAreaSeverity, setCurrentAreaSeverity] = useState<SeverityLevel>('medium');
  const [currentAreaName, setCurrentAreaName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DisasterFormData>({
    resolver: zodResolver(disasterSchema),
  });

  useEffect(() => {
    const fetchDisaster = async () => {
      const supabase = createClient();

      const { data: disaster } = await supabase
        .from('disasters')
        .select('*')
        .eq('id', disasterId)
        .single();

      if (disaster) {
        reset({
          title: disaster.title,
          type: disaster.type,
          description: disaster.description,
          severity: disaster.severity,
          affected_states: disaster.affected_states,
          start_date: disaster.start_date.split('T')[0],
          status: disaster.status,
        });
      }

      const { data: areas } = await supabase
        .from('affected_areas')
        .select('*')
        .eq('disaster_id', disasterId);

      if (areas) {
        setExistingAreas(areas);
      }

      setIsLoading(false);
    };

    fetchDisaster();
  }, [disasterId, reset]);

  const handleAreaComplete = (coordinates: [number, number][]) => {
    if (!currentAreaName) {
      alert('Please enter an area name before drawing');
      return;
    }
    setNewAreas((prev) => [
      ...prev,
      { coordinates, severity: currentAreaSeverity, name: currentAreaName },
    ]);
    setCurrentAreaName('');
  };

  const handleDeleteArea = async (areaId: string) => {
    if (!confirm('Are you sure you want to delete this area?')) return;

    const supabase = createClient();
    const { error } = await supabase.from('affected_areas').delete().eq('id', areaId);

    if (!error) {
      setExistingAreas((prev) => prev.filter((a) => a.id !== areaId));
    }
  };

  const onSubmit = async (data: DisasterFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const supabase = createClient();

      // Update disaster
      const { error: disasterError } = await supabase
        .from('disasters')
        .update({
          title: data.title,
          type: data.type,
          description: data.description,
          severity: data.severity,
          affected_states: data.affected_states,
          start_date: data.start_date,
          status: data.status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', disasterId);

      if (disasterError) {
        setError(disasterError.message);
        return;
      }

      // Add new areas
      if (newAreas.length > 0) {
        const areasToInsert = newAreas.map((area) => ({
          disaster_id: disasterId,
          name: area.name,
          coordinates: {
            type: 'Polygon',
            coordinates: [area.coordinates.map((c) => [c[1], c[0]])],
          },
          severity_level: area.severity,
        }));

        await supabase.from('affected_areas').insert(areasToInsert);
      }

      router.push('/admin/disasters');
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Edit Disaster</h1>
        <p className="text-slate-600">Update disaster information and affected areas</p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Disaster Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Title"
              error={errors.title?.message}
              {...register('title')}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select
                label="Disaster Type"
                options={[
                  { value: 'earthquake', label: 'Earthquake' },
                  { value: 'flood', label: 'Flood' },
                ]}
                error={errors.type?.message}
                {...register('type')}
              />

              <Select
                label="Severity Level"
                options={[
                  { value: 'low', label: 'Low' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'high', label: 'High' },
                  { value: 'critical', label: 'Critical' },
                ]}
                error={errors.severity?.message}
                {...register('severity')}
              />

              <Select
                label="Status"
                options={[
                  { value: 'active', label: 'Active' },
                  { value: 'resolved', label: 'Resolved' },
                ]}
                error={errors.status?.message}
                {...register('status')}
              />
            </div>

            <Textarea
              label="Description"
              error={errors.description?.message}
              {...register('description')}
            />

            <Input
              label="Start Date"
              type="date"
              error={errors.start_date?.message}
              {...register('start_date')}
            />

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Affected States
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-h-60 overflow-y-auto border rounded-lg p-3">
                {INDIAN_STATES.map((state) => (
                  <label key={state} className="flex items-center gap-2 text-sm text-black">
                    <input
                      type="checkbox"
                      value={state}
                      {...register('affected_states')}
                      className="rounded border-slate-300"
                    />
                    {state}
                  </label>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Existing Areas */}
        {existingAreas.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Existing Affected Areas</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {existingAreas.map((area) => (
                  <li key={area.id} className="flex items-center justify-between bg-slate-50 p-3 rounded">
                    <div>
                      <span className="font-medium">{area.name}</span>
                      <span className="text-sm text-slate-500 ml-2">({area.severity_level})</span>
                    </div>
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      onClick={() => handleDeleteArea(area.id)}
                    >
                      Delete
                    </Button>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Add New Areas */}
        <Card>
          <CardHeader>
            <CardTitle>Add New Affected Areas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <Input
                  label="Area Name"
                  placeholder="e.g., Pune City Center"
                  value={currentAreaName}
                  onChange={(e) => setCurrentAreaName(e.target.value)}
                />
              </div>
              <Select
                label="Area Severity"
                options={[
                  { value: 'low', label: 'Low' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'high', label: 'High' },
                  { value: 'critical', label: 'Critical' },
                ]}
                value={currentAreaSeverity}
                onChange={(e) => setCurrentAreaSeverity(e.target.value as SeverityLevel)}
              />
            </div>

            <DrawingMap
              mode="polygon"
              onAreaComplete={handleAreaComplete}
              existingAreas={newAreas}
            />

            {newAreas.length > 0 && (
              <div className="mt-4">
                <h4 className="font-medium text-slate-900 mb-2">New Areas to Add:</h4>
                <ul className="space-y-2">
                  {newAreas.map((area, index) => (
                    <li key={index} className="flex items-center justify-between bg-slate-50 p-2 rounded">
                      <span>{area.name} ({area.severity})</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setNewAreas((prev) => prev.filter((_, i) => i !== index))}
                      >
                        Remove
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex gap-4">
          <Button type="submit" loading={isSubmitting}>
            Update Disaster
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
