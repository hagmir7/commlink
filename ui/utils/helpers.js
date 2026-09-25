export function uppercaseFirst(str) {
  if (!str) return ''

  return str.charAt(0).toUpperCase() + str.slice(1)
}

const COMPANIES = [
  { value: 1, label: 'Intercocina' },
  { value: 2, label: 'Serie Mobel' },
  { value: 3, label: 'AstiDkor' },
  { value: 4, label: 'Stile Mobili' }
]

export const getCompany = (id) => {
  const company = COMPANIES.find((c) => c.value === Number(id))

  return company ? company.label : null
}

export const handleShow = async (navigate, path, width = 1400, height = 800) => {
  console.log(window.api)

  try {
    if (window.api) {
      await window.api.openShow({
        url: path,
        width,
        height
      })
    } else {
      navigate('layout' + path)
    }
  } catch (error) {
    console.error('Error navigating:', error)
  }
}

/*
|--------------------------------------------------------------------------
| Document statuses
|--------------------------------------------------------------------------
*/

const DOCUMENT_STATUTS = {
  0: [
    {
      name: 'DocumentStatutTypeSaisie',
      value: 0,
      label: 'Saisi'
    },
    {
      name: 'DocumentStatutTypeConfirme',
      value: 1,
      label: 'Envoyé'
    },
    {
      name: 'DocumentStatutTypeAPrepare',
      value: 2,
      label: 'Accepté'
    },
    {
      name: 'DocumentStatutTypeDevisPerdu',
      value: 3,
      label: 'Perdu'
    },
    {
      name: 'DocumentStatutTypeDevisArchive',
      value: 4,
      label: 'Archivé'
    }
  ],

  1: [
    {
      name: 'DocumentStatutTypeSaisie',
      value: 0,
      label: 'Saisi'
    },
    {
      name: 'DocumentStatutTypeConfirme',
      value: 1,
      label: 'Confirmé'
    },
    {
      name: 'DocumentStatutTypeAPrepare',
      value: 2,
      label: 'A préparer'
    }
  ],

  2: [
    {
      name: 'DocumentStatutTypeSaisie',
      value: 0,
      label: 'Saisi'
    },
    {
      name: 'DocumentStatutTypeConfirme',
      value: 1,
      label: 'Confirmé'
    },
    {
      name: 'DocumentStatutTypeAPrepare',
      value: 2,
      label: 'A Livré'
    }
  ],

  3: [
    {
      name: 'DocumentStatutTypeSaisie',
      value: 0,
      label: 'Saisi'
    },
    {
      name: 'DocumentStatutTypeConfirme',
      value: 1,
      label: 'Confirmé'
    },
    {
      name: 'DocumentStatutTypeAPrepare',
      value: 2,
      label: 'A facturer'
    }
  ],

  4: [
    {
      name: 'DocumentStatutTypeSaisie',
      value: 0,
      label: 'Saisi'
    },
    {
      name: 'DocumentStatutTypeConfirme',
      value: 1,
      label: 'Confirmé'
    },
    {
      name: 'DocumentStatutTypeAPrepare',
      value: 2,
      label: 'A comptabiliser'
    }
  ],

  6: [
    {
      name: 'DocumentStatutTypeSaisie',
      value: 0,
      label: 'Saisi'
    },
    {
      name: 'DocumentStatutTypeConfirme',
      value: 1,
      label: 'Confirmé'
    },
    {
      name: 'DocumentStatutTypeAPrepare',
      value: 2,
      label: 'A comptabiliser'
    }
  ]
}

/*
|--------------------------------------------------------------------------
| Get all statuses for a document type
|--------------------------------------------------------------------------
*/

export function getAvailableStatuts(documentType) {
  return DOCUMENT_STATUTS[Number(documentType)] ?? []
}

/*
|--------------------------------------------------------------------------
| Get one status
|--------------------------------------------------------------------------
*/

export function getStatut(documentType, statusValue) {
  const statuts = getAvailableStatuts(documentType)

  return statuts.find((statut) => statut.value === Number(statusValue)) ?? null
}

const DOCUMENT_TYPE_LABELS = {
  0: 'Devis',
  1: 'Bon de commande',
  2: 'Prépartion de livraison',
  3: 'Bon de livraison',
  4: 'Avoir',
  6: 'Facture'
}

export function getDocumentTypeLabel(doType) {
  return DOCUMENT_TYPE_LABELS[Number(doType)] ?? 'Document'
}
