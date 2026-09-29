/**
 * Utilitaire de gestion des salutations et des dates adaptées au Bénin
 */

/**
 * Renvoie une salutation dynamique en fonction de l'heure locale :
 * - De 05h00 à 11h59 : "Bonjour"
 * - De 12h00 à 17h59 : "Bon après-midi"
 * - De 18h00 à 04h59 : "Bonsoir"
 * 
 * @param {Date} [date=new Date()]
 * @returns {"Bonjour" | "Bon après-midi" | "Bonsoir"}
 */
export function getTimeBasedGreeting(date = new Date()) {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) {
    return 'Bonjour';
  }
  if (hour >= 12 && hour < 18) {
    return 'Bon après-midi';
  }
  return 'Bonsoir';
}

/**
 * Formate une date au format français standard (ex: "29 septembre 2026")
 */
export function formatDateFr(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}
