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

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const hasCheckedSessionRef = useRef(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  // Check if already logged in on mount
  useEffect(() => {
    if (hasCheckedSessionRef.current) {
      return;
    }

    hasCheckedSessionRef.current = true;

    const checkExistingSession = async () => {
      try {
        const supabase = createClient();
        const {
          data: { session },
        } = await withSupabaseAuthLockRetry(() => supabase.auth.getSession(), 2);

        if (session?.user) {
          const { data: profile, error: profileError } = await supabase
            .from('users')
            .select('role')
            .eq('id', session.user.id)
            .single();

          if (profileError) {
            throw profileError;
          }

          // Redirect based on role
          if (profile?.role === 'admin') {
            router.replace('/admin');
          } else {
            router.replace('/user/dashboard');
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
      );

      if (authError) {
        setError(authError.message);
        setIsLoading(false);
        return;
      }

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

      // Redirect based on role
      if (profile?.role === 'admin') {
        router.replace('/admin');
      } else {
        router.replace('/user/dashboard');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(
        isSupabaseAuthLockError(err)
          ? 'Your session is syncing across tabs. Please wait a moment and try again.'
          : 'An unexpected error occurred'
      );
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Login</CardTitle>
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
              placeholder="Enter your email"
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
