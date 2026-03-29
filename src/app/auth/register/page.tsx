'use client';

import { useState, useRef, useEffect } from 'react';
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

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Password must be at least 6 characters'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const hasCheckedSessionRef = useRef(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
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
          const { data: profile } = await supabase
            .from('users')
            .select('role')
            .eq('id', session.user.id)
            .single();

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

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      // Sign up user
      const { data: authData, error: authError } = await withSupabaseAuthLockRetry(
        () =>
          supabase.auth.signUp({
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
        setError('Registration succeeded but something went wrong. Please try logging in.');
        setIsLoading(false);
        return;
      }

      // Create user profile as regular user (not admin)
      const { error: profileError } = await supabase
        .from('users')
        .insert([
          {
            id: user.id,
            email: user.email,
            role: 'user',
          },
        ]);

      if (profileError) {
        setError('Account created but profile setup failed. Please contact support.');
        setIsLoading(false);
        return;
      }

      router.replace('/user/dashboard');
    } catch (err) {
      console.error('Registration error:', err);
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
          <CardTitle className="text-xl">Create Account</CardTitle>
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

            <Input
              label="Confirm Password"
              type="password"
              placeholder="Confirm password"
              error={errors.confirmPassword?.message}
              {...register('confirmPassword')}
            />

            <Button type="submit" className="w-full" loading={isLoading}>
              Create Account
            </Button>
          </form>

          <div className="mt-4 text-center text-sm text-slate-600">
            <p>Already have an account? <Link href="/auth/login" className="text-slate-900 hover:underline">Sign In</Link></p>
          </div>

          <div className="mt-2 text-center">
            <Link href="/dashboard" className="text-sm text-slate-600 hover:text-slate-900">
              Back to Public Dashboard
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
