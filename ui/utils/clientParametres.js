export const EMPTY_SAGE_DATE = '1753-01-01'

const NUMBERS = ['depotCode', 'deviseCode', 'langueCode', 'prioriteLivraison', 'delaiTransport']
const TEXT = ['raccourci', 'codeEDI', 'codeAffaire']
const FLAGS = [
  'factureParBonLivraison',
  'exclureMarketing',
  'autoriserLivraisonPartielle',
  'mettreEnSommeil'
]
const FIELDS = {
  saisieDocument: [...NUMBERS, ...TEXT, ...FLAGS, 'periodiciteCode'],
  periodeFermeture: ['dateDebut', 'dateFin'],
  comptabilite: ['categorieComptableCode']
}

export function parameterDate(value) {
  if (!value || String(value).startsWith(EMPTY_SAGE_DATE)) return null
  return String(value).slice(0, 10)
}

function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return (
    Number.isFinite(date.getTime()) &&
    date.toISOString().slice(0, 10) === value &&
    value >= EMPTY_SAGE_DATE
  )
}

export function buildClientParametersPatch(current, changes) {
  const patch = {}
  for (const [section, names] of Object.entries(FIELDS)) {
    for (const name of names) {
      const value = changes[section]?.[name]
      if (value == null || Object.is(value, current?.[section]?.[name])) continue
      patch[section] = { ...patch[section], [name]: value }
    }
  }
  const settings = patch.saisieDocument || {}
  for (const name of [...NUMBERS, 'periodiciteCode']) {
    if (!Object.hasOwn(settings, name)) continue
    const min = name === 'periodiciteCode' ? 1 : 0
    if (!Number.isSafeInteger(settings[name]) || settings[name] < min) {
      throw new Error(
        name === 'periodiciteCode'
          ? 'La périodicité doit être un code positif.'
          : 'Les codes, la priorité et le délai doivent être des entiers positifs ou nuls.'
      )
    }
  }
  for (const name of FLAGS) {
    if (Object.hasOwn(settings, name) && typeof settings[name] !== 'boolean') {
      throw new Error('Valeur de case à cocher invalide.')
    }
  }
  for (const name of TEXT) {
    if (Object.hasOwn(settings, name) && typeof settings[name] !== 'string') {
      throw new Error('Valeur de texte invalide.')
    }
  }
  if (
    patch.comptabilite &&
    (!Number.isSafeInteger(patch.comptabilite.categorieComptableCode) ||
      patch.comptabilite.categorieComptableCode < 0)
  ) {
    throw new Error('Catégorie comptable invalide.')
  }
  if (patch.periodeFermeture) {
    if (Object.values(patch.periodeFermeture).some((value) => !validDate(value))) {
      throw new Error('Date de fermeture invalide.')
    }
    const period = { ...current?.periodeFermeture, ...patch.periodeFermeture }
    const start = parameterDate(period.dateDebut)
    const end = parameterDate(period.dateFin)
    if (!start && !end) {
      patch.periodeFermeture = { dateDebut: EMPTY_SAGE_DATE, dateFin: EMPTY_SAGE_DATE }
    } else if (!start || !end || !validDate(start) || !validDate(end) || end < start) {
      throw new Error(
        'Renseignez les deux dates de fermeture, avec une date de fin après la date de début.'
      )
    }
  }
  return patch
}

export function clientParameterOptions(response) {
  if (!response || typeof response !== 'object' || Array.isArray(response)) {
    throw new Error('Réponse des options de paramètres invalide.')
  }
  return Object.fromEntries(
    [
      ['depots', false],
      ['devises', false],
      ['periodicites', false],
      ['categoriesComptables', false],
      ['codesAffaire', true],
      ['langues', false]
    ].map(([name, textCode]) => {
      const items = response[name] ?? []
      if (!Array.isArray(items)) throw new Error('Liste de paramètres invalide.')
      return [
        name,
        items.flatMap((item) => {
          const code = item.code ?? item.value
          if (code == null) return []
          const value = textCode ? String(code) : Number(code)
          if (!textCode && !Number.isSafeInteger(value)) return []
          return [{ value, label: item.intitule ?? item.label ?? item.libelle ?? String(code) }]
        })
      ]
    })
  )
}
