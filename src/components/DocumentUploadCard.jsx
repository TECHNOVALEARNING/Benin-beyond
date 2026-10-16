import React, { useState, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUpload,
  faFilePdf,
  faImage,
  faCheckCircle,
  faCircleExclamation,
  faTrash,
  faRotateRight,
  faEye,
  faShieldHalved,
  faCircleInfo,
  faClock,
  faTriangleExclamation
} from '@fortawesome/free-solid-svg-icons';
import { fileToDataUrl } from '../services/mediaStorage';
import { uploadVerificationDocument } from '../services/ownerVerificationService';

export function DocumentUploadCard({
  rule,
  documentData,
  onUpload,
  onRemove,
  userId = 'owner',
  disabled = false
}) {
  const fileInputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [previewModalOpen, setPreviewModalOpen] = useState(false);

  const acceptedExtensions = (rule.acceptedFormats || ['PDF', 'JPG', 'PNG', 'WEBP'])
    .map((ext) => `.${ext.toLowerCase()}`)
    .join(',');

  const maxBytes = (rule.maxSizeMb || 15) * 1024 * 1024;

  const validateAndProcessFile = async (file) => {
    setErrorMessage('');
    if (!file) return;

    // 1. Validation de l'extension / type MIME
    const fileName = file.name.toLowerCase();
    const hasValidExt = rule.acceptedFormats.some((fmt) => fileName.endsWith(`.${fmt.toLowerCase()}`));
    if (!hasValidExt) {
      setErrorMessage(`Format non supporté. Formats acceptés : ${rule.acceptedFormats.join(', ')}`);
      return;
    }

    // 2. Validation de la taille maximale (15 Mo par défaut)
    if (file.size > maxBytes) {
      setErrorMessage(`Fichier trop volumineux (${(file.size / (1024 * 1024)).toFixed(1)} Mo). Taille maximale autorisée : ${rule.maxSizeMb || 15} Mo.`);
      return;
    }

    setUploading(true);
    try {
      // Téléversement prioritaire vers Supabase Storage
      const fileUrl = await uploadVerificationDocument(file, {
        userId,
        ruleId: rule.id
      });

      const docPayload = {
        ruleId: rule.id,
        name: file.name,
        fileType: file.type || (fileName.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'),
        fileSize: file.size,
        fileUrl,
        uploadedAt: new Date().toISOString(),
        status: 'pending' // Repasse en attente dès téléversement
      };

      onUpload?.(rule.id, docPayload);
    } catch (err) {
      console.warn('Erreur téléversement document, repli local:', err);
      try {
        const dataUrl = await fileToDataUrl(file);
        const docPayload = {
          ruleId: rule.id,
          name: file.name,
          fileType: file.type || (fileName.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'),
          fileSize: file.size,
          fileUrl: dataUrl,
          uploadedAt: new Date().toISOString(),
          status: 'pending'
        };
        onUpload?.(rule.id, docPayload);
      } catch {
        setErrorMessage('Échec du traitement du fichier. Veuillez réessayer.');
      }
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      validateAndProcessFile(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (disabled) return;

    const file = e.dataTransfer?.files?.[0];
    if (file) {
      validateAndProcessFile(file);
    }
  };

  const hasFile = Boolean(documentData?.fileUrl || documentData?.name);
  const isPdf = documentData?.fileType?.includes('pdf') || documentData?.name?.toLowerCase().endsWith('.pdf');
  const docStatus = documentData?.status || 'none'; // 'none' | 'pending' | 'approved' | 'rejected' | 'action_required'
  const isApproved = docStatus === 'approved';
  const isActionRequired = docStatus === 'action_required' || docStatus === 'rejected';

  return (
    <div
      className={`relative rounded-3xl border transition-all duration-200 p-5 ${
        isActionRequired
          ? 'border-amber-500/60 bg-amber-500/[0.04] shadow-sm'
          : isApproved
          ? 'border-emerald-500/40 bg-emerald-500/[0.03]'
          : hasFile
          ? 'border-foreground/15 bg-card/80 shadow-xs'
          : 'border-dashed border-foreground/20 bg-muted/20 hover:border-primary/40 hover:bg-muted/30'
      }`}
    >
      {/* 1. Header du Document */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-heading text-sm font-bold text-foreground">
              {rule.name}
            </h4>
            {rule.required ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/20">
                Obligatoire
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-foreground/10 text-foreground/60">
                Optionnel / Recommandé
              </span>
            )}

            {/* Statut de conformité si document présent */}
            {hasFile && (
              <>
                {isApproved && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                    <FontAwesomeIcon icon={faCheckCircle} className="h-2.5 w-2.5" />
                    Validé conforme
                  </span>
                )}
                {isActionRequired && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/40 animate-pulse">
                    <FontAwesomeIcon icon={faTriangleExclamation} className="h-2.5 w-2.5" />
                    Remplacement requis
                  </span>
                )}
                {docStatus === 'pending' && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                    <FontAwesomeIcon icon={faClock} className="h-2.5 w-2.5" />
                    En attente de revue
                  </span>
                )}
              </>
            )}
          </div>

          <p className="text-xs text-foreground/70 leading-relaxed">
            {rule.purpose}
          </p>
        </div>

        {/* Formats et taille acceptés */}
        <div className="text-[11px] text-foreground/50 shrink-0 text-left sm:text-right font-mono">
          <span>{rule.acceptedFormats?.join(', ')}</span> • <span>Max {rule.maxSizeMb || 15} Mo</span>
        </div>
      </div>

      {/* Critères d'acceptabilité pédagogiques */}
      <div className="mb-4 flex items-start gap-2 rounded-xl bg-background/80 border border-foreground/10 px-3 py-2 text-[11px] text-foreground/70">
        <FontAwesomeIcon icon={faCircleInfo} className="h-3 w-3 text-primary mt-0.5 shrink-0" />
        <span>
          <strong className="text-foreground font-semibold">Critère d'acceptation : </strong>
          {rule.acceptableCriteria}
        </span>
      </div>

      {/* Notification de motif si remplacement demandé par l'administration */}
      {isActionRequired && documentData?.adminFeedback && (
        <div className="mb-4 rounded-2xl border border-amber-500/50 bg-amber-500/10 p-3.5 text-xs text-amber-900 dark:text-amber-200">
          <div className="flex items-center gap-2 font-bold mb-1">
            <FontAwesomeIcon icon={faCircleExclamation} className="h-3.5 w-3.5 text-amber-600" />
            <span>Remarque de l'équipe de vérification :</span>
          </div>
          <p className="leading-relaxed bg-background/60 p-2.5 rounded-xl border border-amber-500/20 font-medium">
            « {documentData.adminFeedback} »
          </p>
          <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-1.5">
            Veuillez téléverser un nouveau document corrigé ci-dessous pour débloquer votre vérification.
          </p>
        </div>
      )}

      {/* 2. Zone d'upload ou fichier déjà chargé */}
      {hasFile ? (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-foreground/15 bg-background p-3.5">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Miniature de prévisualisation */}
            {isPdf ? (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-rose-500/15 text-rose-600">
                <FontAwesomeIcon icon={faFilePdf} className="h-6 w-6" />
              </div>
            ) : documentData.fileUrl ? (
              <button
                type="button"
                onClick={() => setPreviewModalOpen(true)}
                className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-foreground/10 group cursor-pointer"
                title="Agrandir l'aperçu"
              >
                <img
                  src={documentData.fileUrl}
                  alt={rule.name}
                  className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                />
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs transition-opacity">
                  <FontAwesomeIcon icon={faEye} />
                </div>
              </button>
            ) : (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <FontAwesomeIcon icon={faImage} className="h-6 w-6" />
              </div>
            )}

            {/* Détails du fichier */}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-foreground truncate max-w-[260px] sm:max-w-[320px]">
                {documentData.name}
              </p>
              <div className="flex items-center gap-2 text-[10px] text-foreground/50 mt-0.5">
                {documentData.fileSize && (
                  <span>{(documentData.fileSize / (1024 * 1024)).toFixed(2)} Mo</span>
                )}
                {documentData.uploadedAt && (
                  <span>
                    • Déposé le {new Date(documentData.uploadedAt).toLocaleDateString('fr-FR')}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Boutons d'action (Aperçu, Remplacer, Supprimer) */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {documentData.fileUrl && (
              <button
                type="button"
                onClick={() => setPreviewModalOpen(true)}
                className="rounded-xl border border-foreground/15 bg-muted/40 hover:bg-muted px-3 py-1.5 text-xs font-semibold text-foreground transition-colors flex items-center gap-1.5"
                title="Prévisualiser le document"
              >
                <FontAwesomeIcon icon={faEye} className="h-3 w-3 text-foreground/70" />
                <span>Aperçu</span>
              </button>
            )}

            {!disabled && (
              <>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-xl border border-primary/30 bg-primary/10 hover:bg-primary/20 px-3 py-1.5 text-xs font-bold text-primary transition-colors flex items-center gap-1.5"
                  title="Remplacer par un autre fichier"
                >
                  <FontAwesomeIcon icon={faRotateRight} className="h-3 w-3" />
                  <span>Remplacer</span>
                </button>

                <button
                  type="button"
                  onClick={() => onRemove?.(rule.id)}
                  className="rounded-xl border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 px-2.5 py-1.5 text-xs font-semibold text-rose-700 dark:text-rose-300 transition-colors"
                  title="Retirer ce document"
                >
                  <FontAwesomeIcon icon={faTrash} className="h-3 w-3" />
                </button>
              </>
            )}
          </div>
        </div>
      ) : (
        /* Zone de Glisser-Déposer */
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => !disabled && fileInputRef.current?.click()}
          className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition-all cursor-pointer ${
            dragActive
              ? 'border-primary bg-primary/10 scale-[1.01]'
              : 'border-foreground/20 hover:border-primary/50 hover:bg-background/80'
          }`}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-3">
            {uploading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            ) : (
              <FontAwesomeIcon icon={faUpload} className="h-5 w-5" />
            )}
          </div>

          <p className="text-xs font-bold text-foreground">
            {uploading ? 'Traitement du fichier...' : 'Cliquez pour sélectionner ou glissez-déposez le fichier ici'}
          </p>
          <p className="text-[11px] text-foreground/50 mt-1">
            Formats : {rule.acceptedFormats?.join(', ')} (Max {rule.maxSizeMb || 15} Mo)
          </p>
        </div>
      )}

      {/* Message d'erreur de validation */}
      {errorMessage && (
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-rose-500/10 border border-rose-500/20 p-2.5 text-xs text-rose-700 dark:text-rose-300">
          <FontAwesomeIcon icon={faCircleExclamation} className="h-3.5 w-3.5 shrink-0 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Input de fichier caché */}
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedExtensions}
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled}
      />

      {/* Lightbox / Modal d'Aperçu du Document */}
      {previewModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in"
          onClick={() => setPreviewModalOpen(false)}
        >
          <div
            className="relative max-h-[90vh] max-w-4xl w-full bg-card rounded-3xl border border-foreground/20 overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-foreground/10 px-6 py-4 bg-muted/40">
              <div className="flex items-center gap-2">
                <FontAwesomeIcon icon={faShieldHalved} className="h-4 w-4 text-primary" />
                <h3 className="font-heading text-sm font-bold text-foreground">
                  Aperçu du document : {rule.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewModalOpen(false)}
                className="rounded-full h-8 w-8 flex items-center justify-center bg-foreground/10 hover:bg-foreground/20 text-foreground transition-colors text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-auto flex items-center justify-center min-h-[300px] max-h-[70vh]">
              {isPdf ? (
                <div className="flex flex-col items-center gap-4 text-center">
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600">
                    <FontAwesomeIcon icon={faFilePdf} className="h-10 w-10" />
                  </div>
                  <div>
                    <p className="font-bold text-foreground text-sm">{documentData.name}</p>
                    <p className="text-xs text-foreground/60 mt-1">
                      Fichier PDF prêt pour l'audit administratif
                    </p>
                  </div>
                  {documentData.fileUrl && (
                    <a
                      href={documentData.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-xl bg-primary text-white text-xs font-bold px-4 py-2 hover:bg-primary-dark transition-colors inline-flex items-center gap-2"
                    >
                      <FontAwesomeIcon icon={faEye} />
                      Ouvrir dans un nouvel onglet
                    </a>
                  )}
                </div>
              ) : documentData.fileUrl ? (
                <img
                  src={documentData.fileUrl}
                  alt={rule.name}
                  className="max-h-[65vh] w-auto max-w-full rounded-xl object-contain shadow-md"
                />
              ) : (
                <p className="text-sm text-foreground/50">Aucun aperçu disponible.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
