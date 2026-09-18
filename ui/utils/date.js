import dayjs from 'dayjs'
import 'dayjs/locale/fr'

dayjs.locale('fr')

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

export const dateFormat = (date) => {
  if (!date) return '__'
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return '__'
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  return `${day}/${month}/${d.getFullYear()}`
}

export function isOverdue(item) {
  if (item.status === 'completed') return false
  return dayjs(item.due_date).isBefore(dayjs(), 'day')
}
