'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase-client';

type DeleteReservationButtonProps = {
  table: 'reservation_requests' | 'reservations';
  rowId: string;
  status: string;
};

const removableStatuses: Record<DeleteReservationButtonProps['table'], string[]> = {
  reservation_requests: ['cancelled', 'rejected', 'expired'],
  reservations: ['cancelled', 'completed', 'no_show']
};

export default function DeleteReservationButton({ table, rowId, status }: DeleteReservationButtonProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  if (!removableStatuses[table].includes(status)) return null;

  const remove = async () => {
    if (!window.confirm('Supprimer définitivement cette réservation ?')) return;
    setLoading(true);
    setMessage('');

    const supabase = createClient();
    const { error } = await supabase.from(table).delete().eq('id', rowId);

    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    window.location.reload();
  };

  return (
    <span className="table-actions">
      <button className="table-action edit" disabled={loading} onClick={remove} type="button">
        {loading ? '...' : 'Supprimer'}
      </button>
      {message ? <small className="table-error">{message}</small> : null}
    </span>
  );
}
