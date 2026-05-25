import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { ResetPasswordSchema, type ResetPasswordInput } from '@pm/shared';
import { endpoints } from '@/lib/api';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export default function ResetPasswordPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<ResetPasswordInput>({
    resolver: zodResolver(ResetPasswordSchema),
    defaultValues: { token: token! },
  });

  const onSubmit = async (data: ResetPasswordInput) => {
    setLoading(true);
    try {
      await endpoints.auth.resetPassword(data);
      toast.success('Password reset! You can now log in.');
      navigate('/login');
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg-primary)' }}>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold mb-6 text-center" style={{ color: 'var(--text-primary)' }}>Set new password</h1>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <input type="hidden" {...register('token')} />
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>New password</label>
            <input {...register('password')} type="password" placeholder="12+ characters" className="w-full h-10 px-3 rounded-md text-sm outline-none" style={{ background: 'var(--bg-card)', border: `1px solid ${errors.password ? '#f43f5e' : 'var(--border)'}`, color: 'var(--text-primary)' }} />
            {errors.password && <p className="text-xs mt-1 text-rose-400">{errors.password.message}</p>}
          </div>
          <button type="submit" disabled={loading} className="w-full h-10 rounded-md text-sm font-medium text-white flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
            {loading ? <LoadingSpinner size="sm" /> : 'Reset password'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
