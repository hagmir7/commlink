const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { test } = require('node:test')

const helpers = import(
  `data:text/javascript;base64,${Buffer.from(
    fs.readFileSync(path.join(__dirname, '../ui/utils/clientParametres.js'), 'utf8')
  ).toString('base64')}`
)

const baseline = {
  saisieDocument: {
    depotCode: 1,
    deviseCode: 1,
    periodiciteCode: 9,
    autoriserLivraisonPartielle: true,
    delaiTransport: 3,
    raccourci: 'OLD',
    codeEDI: 'EDI',
    codeAffaire: 'A001'
  },
  periodeFermeture: { dateDebut: '2026-12-01', dateFin: '2026-12-07' },
  comptabilite: { categorieComptableCode: 1 }
}

test('partial client PATCH preserves false and zero without sending untouched fields or labels', async () => {
  const { buildClientParametersPatch } = await helpers
  assert.deepEqual(
    buildClientParametersPatch(baseline, {
      saisieDocument: {
        autoriserLivraisonPartielle: false,
        delaiTransport: 0,
        depotIntitule: 'Never assign this label',
        deviseCode: null
      },
      comptabilite: { categorieComptableIntitule: 'Read only' }
    }),
    { saisieDocument: { delaiTransport: 0, autoriserLivraisonPartielle: false } }
  )
  assert.equal(baseline.saisieDocument.autoriserLivraisonPartielle, true)
})

test('clears references with zero or empty text and omits null properties', async () => {
  const { buildClientParametersPatch } = await helpers
  assert.deepEqual(
    buildClientParametersPatch(baseline, {
      saisieDocument: {
        depotCode: 0,
        deviseCode: 0,
        raccourci: '',
        codeEDI: '',
        codeAffaire: '',
        langueCode: 0
      },
      comptabilite: { categorieComptableCode: null }
    }),
    {
      saisieDocument: {
        depotCode: 0,
        deviseCode: 0,
        langueCode: 0,
        raccourci: '',
        codeEDI: '',
        codeAffaire: ''
      }
    }
  )
})

test('unchanged periodicity is omitted even when its code has no configured label', async () => {
  const { buildClientParametersPatch } = await helpers
  assert.deepEqual(
    buildClientParametersPatch(baseline, { saisieDocument: { periodiciteCode: 9 } }),
    {}
  )
  assert.throws(() =>
    buildClientParametersPatch(baseline, { saisieDocument: { periodiciteCode: 0 } })
  )
  assert.throws(() =>
    buildClientParametersPatch(baseline, { saisieDocument: { periodiciteCode: -1 } })
  )
})

test('dates are cleared together using Sage empty dates', async () => {
  const { buildClientParametersPatch, EMPTY_SAGE_DATE, parameterDate } = await helpers
  assert.deepEqual(
    buildClientParametersPatch(baseline, {
      periodeFermeture: { dateDebut: EMPTY_SAGE_DATE, dateFin: EMPTY_SAGE_DATE }
    }),
    { periodeFermeture: { dateDebut: '1753-01-01', dateFin: '1753-01-01' } }
  )
  assert.equal(parameterDate('1753-01-01T00:00:00'), null)
  assert.equal(parameterDate('2026-12-01T00:00:00'), '2026-12-01')
  assert.deepEqual(
    buildClientParametersPatch(baseline, {
      periodeFermeture: { dateDebut: null, dateFin: null }
    }),
    {}
  )
})

test('rejects reversed, incomplete and invalid dates before PATCH', async () => {
  const { buildClientParametersPatch } = await helpers
  for (const period of [
    { dateDebut: '2026-12-15', dateFin: '2026-12-01' },
    { dateDebut: '1753-01-01', dateFin: '2026-12-01' },
    { dateDebut: '2026-02-30', dateFin: '2026-03-01' },
    { dateDebut: 'invalid', dateFin: '2026-03-01' }
  ])
    assert.throws(() => buildClientParametersPatch(baseline, { periodeFermeture: period }))
  assert.deepEqual(
    buildClientParametersPatch(baseline, {
      periodeFermeture: { dateFin: '2026-12-08' }
    }),
    { periodeFermeture: { dateFin: '2026-12-08' } }
  )
})

test('accepts the supplied company options, including empty periodicities and language zero', async () => {
  const { clientParameterOptions } = await helpers
  const options = clientParameterOptions({
    depots: [{ code: 1, intitule: 'STILEMOBILI' }],
    devises: [{ code: 1, intitule: 'MAD', codeISO: 'MAD' }],
    periodicites: [],
    categoriesComptables: [{ code: 1, intitule: 'VENTE AU MAROC' }],
    codesAffaire: [],
    langues: [
      { code: 0, intitule: 'Aucune' },
      { code: 1, intitule: 'Langue 1' }
    ]
  })
  assert.deepEqual(options.depots, [{ value: 1, label: 'STILEMOBILI' }])
  assert.deepEqual(options.langues[0], { value: 0, label: 'Aucune' })
  assert.deepEqual(options.periodicites, [])
  assert.deepEqual(options.codesAffaire, [])
})

test('rejects invalid priority, transport and checkbox values', async () => {
  const { buildClientParametersPatch } = await helpers
  for (const fields of [
    { delaiTransport: -1 },
    { prioriteLivraison: 1.5 },
    { mettreEnSommeil: 'false' }
  ]) {
    assert.throws(() => buildClientParametersPatch(baseline, { saisieDocument: fields }))
  }
})

test('parameter API uses encoded client paths and the shared business API without changing PATCH values', async (t) => {
  const calls = []
  globalThis.clientParametersTestApi = {
    get: async (url) => {
      calls.push(['GET', url])
      return { data: { marker: url } }
    },
    patch: async (url, payload) => {
      calls.push(['PATCH', url, payload])
      return { data: { success: true } }
    }
  }
  t.after(() => {
    delete globalThis.clientParametersTestApi
  })
  const source = fs
    .readFileSync(path.join(__dirname, '../ui/api/client.js'), 'utf8')
    .replace("import { api } from '../utils/api'", 'const api = globalThis.clientParametersTestApi')
  const api = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)
  const payload = { saisieDocument: { autoriserLivraisonPartielle: false, delaiTransport: 0 } }
  assert.deepEqual(await api.getClientParametresOptions('CL/001'), {
    marker: '/clients/CL%2F001/parametres/options'
  })
  assert.deepEqual(await api.updateClientParametres('CL/001', payload), { success: true })
  await api.getClientParametres('CL/001')
  assert.deepEqual(calls, [
    ['GET', '/clients/CL%2F001/parametres/options'],
    ['PATCH', '/clients/CL%2F001/parametres', payload],
    ['GET', '/clients/CL%2F001/parametres']
  ])
})
