import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { LoginSchema, type LoginInput } from '@pm/shared';
import { endpoints } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export default function LoginPage() {
  const navigate = useNavigate();
  const { setUser, setAccessToken } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),
  });

  const onSubmit = async (data: LoginInput) => {
    setLoading(true);
    try {
      const res = await endpoints.auth.login(data);
      const { accessToken, user } = res.data.data;
      setAccessToken(accessToken);
      setUser(user);
      navigate('/');
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message ?? 'Login failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg-primary)' }}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-xl font-bold mx-auto mb-4"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
          >
            P
          </div>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>Welcome back</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              Email
            </label>
            <input
              {...register('email')}
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              className="w-full h-10 px-3 rounded-md text-sm outline-none transition-colors"
              style={{
                background: 'var(--bg-card)',
                border: `1px solid ${errors.email ? '#f43f5e' : 'var(--border)'}`,
                color: 'var(--text-primary)',
              }}
            />
            {errors.email && <p className="text-xs mt-1 text-rose-400">{errors.email.message}</p>}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Password</label>
              <Link to="/forgot-password" className="text-xs hover:text-indigo-400" style={{ color: 'var(--text-muted)' }}>
                Forgot password?
              </Link>
            </div>
            <input
              {...register('password')}
              type="password"
              autoComplete="current-password"
              placeholder="••••••••••••"
              className="w-full h-10 px-3 rounded-md text-sm outline-none transition-colors"
              style={{
                background: 'var(--bg-card)',
                border: `1px solid ${errors.password ? '#f43f5e' : 'var(--border)'}`,
                color: 'var(--text-primary)',
              }}
            />
            {errors.password && <p className="text-xs mt-1 text-rose-400">{errors.password.message}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-10 rounded-md text-sm font-medium text-white flex items-center justify-center gap-2 disabled:opacity-60 transition-opacity"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
          >
            {loading ? <LoadingSpinner size="sm" /> : 'Sign in'}
          </button>
        </form>

        <p className="text-center text-sm mt-6" style={{ color: 'var(--text-muted)' }}>
          Don't have an account?{' '}
          <Link to="/signup" className="font-medium hover:text-indigo-400" style={{ color: '#818cf8' }}>
            Sign up
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
