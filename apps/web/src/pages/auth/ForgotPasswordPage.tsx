import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { ForgotPasswordSchema, type ForgotPasswordInput } from '@pm/shared';
import { endpoints } from '@/lib/api';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<ForgotPasswordInput>({ resolver: zodResolver(ForgotPasswordSchema) });

  const onSubmit = async (data: ForgotPasswordInput) => {
    setLoading(true);
    try {
      await endpoints.auth.forgotPassword(data);
      setSent(true);
    } catch {
      toast.error('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg-primary)' }}>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm text-center">
        <h1 className="text-2xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Reset password</h1>
        {sent ? (
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Check your inbox for a reset link. It expires in 1 hour.</p>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-6 text-left">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Email</label>
              <input {...register('email')} type="email" placeholder="you@example.com" className="w-full h-10 px-3 rounded-md text-sm outline-none" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
              {errors.email && <p className="text-xs mt-1 text-rose-400">{errors.email.message}</p>}
            </div>
            <button type="submit" disabled={loading} className="w-full h-10 rounded-md text-sm font-medium text-white flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
              {loading ? <LoadingSpinner size="sm" /> : 'Send reset link'}
            </button>
          </form>
        )}
        <Link to="/login" className="block text-sm mt-4" style={{ color: '#818cf8' }}>Back to login</Link>
      </motion.div>
    </div>
  );
}
