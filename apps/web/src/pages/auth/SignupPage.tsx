import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { SignupSchema, type SignupInput } from '@pm/shared';
import { endpoints } from '@/lib/api';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export default function SignupPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<SignupInput>({
    resolver: zodResolver(SignupSchema),
  });

  const onSubmit = async (data: SignupInput) => {
    setLoading(true);
    try {
      await endpoints.auth.signup(data);
      toast.success('Account created! Check your email to verify.');
      navigate('/login');
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg-primary)' }}>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-xl font-bold mx-auto mb-4" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>P</div>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>Create account</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Start managing your projects</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {[
            { name: 'fullName' as const, label: 'Full name', type: 'text', placeholder: 'Jane Smith' },
            { name: 'email' as const, label: 'Email', type: 'email', placeholder: 'you@example.com' },
            { name: 'orgName' as const, label: 'Organization name (optional)', type: 'text', placeholder: 'Acme Corp' },
            { name: 'password' as const, label: 'Password', type: 'password', placeholder: '12+ characters' },
          ].map((field) => (
            <div key={field.name}>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>{field.label}</label>
              <input
                {...register(field.name)}
                type={field.type}
                placeholder={field.placeholder}
                className="w-full h-10 px-3 rounded-md text-sm outline-none"
                style={{ background: 'var(--bg-card)', border: `1px solid ${errors[field.name] ? '#f43f5e' : 'var(--border)'}`, color: 'var(--text-primary)' }}
              />
              {errors[field.name] && <p className="text-xs mt-1 text-rose-400">{errors[field.name]?.message as string}</p>}
            </div>
          ))}

          <button type="submit" disabled={loading} className="w-full h-10 rounded-md text-sm font-medium text-white flex items-center justify-center gap-2 disabled:opacity-60" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
            {loading ? <LoadingSpinner size="sm" /> : 'Create account'}
          </button>
        </form>

        <p className="text-center text-sm mt-6" style={{ color: 'var(--text-muted)' }}>
          Already have an account?{' '}
          <Link to="/login" className="font-medium" style={{ color: '#818cf8' }}>Sign in</Link>
        </p>
      </motion.div>
    </div>
  );
}
