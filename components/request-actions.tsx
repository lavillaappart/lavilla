'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase-client';

export default function RequestActions({ requestId, status }: { requestId: string; status: string }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const changeStatus = async (nextStatus: string) => {
    setLoading(true);
    setMessage('');
    const supabase = createClient();
    const { error } = await supabase.from('reservation_requests').update({
      status: nextStatus,
      last_contacted_at: nextStatus === 'contacted' ? new Date().toISOString() : undefined
    }).eq('id', requestId);
    setLoading(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    window.location.reload();
  };

  return <div className="request-actions"><button disabled={loading} onClick={() => changeStatus('contacted')} type="button">Contacter</button><button disabled={loading} onClick={() => changeStatus('awaiting_payment')} type="button">Demander le paiement</button><button disabled={loading} onClick={() => changeStatus('rejected')} type="button">Refuser</button>{status !== 'cancelled' ? <button className="danger" disabled={loading} onClick={() => changeStatus('cancelled')} type="button">Annuler</button> : null}{message ? <small>{message}</small> : null}</div>;
}
