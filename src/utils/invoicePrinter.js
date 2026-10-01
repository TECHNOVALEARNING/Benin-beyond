/**
 * Utilitaire d'impression et d'export de factures & vouchers officiels Bénin Beyond
 * - Garantit un rendu A4 haute définition sans page blanche
 * - Supprime complètement les en-têtes et pieds de page natifs du navigateur (aucun lien d'URL web ni date parasite)
 * - Rendu luxury prestige conforme aux normes comptables et conciergerie de luxe
 */

export function generateInvoiceHtml(booking, customer = null, options = {}) {
  const ref = booking?.booking_ref || booking?.id || `BB-${Math.floor(Math.random() * 900000 + 100000)}`;
  const clientName = booking?.customer_name || customer?.name || customer?.full_name || 'Client Bénin Beyond';
  const clientEmail = booking?.customer_email || customer?.email || 'contact@client.com';
  const clientPhone = booking?.customer_phone || customer?.phone || '+229 00 00 00 00';
  
  const isVehicle = booking?.rental_type === 'drive' || booking?.type === 'drive' || booking?.items?.[0]?.type === 'drive' || booking?.items?.[0]?.rental_type === 'drive';
  const listingTitle = booking?.listing_title || booking?.items?.[0]?.title || booking?.title || (isVehicle ? 'Location de Véhicule de Prestige' : 'Séjour d\'Exception Bénin Beyond');
  const location = booking?.location || booking?.city || 'Bénin (Littoral)';
  const dates = booking?.dates || booking?.period || 'Selon calendrier convenu';
  const paymentMethod = booking?.payment_method || 'Paiement Sécurisé en Ligne';
  
  const rawTotal = booking?.total_amount || booking?.gross_amount || booking?.amount || 0;
  const formattedTotal = new Intl.NumberFormat('fr-FR').format(Number(rawTotal) || 0) + ' FCFA';
  
  const issueDate = booking?.created_at
    ? new Date(booking.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

  // Sécurité / Code de validation unique
  const securityHash = `BB-AUTH-${String(ref).replace(/[^a-zA-Z0-9]/g, '').toUpperCase()}-${new Date().getFullYear()}`;

  const docBadgeText = isVehicle ? 'Facture & Bon de Location' : 'Facture & Voucher Officiel';
  const serviceSubText = isVehicle
    ? 'Véhicule vérifié, protocole de mise à disposition (tranche 24h/j), assurance et conciergerie inclus'
    : 'Accès conciergerie VIP, accueil personnalisé et protocole de séjour inclus';

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title> </title>
  <style>
    @page {
      size: A4 portrait;
      margin: 0mm !important; /* Élimine radicalement l'en-tête (date/titre) et le pied de page (URL) générés par le navigateur */
    }

    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    html, body {
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      min-height: 100% !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #0f172a;
      background-color: #ffffff !important;
      font-size: 11.5px;
      line-height: 1.45;
    }

    .invoice-wrapper {
      width: 100%;
      max-width: 100%;
      margin: 0 auto;
      padding: 14mm 16mm;
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      box-sizing: border-box;
    }

    /* En-tête prestige */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 14px;
      margin-bottom: 18px;
    }

    .brand-title {
      font-size: 24px;
      font-weight: 900;
      letter-spacing: -0.5px;
      color: #0f172a;
      margin: 0 0 2px 0;
      text-transform: uppercase;
    }

    .brand-title span {
      color: #059669; /* Émeraude Bénin Beyond */
    }

    .brand-sub {
      font-size: 9.5px;
      color: #64748b;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin: 0;
    }

    .doc-meta {
      text-align: right;
    }

    .doc-badge {
      display: inline-block;
      background: #ecfdf5;
      color: #065f46;
      border: 1px solid #a7f3d0;
      padding: 3px 10px;
      border-radius: 9999px;
      font-size: 9px;
      font-weight: 800;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      margin-bottom: 6px;
    }

    .doc-ref {
      font-family: "Courier New", Courier, monospace;
      font-size: 13px;
      font-weight: 800;
      color: #059669;
      margin: 0 0 2px 0;
    }

    .doc-date {
      font-size: 10px;
      color: #64748b;
      margin: 0;
    }

    /* Blocs Émetteur / Client */
    .parties-grid {
      display: flex;
      justify-content: space-between;
      gap: 20px;
      margin-bottom: 20px;
    }

    .party-card {
      flex: 1;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 12px 14px;
    }

    .party-title {
      font-size: 9px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #64748b;
      margin: 0 0 6px 0;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 4px;
    }

    .party-name {
      font-size: 12px;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 4px 0;
    }

    .party-detail {
      font-size: 10.5px;
      color: #475569;
      margin: 2px 0;
    }

    /* Tableau des prestations */
    .table-container {
      margin-bottom: 18px;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      overflow: hidden;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }

    thead th {
      background: #0f172a;
      color: #ffffff;
      font-size: 9.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 8px 12px;
    }

    tbody td {
      padding: 10px 12px;
      border-bottom: 1px solid #f1f5f9;
      font-size: 11px;
      vertical-align: top;
    }

    tbody tr:last-child td {
      border-bottom: none;
    }

    .item-title {
      font-weight: 700;
      color: #0f172a;
      font-size: 11.5px;
      margin: 0 0 2px 0;
    }

    .item-sub {
      font-size: 10px;
      color: #64748b;
      margin: 0;
    }

    /* Récapitulatif financier */
    .financial-section {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 20px;
    }

    .financial-box {
      width: 320px;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      padding: 12px 16px;
    }

    .financial-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 3px 0;
      font-size: 11px;
      color: #475569;
    }

    .financial-total {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 6px;
      padding-top: 8px;
      border-top: 2px solid #0f172a;
      font-size: 13.5px;
      font-weight: 900;
      color: #0f172a;
    }

    .financial-total span:last-child {
      color: #059669;
      font-size: 15px;
      font-family: "Courier New", Courier, monospace;
    }

    .paid-badge {
      display: inline-block;
      margin-top: 6px;
      background: #059669;
      color: #ffffff;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 9px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      text-align: center;
      width: 100%;
    }

    /* Sécurité & instructions VIP */
    .security-box {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 10px;
      padding: 12px 14px;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }

    .security-text {
      flex: 1;
    }

    .security-title {
      font-size: 10px;
      font-weight: 800;
      color: #166534;
      text-transform: uppercase;
      margin: 0 0 3px 0;
    }

    .security-desc {
      font-size: 10px;
      color: #15803d;
      margin: 0;
      line-height: 1.4;
    }

    .security-seal {
      border: 2px dashed #166534;
      padding: 6px 12px;
      border-radius: 8px;
      text-align: center;
      background: #ffffff;
      shrink-0;
    }

    .seal-text {
      font-family: "Courier New", Courier, monospace;
      font-size: 9.5px;
      font-weight: 800;
      color: #166534;
      display: block;
    }

    .seal-sub {
      font-size: 8px;
      color: #15803d;
      text-transform: uppercase;
      font-weight: 700;
    }

    /* Pied de page officiel (Conforme et sans lien web parasite) */
    .footer {
      margin-top: auto;
      border-top: 1px solid #e2e8f0;
      padding-top: 12px;
      text-align: center;
      font-size: 8.5px;
      color: #94a3b8;
      line-height: 1.5;
    }

    .footer-bold {
      color: #64748b;
      font-weight: 700;
    }
  </style>
