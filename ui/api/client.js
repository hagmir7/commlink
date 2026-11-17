import { api } from '../utils/api'

export async function getClients(type = 0) {
  try {
    const response = await api.get('clients/short', { params: { type } })
    const data = response.data
    return Array.isArray(data) ? data : []
  } catch (error) {
    throw new Error(
      `Client API error: ${error.response?.status || ''} ${
        error.response?.statusText || error.message
      }`
    )
  }
}

// Works whether or not your axios has an interceptor that already unwraps `.data`
const unwrap = (res) => (res && res.data !== undefined ? res.data : res)

export const getClientIdentification = (code) =>
  api.get(`/clients/${code}/identification`).then(unwrap)

export const getClientTarifs = (code) => api.get(`/clients/${code}/tarifs`).then(unwrap)

const tarifsUrl = (code) => `/clients/${encodeURIComponent(code)}/tarifs`

export const updateClientTarifs = (code, payload) =>
  api.patch(tarifsUrl(code), payload).then(unwrap)

export const getClientTarifsOptions = (code) => api.get(`${tarifsUrl(code)}/options`).then(unwrap)

export const getClientFamilyDiscounts = (code) =>
  api.get(`${tarifsUrl(code)}/familles`).then(unwrap)

export const saveClientFamilyDiscount = (code, familleCode, tauxRemise) =>
  api
    .put(`${tarifsUrl(code)}/familles/${encodeURIComponent(familleCode)}`, { tauxRemise })
    .then(unwrap)

export const deleteClientFamilyDiscount = (code, familleCode) =>
  api.delete(`${tarifsUrl(code)}/familles/${encodeURIComponent(familleCode)}`).then(unwrap)

const parametresUrl = (code) => `/clients/${encodeURIComponent(code)}/parametres`

export const getClientParametres = (code) => api.get(parametresUrl(code)).then(unwrap)

export const getClientParametresOptions = (code) =>
  api.get(`${parametresUrl(code)}/options`).then(unwrap)

export const updateClientParametres = (code, payload) =>
  api.patch(parametresUrl(code), payload).then(unwrap)

const livraisonsUrl = (code) => `/clients/${encodeURIComponent(code)}/livraisons`

export const getExpeditions = () => api.get('/expeditions').then(unwrap)

export const getClientLivraisons = (code) => api.get(livraisonsUrl(code)).then(unwrap)

export const getClientLivraison = (code, no) =>
  api.get(`${livraisonsUrl(code)}/${encodeURIComponent(no)}`).then(unwrap)

export const createClientLivraison = (code, payload) =>
  api.post(livraisonsUrl(code), payload).then(unwrap)

export const updateClientLivraison = (code, no, payload) =>
  api.patch(`${livraisonsUrl(code)}/${encodeURIComponent(no)}`, payload).then(unwrap)

export const deleteClientLivraison = (code, no) =>
  api.delete(`${livraisonsUrl(code)}/${encodeURIComponent(no)}`).then(unwrap)

export const createClient = (payload) => api.post('/clients', payload).then(unwrap)

export const updateClient = (code, payload) => api.put(`/clients/${code}`, payload).then(unwrap)

export const getClientFreeFields = (code) =>
  api.get(`/clients/${encodeURIComponent(code)}/info-libre`).then(unwrap)

export const updateClientFreeFields = (code, values) =>
  api.patch(`/clients/${encodeURIComponent(code)}/info-libre`, values).then(unwrap)
