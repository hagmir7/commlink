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
