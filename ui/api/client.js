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

export const getClientParametres = (code) => api.get(`/clients/${code}/parametres`).then(unwrap)

export const getClientLivraisons = (code) => api.get(`/clients/${code}/livraisons`).then(unwrap)

export const createClient = (payload) => api.post('/clients', payload).then(unwrap)

export const updateClient = (code, payload) => api.put(`/clients/${code}`, payload).then(unwrap)
