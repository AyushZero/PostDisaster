'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createClient } from '@/lib/supabase-client';
import {
  Button,
  Input,
  Select,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Modal,
} from '@/components/ui';
import { EmergencyContact, INDIAN_STATES } from '@/types';

const contactSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  number: z.string().min(3, 'Number is required'),
  type: z.enum(['ambulance', 'police', 'fire', 'disaster_helpline', 'emergency']),
  region: z.string().optional(),
  description: z.string().optional(),
  is_national: z.boolean(),
});

type ContactFormData = z.infer<typeof contactSchema>;

export default function EmergencyContactsPage() {
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      type: 'emergency',
      is_national: true,
    },
  });

  const watchIsNational = watch('is_national');

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('emergency_contacts')
      .select('*')
      .order('is_national', { ascending: false })
      .order('type');

    if (data) {
      setContacts(data);
    }
    setIsLoading(false);
  };

  const onSubmit = async (data: ContactFormData) => {
    setIsSubmitting(true);

    const supabase = createClient();
    const { error } = await supabase.from('emergency_contacts').insert({
      name: data.name,
      number: data.number,
      type: data.type,
      region: data.is_national ? null : data.region,
      description: data.description || null,
      is_national: data.is_national,
    });

    if (!error) {
      await fetchContacts();
      setIsModalOpen(false);
      reset();
    }

    setIsSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this contact?')) return;

    const supabase = createClient();
    const { error } = await supabase.from('emergency_contacts').delete().eq('id', id);

    if (!error) {
      setContacts((prev) => prev.filter((c) => c.id !== id));
    }
  };

  const typeLabels: Record<string, string> = {
    ambulance: 'Ambulance',
    police: 'Police',
    fire: 'Fire',
    disaster_helpline: 'Disaster Helpline',
    emergency: 'Emergency',
  };

  const nationalContacts = contacts.filter((c) => c.is_national);
  const regionalContacts = contacts.filter((c) => !c.is_national);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Emergency Contacts</h1>
          <p className="text-slate-600">Manage emergency contact numbers</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>Add Contact</Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-slate-500">Loading...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* National Contacts */}
          <Card>
            <CardHeader>
              <CardTitle>National Emergency Numbers</CardTitle>
            </CardHeader>
            <CardContent>
              {nationalContacts.length === 0 ? (
                <p className="text-slate-500">No national contacts added</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {nationalContacts.map((contact) => (
                    <div
                      key={contact.id}
                      className="flex items-center justify-between p-4 bg-slate-50 rounded-lg"
                    >
                      <div>
                        <p className="font-semibold text-slate-900">{contact.name}</p>
                        <p className="text-lg font-mono text-slate-700">{contact.number}</p>
                        <p className="text-xs text-slate-500">{typeLabels[contact.type]}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(contact.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Regional Contacts */}
          <Card>
            <CardHeader>
              <CardTitle>Regional Emergency Numbers</CardTitle>
            </CardHeader>
            <CardContent>
              {regionalContacts.length === 0 ? (
                <p className="text-slate-500">No regional contacts added</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {regionalContacts.map((contact) => (
                    <div
                      key={contact.id}
                      className="flex items-center justify-between p-4 bg-slate-50 rounded-lg"
                    >
                      <div>
                        <p className="font-semibold text-slate-900">{contact.name}</p>
                        <p className="text-lg font-mono text-slate-700">{contact.number}</p>
                        <p className="text-xs text-slate-500">
                          {typeLabels[contact.type]} - {contact.region}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(contact.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add Contact Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Emergency Contact"
        size="md"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Contact Name"
            placeholder="e.g., National Emergency"
            error={errors.name?.message}
            {...register('name')}
          />

          <Input
            label="Phone Number"
            placeholder="e.g., 112"
            error={errors.number?.message}
            {...register('number')}
          />

          <Select
            label="Type"
            options={[
              { value: 'emergency', label: 'Emergency' },
              { value: 'ambulance', label: 'Ambulance' },
              { value: 'police', label: 'Police' },
              { value: 'fire', label: 'Fire' },
              { value: 'disaster_helpline', label: 'Disaster Helpline' },
            ]}
            error={errors.type?.message}
            {...register('type')}
          />

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              {...register('is_national')}
              className="rounded border-slate-300"
            />
            <span className="text-sm text-slate-700">National contact (available everywhere)</span>
          </label>

          {!watchIsNational && (
            <Select
              label="Region"
              placeholder="Select state"
              options={INDIAN_STATES.map((state) => ({
                value: state,
                label: state,
              }))}
              {...register('region')}
            />
          )}

          <Input
            label="Description (Optional)"
            placeholder="Additional details"
            {...register('description')}
          />

          <div className="flex gap-4 pt-4">
            <Button type="submit" loading={isSubmitting}>
              Add Contact
            </Button>
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
