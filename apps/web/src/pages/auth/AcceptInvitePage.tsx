import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { z } from 'zod';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface InvitePreview {
  org: { id: string; name: string; slug: string; logoUrl: string | null };
  email: string;
  role: string;
  userExists: boolean;
}

const NewUserSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  password: z
    .string()
    .min(12, 'Password must be at least 12 characters')
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[a-z]/, 'Must contain a lowercase letter')
    .regex(/[0-9]/, 'Must contain a number'),
});

type NewUserInput = z.infer<typeof NewUserSchema>;

export default function AcceptInvitePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { setUser, setAccessToken } = useAuthStore();

  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [status, setStatus] = useState<'loading' | 'preview' | 'not_found' | 'accepting'>('loading');

  const { register, handleSubmit, formState: { errors } } = useForm<NewUserInput>({
    resolver: zodResolver(NewUserSchema),
  });

  useEffect(() => {
    api.get(`/api/v1/invites/${token}`)
      .then((r) => {
        setPreview(r.data.data);
        setStatus('preview');
      })
      .catch(() => setStatus('not_found'));
  }, [token]);

  const acceptAsExistingUser = async () => {
    setStatus('accepting');
    try {
      const res = await api.post('/api/v1/invites/accept', { token });
      const { accessToken, user } = res.data.data;
      setAccessToken(accessToken);
      setUser(user);
      toast.success(`Joined ${preview?.org.name}!`);
      navigate(`/${preview?.org.slug}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? 'Failed to accept invite');
      setStatus('preview');
    }
  };

  const acceptAsNewUser = async (data: NewUserInput) => {
    setStatus('accepting');
    try {
      const res = await api.post('/api/v1/invites/accept', { token, ...data });
      const { accessToken, user } = res.data.data;
      setAccessToken(accessToken);
      setUser(user);
      toast.success(`Welcome to ${preview?.org.name}!`);
      navigate(`/${preview?.org.slug}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? 'Failed to accept invite');
      setStatus('preview');
    }
  };

  if (status === 'loading') return <LoadingSpinner fullScreen />;

  if (status === 'not_found') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg-primary)' }}>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-sm">
          <div className="text-4xl mb-4">🔗</div>
          <h1 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Invite not found</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            This invite link has expired or already been used.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg-primary)' }}>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        {/* Org branding */}
        <div className="text-center mb-8">
          {preview?.org.logoUrl ? (
            <img src={preview.org.logoUrl} alt={preview.org.name} className="w-16 h-16 rounded-xl object-cover mx-auto mb-3" />
          ) : (
            <div
              className="w-16 h-16 rounded-xl flex items-center justify-center text-white text-2xl font-bold mx-auto mb-3"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
            >
              {preview?.org.name[0]}
            </div>
          )}
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            You're invited to join
          </h1>
          <p className="text-lg font-bold mt-1" style={{ color: '#818cf8' }}>{preview?.org.name}</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            As <strong className="capitalize">{preview?.role.replace('tenant_', '')}</strong> · {preview?.email}
          </p>
        </div>

        {preview?.userExists ? (
          /* Existing user — one-click accept */
          <div className="space-y-3">
            <p className="text-sm text-center" style={{ color: 'var(--text-secondary)' }}>
              Log in to accept this invitation.
            </p>
            <button
              onClick={acceptAsExistingUser}
              disabled={status === 'accepting'}
              className="w-full h-10 rounded-md text-sm font-medium text-white flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
            >
              {status === 'accepting' ? <LoadingSpinner size="sm" /> : `Accept & join ${preview?.org.name}`}
            </button>
          </div>
        ) : (
          /* New user — create account */
          <form onSubmit={handleSubmit(acceptAsNewUser)} className="space-y-4">
            <p className="text-sm text-center" style={{ color: 'var(--text-secondary)' }}>
              Create your account to accept this invitation.
            </p>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Full name</label>
              <input
                {...register('fullName')}
                type="text"
                placeholder="Your name"
                autoComplete="name"
                className="w-full h-10 px-3 rounded-md text-sm outline-none"
                style={{
                  background: 'var(--bg-card)',
                  border: `1px solid ${errors.fullName ? '#f43f5e' : 'var(--border)'}`,
                  color: 'var(--text-primary)',
                }}
              />
              {errors.fullName && <p className="text-xs mt-1 text-rose-400">{errors.fullName.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Password</label>
              <input
                {...register('password')}
                type="password"
                placeholder="12+ characters"
                autoComplete="new-password"
                className="w-full h-10 px-3 rounded-md text-sm outline-none"
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
              disabled={status === 'accepting'}
              className="w-full h-10 rounded-md text-sm font-medium text-white flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
            >
              {status === 'accepting' ? <LoadingSpinner size="sm" /> : 'Create account & join'}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
