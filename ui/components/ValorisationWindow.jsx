import React, { useEffect, useState, useCallback } from 'react'
import {
  Form,
  InputNumber,
  Select,
  Button,
  Table,
  Divider,
  Menu,
  Row,
  Col,
  message,
  Spin
} from 'antd'
import { Tag } from 'lucide-react'
import TitleBar from './TitleBar'
import { api } from '../utils/api'
import EcheancierTab from './EcheancierTab'

// --- Helpers ---
const SectionDivider = ({ children, className = '' }) => (
  <Divider orientation="left" plain className={`!mt-4 !mb-4 ${className}`}>
    {children}
  </Divider>
)

const FieldLabel = ({ span, children }) => (
  <Col
    span={span}
    className="text-right text-gray-600 leading-6 whitespace-nowrap"
    style={{ fontSize: '13px' }}
  >
    {children}
  </Col>
)

const formatMoney = (value) => {
  if (value === null || value === undefined) return '0,00'
  return Number(value).toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

const menuItems = [
  { key: 'pied', label: 'Pied' },
  { key: 'acomptes', label: 'Acomptes' },
  { key: 'echeancier', label: 'Echéancier' }
]

export default function ValorisationWindow({ heightClass = 'h-screen', piece = '25DE005440' }) {
  const [activeTab, setActiveTab] = useState('pied')
  const [expeditions, setExpeditions] = useState([])

  const [documentData, setDocumentData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // États locaux pour les champs modifiables
  const [editExpedition, setEditExpedition] = useState(null)
  const [editFrais, setEditFrais] = useState(0)
  const [editTxEscompte, setEditTxEscompte] = useState(0)

  // 1. Chargement des expéditions
  useEffect(() => {
    let cancelled = false
    const fetchExpeditions = async () => {
      try {
        const response = await api.get('expeditions')
        const options = (response.data ?? []).map((item) =>
          typeof item === 'string' ? { value: item, label: item } : item
        )
        if (!cancelled) setExpeditions(options)
      } catch (error) {
        message.error('Erreur lors du chargement des expéditions')
      }
    }
    fetchExpeditions()
    return () => {
      cancelled = true
    }
  }, [])

  // 2. Fonction de chargement des données (extractible pour le refetch)
  const fetchDocumentData = useCallback(async () => {
    if (!piece) return
    setLoading(true)
    try {
      const response = await api.get(`documents/${piece}/pied`)
      if (response.data?.success) {
        const { entete } = response.data
        setDocumentData(response.data)

        // Initialisation des champs modifiables avec les valeurs de l'API
        setEditExpedition(entete.expedition || null)
        setEditFrais(entete.do_ValFrais || 0)
        setEditTxEscompte(entete.do_TxEscompte || 0)
      } else {
        message.error('Impossible de récupérer les données.')
      }
    } catch (error) {
      message.error('Erreur de chargement du document.')
    } finally {
      setLoading(false)
    }
  }, [piece])

  // Chargement initial
  useEffect(() => {
    fetchDocumentData()
  }, [fetchDocumentData])

  // 3. Fonction de sauvegarde
  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = {
        expedition: editExpedition,
        fraisPort: editFrais,
        tauxEscompte: editTxEscompte
      }

      const response = await api.patch(`documents/${piece}/pied`, payload)

      if (response.data?.success) {
        message.success('Modifications enregistrées avec succès.')
        // ✅ REFETCH DES DONNÉES APRÈS SAUVEGARDE
        await fetchDocumentData()
      } else {
        message.error(response.data?.message || 'Erreur lors de la sauvegarde.')
      }
    } catch (error) {
      message.error(error.response?.data?.message || 'Erreur de communication avec le serveur.')
    } finally {
      setSaving(false)
    }
  }

  // --- Colonnes du tableau ---
  const tableColumns = [
    { title: 'Libellé', dataIndex: 'libelle', key: 'libelle' },
    { title: 'Base', dataIndex: 'base', key: 'base', align: 'right' },
    { title: 'Taux', dataIndex: 'taux', key: 'taux', align: 'right' },
    { title: 'Montant', dataIndex: 'montant', key: 'montant', align: 'right' }
  ]

  const formattedTaxes = (documentData?.recapTaxes || []).map((tax, index) => ({
    key: index.toString(),
    libelle: tax.libelle,
    base: formatMoney(tax.base_ || tax.base || 0),
    taux: `${formatMoney(tax.taux)} %`,
    montant: formatMoney(tax.montant)
  }))

  // --- Rendu de l'onglet Pied ---
  const renderPied = () => {
    if (loading)
      return (
        <div className="p-10 text-center">
          <Spin />
        </div>
      )
    if (!documentData)
      return <div className="p-10 text-center text-red-500">Document introuvable.</div>

    const { entete } = documentData

    return (
      <>
        <SectionDivider className="!mt-2">Escompte</SectionDivider>
        <Row gutter={16} className="mb-2">
          <FieldLabel span={4}>Taux d'escompte</FieldLabel>
          <Col span={8}>
            <InputNumber
              size="small"
              className="w-full rounded-sm"
              style={{ width: '100%' }}
              value={editTxEscompte}
              onChange={setEditTxEscompte}
              min={0}
              max={100}
              step={0.5}
            />
          </Col>
        </Row>

        <SectionDivider>Livraison / Expédition</SectionDivider>
        <Row gutter={24} className="mb-2">
          <Col span={12}>
            <Row gutter={8} className="items-center">
              <FieldLabel span={8}>Mode d'expédition</FieldLabel>
              <Col span={16}>
                <Select
                  size="small"
                  value={editExpedition}
                  onChange={setEditExpedition}
                  options={expeditions}
                  className="w-full"
                  allowClear
                />
              </Col>
            </Row>
          </Col>
          <Col span={12}>
            <Row gutter={8} className="items-center">
              <FieldLabel span={8}>Frais de Port (HT)</FieldLabel>
              <Col span={16}>
                <InputNumber
                  size="small"
                  className="w-full rounded-sm"
                  style={{ width: '100%' }}
                  value={editFrais}
                  onChange={setEditFrais}
                  min={0}
                  step={1}
                />
              </Col>
            </Row>
          </Col>
        </Row>
        <Row gutter={8} className="mb-4 items-center pt-3">
          <FieldLabel span={4}>Condition de livraison</FieldLabel>
          <Col span={20}>
            <Select size="small" disabled placeholder="Sélectionner..." className="w-full" />
          </Col>
        </Row>

        <SectionDivider>Récapitulation Escomptes et Taxes</SectionDivider>
        <Table
          size="small"
          columns={tableColumns}
          dataSource={formattedTaxes}
          pagination={false}
          bordered
          rowClassName="text-[12px]"
          className="mb-4"
        />

        <SectionDivider>Récapitulation TTC</SectionDivider>
        <div className="flex justify-end">
          <div className="w-[300px] bg-[#eef5fb] border border-[#cce0f5] rounded-md p-3">
            <div className="flex justify-between mb-1.5 text-gray-700">
              <span>Total HT</span>
              <span>{formatMoney(entete.do_TotalHT)}</span>
            </div>
            <div className="flex justify-between mb-1.5 text-gray-700">
              <span>Total HT Net</span>
              <span>{formatMoney(entete.do_TotalHTNet)}</span>
            </div>
            <div className="flex justify-between mb-1.5 text-gray-700">
              <span>Valorisation</span>
              <span>{formatMoney(entete.do_TotalTTC)}</span>
            </div>
            <div className="flex justify-between mb-1.5 text-gray-700">
              <span>Ecart</span>
              <span></span>
            </div>
            <Divider className="!my-2 !border-[#cce0f5]" />
            <div className="flex justify-between font-medium text-gray-800">
              <span>Total TTC</span>
              <span>{formatMoney(entete.do_TotalTTC)}</span>
            </div>
          </div>
        </div>
      </>
    )
  }

  const renderAcomptes = () => (
    <>
      <SectionDivider className="!mt-2">Acomptes</SectionDivider>
      <div className="text-gray-500">Aucun acompte.</div>
    </>
  )

  const renderEcheancier = () => (
    <>
      {/* <SectionDivider className="!mt-2">Echéancier</SectionDivider> */}

      <EcheancierTab documentPiece={piece} documentType={'DocumentTypeVenteDevis'} />
    </>
  )

  const tabContent = {
    pied: renderPied,
    acomptes: renderAcomptes,
    echeancier: renderEcheancier
  }

  return (
    <div
      className={`flex flex-col w-full ${heightClass} min-h-[300px] bg-white border border-gray-300 rounded-md overflow-hidden font-sans text-[12px] text-gray-800`}
    >
      <div className="shrink-0">
        <TitleBar
          title={`Valorisation TTC Devis N° ${documentData?.entete?.do_Piece || piece}`}
          chiled={true}
        />
      </div>

      <div className="flex h-[32px] shrink-0 items-center px-2 bg-[#e5eaed] border-b border-gray-300">
        <Button
          type="text"
          size="small"
          className="flex items-center gap-2 text-gray-700 hover:bg-gray-300"
        >
          <Tag size={14} className="rotate-90" />
          Remise
        </Button>
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div className="w-[120px] shrink-0 bg-[#f5f5f5] border-r border-gray-300 pt-1 overflow-y-auto">
          <Menu
            mode="inline"
            selectedKeys={[activeTab]}
            onClick={({ key }) => setActiveTab(key)}
            size="small"
            items={menuItems}
            inlineIndent={8}
            style={{ border: 'none', background: 'transparent', fontSize: '12px', width: '100%' }}
            className="!p-1 [&_.ant-menu-item]:!h-[26px] [&_.ant-menu-item]:!leading-[26px] [&_.ant-menu-item]:!my-0.5 [&_.ant-menu-item]:!px-2"
          />
        </div>

        <div className="flex-1 min-w-0 min-h-0 bg-white overflow-y-auto px-6 pb-4">
          <Form size="small" layout="horizontal">
            {tabContent[activeTab]()}
          </Form>
        </div>
      </div>

      <div className="flex h-[45px] shrink-0 items-center justify-end gap-2 bg-[#f8f9fa] border-t border-gray-300 px-4">
        <Button
          size="small"
          className="w-[80px] rounded-sm text-[12px]"
          onClick={() => fetchDocumentData()} // Annuler = refetch
          disabled={saving}
        >
          Annuler
        </Button>
        <Button
          type="primary"
          size="small"
          className="w-[80px] rounded-sm text-[12px]"
          onClick={handleSave}
          loading={saving}
        >
          OK
        </Button>
      </div>
    </div>
  )
}
