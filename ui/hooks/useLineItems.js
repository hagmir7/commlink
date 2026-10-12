import { useCallback, useEffect, useRef, useState } from 'react'

let tempIdCounter = 1
const EMPTY_LIST = []

/**
 * Normalizes a raw article into the shape the table expects.
 *
 * `key` rules:
 *  - Lines coming from the server get a POSITION-based key (index + 1).
 *    The backend identifies lines by position, and the key stays identical
 *    across refetches, so row selection survives a refresh.
 *  - Lines added locally (before the server responds) get a temporary key.
 *    They are replaced by the position-based ones on the next refetch.
 */
function toLineItem(article, index) {
  const key = index !== undefined ? index + 1 : (article.key ?? `tmp-${tempIdCounter++}`)

  return {
    key,
    id: article.id ?? null,
    articleRef: article.articleRef ?? article.reference ?? '',
    designation: article.designation ?? '',
    hauteur: article.hauteur ?? '',
    largeur: article.largeur ?? '',
    chant: article.chant ?? '',
    couleur: article.couleur ?? '',
    prixUnitaire: article.prixUnitaire ?? 0,
    quantite: article.quantite ?? 1,
    quantityColisee: article.quantityColisee ?? 1,
    remise: article.remise ?? 0,
    indent: article.indent ?? false,
    description: article.description ?? false,
    conditionnement: article.conditionnement ?? false,
    profondeur: article.profondeur ?? false,
    nom: article.nom ?? false,
    episseur: article.episseur ?? 0,
    // keep extra fields used elsewhere (e.g. the list of packagings)
    conditionnements: article.conditionnements
  }
}

const fromServer = (items) => items.map((item, index) => toLineItem(item, index))

export default function useLineItems(initialItems = EMPTY_LIST) {
  const [lineItems, setLineItemsState] = useState(() => fromServer(initialItems))

  // `initialItems` is often empty on the first render and replaced with the
  // real array once the parent's fetch resolves (and on every refetch).
  const previousInitialItemsRef = useRef(initialItems)
  useEffect(() => {
    if (initialItems !== previousInitialItemsRef.current) {
      previousInitialItemsRef.current = initialItems
      setLineItemsState(fromServer(initialItems))
    }
  }, [initialItems])

  const addArticles = useCallback((articleOrArticles) => {
    const incoming = Array.isArray(articleOrArticles) ? articleOrArticles : [articleOrArticles]
    const newItems = incoming.map((a) => toLineItem(a))
    setLineItemsState((prev) => [...prev, ...newItems])
    return newItems
  }, [])

  const updateLineItem = useCallback((key, changes) => {
    setLineItemsState((prev) =>
      prev.map((item) => (item.key === key ? { ...item, ...changes } : item))
    )
  }, [])

  const removeLineItems = useCallback((ids) => {
    if (!ids || ids.length === 0) return
    setLineItemsState((prev) =>
      prev.filter((item) => !ids.includes(`${item.articleRef}-${item.key}`))
    )
  }, [])

  /**
   * Replace the whole list. Accepts an array or a function `(prev) => next`.
   * Items that already have a `key` are kept as is.
   */
  const setLineItems = useCallback((next) => {
    setLineItemsState((prev) => {
      const resolved = typeof next === 'function' ? next(prev) : next
      if (!Array.isArray(resolved)) return prev
      return resolved.map((item) =>
        item && Object.prototype.hasOwnProperty.call(item, 'key') ? item : toLineItem(item)
      )
    })
  }, [])

  return { lineItems, setLineItems, addArticles, updateLineItem, removeLineItems }
}
