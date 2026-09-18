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

    const { data: requestData, error: requestFetchError } = await supabase
      .from('reservation_requests')
      .select('id, apartment_id, customer_id, check_in, check_out, guests_count, payment_method, payment_amount, status')
      .eq('id', requestId)
      .maybeSingle();

    if (requestFetchError) {
      setLoading(false);
      setMessage(requestFetchError.message);
      return;
    }

    if (!requestData) {
      setLoading(false);
      setMessage('La demande de réservation est introuvable.');
      return;
    }

    const updatePayload: Record<string, unknown> = {
      status: nextStatus,
      last_contacted_at: nextStatus === 'contacted' ? new Date().toISOString() : null
    };

    const { error: requestUpdateError } = await supabase
      .from('reservation_requests')
      .update(updatePayload)
      .eq('id', requestId);

    if (requestUpdateError) {
      setLoading(false);
      setMessage(requestUpdateError.message);
      return;
    }

    if (nextStatus === 'confirmed') {
      const { data: apartmentData } = await supabase
        .from('apartments')
        .select('base_price, currency')
        .eq('id', requestData.apartment_id)
        .maybeSingle();

      const nightlyPrice = Number(apartmentData?.base_price ?? 0);
      const totalPrice = Number(requestData.payment_amount && requestData.payment_amount > 0 ? requestData.payment_amount : nightlyPrice * Math.max(1, Math.ceil((new Date(requestData.check_out).getTime() - new Date(requestData.check_in).getTime()) / (1000 * 60 * 60 * 24))));

      const { error: reservationInsertError } = await supabase
        .from('reservations')
        .upsert({
          request_id: requestData.id,
          apartment_id: requestData.apartment_id,
          customer_id: requestData.customer_id,
          check_in: requestData.check_in,
          check_out: requestData.check_out,
          guests_count: requestData.guests_count,
          nightly_price: nightlyPrice,
          total_price: totalPrice,
          currency: apartmentData?.currency ?? 'MAD',
          status: 'confirmed',
          source: 'website',
          confirmed_at: new Date().toISOString()
        }, { onConflict: 'request_id' });

      if (reservationInsertError) {
        setLoading(false);
        setMessage(reservationInsertError.message);
        return;
      }
    }

    if (nextStatus === 'cancelled') {
      await supabase
        .from('reservations')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString()
        })
        .eq('request_id', requestData.id);
    }

    setLoading(false);
    window.location.reload();
  };

  return (
    <div className="request-actions">
      <button disabled={loading || status === 'confirmed'} onClick={() => changeStatus('confirmed')} type="button">Accepter</button>
      <button disabled={loading || status === 'contacted'} onClick={() => changeStatus('contacted')} type="button">Contacter</button>
      <button disabled={loading || status === 'awaiting_payment'} onClick={() => changeStatus('awaiting_payment')} type="button">Demander paiement</button>
      <button disabled={loading || status === 'rejected'} onClick={() => changeStatus('rejected')} type="button">Refuser</button>
      {status !== 'cancelled' ? <button className="danger" disabled={loading} onClick={() => changeStatus('cancelled')} type="button">Annuler</button> : null}
      {message ? <small>{message}</small> : null}
    </div>
  );
}
