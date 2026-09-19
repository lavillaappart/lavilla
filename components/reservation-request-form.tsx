'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';

type ReservationRequestFormProps = {
  apartment: {
    id: string;
    slug: string;
    base_price: number;
    currency: string;
    city: string;
  };
};

const paymentLabels: Record<string, string> = {
  bank_transfer: 'Paiement par virement bancaire',
  partial_now: 'Un peu maintenant, le reste à l’arrivée',
  on_arrival: 'Payer à l’arrivée'
};

const requiredDocumentOptions = [
  'CIN / passeport',
  'Preuve de paiement',
  'Acte de mariage si applicable'
];

export default function ReservationRequestForm({ apartment }: ReservationRequestFormProps) {
  const router = useRouter();
  const [form, setForm] = useState({
    checkIn: '',
    checkOut: '',
    guests: 2,
    paymentMethod: 'bank_transfer',
    paymentAmount: '',
    specialRequests: '',
    requiredDocuments: [] as string[]
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const nights = useMemo(() => {
    if (!form.checkIn || !form.checkOut) return 0;
    const start = new Date(form.checkIn);
    const end = new Date(form.checkOut);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
    const diffMs = end.getTime() - start.getTime();
    return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  }, [form.checkIn, form.checkOut]);

  const estimatedTotal = nights > 0 ? nights * apartment.base_price : 0;
  const suggestedDeposit = estimatedTotal > 0 ? Math.round(estimatedTotal * 0.3) : 0;

  const updateField = (field: keyof typeof form, value: string | number | string[]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    if (!form.checkIn || !form.checkOut) {
      setLoading(false);
      setMessage('Choisissez les dates d’arrivée et de départ.');
      return;
    }

    const start = new Date(form.checkIn);
    const end = new Date(form.checkOut);
    if (end <= start) {
      setLoading(false);
      setMessage('La date de départ doit être après la date d’arrivée.');
      return;
    }

    const supabase = createClient();
    const { data: sessionData, error: sessionError } = await supabase.auth.getUser();

    if (sessionError || !sessionData.user) {
      setLoading(false);
      setMessage('Vous devez être connecté pour demander une réservation.');
      router.push('/login');
      return;
    }

    const fullName = sessionData.user.user_metadata?.full_name || 'Client';
    const nameParts = fullName.trim().split(/\s+/);
    const firstName = nameParts.shift() || 'Client';
    const lastName = nameParts.join(' ') || 'Client';

    const email = (sessionData.user.email ?? '').trim();
    const { data: existingCustomers, error: customerLookupError } = await supabase
      .from('customers')
      .select('id')
      .ilike('email', email)
      .order('created_at', { ascending: false });

    const existingCustomer = existingCustomers?.[0];
    let customerId = existingCustomer?.id;

    if (!customerId) {
      const { data: insertedCustomer, error: customerInsertError } = await supabase
        .from('customers')
        .insert({
          first_name: firstName,
          last_name: lastName,
          email,
          phone: sessionData.user.user_metadata?.whatsapp_phone ?? '',
          country: sessionData.user.user_metadata?.country ?? '',
          preferred_language: 'fr',
          source: 'website'
        })
        .select('id')
        .single();

      if (customerInsertError || !insertedCustomer) {
        setLoading(false);
        setMessage(customerInsertError?.message || 'Impossible de créer votre profil voyageur.');
        return;
      }

      customerId = insertedCustomer.id;
    }

    if (customerLookupError && customerLookupError.code !== 'PGRST116') {
      setLoading(false);
      setMessage(customerLookupError.message);
      return;
    }

    const paymentMethod = form.paymentMethod;
    const paymentAmount = paymentMethod === 'partial_now'
      ? Number(form.paymentAmount || suggestedDeposit || 0)
      : null;

    const requiredDocumentSummary = form.requiredDocuments
      .concat(form.specialRequests.trim() ? [`Autre demande : ${form.specialRequests.trim()}`] : [])
      .join('\n');

    const { data: insertedRequest, error: requestError } = await supabase.from('reservation_requests').insert({
      apartment_id: apartment.id,
      customer_id: customerId,
      check_in: form.checkIn,
      check_out: form.checkOut,
      guests_count: Number(form.guests),
      status: 'pending',
      special_requests: requiredDocumentSummary || null,
      privacy_accepted: true,
      source: 'website',
      payment_method: paymentMethod,
      payment_amount: paymentAmount
    }).select('id').single();

    setLoading(false);

    if (requestError || !insertedRequest) {
      setMessage(requestError?.message || 'La demande de réservation n’a pas pu être enregistrée.');
      return;
    }

    setMessage('Votre demande de réservation a bien été envoyée. Vous pouvez suivre son statut dans votre espace client.');
    router.push(`/reservations/${insertedRequest.id}`);
  };

  return (
    <form className="reservation-request-form" onSubmit={handleSubmit}>
      <div className="booking-form-header">
        <span className="booking-form-badge">Réservation</span>
        <strong>{apartment.city}</strong>
      </div>

      <div className="booking-form-grid">
        <label>
          Arrivée
          <input type="date" value={form.checkIn} onChange={(event) => updateField('checkIn', event.target.value)} required />
        </label>
        <label>
          Départ
          <input type="date" value={form.checkOut} onChange={(event) => updateField('checkOut', event.target.value)} required />
        </label>
        <label>
          Voyageurs
          <input type="number" min={1} max={12} value={form.guests} onChange={(event) => updateField('guests', Number(event.target.value) || 1)} required />
        </label>
      </div>

      <div className="payment-choice-group">
        <p className="eyebrow">Mode de paiement</p>
        {Object.entries(paymentLabels).map(([value, label]) => (
          <label className="payment-choice" key={value}>
            <input
              checked={form.paymentMethod === value}
              name="paymentMethod"
              onChange={() => updateField('paymentMethod', value)}
              type="radio"
            />
            <span>{label}</span>
          </label>
        ))}
      </div>

      {form.paymentMethod === 'partial_now' ? (
        <label>
          Montant à verser maintenant
          <input
            min={0}
            onChange={(event) => updateField('paymentAmount', event.target.value)}
            placeholder={String(suggestedDeposit || estimatedTotal || 0)}
            type="number"
            value={form.paymentAmount}
          />
        </label>
      ) : null}

      <div className="document-requirement-block">
        <p className="eyebrow">Documents requis</p>
        <div className="required-document-options">
          {requiredDocumentOptions.map((option) => (
            <label className="required-document-option" key={option}>
              <input
                checked={form.requiredDocuments.includes(option)}
                onChange={() => {
                  const nextDocuments = form.requiredDocuments.includes(option)
                    ? form.requiredDocuments.filter((item) => item !== option)
                    : [...form.requiredDocuments, option];
                  updateField('requiredDocuments', nextDocuments);
                }}
                type="checkbox"
              />
              <span>{option}</span>
            </label>
          ))}
        </div>

        {form.requiredDocuments.length === 0 && !form.specialRequests.trim() ? (
          <small className="document-empty-note">Aucun document requis — la réservation peut être acceptée sans exigence complémentaire.</small>
        ) : null}

        <label className="custom-requirement-field">
          Demande supplémentaire
          <textarea
            onChange={(event) => updateField('specialRequests', event.target.value)}
            placeholder="Si besoin d’un document supplémentaire, précisez-le ici."
            value={form.specialRequests}
          />
        </label>
      </div>

      <div className="booking-summary-box">
        <span>{nights} nuit{nights > 1 ? 's' : ''}</span>
        <strong>
          {estimatedTotal} {apartment.currency}
        </strong>
      </div>

      <button className="auth-submit" disabled={loading} type="submit">
        {loading ? 'Envoi...' : 'Demander ce séjour'}
      </button>

      {message ? <p className="auth-message" role="status">{message}</p> : null}
    </form>
  );
}
