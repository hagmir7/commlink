import { api } from '../utils/api'

// ---------------------------------------------------------------------------
// Lecture
// ---------------------------------------------------------------------------

// Statuts proposés pour un type de document : [{ label, value }]
export const getStatuts = async (documentType) => {
  const { data } = await api.get(`documents/${documentType}/statuts`)
  return Array.isArray(data) ? data : []
}

// Prochain numéro de pièce pour un type de document et une souche.
export const getNextPiece = async (documentType, souche) => {
  const { data } = await api.get(`documents/${documentType}/next-piece`, {
    params: { souche: souche ?? '' }
  })
  return data?.piece ?? ''
}

// ---------------------------------------------------------------------------
// Transformation
// ---------------------------------------------------------------------------

// Transforme le document entier : la source est consommée (sauf reliquat).
export const transformDocument = (sourceType, piece, target, payload) =>
  api.post(`documents/${sourceType}/${piece}/transform`, payload, { params: { target } })

// Transforme uniquement les lignes choisies : la source reste.
export const transformLines = (sourceType, piece, body) =>
  api.post(`documents/${sourceType}/${piece}/transform/lines`, body)

// Normalise la réponse du backend (Ok / Fail de TransformServices).
//   piece          : numéro du document créé (clé "piece", ou "resultat" selon le contrôleur)
//   nonTransferred : [{ articleRef, quantity, transferredQuantity, residualQuantity }]
export const parseTransferResult = (data) => ({
  success: data?.success !== false,
  message: data?.message ?? '',
  piece: data?.resultat ?? data?.piece ?? null,
  nonTransferred: Array.isArray(data?.nonTransferred) ? data.nonTransferred : []
})

// ---------------------------------------------------------------------------
// Restauration (RevertToPrevious / CanRevert)
// Ces deux routes sont à aligner sur celles de votre contrôleur.
// ---------------------------------------------------------------------------

// Réponse : { canRevert, reason, notFound }
export const canRevertDocument = (type, piece) => api.get(`documents/${type}/${piece}/can-revert`)

// Réponse : { success, originalPiece, newPiece, message, notFound }
export const revertDocument = (type, piece) => api.post(`documents/${type}/${piece}/revert`)
