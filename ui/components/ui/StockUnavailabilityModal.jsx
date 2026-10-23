import { useEffect, useMemo, useState } from 'react'
import { Select, Input, Checkbox, Button, Spin, message } from 'antd'
import DesktopWindow from './DesktopWindow'
import { api } from '../../utils/api'

const fmt = (value) => {
  if (value === null || value === undefined || value === '') return ''
  const n = Number(value)
  return Number.isNaN(n) ? String(value) : n.toLocaleString('fr-FR', { minimumFractionDigits: 2 })
}

const toNumber = (value) => Number(String(value ?? '').replace(',', '.')) || 0

const computeOrderQty = (needed, supplier) => {
  if (needed <= 0) return 0
  const min = Number(supplier?.aF_QteMini) || 0
  const pack = Number(supplier?.aF_Colisage) || 1
  const atLeastMin = Math.max(needed, min)
  return Math.ceil(atLeastMin / pack) * pack
}

const StockUnavailabilityModal = ({ open, onClose, onOk, unvilableData }) => {
  const articleRef = unvilableData?.articleRef
  const quantiteDemandee = toNumber(unvilableData?.quantity)

  // Data from the API
  const [article, setArticle] = useState(null)
  const [stocks, setStocks] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(false)

  // Selections / editable values
  const [depotNo, setDepotNo] = useState(null)
  const [supplierRef, setSupplierRef] = useState(null)
  const [quantiteALivrer, setQuantiteALivrer] = useState('0')
  const [gererReliquat, setGererReliquat] = useState(true)
  const [quantiteReliquat, setQuantiteReliquat] = useState('0')
  const [genererDocument, setGenererDocument] = useState(false)
  const [quantiteACommander, setQuantiteACommander] = useState('0')

  const selectedStock = useMemo(
    () => stocks.find((s) => s.depotNo === depotNo) ?? null,
    [stocks, depotNo]
  )
  const selectedSupplier = useMemo(
    () => suppliers.find((s) => s.cT_Num === supplierRef) ?? null,
    [suppliers, supplierRef]
  )

  const stockDisponible = selectedStock?.qteDisponible ?? 0

  const stockATerme = stockDisponible + (selectedStock?.qteCommandee ?? 0)

  /**
   * Load stock + suppliers for the current article, then set smart defaults.
   */
  useEffect(() => {
    if (!open || !articleRef) return

    let cancelled = false

    const load = async () => {
      setLoading(true)

      const encoded = encodeURIComponent(articleRef)
      const [stockRes, supplierRes] = await Promise.allSettled([
        api.get(`/articles/${encoded}/stock`),
        api.get(`/articles/${encoded}/fournisseurs`)
      ])

      if (cancelled) return

      if (stockRes.status === 'rejected') {
        message.error("Erreur lors de la récupération du stock de l'article")
      }
      if (supplierRes.status === 'rejected') {
        message.error('Erreur lors de la récupération des fournisseurs')
      }

      const stockData = stockRes.status === 'fulfilled' ? stockRes.value.data : null
      const supplierData = supplierRes.status === 'fulfilled' ? supplierRes.value.data : null

      const stockList = stockData?.stocks ?? []
      const supplierList = supplierData?.suppliers ?? []

      const defaultStock = stockList.find((s) => s.isPrincipal) ?? stockList[0] ?? null
      const defaultSupplier = supplierList.find((s) => s.isPrincipal) ?? supplierList[0] ?? null

      // Default quantities: deliver what is available, put the rest on backorder
      const available = Math.max(defaultStock?.qteDisponible ?? 0, 0)
      const toDeliver = Math.min(quantiteDemandee, available)
      const backorder = Math.max(quantiteDemandee - toDeliver, 0)

      setArticle(stockData)
      setStocks(stockList)
      setSuppliers(supplierList)
      setDepotNo(defaultStock?.depotNo ?? null)
      setSupplierRef(defaultSupplier?.cT_Num ?? null)
      setQuantiteALivrer(String(toDeliver))
      setQuantiteReliquat(String(backorder))
      setQuantiteACommander(String(computeOrderQty(backorder, defaultSupplier)))
      setLoading(false)
    }

    load()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, articleRef])

  /**
   * Changing the quantity to deliver recalculates the backorder
   * and the quantity to order.
   */
  const handleQuantiteALivrerChange = (e) => {
    const value = e.target.value
    setQuantiteALivrer(value)

    const backorder = Math.max(quantiteDemandee - toNumber(value), 0)
    setQuantiteReliquat(String(backorder))
    setQuantiteACommander(String(computeOrderQty(backorder, selectedSupplier)))
  }

  const handleSupplierChange = (value) => {
    setSupplierRef(value)
    const supplier = suppliers.find((s) => s.cT_Num === value)
    setQuantiteACommander(String(computeOrderQty(toNumber(quantiteReliquat), supplier)))
  }

  const handleOk = () => {
    onOk?.({
      data: unvilableData,
      articleRef,
      depotNo,
      quantiteALivrer: toNumber(quantiteALivrer),
      gererReliquat,
      quantiteReliquat: gererReliquat ? toNumber(quantiteReliquat) : 0,
      genererDocument,
      fournisseur: genererDocument ? supplierRef : null,
      quantiteACommander: genererDocument ? toNumber(quantiteACommander) : 0
    })
  }

  const title = `Indisponibilité en stock : ${articleRef}`

  return (
    <DesktopWindow open={open} onClose={onClose} canClose={false} title={title} width={600}>
      <Spin spinning={loading}>
        <div className="flex flex-col text-xs text-gray-800 bg-[#f5f5f5] min-h-full">
          <div className="p-3 space-y-4">
            <div>
              <h3 className="mb-2 text-gray-700 font-medium">Stock de l'article</h3>
              <div className="pb-2 pl-6">
                <div className="flex items-center pb-2 gap-x-5">
                  <span className="w-40 text-right mr-2">Dépôt</span>
                  <Select
                    value={depotNo}
                    onChange={setDepotNo}
                    className="w-64"
                    size="small"
                    disabled={stocks.length <= 1}
                    options={stocks.map((s) => ({
                      value: s.depotNo,
                      label: s.depotIntitule
                    }))}
                  />
                </div>
              </div>

              {/* Table */}
              <div className="border border-blue-800 rounded-sm overflow-hidden bg-white">
                <div className="flex border-b border-blue-800 bg-gray-50/50">
                  <div className="flex-1 p-1 border-r border-blue-800 font-semibold text-gray-700">
                    Référence article
                  </div>
                  <div className="w-28 p-1 border-r border-blue-800 font-semibold text-center">
                    Stock disponible
                  </div>
                  <div className="w-28 p-1 font-semibold text-center">Stock à terme</div>
                </div>
                <div className="flex">
                  <div className="flex-1 p-1 border-r border-blue-800">
                    <div className="text-blue-800 font-medium">
                      {article?.designation ?? articleRef}
                    </div>
                    <div className="mt-1">Substitution :</div>
                  </div>
                  <div className="w-28 p-1 border-r border-blue-800 flex flex-col items-end justify-start">
                    <span>{fmt(stockDisponible)}</span>
                    <span>{fmt(0)}</span>
                  </div>
                  <div className="w-28 p-1 flex flex-col items-end justify-start">
                    <span>{fmt(stockATerme)}</span>
                    <span>{fmt(0)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Validation quantité livrée */}
            <div className="pt-2">
              <h3 className="mb-2 text-gray-700 font-medium">Validation quantité livrée</h3>
              <div className="pb-2 pl-6">
                <div className="flex items-center pb-2 gap-x-5">
                  <span className="w-40 text-right mr-2">Quantité demandée</span>
                  <Input
                    size="small"
                    value={fmt(quantiteDemandee)}
                    style={{ width: '256px' }}
                    disabled
                  />
                </div>
                <div className="flex items-center pb-2 gap-x-5">
                  <span className="w-40 text-right mr-2">Quantité à livrer</span>
                  <Input
                    size="small"
                    value={quantiteALivrer}
                    onChange={handleQuantiteALivrerChange}
                    style={{ width: '256px' }}
                  />
                </div>
              </div>
            </div>

            {/* Traitement de l'indisponibilité de stock */}
            <div>
              <h3 className="mb-2 text-gray-700 font-medium">
                Traitement de l'indisponibilité de stock
              </h3>

              <div className="mb-2">
                {/* Gérer un reliquat */}
                <div className="flex items-center pb-2 gap-x-5">
                  <Checkbox
                    checked={gererReliquat}
                    onChange={(e) => setGererReliquat(e.target.checked)}
                  />
                  <p>Gérer un reliquat</p>
                </div>
                <div className="pb-2 pl-6">
                  <div className="flex items-center pb-2 gap-x-5">
                    <span className="w-40 text-right mr-2">Quantité en reliquat</span>
                    <Input
                      size="small"
                      value={quantiteReliquat}
                      onChange={(e) => setQuantiteReliquat(e.target.value)}
                      disabled={!gererReliquat}
                      style={{ width: '256px' }}
                    />
                  </div>
                </div>

                {/* Générer un document */}
                <div className="flex items-center pb-2 gap-x-5">
                  <Checkbox
                    checked={genererDocument}
                    onChange={(e) => setGenererDocument(e.target.checked)}
                  />
                  <p>Générer un document</p>
                </div>

                <div className="pb-2 pl-6">
                  <div className="flex items-center pb-2 gap-x-5">
                    <span className="w-40 text-right mr-2">Type de document</span>
                    <Select
                      defaultValue="Commande fournisseur"
                      className="w-64"
                      size="small"
                      disabled
                      options={[{ value: 'Commande fournisseur', label: 'Commande fournisseur' }]}
                    />
                  </div>
                  <div className="flex items-center pb-2 gap-x-5">
                    <span className="w-40 text-right mr-2">Choix de traitement</span>
                    <Select
                      defaultValue="Compléter un document existant"
                      className="w-64"
                      size="small"
                      disabled
                      options={[
                        {
                          value: 'Compléter un document existant',
                          label: 'Compléter un document existant'
                        }
                      ]}
                    />
                  </div>
                  <div className="flex items-center pb-2 gap-x-5">
                    <span className="w-40 text-right mr-2">Souche du document</span>
                    <Select
                      defaultValue="Souche par défaut"
                      className="w-64"
                      size="small"
                      disabled
                      options={[{ value: 'Souche par défaut', label: 'Souche par défaut' }]}
                    />
                  </div>
                  <div className="flex items-center pb-2 gap-x-5">
                    <span className="w-40 text-right mr-2">
                      <Select
                        value={'FP'}
                        // onChange={handleSupplierChange}
                        className="flex-1"
                        size="small"
                        disabled={!genererDocument}
                        placeholder="Fournisseur"
                        options={[
                          { label: 'Fournisseur principal', value: 'FP' },
                          { label: 'Fournisseur article', value: 'FA' },
                          { label: 'Tous le Fournisseur', value: 'TF' }
                        ]}
                      />
                    </span>
                    <Select
                      value={supplierRef}
                      onChange={handleSupplierChange}
                      // className="w-24"
                      className="w-64"
                      size="small"
                      disabled={!genererDocument}
                      options={suppliers.map((s) => ({
                        value: s.cT_Num,
                        label: s.supplierName + ' ' + s.cT_Num
                      }))}
                    />
                  </div>
                  <div className="flex items-center pb-2 gap-x-5">
                    <span className="w-40 text-right mr-2">Quantité à commander</span>
                    <Input
                      size="small"
                      value={quantiteACommander}
                      onChange={(e) => setQuantiteACommander(e.target.value)}
                      disabled={!genererDocument}
                      style={{ width: '256px' }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-100 px-3 py-2 border-t border-gray-300 flex justify-end gap-2 mt-auto">
            <Button size="small" disabled className="rounded-sm text-xs px-4">
              Substitution
            </Button>
            <Button size="small" disabled className="rounded-sm text-xs px-4">
              OK pour tous
            </Button>
            <Button
              type="primary"
              size="small"
              className="rounded-sm text-xs px-6 bg-blue-600"
              onClick={handleOk}
              disabled={loading}
            >
              OK
            </Button>
            <Button size="small" onClick={onClose} className="rounded-sm text-xs px-4">
              Annuler
            </Button>
          </div>
        </div>
      </Spin>
    </DesktopWindow>
  )
}

export default StockUnavailabilityModal
