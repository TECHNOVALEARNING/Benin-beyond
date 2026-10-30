import React, { useEffect, useState } from 'react';
import { getVerificationDocumentUrl } from '../services/ownerVerificationService';

// Les pièces justificatives sont saisies par les utilisateurs : seuls les liens https, blob et
// images en data: sont ouverts (jamais javascript: ou autre schéma).
function isSafeDocumentUrl(url) {
  return /^(https:\/\/|blob:|data:(image\/|application\/pdf))/i.test(url || '');
}

/** Résout une référence de document KYC (bucket privé → lien signé de 5 min). */
function useKycDocumentUrl(ref) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    let cancelled = false;
    getVerificationDocumentUrl(ref).then((resolved) => {
      if (!cancelled) setUrl(isSafeDocumentUrl(resolved) ? resolved : '');
    });
    return () => {
      cancelled = true;
    };
  }, [ref]);
  return url;
}

export function KycDocumentLink({ docRef, children, ...props }) {
  const url = useKycDocumentUrl(docRef);
  if (!url) return null;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" {...props}>
      {children}
    </a>
  );
}

export function KycDocumentImage({ docRef, ...props }) {
  const url = useKycDocumentUrl(docRef);
  if (!url) return null;
  return <img src={url} {...props} />;
}
