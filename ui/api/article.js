import { api } from '../utils/api'

/**
 * Looks up article(s) by exact reference.
 * Always returns an array.
 */
export async function findArticleByReference(reference) {
  try {
    const response = await api.get(`articles/${reference}`)

    const data = response.data

    if (Array.isArray(data)) return data

    return data ? [data] : []
  } catch (error) {
    throw new Error(
      `Article API error: ${
        error.response?.status || ''
      } ${error.response?.statusText || error.message}`
    )
  }
}

/**
 * Full-text style search used by the search article modal.
 */
export async function searchArticles(query) {
  try {
    const response = await api.get(`articles`, {
      params: { query }
    })

    const data = response.data

    return Array.isArray(data) ? data : []
  } catch (error) {
    throw new Error(
      `Article API error: ${
        error.response?.status || ''
      } ${error.response?.statusText || error.message}`
    )
  }
}
