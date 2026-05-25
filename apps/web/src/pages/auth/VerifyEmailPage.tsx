import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle } from 'lucide-react';
import { api } from '@/lib/api';

export default function VerifyEmailPage() {
  const { token } = useParams<{ token: string }>();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    api.post(`/api/v1/auth/verify-email/${token}`)
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'));
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg-primary)' }}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
        {status === 'loading' && <p style={{ color: 'var(--text-muted)' }}>Verifying your email...</p>}
        {status === 'success' && (
          <>
            <CheckCircle size={48} className="text-green-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Email verified!</h2>
            <p className="mb-4" style={{ color: 'var(--text-muted)' }}>Your email has been successfully verified.</p>
            <Link to="/login" className="text-indigo-400 hover:underline">Continue to login</Link>
          </>
        )}
        {status === 'error' && (
          <>
            <XCircle size={48} className="text-rose-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Verification failed</h2>
            <p className="mb-4" style={{ color: 'var(--text-muted)' }}>This link is invalid or has expired.</p>
            <Link to="/login" className="text-indigo-400 hover:underline">Back to login</Link>
          </>
        )}
      </motion.div>
    </div>
  );
}
