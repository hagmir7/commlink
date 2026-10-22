import { useState, useEffect, useMemo } from 'react'
import { Form, Input, DatePicker, Select, Button, message, Divider } from 'antd'
import { DownOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import DesktopWindow from './ui/DesktopWindow'
import { DOCUMENT_TYPES, SOUCHE_OPTIONS } from '../constants/documentTypes'
import { api } from '../utils/api'
import { getStatut } from '../utils/helpers'

const DATE_FORMAT_API = 'YYYY-MM-DDTHH:mm:ss'

// Display labels for the document type (fallback: raw value)
const TYPE_LABELS = {
  DocumentTypeVenteDevis: 'Devis',
  DocumentTypeVenteCommande: 'Bon de commande',
  DocumentTypeVenteLivraison: 'Bon de livraison',
  DocumentTypeVenteFacture: 'Facture'
}

// DOCUMENT_TYPES entries look like { type, value, label, code, domain, color },
// so try every plausible key instead of assuming only one.
const TYPE_MATCH_KEYS = ['value', 'type', 'code']

function findDocumentType(rawType) {
  if (rawType === null || rawType === undefined) return undefined
  const list = Array.isArray(DOCUMENT_TYPES) ? DOCUMENT_TYPES : []
  const raw = String(rawType)

  for (const key of TYPE_MATCH_KEYS) {
    const found = list.find(
      (entry) =>
        entry && entry[key] !== null && entry[key] !== undefined && String(entry[key]) === raw
    )
    if (found) return found
  }
  return undefined
}

// Always returns a *string* (never an object) so it is safe to render.
function getDocumentTypeLabel(rawType) {
  const found = findDocumentType(rawType)
  if (found) return found.label ?? found.code ?? found.value ?? String(rawType)
  if (rawType === null || rawType === undefined) return undefined
  return TYPE_LABELS[rawType] ?? String(rawType)
}

// Keep the original souche if the option list does not contain it,
// instead of silently replacing it with the first option.
function normalizeSouche(rawSouche) {
  const list = Array.isArray(SOUCHE_OPTIONS) ? SOUCHE_OPTIONS : []
  if (rawSouche === null || rawSouche === undefined) return list[0]?.value
  const found = list.find((option) => String(option?.value) === String(rawSouche))
  return found ? found.value : rawSouche
}

/**
 * Props:
 *   docSource — the row being duplicated (null when closed)
 *   open      — visibility
 *   close     — () => void
 *   onSubmit  — async (payload, docSource) => void
 *               payload = { date, reference, souche, clientCode }
 */

export default function DuplicateDocumentModal({ docSource, open, close, onSubmit }) {
  const [form] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)
  const [clients, setClients] = useState([])
  const [clientsLoaded, setClientsLoaded] = useState(false)
  const [loadingClients, setLoadingClients] = useState(false)

  // Stable identity for the source document (avoids resetting the form
  // on every parent re-render when docSource is a fresh object literal).
  const docKey = docSource ? `${docSource.type}-${docSource.piece}` : 'empty'

  // Load the client list when the modal opens (only once, retried on failure)
  useEffect(() => {
    if (!open || clientsLoaded) return
    let cancelled = false

    ;(async () => {
      try {
        setLoadingClients(true)
        const res = await api.get('/clients/short')
        if (cancelled) return
        const raw = Array.isArray(res?.data) ? res.data : (res?.data?.data ?? [])
        setClients(Array.isArray(raw) ? raw : [])
        setClientsLoaded(true)
      } catch (err) {
        if (!cancelled) message.error('Impossible de charger la liste des clients')
      } finally {
        if (!cancelled) setLoadingClients(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [open, clientsLoaded])

  // Seed the editable fields every time the modal opens or the source changes.
  useEffect(() => {
    if (!open) return
    form.setFieldsValue({
      date: dayjs(), // a duplicate starts today
      reference: docSource?.ref ?? '',
      souche: normalizeSouche(docSource?.souche),
      clientCode: docSource?.clientCode ?? undefined
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, docKey, form])

  // Adjust the field names to match what /clients/short really returns
  const clientOptions = useMemo(() => {
    const options = clients.map((c) => {
      const code = c.code ?? c.clientCode ?? c.numero
      const name = c.name ?? c.intitule ?? c.clientName ?? ''
      return { value: code, label: name ? `${code} — ${name}` : String(code ?? '') }
    })

    // Make sure the source document's client is selectable even if it is
    // missing from /clients/short (inactive or deleted client).
    const current = docSource?.clientCode
    if (current && !options.some((o) => String(o.value) === String(current))) {
      options.unshift({
        value: current,
        label: docSource?.clientIntitule
          ? `${current} — ${docSource.clientIntitule}`
          : String(current)
      })
    }

    return options
  }, [clients, docSource])

  const handleFinish = async (values) => {
    const payload = {
      date: values.date.startOf('day').format(DATE_FORMAT_API), // "2026-10-25T00:00:00"
      reference: (values.reference ?? '').trim(),
      souche: values.souche,
      clientCode: values.clientCode
    }

    try {
      setSubmitting(true)
      await onSubmit?.(payload, docSource)
      message.success('Document dupliqué')
      close?.()
    } catch (err) {
      message.error(err?.response?.data?.message || err?.message || 'Échec de la duplication')
    } finally {
      setSubmitting(false)
    }
  }

  const originalDate = docSource?.date ? dayjs(docSource.date) : null

  return (
    <DesktopWindow
      open={open}
      onClose={close}
      title={`Dupliquer le document${docSource?.piece ? ` ${docSource.piece}` : ''}`}
      width={480}
      canClose={!submitting}
    >
      <div className="text-[13px] text-gray-800">
        {/* ---------------------------------------------------------------
            Original document (read-only)
        --------------------------------------------------------------- */}

        <Divider titlePlacement="start">Document original</Divider>

        <div className="mb-1 flex flex-col gap-1">
          <InfoRow label="Type du document" value={getDocumentTypeLabel(docSource?.type)} />
          <InfoRow label="N° de pièce" value={docSource?.piece} />
          <InfoRow label="N° compte client" value={docSource?.clientCode} />
          <InfoRow label="Intitulé client" value={docSource?.clientIntitule} />
          <InfoRow
            label="Date"
            value={originalDate?.isValid() ? originalDate.format('DDMMYY') : undefined}
          />
          <InfoRow label="Référence" value={docSource?.ref} />
          <InfoRow label="Statut" value={getStatut(docSource?.type, docSource?.statut)?.label} />
        </div>

        {/* ---------------------------------------------------------------
            New document (editable)
        --------------------------------------------------------------- */}
        <Divider titlePlacement="start">Paramètres du nouveau document</Divider>

        <Form
          form={form}
          size="small"
          layout="horizontal"
          colon={false}
          labelAlign="right"
          labelCol={{ flex: '130px' }}
          wrapperCol={{ flex: 1 }}
          onFinish={handleFinish}
          requiredMark={false}
          className="[&_.ant-form-item]:!mb-1 [&_.ant-form-item-label>label]:text-[13px] [&_.ant-form-item-label>label]:text-gray-700"
        >
          <div className="px-2 pb-3">
            <Form.Item
              name="date"
              label="Date"
              rules={[{ required: true, message: 'La date est obligatoire' }]}
            >
              <DatePicker size="small" format="DD/MM/YYYY" className="w-full" allowClear={false} />
            </Form.Item>

            <Form.Item name="reference" label="Référence">
              <Input size="small" placeholder="Référence" maxLength={50} />
            </Form.Item>

            <Form.Item
              name="souche"
              label="Souche"
              rules={[{ required: true, message: 'La souche est obligatoire' }]}
            >
              <Select
                size="small"
                className="w-full"
                suffixIcon={<DownOutlined className="text-[10px] text-gray-500" />}
                options={SOUCHE_OPTIONS}
              />
            </Form.Item>

            <Form.Item
              name="clientCode"
              label="N° client"
              rules={[{ required: true, message: 'Le client est obligatoire' }]}
            >
              <Select
                size="small"
                className="w-full"
                showSearch
                placeholder="Sélectionner un client"
                loading={loadingClients}
                options={clientOptions}
                optionFilterProp="label"
                suffixIcon={<DownOutlined className="text-[10px] text-gray-500" />}
                notFoundContent={loadingClients ? 'Chargement…' : 'Aucun client'}
              />
            </Form.Item>
          </div>

          <div className="flex shrink-0 items-center justify-end gap-2 border-t border-gray-300 bg-gradient-to-t from-white to-gray-100 p-2">
            <Button size="small" className="min-w-[76px]" onClick={close} disabled={submitting}>
              Annuler
            </Button>
            <Button
              type="primary"
              size="small"
              htmlType="submit"
              loading={submitting}
              className="min-w-[76px]"
            >
              Dupliquer
            </Button>
          </div>
        </Form>
      </div>
    </DesktopWindow>
  )
}

function InfoRow({ label, value }) {
  let display = '—'
  if (value !== null && value !== undefined && value !== '') {
    display = typeof value === 'object' ? (value.label ?? value.code ?? '—') : String(value)
  }

  return (
    <div className="grid grid-cols-[130px_1fr] items-baseline gap-3">
      <span className="whitespace-nowrap text-right text-[13px] text-gray-700">{label} :</span>
      <span className="text-[13px] text-gray-800">{display}</span>
    </div>
  )
}
