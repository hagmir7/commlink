export const DOCUMENT_TYPES = [
  {
    type: 'DocumentTypeVenteDevis',
    value: 0,
    label: 'Devis',
    code: 'DE',
    domain: 0,
    color: '#13c2c2'
  },
  {
    type: 'DocumentTypeVenteCommande',
    value: 1,
    label: 'Bon de commande',
    code: 'BC',
    domain: 0,
    color: '#1677ff'
  },
  {
    type: 'DocumentTypeVentePrepaLivraison',
    value: 2,
    label: 'Préparation de livraison',
    code: 'PL',
    domain: 0,
    color: '#722ed1'
  },
  {
    type: 'DocumentTypeVenteLivraison',
    value: 3,
    label: 'Bon de livraison',
    code: 'BL',
    domain: 0,
    color: '#52c41a'
  },
  {
    type: 'DocumentTypeVenteFacture',
    value: 6,
    label: 'Facture',
    code: 'FA',
    domain: 0,
    color: '#f5222d'
  },
  {
    type: 'DocumentTypeVenteReprise',
    value: 4,
    label: 'Bon de retour',
    code: 'BR',
    domain: 0,
    color: '#fa8c16'
  }
  // {
  //   type: 'DocumentTypeVenteAvoir',
  //   value: 50,
  //   label: "Bon d'avoir financier",
  //   code: 'BA',
  //   domain: 0,
  //   color: '#eb2f96'
  // },

  // {
  //   type: 'DocumentTypeVenteFactureCpta',
  //   value: 70,
  //   label: 'Facture comptabilisée',
  //   code: 'FC',
  //   domain: 0,
  //   color: '#8c8c8c'
  // }
]

// Default landing type, per your spec (documents?type=DocumentTypeVenteDevis)
export const DEFAULT_DOCUMENT_TYPE = DOCUMENT_TYPES.find((t) => t.value === 0)

export const STATUT_COLORS = {
  Confirmé: 'green',
  'A préparer': 'orange',
  Saisie: 'blue',
  Facturé: 'purple',
  Annulé: 'red',
  Clôturé: 'default'
}