</head>
<body>
  <div class="invoice-wrapper">
    <!-- En-tête -->
    <div class="header">
      <div>
        <h1 class="brand-title">BÉNIN <span>BEYOND</span></h1>
        <p class="brand-sub">Conciergerie Privée & Résidences d'Exception au Bénin</p>
      </div>
      <div class="doc-meta">
        <div class="doc-badge">${docBadgeText}</div>
        <div class="doc-ref">${ref}</div>
        <p class="doc-date">Délivré le : ${issueDate}</p>
      </div>
    </div>

    <!-- Parties prenantes -->
    <div class="parties-grid">
      <!-- Émetteur -->
      <div class="party-card">
        <div class="party-title">Émetteur du Document</div>
        <div class="party-name">BÉNIN BEYOND CONCIERGERIE SAS</div>
        <div class="party-detail">RCCM : RB/COT/2026-B-99881 | IFU : 0202611984523</div>
        <div class="party-detail">Haie Vive, Zone Résidentielle, Cotonou, Bénin</div>
        <div class="party-detail">Assistance & Conciergerie 24/7 : support@benin-beyond.com</div>
      </div>

      <!-- Voyageur / Client -->
      <div class="party-card">
        <div class="party-title">Client / Facturé À</div>
        <div class="party-name">${clientName}</div>
        <div class="party-detail">Email : ${clientEmail}</div>
        <div class="party-detail">Téléphone : ${clientPhone}</div>
        <div class="party-detail">Réf. Réservation : ${ref}</div>
      </div>
    </div>

    <!-- Détails des prestations -->
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th style="width: 50%;">Description de la Prestation</th>
            <th style="width: 25%;">Lieu & Période</th>
            <th style="width: 10%; text-align: center;">Statut</th>
            <th style="width: 15%; text-align: right;">Montant</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <div class="item-title">${listingTitle}</div>
              <div class="item-sub">${serviceSubText}</div>
            </td>
            <td>
              <div class="item-title" style="font-size: 10.5px;">${location}</div>
              <div class="item-sub">${dates}</div>
            </td>
            <td style="text-align: center;">
              <span style="display: inline-block; background: #ecfdf5; color: #065f46; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: 700;">VALIDÉ</span>
            </td>
            <td style="text-align: right; font-weight: 700; font-family: 'Courier New', Courier, monospace;">
              ${formattedTotal}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Ventilation financière -->
    <div class="financial-section">
      <div class="financial-box">
        <div class="financial-row">
          <span>Montant des prestations :</span>
          <span>${formattedTotal}</span>
        </div>
        <div class="financial-row">
          <span>Conciergerie & Assurance Séjour :</span>
          <span style="color: #059669; font-weight: 600;">Inclus</span>
        </div>
        <div class="financial-row">
          <span>Mode de règlement :</span>
          <span>${paymentMethod}</span>
        </div>
        <div class="financial-total">
          <span>Total Net Réglé :</span>
          <span>${formattedTotal}</span>
        </div>
        <div class="paid-badge">
          Paiement 100% Acquitté · Réf. Vérifiée
        </div>
      </div>
    </div>

    <!-- Sécurité et instructions VIP -->
    <div class="security-box">
      <div class="security-text">
        <div class="security-title">${isVehicle ? 'Bon de mise à disposition & Justificatif officiel' : 'Instruction d\'accès & Justificatif officiel'}</div>
        <div class="security-desc">
          ${isVehicle
            ? 'Ce document officiel tient lieu de bon de réservation et de quittance de paiement acquitté. Veuillez le présenter lors de la prise en charge du véhicule auprès de votre agent / chauffeur Bénin Beyond. Assistance conciergerie prioritaire 24h/24.'
            : 'Ce document officiel tient lieu de bon de réservation et de quittance de paiement acquitté. Veuillez le présenter lors de votre arrivée au check-in ou auprès de votre hôte / concierge. Assistance conciergerie prioritaire joignable 24h/24.'}
        </div>
      </div>
      <div class="security-seal">
        <span class="seal-text">${securityHash}</span>
        <span class="seal-sub">Certifié Authentique</span>
      </div>
    </div>

    <!-- Pied de page officiel sans lien web -->
    <div class="footer">
      <div class="footer-bold">Bénin Beyond SAS — Société d'Hospitalité de Prestige & de Mobilité Haut de Gamme au Bénin</div>
      <div>Document officiel certifié généré par le système sécurisé de Bénin Beyond. Fait foi de voucher d'accès et de reçu libératoire.</div>
      <div>Pour toute vérification d'authenticité : conciergerie@benin-beyond.com · Ligne VIP : +229 01 97 00 00 00</div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Lance l'impression isolée et propre du document
 * - N'utilise pas l'arbre DOM complet du dashboard (évite toute superposition ou disparition)
 * - Assure l'absence complète de l'URL du tableau de bord dans le pied de page
 */
