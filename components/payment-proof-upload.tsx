'use client';

import { ChangeEvent, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-client';

type PaymentProofUploadProps = {
  requestId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  status: string;
  reservationId?: string | null;
};

function parseProofUrls(value: unknown): string[] {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
      }
    } catch {
      // ignore JSON parse failures and fall back to a simple split
    }

    return trimmed
      .split(/\||\n|,/) 
      .map((item) => item.trim())
      .filter((item) => item.length > 0 && !item.startsWith('[') && !item.startsWith(']'));
  }

  return [];
}

export default function PaymentProofUpload({ requestId, amount, currency, paymentMethod, status, reservationId }: PaymentProofUploadProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [existingUrls, setExistingUrls] = useState<string[]>([]);

  useEffect(() => {
    const fetchCurrentProof = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('payments')
        .select('id, proof_url')
        .eq('request_id', requestId)
        .maybeSingle();

      if (data?.proof_url) {
        setExistingUrls(parseProofUrls(data.proof_url));
      }
    };

    fetchCurrentProof();
  }, [requestId]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const incoming = Array.from(event.target.files ?? []);
    setSelectedFiles((previous) => {
      const next = [...previous];
      for (const file of incoming) {
        const duplicate = next.some(
          (item) => item.name === file.name && item.size === file.size && item.lastModified === file.lastModified
        );
        if (!duplicate) next.push(file);
      }
      return next;
    });
    event.target.value = '';
  };

  const handleUpload = async () => {
    if (!selectedFiles.length) {
      setMessage('Sélectionnez au moins un document avant d’envoyer.');
      return;
    }

    setUploading(true);
    setMessage('');

    try {
      const supabase = createClient();
      const uploadedUrls = await Promise.all(
        selectedFiles.map(async (file) => {
          const filePath = `payment-proofs/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${file.name.replace(/\s+/g, '-')}`;
          const { error: uploadError } = await supabase.storage.from('payment-proofs').upload(filePath, file, {
            upsert: true,
            contentType: file.type || 'application/octet-stream'
          });

          if (uploadError) {
            throw new Error(uploadError.message === 'Bucket not found' ? 'Le bucket des justificatifs n’existe pas. Ajoutez la migration 016 dans Supabase.' : uploadError.message);
          }

          const { data: publicData } = supabase.storage.from('payment-proofs').getPublicUrl(filePath);
          const publicUrl = publicData?.publicUrl;

          if (!publicUrl) {
            throw new Error('Impossible de générer l’URL du document.');
          }

          return publicUrl;
        })
      );

      const mergedUrls: string[] = [];
      for (const url of [...existingUrls, ...uploadedUrls]) {
        if (!mergedUrls.includes(url)) {
          mergedUrls.push(url);
        }
      }
      const proofValue = JSON.stringify(mergedUrls);

      const { data: currentPayment, error: lookupError } = await supabase
        .from('payments')
        .select('id')
        .eq('request_id', requestId)
        .maybeSingle();

      if (lookupError && lookupError.code !== 'PGRST116') {
        throw new Error(lookupError.message);
      }

      if (currentPayment) {
        const { error: updateError } = await supabase
          .from('payments')
          .update({
            proof_url: proofValue,
            proof_uploaded_at: new Date().toISOString(),
            amount,
            currency,
            payment_method: paymentMethod,
            status: 'proof_received',
            reservation_id: reservationId ?? null
          })
          .eq('id', currentPayment.id);

        if (updateError) throw new Error(updateError.message);
      } else {
        const { error: insertError } = await supabase.from('payments').insert({
          request_id: requestId,
          reservation_id: reservationId ?? null,
          payment_method: paymentMethod,
          amount,
          currency,
          status: 'proof_received',
          proof_url: proofValue,
          proof_uploaded_at: new Date().toISOString()
        });

        if (insertError) throw new Error(insertError.message);
      }

      setExistingUrls(mergedUrls);
      setSelectedFiles([]);
      setMessage('Documents envoyés avec succès.');
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Erreur inconnue lors de l’envoi des documents.');
    } finally {
      setUploading(false);
    }
  };

  if (!['awaiting_payment', 'payment_received'].includes(status)) return null;

  return (
    <div className="payment-proof-upload">
      <label className="payment-proof-label">Justificatif de paiement + documents complémentaires</label>

      <div className="payment-proof-selector">
        <input
          type="file"
          accept="image/*,.pdf"
          multiple
          capture="environment"
          onChange={handleFileChange}
          aria-label="Ajouter des documents ou photos"
        />
      </div>

      <small className="payment-proof-hint">
        {selectedFiles.length > 0
          ? `${selectedFiles.length} document${selectedFiles.length > 1 ? 's' : ''} prêt${selectedFiles.length > 1 ? 's' : ''} à envoyer.`
          : 'Choisissez plusieurs fichiers ou prenez plusieurs photos depuis votre mobile.'}
      </small>

      {selectedFiles.length > 0 ? (
        <div className="payment-proof-file-list">
          {selectedFiles.map((file, index) => (
            <span key={`${file.name}-${file.lastModified}-${index}`} className="payment-proof-file-pill">
              {file.name.length > 28 ? `${file.name.slice(0, 25)}...` : file.name}
            </span>
          ))}
        </div>
      ) : null}

      <button className="payment-proof-button" disabled={uploading || !selectedFiles.length} onClick={handleUpload} type="button">
        {uploading ? 'Envoi...' : 'Envoyer les documents'}
      </button>

      {existingUrls.length > 0 ? (
        <div className="payment-proof-links">
          {existingUrls.map((url, index) => (
            <a key={`${url}-${index}`} className="payment-proof-link" href={url} target="_blank" rel="noreferrer">
              Voir le document {index + 1}
            </a>
          ))}
        </div>
      ) : null}
      {message ? <small className="payment-proof-message">{message}</small> : null}
    </div>
  );
}
