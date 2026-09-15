import dayjs from 'dayjs'

export const locale = {
  lang: {
    locale: 'fr_FR',
    placeholder: 'Sélectionner une date',
    rangePlaceholder: ['Date de début', 'Date de fin'],
    today: 'Aujourd’hui',
    now: 'Maintenant',
    backToToday: 'Retour à aujourd’hui',
    ok: 'OK',
    clear: 'Effacer',
    month: 'Mois',
    year: 'Année',
    timeSelect: 'Choisir l’heure',
    dateSelect: 'Choisir la date',
    monthSelect: 'Choisir un mois',
    yearSelect: 'Choisir une année',
    decadeSelect: 'Choisir une décennie',
    yearFormat: 'YYYY',
    fieldDateFormat: 'DD/MM/YYYY',
    cellDateFormat: 'D',
    fieldDateTimeFormat: 'DD/MM/YYYY HH:mm:ss',
    monthFormat: 'MMMM',
    fieldWeekFormat: 'YYYY-wo',
    monthBeforeYear: false,
    previousMonth: 'Mois précédent (PageUp)',
    nextMonth: 'Mois suivant (PageDown)',
    previousYear: 'Année précédente (Ctrl + gauche)',
    nextYear: 'Année suivante (Ctrl + droite)',
    previousDecade: 'Décennie précédente',
    nextDecade: 'Décennie suivante',
    previousCentury: 'Siècle précédent',
    nextCentury: 'Siècle suivant',
    shortWeekDays: ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'],
    shortMonths: [
      'Janv',
      'Févr',
      'Mars',
      'Avr',
      'Mai',
      'Juin',
      'Juil',
      'Août',
      'Sept',
      'Oct',
      'Nov',
      'Déc'
    ],

    months: [
      'Janv',
      'Févr',
      'Mars',
      'Avr',
      'Mai',
      'Juin',
      'Juil',
      'Août',
      'Sept',
      'Oct',
      'Nov',
      'Déc'
    ]
  },
  timePickerLocale: {
    placeholder: 'Sélectionner l’heure'
  }
}

export function uppercaseFirst(str) {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1)
}

export const getCompany = ($id) => {
  const companies = [
    { value: 1, label: 'Intercocina' },
    { value: 2, label: 'Serie Mobel' },
    { value: 3, label: 'AstiDkor' },
    { value: 4, label: 'Stile Mobili' }
  ]
  const company = companies.find((c) => c.value === Number($id))
  return company ? company.label : null
}

export const handleShow = async (navigate, path, width = 1400, height = 800) => {
  console.log(path)

  try {
    if (window.electron && typeof window.electron.openShow === 'function') {
      await window.electron.openShow({ url: path, width, height })
    } else {
      navigate('layout' + path)
    }
  } catch (error) {
    console.error('Error navigating:', error)
  }
}

export const dateFormat = (date) => {
  if (!date) return '__'

  const inputDate = new Date(date)

  const day = inputDate.getDate()
  const month = inputDate.getMonth() + 1
  const year = inputDate.getFullYear()

  return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`
}

export function isOverdue(item) {
  if (item.status === 'completed') return false
  return dayjs(item.due_date).isBefore(dayjs(), 'day')
}

export const STATUS_AC = {
  Créée: {
    label: 'Créée',
    color: 'blue'
  },
  Affectée: {
    label: 'Affectée',
    color: 'cyan'
  },
  'En cours': {
    label: 'En cours',
    color: 'processing'
  },
  Réalisé: {
    label: 'Réalisé',
    color: 'green'
  },
  Clôturée: {
    label: 'Clôturée',
    color: 'default'
  },
  Rejetée: {
    label: 'Rejetée',
    color: 'red'
  }
}

export const WORKFLOW_STEPS = {
  1: 'Création',
  2: 'Validation',
  3: 'Analyse et Traitement',
  4: 'Affectation',
  5: 'Clôturé'
}

export const MONTH_LABELS = [
  'Jan',
  'Fév',
  'Mar',
  'Avr',
  'Mai',
  'Jun',
  'Jul',
  'Aoû',
  'Sep',
  'Oct',
  'Nov',
  'Déc'
]

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

// Adjust the range as needed, or fetch available years from the backend
export const YEAR_OPTIONS = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR - i).map((year) => ({
  label: String(year),
  value: year
}))
