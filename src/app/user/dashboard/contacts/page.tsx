'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { EmergencyContact } from '@/types';

export default function UserContactsPage() {
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchContacts = async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from('emergency_contacts')
          .select('*')
          .order('is_national', { ascending: false })
          .order('name');

        if (data) {
          setContacts(data);
        }
      } catch (error) {
        console.error('Failed to fetch contacts:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchContacts();
  }, []);

  if (isLoading) {
    return <div className="text-center py-8">Loading contacts...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Emergency Contacts</h1>
        <p className="text-slate-600">Important contact numbers for emergencies and disasters</p>
      </div>

      {contacts.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-slate-500">No emergency contacts available</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {contacts.map((contact) => (
            <Card key={contact.id}>
              <CardHeader>
                <CardTitle className="text-lg text-black">{contact.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Phone:</span>
                  <a href={`tel:${contact.number}`} className="text-blue-600 hover:underline font-medium">
                    {contact.number}
                  </a>
                </div>
                {contact.type && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Type:</span>
                    <span className="text-slate-900">{contact.type}</span>
                  </div>
                )}
                {contact.region && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Region:</span>
                    <span className="text-slate-900">{contact.region}</span>
                  </div>
                )}
                {contact.description && (
                  <p className="text-slate-600 text-sm mt-2">{contact.description}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
