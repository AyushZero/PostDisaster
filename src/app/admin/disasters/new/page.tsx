'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import dynamic from 'next/dynamic';
import { createClient } from '@/lib/supabase-client';
import { useAuth, useCSVParser } from '@/hooks';
import {
  Button,
  Input,
  Select,
  Textarea,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui';
import { INDIAN_STATES, SeverityLevel } from '@/types';

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
});

type DisasterFormData = z.infer<typeof disasterSchema>;

interface DrawnArea {
  coordinates: [number, number][];
  severity: SeverityLevel;
  name: string;
}

export default function NewDisasterPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { parseCSV, isLoading: csvLoading, error: csvError } = useCSVParser();

  const [mode, setMode] = useState<'manual' | 'csv'>('manual');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [drawnAreas, setDrawnAreas] = useState<DrawnArea[]>([]);
  const [currentAreaSeverity, setCurrentAreaSeverity] = useState<SeverityLevel>('medium');
  const [currentAreaName, setCurrentAreaName] = useState('');
  const [csvData, setCsvData] = useState<{ area_name: string; severity: string; description?: string }[]>([]);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<DisasterFormData>({
    resolver: zodResolver(disasterSchema),
    defaultValues: {
      type: 'earthquake',
      severity: 'medium',
      affected_states: user?.assigned_state ? [user.assigned_state] : [],
      start_date: new Date().toISOString().split('T')[0],
    },
  });

  const handleAreaComplete = useCallback((coordinates: [number, number][]) => {
    if (!currentAreaName) {
      alert('Please enter an area name before drawing');
      return;
    }
    setDrawnAreas((prev) => [
      ...prev,
      { coordinates, severity: currentAreaSeverity, name: currentAreaName },
    ]);
    setCurrentAreaName('');
  }, [currentAreaSeverity, currentAreaName]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await parseCSV(file);
      setCsvData(data);
    } catch (err) {
      setError('Failed to parse CSV file');
    }
  };

  const onSubmit = async (data: DisasterFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const supabase = createClient();

      // Create disaster
      const { data: disaster, error: disasterError } = await supabase
        .from('disasters')
        .insert({
          title: data.title,
          type: data.type,
          description: data.description,
          severity: data.severity,
          affected_states: data.affected_states,
          start_date: data.start_date,
          status: 'active',
          created_by: user?.id,
        })
        .select()
        .single();

      if (disasterError) {
        setError(disasterError.message);
        return;
      }

      // Add affected areas from drawing
      if (mode === 'manual' && drawnAreas.length > 0) {
        const areasToInsert = drawnAreas.map((area) => ({
          disaster_id: disaster.id,
          name: area.name,
          coordinates: {
            type: 'Polygon',
            coordinates: [area.coordinates.map((c) => [c[1], c[0]])],
          },
          severity_level: area.severity,
        }));

        await supabase.from('affected_areas').insert(areasToInsert);
      }

      // Add affected areas from CSV
      if (mode === 'csv' && csvData.length > 0) {
        const areasToInsert = csvData.map((row) => ({
          disaster_id: disaster.id,
          name: row.area_name,
          severity_level: row.severity as SeverityLevel,
          description: row.description || null,
          coordinates: null,
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

  const stateOptions = INDIAN_STATES.map((state) => ({
    value: state,
    label: state,
  }));

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Add New Disaster</h1>
        <p className="text-slate-600">Create a new disaster event and mark affected areas</p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Mode Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Entry Mode</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button
              variant={mode === 'manual' ? 'primary' : 'outline'}
              onClick={() => setMode('manual')}
            >
              Manual Entry with Map
            </Button>
            <Button
              variant={mode === 'csv' ? 'primary' : 'outline'}
              onClick={() => setMode('csv')}
            >
              Upload CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Disaster Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Title"
              placeholder="e.g., Maharashtra Floods 2024"
              error={errors.title?.message}
              {...register('title')}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            </div>

            <Textarea
              label="Description"
              placeholder="Describe the disaster situation..."
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
                  <label key={state} className="flex items-center gap-2 text-sm">
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
              {errors.affected_states && (
                <p className="mt-1 text-sm text-red-600">{errors.affected_states.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Manual Mode - Map Drawing */}
        {mode === 'manual' && (
          <Card>
            <CardHeader>
              <CardTitle>Mark Affected Areas on Map</CardTitle>
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
                existingAreas={drawnAreas}
              />

              {drawnAreas.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium text-slate-900 mb-2">Marked Areas:</h4>
                  <ul className="space-y-2">
                    {drawnAreas.map((area, index) => (
                      <li key={index} className="flex items-center justify-between bg-slate-50 p-2 rounded">
                        <span>{area.name} ({area.severity})</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setDrawnAreas((prev) => prev.filter((_, i) => i !== index))}
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
        )}

        {/* CSV Mode */}
        {mode === 'csv' && (
          <Card>
            <CardHeader>
              <CardTitle>Upload CSV File</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="csv-upload"
                />
                <label htmlFor="csv-upload" className="cursor-pointer">
                  <div className="text-slate-600">
                    <p className="font-medium">Click to upload CSV file</p>
                    <p className="text-sm mt-1">Required columns: area_name, severity</p>
                    <p className="text-sm">Optional: description, latitude, longitude</p>
                  </div>
                </label>
              </div>

              {csvLoading && <p className="text-slate-600">Parsing CSV...</p>}
              {csvError && <p className="text-red-600">{csvError}</p>}

              {csvData.length > 0 && (
                <div>
                  <h4 className="font-medium text-slate-900 mb-2">
                    Parsed {csvData.length} areas:
                  </h4>
                  <div className="max-h-60 overflow-y-auto border rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 sticky top-0">
                        <tr>
                          <th className="text-left p-2">Area Name</th>
                          <th className="text-left p-2">Severity</th>
                          <th className="text-left p-2">Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {csvData.map((row, index) => (
                          <tr key={index} className="border-t">
                            <td className="p-2">{row.area_name}</td>
                            <td className="p-2">{row.severity}</td>
                            <td className="p-2">{row.description || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Submit */}
        <div className="flex gap-4">
          <Button type="submit" loading={isSubmitting}>
            Create Disaster
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
