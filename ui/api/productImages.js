const IMAGE_API = 'https://app.intercocina.com/api/products/images/'
const CACHE_TTL = 5 * 60 * 1000
const cache = new Map()

export function getProductImages(reference) {
  const code = String(reference ?? '').trim()
  if (!code) return Promise.resolve([])

  const cached = cache.get(code)
  if (cached && cached.expires > Date.now()) return cached.promise

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000)
  // Electron supplies the image service key; never forward Sage credentials.
  const request =
    typeof window !== 'undefined' && window.api?.getProductImages
      ? window.api.getProductImages(code)
      : fetch(`${IMAGE_API}${encodeURIComponent(code)}`, {
          credentials: 'omit',
          headers: { Accept: 'application/json' },
          signal: controller.signal
        }).then(async (response) => {
          if (response.status === 404) return { images: [] }
          if (!response.ok) throw new Error('Impossible de charger les images.')
          return response.json()
        })
  const promise = request
    .then((data) => {
      if (!Array.isArray(data.images)) throw new Error('Réponse images invalide.')
      return data.images
        .filter((image) => {
          try {
            return new URL(image.url).protocol === 'https:'
          } catch {
            return false
          }
        })
        .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0))
    })
    .catch((error) => {
      if (cache.get(code)?.promise === promise) cache.delete(code)
      throw error
    })
    .finally(() => clearTimeout(timeout))

  // Bound memory in long-running desktop sessions; concurrent hovers share a request.
  if (cache.size >= 200) cache.delete(cache.keys().next().value)
  cache.set(code, { promise, expires: Date.now() + CACHE_TTL })
  return promise
}
