export const STATUS_AC = {
  Créée: { label: 'Créée', color: 'blue' },
  Affectée: { label: 'Affectée', color: 'cyan' },
  'En cours': { label: 'En cours', color: 'processing' },
  Réalisé: { label: 'Réalisé', color: 'green' },
  Clôturée: { label: 'Clôturée', color: 'default' },
  Rejetée: { label: 'Rejetée', color: 'red' }
}

export const WORKFLOW_STEPS = {
  1: 'Création',
  2: 'Validation',
  3: 'Analyse et Traitement',
  4: 'Affectation',
  5: 'Clôturé'
}

export const STATUS_COLORS = {
  Clôturées: '#0f5c4f',
  Critique: '#ef4444',
  'En cours': '#f59e0b'
}

export const IMPROVEMENT_SHEET_STATUT_COLORS = {
  'En attente': 'processing',
  Approuvé: 'success',
  Enregistré: 'blue',
  'En cours': 'gold',
  Clôturée: '#0f5c4f',
  Annulé: 'red'
}

export const CURRENT_YEAR = new Date().getFullYear()

export const YEAR_OPTIONS = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR - i).map((year) => ({
  label: String(year),
  value: year
}))
