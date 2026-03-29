'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
import { Disaster, InfrastructureType } from '@/types';

const DrawingMap = dynamic(
  () => import('@/components/map/DrawingMap').then((mod) => mod.DrawingMap),
  { ssr: false, loading: () => <div className="h-[400px] bg-slate-100 rounded-lg flex items-center justify-center">Loading map...</div> }
);

const infrastructureSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  type: z.enum(['closed_road', 'evacuation_zone', 'supply_center', 'help_center', 'shelter', 'hospital', 'ngo']),
  disaster_id: z.string().min(1, 'Select a disaster'),
  address: z.string().optional(),
  contact_info: z.string().optional(),
  description: z.string().optional(),
});

type InfrastructureFormData = z.infer<typeof infrastructureSchema>;

function InfrastructureForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedDisaster = searchParams.get('disaster');
  const { user } = useAuth();

  const [disasters, setDisasters] = useState<Disaster[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<InfrastructureFormData>({
    resolver: zodResolver(infrastructureSchema),
    defaultValues: {
      type: 'shelter',
      disaster_id: preselectedDisaster || '',
    },
  });

  useEffect(() => {
    const fetchDisasters = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('disasters')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (data) {
        setDisasters(data);
      }
    };

    fetchDisasters();
  }, []);

  const handleLocationSelect = (lat: number, lng: number) => {
    setSelectedLocation({ lat, lng });
  };

  const onSubmit = async (data: InfrastructureFormData) => {
    if (!selectedLocation) {
      setError('Please select a location on the map');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const supabase = createClient();

      const { error: insertError } = await supabase.from('infrastructure_points').insert({
        name: data.name,
        type: data.type,
        disaster_id: data.disaster_id,
        latitude: selectedLocation.lat,
        longitude: selectedLocation.lng,
        address: data.address || null,
        contact_info: data.contact_info || null,
        description: data.description || null,
        status: 'active',
      });

      if (insertError) {
        setError(insertError.message);
        return;
      }

      router.push('/admin/infrastructure');
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const typeOptions = [
    { value: 'closed_road', label: 'Closed Road' },
    { value: 'evacuation_zone', label: 'Evacuation Zone' },
    { value: 'supply_center', label: 'Supply Center' },
    { value: 'help_center', label: 'Help Center' },
    { value: 'shelter', label: 'Shelter' },
    { value: 'hospital', label: 'Hospital' },
    { value: 'ngo', label: 'NGO' },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Add Infrastructure Point</h1>
        <p className="text-slate-600">Mark important locations on the map</p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Point Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Name"
                placeholder="e.g., City Hospital, NH-44 Block"
                error={errors.name?.message}
                {...register('name')}
              />

              <Select
                label="Type"
                options={typeOptions}
                error={errors.type?.message}
                {...register('type')}
              />
            </div>

            <Select
              label="Related Disaster"
              placeholder="Select a disaster"
              options={disasters.map((d) => ({
                value: d.id,
                label: `${d.title} (${d.type})`,
              }))}
              error={errors.disaster_id?.message}
              {...register('disaster_id')}
            />

            <Input
              label="Address (Optional)"
              placeholder="Full address"
              {...register('address')}
            />

            <Input
              label="Contact Information (Optional)"
              placeholder="Phone number or email"
              {...register('contact_info')}
            />

            <Textarea
              label="Description (Optional)"
              placeholder="Additional details..."
              {...register('description')}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Select Location on Map</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600 mb-4">
              Click on the map to select the location for this infrastructure point.
            </p>
            
            <DrawingMap
              mode="point"
              onPointSelect={handleLocationSelect}
            />

            {selectedLocation && (
              <p className="mt-4 text-sm text-slate-600">
                Selected: {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
              </p>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button type="submit" loading={isSubmitting} disabled={!selectedLocation}>
            Add Infrastructure Point
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function NewInfrastructurePage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <InfrastructureForm />
    </Suspense>
  );
}