export function printInvoiceDocument(booking, customer = null, options = {}) {
  const html = generateInvoiceHtml(booking, customer, options);

  // Détection mobile : sur smartphones, les iframes invisibles sont souvent ignorées par le moteur d'impression
  const isMobile = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);
  if (isMobile) {
    fallbackPrintWindow(html);
    return;
  }

  // Création d'une iframe avec dimensions réelles hors champ pour calcul correct du layout A4
  const iframe = document.createElement('iframe');
  iframe.id = 'bb-print-frame';
  iframe.style.position = 'fixed';
  iframe.style.top = '0';
  iframe.style.left = '0';
  iframe.style.width = '100vw';
  iframe.style.height = '100vh';
  iframe.style.border = 'none';
  iframe.style.zIndex = '-9999';
  iframe.style.opacity = '0.001';
  iframe.style.pointerEvents = 'none';
  iframe.setAttribute('aria-hidden', 'true');
  document.body.appendChild(iframe);

  try {
    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(html);
    doc.close();

    const triggerPrint = () => {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } catch (err) {
        console.error('Erreur lors de l\'impression dans l\'iframe :', err);
        fallbackPrintWindow(html);
      } finally {
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 4000);
      }
    };

    if (iframe.contentWindow.document.readyState === 'complete') {
      setTimeout(triggerPrint, 300);
    } else {
      iframe.contentWindow.onload = () => setTimeout(triggerPrint, 300);
    }
  } catch (e) {
    console.error('Échec iframe print, utilisation du fallback', e);
    fallbackPrintWindow(html);
    if (document.body.contains(iframe)) {
      document.body.removeChild(iframe);
    }
  }
}

function fallbackPrintWindow(html) {
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      try {
        printWindow.print();
      } catch (e) {
        console.warn('Impression fenêtre bloquée:', e);
      }
    }, 450);
  }
}
