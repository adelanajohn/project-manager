import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function AcceptInvitePage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg-primary)' }}>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
        <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Accept Invite</h2>
        <p className="mb-4" style={{ color: 'var(--text-muted)' }}>Create an account or sign in to accept the invitation.</p>
        <div className="flex gap-3 justify-center">
          <Link to="/signup" className="px-4 py-2 rounded-md text-sm text-white" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>Sign up</Link>
          <Link to="/login" className="px-4 py-2 rounded-md text-sm" style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>Sign in</Link>
        </div>
      </motion.div>
    </div>
  );
}
