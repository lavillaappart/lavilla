'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase-client';

export default function DeleteApartmentButton({ apartmentId, imagePaths }: { apartmentId: string; imagePaths: string[] }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const remove = async () => {
    if (!window.confirm('Supprimer définitivement cet appartement et ses photos ?')) return;
    setLoading(true);
    setMessage('');
    const supabase = createClient();
    const paths = imagePaths.map((value) => value.split('/object/public/apartment-images/')[1]).filter(Boolean);
    if (paths.length) await supabase.storage.from('apartment-images').remove(paths);
    const { error } = await supabase.from('apartments').delete().eq('id', apartmentId);
    if (error) {
      setMessage(error.message.includes('violates foreign key') ? 'Impossible de supprimer un appartement avec des réservations liées.' : error.message);
      setLoading(false);
      return;
    }
    window.location.reload();
  };

  return <span className="table-actions"><button className="table-action edit" disabled={loading} onClick={remove} type="button">{loading ? '...' : 'Supprimer'}</button>{message ? <small className="table-error">{message}</small> : null}</span>;
}
