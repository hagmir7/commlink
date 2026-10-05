import { useEffect, useState } from 'react'
import { Button, Form, Input, message as toast } from 'antd'
import { WhatsAppOutlined, SendOutlined, LoadingOutlined } from '@ant-design/icons'
import DesktopWindow from './ui/DesktopWindow'

/**
 * Turns whatever the user typed into digits with country code:
 *   "+212 600-000000" -> "212600000000"
 *   "0600000000"      -> "212600000000"  (when defaultCountryCode = '212')
 */
function normalizePhone(raw, defaultCountryCode) {
  let digits = String(raw || '').replace(/\D/g, '')
  if (digits.startsWith('00')) digits = digits.slice(2)
  else if (defaultCountryCode && digits.startsWith('0')) {
    digits = defaultCountryCode + digits.slice(1)
  }
  return digits
}

/**
 * Two modes:
 *  - Controlled (toolbar/menu use): pass `open` + `onClose`. No trigger button.
 *  - Standalone: omit `open`; a trigger button is rendered.
 *
 * Props
 *  - pdfUrl:             PDF to send (required)
 *  - fileName:           name shown in WhatsApp, e.g. "Invoice-123"
 *  - defaultPhone:       prefilled phone (e.g. the customer's number)
 *  - defaultMessage:     prefilled text (optional)
 *  - defaultCountryCode: for numbers typed with a leading 0 (default '212')
 *  - buttonLabel / buttonProps: standalone trigger button only
 */
export default function WhatsappSendDocument({
  open: controlledOpen,
  onClose,
  onSend,
  pdfUrl,
  fileName,
  defaultPhone = '',
  defaultMessage = '',
  defaultCountryCode = '212',
  buttonLabel = 'WhatsApp',
  buttonProps = {}
}) {
  const isControlled = controlledOpen !== undefined
  const [innerOpen, setInnerOpen] = useState(false)
  const open = isControlled ? controlledOpen : innerOpen

  const [sending, setSending] = useState(false)
  const [form] = Form.useForm()

  // Prefill every time the window opens.
  useEffect(() => {
    if (open) form.setFieldsValue({ phone: defaultPhone, text: defaultMessage })
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const close = () => {
    if (isControlled) onClose?.()
    else setInnerOpen(false)
  }

  // Closing mid-send would not stop the automation, so block it.
  const closeWindow = () => {
    if (!sending) close()
  }

  const handleSend = async () => {
    let values
    try {
      values = await form.validateFields()
    } catch {
      return
    }

    setSending(true)
    try {
      const res = await window.api.whatsappSendPdf(pdfUrl, {
        phone: normalizePhone(values.phone, defaultCountryCode),
        message: values.text?.trim() || '',
        fileName
      })

      if (res?.success) {
        toast.success(
          res.mode === 'desktop' ? 'Envoyé via WhatsApp Desktop' : 'Envoyé via WhatsApp Web'
        )
        close()
        onSend?.()
      } else {
        toast.error(res?.error || "Impossible d'envoyer le document")
      }
    } catch (err) {
      toast.error(err?.message || "Impossible d'envoyer le document")
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      {!isControlled && (
        <Button icon={<WhatsAppOutlined />} onClick={() => setInnerOpen(true)} {...buttonProps}>
          {buttonLabel}
        </Button>
      )}

      <DesktopWindow open={open} onClose={closeWindow} title="Envoyer via WhatsApp" width={460}>
        <Form form={form} layout="vertical" requiredMark={false} disabled={sending}>
          <Form.Item
            label="Numéro de téléphone"
            name="phone"
            extra="Avec indicatif pays, ou commencez par 0 pour un numéro local."
            rules={[
              { required: true, message: 'Le numéro est obligatoire' },
              {
                validator: (_, value) => {
                  const n = normalizePhone(value, defaultCountryCode)
                  return n.length >= 8 && n.length <= 15
                    ? Promise.resolve()
                    : Promise.reject(new Error('Numéro invalide'))
                }
              }
            ]}
          >
            <Input placeholder="+212 600 000 000" autoFocus onPressEnter={handleSend} />
          </Form.Item>

          <Form.Item label="Message (facultatif)" name="text">
            <Input.TextArea rows={4} placeholder="Bonjour, veuillez trouver votre document." />
          </Form.Item>

          {fileName && (
            <p className="mb-3 pb-3 truncate text-xs text-[#5F7052]">
              Pièce jointe : {fileName}.pdf
            </p>
          )}

          {sending && (
            <div className="pb-3">
              <div className="mb-3 flex items-center gap-2 rounded-md border border-[#D2DAC4] bg-[#F4F6F1] px-3 py-2 text-xs text-[#37402F]">
                <LoadingOutlined />
                <span>
                  Envoi en cours… ne touchez ni au clavier ni à la souris pendant environ 10
                  secondes.
                </span>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button size="small" onClick={closeWindow} disabled={sending}>
              Annuler
            </Button>
            <Button
              size="small"
              type="primary"
              icon={<SendOutlined />}
              onClick={handleSend}
              loading={sending}
              style={{ background: '#25D366' }}
            >
              Envoyer
            </Button>
          </div>
        </Form>
      </DesktopWindow>
    </>
  )
}
