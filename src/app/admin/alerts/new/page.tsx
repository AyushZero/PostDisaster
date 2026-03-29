'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
} from '@/components/ui';
import { INDIAN_STATES, Disaster } from '@/types';

const alertSchema = z.object({
  title: z.string().min(3, 'Title is required'),
  message: z.string().min(10, 'Message is required'),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  disaster_id: z.string().optional(),
  affected_states: z.array(z.string()).min(1, 'Select at least one state'),
  expires_at: z.string().optional(),
});

type AlertFormData = z.infer<typeof alertSchema>;

export default function NewAlertPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [disasters, setDisasters] = useState<Disaster[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AlertFormData>({
    resolver: zodResolver(alertSchema),
    defaultValues: {
      severity: 'medium',
      affected_states: user?.assigned_state ? [user.assigned_state] : [],
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

  const onSubmit = async (data: AlertFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const supabase = createClient();

      const { error: alertError } = await supabase.from('alerts').insert({
        title: data.title,
        message: data.message,
        severity: data.severity,
        disaster_id: data.disaster_id || null,
        affected_states: data.affected_states,
        expires_at: data.expires_at || null,
        issued_by: user?.id,
        is_active: true,
      });

      if (alertError) {
        setError(alertError.message);
        return;
      }

      router.push('/admin/alerts');
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Issue New Alert</h1>
        <p className="text-slate-600">Create an emergency alert for users</p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Alert Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Alert Title"
              placeholder="e.g., Evacuation Notice for Coastal Areas"
              error={errors.title?.message}
              {...register('title')}
            />

            <Textarea
              label="Alert Message"
              placeholder="Provide detailed instructions and information..."
              error={errors.message?.message}
              {...register('message')}
            />

            <Select
              label="Severity Level"
              options={[
                { value: 'low', label: 'Low - General Information' },
                { value: 'medium', label: 'Medium - Attention Required' },
                { value: 'high', label: 'High - Urgent Action Needed' },
                { value: 'critical', label: 'Critical - Immediate Action Required' },
              ]}
              error={errors.severity?.message}
              {...register('severity')}
            />

            <Select
              label="Related Disaster (Optional)"
              placeholder="Select a disaster"
              options={disasters.map((d) => ({
                value: d.id,
                label: `${d.title} (${d.type})`,
              }))}
              {...register('disaster_id')}
            />

            <Input
              label="Expires At (Optional)"
              type="datetime-local"
              helperText="Leave empty for no expiration"
              {...register('expires_at')}
            />

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Affected States
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-60 overflow-y-auto border rounded-lg p-3">
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

        <div className="flex gap-4">
          <Button type="submit" loading={isSubmitting}>
            Issue Alert
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
