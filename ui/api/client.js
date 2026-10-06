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
