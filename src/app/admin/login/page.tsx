'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  createClient,
  isSupabaseAuthLockError,
  withSupabaseAuthLockRetry,
} from '@/lib/supabase-client';
import { Button, Input, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

// Test credentials for demo purposes
const TEST_ADMIN = {
  email: 'admin@disaster.gov.in',
  password: 'admin123',
};

export default function AdminLoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const hasCheckedSessionRef = useRef(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  // Check if already logged in as admin on mount
  useEffect(() => {
    if (hasCheckedSessionRef.current) {
      return;
    }

    hasCheckedSessionRef.current = true;

    const checkExistingSession = async () => {
      try {
        const supabase = createClient();
        const { data: { session } } = await withSupabaseAuthLockRetry(() => supabase.auth.getSession(), 2) as any;

        if (session?.user) {
          const { data: profile, error: profileError } = await supabase
            .from('users')
            .select('role')
            .eq('id', session.user.id)
            .single();

          if (profileError) {
            throw profileError;
          }

          if (profile?.role === 'admin') {
            router.replace('/admin');
          }
        }
      } catch (sessionError) {
        if (!isSupabaseAuthLockError(sessionError)) {
          console.error('Session check failed:', sessionError);
        }
      }
    };
    
    checkExistingSession();
  }, [router]);

  const fillTestCredentials = () => {
    setValue('email', TEST_ADMIN.email);
    setValue('password', TEST_ADMIN.password);
  };

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      const { data: authData, error: authError } = await withSupabaseAuthLockRetry(
        () =>
          supabase.auth.signInWithPassword({
            email: data.email,
            password: data.password,
          }),
        2
      ) as any;

      if (authError) {
        setError(authError.message);
        setIsLoading(false);
        return;
      }

      // Use the user returned directly from signInWithPassword
      const user = authData.user;

      if (!user) {
        setError('Login succeeded but no active session was found. Please try again.');
        setIsLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role === 'admin') {
        router.replace('/admin');
        return;
      }

      setError('Access denied. Admin accounts only.');
      await withSupabaseAuthLockRetry(() => supabase.auth.signOut(), 1);
      setIsLoading(false);
      return;
    } catch (err) {
      console.error('Login error:', err);
      setError(
        isSupabaseAuthLockError(err)
          ? 'Your session is syncing across tabs. Please wait a moment and try again.'
          : 'An unexpected error occurred'
      );
      setIsLoading(false);
      return;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Admin Login</CardTitle>
          <p className="text-slate-600 text-sm mt-1">Disaster Management Portal</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            <Input
              label="Email"
              type="email"
              placeholder="Enter admin email"
              error={errors.email?.message}
              {...register('email')}
            />

            <Input
              label="Password"
              type="password"
              placeholder="Enter password"
              error={errors.password?.message}
              {...register('password')}
            />

            <Button type="submit" className="w-full" loading={isLoading}>
              Sign In
            </Button>

            <div className="pt-4 border-t border-slate-200">
              <p className="text-xs text-slate-500 text-center mb-2">For testing purposes:</p>
              <Button
                type="button"
                variant="outline"
                className="w-full text-sm"
                onClick={fillTestCredentials}
              >
                Use Test Admin Credentials
              </Button>
            </div>
          </form>

          <div className="mt-4 text-center">
            <Link href="/dashboard" className="text-sm text-slate-600 hover:text-slate-900">
              Back to Public Dashboard
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
