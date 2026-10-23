const DEVIS = 'DocumentTypeVenteDevis'
const COMMANDE = 'DocumentTypeVenteCommande'
const PREPA = 'DocumentTypeVentePrepaLivraison'
const LIVRAISON = 'DocumentTypeVenteLivraison'
const FACTURE = 'DocumentTypeVenteFacture'

// Chaîne des documents de vente, dans l'ordre du cycle de vente.
// target : valeur de l'enum TransformTarget attendue par l'API.
//          null = ce type ne peut pas être une cible de transformation.
export const DOCUMENT_CHAIN = [
  { label: 'Devis', value: DEVIS, target: null },
  { label: 'Bon de commande', value: COMMANDE, target: 'Commande' },
  { label: 'Préparation de livraison', value: PREPA, target: null },
  { label: 'Bon de livraison', value: LIVRAISON, target: 'Livraison' },
  { label: 'Facture', value: FACTURE, target: 'Facture' }
]

// Types sources acceptés par chaque cible.
// Miroir de TransformServices.AllowedSources (backend) : à garder synchronisé.
export const ALLOWED_SOURCES = {
  Commande: [DEVIS],
  Livraison: [DEVIS, COMMANDE, PREPA],
  Facture: [DEVIS, COMMANDE, PREPA, LIVRAISON]
}

// Cibles possibles pour un document source donné.
export const getAllowedTargets = (sourceType) =>
  DOCUMENT_CHAIN.filter(
    (entry) => entry.target && ALLOWED_SOURCES[entry.target]?.includes(sourceType)
  )

// Type précédent de chaque document (restauration).
// Miroir de TransformServices.GetPreviousType (backend).
export const PREVIOUS_TYPE = {
  [COMMANDE]: DEVIS,
  [PREPA]: COMMANDE,
  [LIVRAISON]: PREPA,
  [FACTURE]: LIVRAISON
}

export const getTypeLabel = (value) =>
  DOCUMENT_CHAIN.find((entry) => entry.value === value)?.label ?? value

// Options affichées dans la fenêtre de transformation.
// Elles sont envoyées à l'API, mais TransformServices ne les utilise pas pour l'instant.
export const TRANSFORM_OPTIONS = [
  { key: 'conserverDevis', label: "Conserver le devis d'origine" },
  { key: 'majTaxes', label: 'Mettre à jour les taux de taxes' },
  { key: 'recalculerPrix', label: 'Recalculer le prix de vente' },
  { key: 'recalculerFrais', label: "Recalculer les frais d'expédition" },
  { key: 'appliquerBaremes', label: 'Appliquer les barèmes' }
]

export const DEFAULT_TRANSFORM_OPTIONS = Object.fromEntries(
  TRANSFORM_OPTIONS.map((option) => [option.key, false])
)
