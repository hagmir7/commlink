export const DOCUMENT_TYPES = [
  { type: 'DocumentTypeVenteDevis', value: 0, label: 'Devis', code: 'DE', color: '#13c2c2' },
  { type: 'DocumentTypeVenteCommande', value: 10, label: 'Bon de commande', code: 'BC', color: '#1677ff' },
  { type: 'DocumentTypeVentePrepaLivraison', value: 20, label: 'Préparation de livraison', code: 'PL', color: '#722ed1' },
  { type: 'DocumentTypeVenteLivraison', value: 30, label: 'Bon de livraison', code: 'BL', color: '#52c41a' },
  { type: 'DocumentTypeVenteReprise', value: 40, label: 'Bon de retour', code: 'BR', color: '#fa8c16' },
  { type: 'DocumentTypeVenteAvoir', value: 50, label: "Bon d'avoir financier", code: 'BA', color: '#eb2f96' },
  { type: 'DocumentTypeVenteFacture', value: 60, label: 'Facture', code: 'FA', color: '#f5222d' },
  { type: 'DocumentTypeVenteFactureCpta', value: 70, label: 'Facture comptabilisée', code: 'FC', color: '#8c8c8c' },
];

// Default landing type, per your spec (documents?type=DocumentTypeVenteDevis)
export const DEFAULT_DOCUMENT_TYPE = 'DocumentTypeVenteDevis';

export const STATUT_COLORS = {
  Confirmé: 'green',
  'A préparer': 'orange',
  Saisie: 'blue',
  Facturé: 'purple',
  Annulé: 'red',
  Clôturé: 'default',
};