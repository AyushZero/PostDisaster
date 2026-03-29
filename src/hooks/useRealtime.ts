'use client';

import { useEffect } from 'react';
import {
  createClient,
  isSupabaseAuthLockError,
  withSupabaseAuthLockRetry,
} from '@/lib/supabase-client';
import { useAppStore } from '@/store';
import { Disaster, Alert, InfrastructurePoint, AffectedArea } from '@/types';

let authInitialized = false;
let authSubscription: { unsubscribe: () => void } | null = null;

export function useRealtimeSubscription() {
  const {
    addDisaster,
    updateDisaster,
    removeDisaster,
    addAlert,
    removeAlert,
    addInfrastructurePoint,
    updateInfrastructurePoint,
    removeInfrastructurePoint,
    addAffectedArea,
    setIsConnected,
  } = useAppStore();

  useEffect(() => {
    const supabase = createClient();

    // Subscribe to disasters changes
    const disasterChannel = supabase
      .channel('disasters-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'disasters' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            addDisaster(payload.new as Disaster);
          } else if (payload.eventType === 'UPDATE') {
            updateDisaster(payload.new as Disaster);
          } else if (payload.eventType === 'DELETE') {
            removeDisaster(payload.old.id);
          }
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    // Subscribe to alerts changes
    const alertChannel = supabase
      .channel('alerts-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'alerts' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            addAlert(payload.new as Alert);
          } else if (payload.eventType === 'DELETE') {
            removeAlert(payload.old.id);
          }
        }
      )
      .subscribe();

    // Subscribe to infrastructure changes
    const infraChannel = supabase
      .channel('infrastructure-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'infrastructure_points' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            addInfrastructurePoint(payload.new as InfrastructurePoint);
          } else if (payload.eventType === 'UPDATE') {
            updateInfrastructurePoint(payload.new as InfrastructurePoint);
          } else if (payload.eventType === 'DELETE') {
            removeInfrastructurePoint(payload.old.id);
          }
        }
      )
      .subscribe();

    // Subscribe to affected areas changes
    const areaChannel = supabase
      .channel('affected-areas-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'affected_areas' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            addAffectedArea(payload.new as AffectedArea);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(disasterChannel);
      supabase.removeChannel(alertChannel);
      supabase.removeChannel(infraChannel);
      supabase.removeChannel(areaChannel);
    };
  }, [
    addDisaster,
    updateDisaster,
    removeDisaster,
    addAlert,
    removeAlert,
    addInfrastructurePoint,
    updateInfrastructurePoint,
    removeInfrastructurePoint,
    addAffectedArea,
    setIsConnected,
  ]);
}

export function useAuth() {
  const { user, setUser } = useAppStore();

  useEffect(() => {
    if (authInitialized) {
      return;
    }

    authInitialized = true;
    const supabase = createClient();

    const syncUserFromSession = async (session: { user?: { id: string } | null } | null) => {
      if (!session?.user) {
        setUser(null);
        return;
      }

      const { data: profile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error) {
        throw error;
      }

      setUser(profile ?? null);
    };

    void withSupabaseAuthLockRetry(() => supabase.auth.getSession(), 2)
      .then(({ data: { session } }) => syncUserFromSession(session))
      .catch((error) => {
        if (isSupabaseAuthLockError(error)) {
          return;
        }

        console.error('Failed to restore auth session:', error);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      void (async () => {
        if (event === 'SIGNED_OUT') {
          setUser(null);
          return;
        }

        await syncUserFromSession(session as { user?: { id: string } | null } | null);
      })().catch((error) => {
        if (isSupabaseAuthLockError(error)) {
          return;
        }

        console.error('Auth state sync failed:', error);
      });
    });

    authSubscription = subscription;

    return () => {
      if (authSubscription) {
        authSubscription.unsubscribe();
        authSubscription = null;
      }

      authInitialized = false;
    };
  }, [setUser]);

  const signOut = async () => {
    const supabase = createClient();
    await withSupabaseAuthLockRetry(() => supabase.auth.signOut(), 1);
    setUser(null);
  };

  return { user, signOut };
}
