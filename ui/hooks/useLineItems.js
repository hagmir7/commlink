import { useCallback, useEffect, useRef, useState } from 'react'

let tempIdCounter = 1

/**
 * Normalizes a raw article (from the API or from a manual entry) into
 * the shape the table expects, and guarantees a unique `key`.
 */
function toLineItem(article) {
  return {
    key: article.id ?? article.key ?? `tmp-${tempIdCounter++}`,
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
    episseur: article.episseur ?? 0
  }
}

export default function useLineItems(initialItems = []) {
  const [lineItems, setLineItemsState] = useState(() => initialItems.map(toLineItem))

  // `initialItems` often arrives empty on the first render (parent still
  // fetching) and is replaced with the real array once the fetch resolves.
  const previousInitialItemsRef = useRef(initialItems)
  useEffect(() => {
    if (initialItems !== previousInitialItemsRef.current) {
      previousInitialItemsRef.current = initialItems
      setLineItemsState(initialItems.map(toLineItem))
    }
  }, [initialItems])

  const addArticles = useCallback((articleOrArticles) => {
    const incoming = Array.isArray(articleOrArticles) ? articleOrArticles : [articleOrArticles]
    const newItems = incoming.map(toLineItem)
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
   * Replace the whole list. Accepts either an array of already-shaped
   * line items, or a function `(prev) => next` for functional updates.
   * Any raw objects passed in are normalized through `toLineItem`.
   */
  const setLineItems = useCallback((next) => {
    setLineItemsState((prev) => {
      const resolved = typeof next === 'function' ? next(prev) : next
      if (!Array.isArray(resolved)) return prev
      // If the items already look normalized (have a `key`), keep them as is.
      return resolved.map((item) =>
        item && Object.prototype.hasOwnProperty.call(item, 'key') ? item : toLineItem(item)
      )
    })
  }, [])

  return { lineItems, setLineItems, addArticles, updateLineItem, removeLineItems }
}
