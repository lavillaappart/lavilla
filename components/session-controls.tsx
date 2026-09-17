'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-client';

export default function SessionControls({ isAuthenticated, isAdmin = false }: { isAuthenticated: boolean; isAdmin?: boolean }) {
  const [loading, setLoading] = useState(false);

  const handleSignOut = async () => {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  if (isAuthenticated) {
    return (
      <div className="session-controls">
        <Link className="session-link" href={isAdmin ? '/admin' : '/compte'}><span aria-hidden="true">◉</span> {isAdmin ? 'Administration' : 'Mon compte'}</Link>
        <button className="session-button" disabled={loading} onClick={handleSignOut} type="button">
          {loading ? 'Déconnexion...' : 'Se déconnecter'}
        </button>
      </div>
    );
  }

  return (
    <div className="session-controls">
      <Link className="session-link" href="/login"><span aria-hidden="true">↪</span> Se connecter</Link>
      <Link className="session-button session-register" href="/registro">Créer un compte</Link>
    </div>
  );
}
