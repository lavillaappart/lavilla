'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase-client';

export default function RequestActions({ requestId, status, defaultNotes = '' }: { requestId: string; status: string; defaultNotes?: string }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [notes, setNotes] = useState(defaultNotes);
  const [cancelReason, setCancelReason] = useState('');

  const saveRequirements = async () => {
    setLoading(true);
    setMessage('');
    const supabase = createClient();

    const { error } = await supabase
      .from('reservation_requests')
      .update({ special_requests: notes.trim() || null })
      .eq('id', requestId);

    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage('Documents requis enregistrés.');
  };

  const changeStatus = async (nextStatus: string) => {
    setLoading(true);
    setMessage('');
    const supabase = createClient();
    const cancellationReason = (cancelReason || notes || 'Reserva anulada por el administrador.').trim();

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
      last_contacted_at: nextStatus === 'contacted' ? new Date().toISOString() : null,
      contact_notes: nextStatus === 'cancelled' ? cancellationReason : notes.trim() || null
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
      const cancelledAt = new Date().toISOString();
      await supabase
        .from('reservation_requests')
        .update({
          status: 'cancelled',
          contact_notes: cancellationReason,
          last_contacted_at: cancelledAt
        })
        .eq('id', requestData.id);

      await supabase
        .from('reservations')
        .update({
          status: 'cancelled',
          cancelled_at: cancelledAt,
          notes: cancellationReason
        })
        .eq('request_id', requestData.id);
    }

    setLoading(false);
    window.location.reload();
  };

  return (
    <div className="request-actions">
      <div className="admin-requirements-box">
        <label htmlFor={`requirements-${requestId}`}>Documents requis</label>
        <textarea
          id={`requirements-${requestId}`}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="CIN / passeport\nPreuve de paiement\nActe de mariage si applicable"
          value={notes}
        />
        <button className="secondary-action" disabled={loading} onClick={saveRequirements} type="button">Enregistrer</button>
      </div>
      <div className="admin-cancel-box">
        <label htmlFor={`cancel-reason-${requestId}`}>Note d’annulation</label>
        <textarea
          id={`cancel-reason-${requestId}`}
          onChange={(event) => setCancelReason(event.target.value)}
          placeholder="Ex. Client a annulé pour raison personnelle."
          value={cancelReason}
        />
      </div>
      <div className="request-action-buttons">
        <button disabled={loading || status === 'confirmed'} onClick={() => changeStatus('confirmed')} type="button">Accepter</button>
        <button disabled={loading || status === 'contacted'} onClick={() => changeStatus('contacted')} type="button">Contacter</button>
        <button disabled={loading || status === 'awaiting_payment'} onClick={() => changeStatus('awaiting_payment')} type="button">Demander paiement</button>
        <button disabled={loading || status === 'rejected'} onClick={() => changeStatus('rejected')} type="button">Refuser</button>
        {status !== 'cancelled' ? <button className="danger" disabled={loading} onClick={() => changeStatus('cancelled')} type="button">Annuler</button> : null}
      </div>
      {message ? <small>{message}</small> : null}
    </div>
  );
}
