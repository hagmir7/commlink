import React, { useState } from 'react'
import { Select, Input, Button, message } from 'antd'
import { LoadingOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons'

const STORAGE_KEY = 'connection_url'

const connections = [
  { label: 'Local', value: 'http://192.168.1.19' },
  { label: 'Online', value: 'https://comlink.intercocina.online' },
  { label: 'Développement', value: 'https://localhost:7244' },
  { label: 'Personnalisée', value: 'custom' }
]

// Local is the default connection
const DEFAULT_CONNECTION = connections[0].value

const isPredefined = (url) => connections.some((c) => c.value === url && c.value !== 'custom')

// Safe localStorage access (can throw in private mode / blocked storage)
const readStorage = () => {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

const writeStorage = (value) => {
  try {
    localStorage.setItem(STORAGE_KEY, value)
  } catch {
    /* ignore */
  }
}

// Resolve the initial state once, synchronously, so Local is used right away
const getInitialState = () => {
  const saved = readStorage()

  if (!saved) {
    writeStorage(DEFAULT_CONNECTION)
    return { connection: DEFAULT_CONNECTION, selected: DEFAULT_CONNECTION, custom: '' }
  }

  if (isPredefined(saved)) {
    return { connection: saved, selected: saved, custom: '' }
  }

  return { connection: saved, selected: 'custom', custom: saved }
}

const normalizeUrl = (url) => url.trim().replace(/\/+$/, '')

const testUrl = async (url) => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 5000)

  try {
    const response = await fetch(url, {
      method: 'GET',
      mode: 'no-cors',
      signal: controller.signal
    })

    return response.type === 'opaque' || response.ok
  } catch {
    return false
  } finally {
    clearTimeout(timer)
  }
}

export default function Connection() {
  const [messageApi, contextHolder] = message.useMessage()
  const [initial] = useState(getInitialState)

  const [connection, setConnection] = useState(initial.connection)
  const [customUrl, setCustomUrl] = useState(initial.custom)
  const [selectedValue, setSelectedValue] = useState(initial.selected)
  const [testing, setTesting] = useState(false)

  // Value the Select should show again if a test fails
  const currentSelectValue = isPredefined(connection) ? connection : 'custom'

  const saveUrl = (url) => {
    if (url === connection) {
      messageApi.success({ content: 'Connexion déjà active ✅', icon: <CheckCircleOutlined /> })
      return
    }

    setConnection(url)
    writeStorage(url)

    messageApi.success({
      content: 'Connexion enregistrée ✅',
      icon: <CheckCircleOutlined />
    })

    setTimeout(() => {
      window.location.reload()
    }, 500)
  }

  const testAndSave = async (url) => {
    setTesting(true)

    messageApi.loading({
      content: 'Test de connexion en cours...',
      key: 'test',
      duration: 0
    })

    const ok = await testUrl(url)

    setTesting(false)

    if (!ok) {
      messageApi.error({
        content: `Impossible de joindre ${url}`,
        key: 'test',
        duration: 4,
        icon: <CloseCircleOutlined />
      })
      return false
    }

    messageApi.destroy('test')
    saveUrl(url)
    return true
  }

  const handleSelect = async (value) => {
    setSelectedValue(value)

    if (value === 'custom') {
      // Only show the input; the saved connection stays untouched until a valid URL is saved
      return
    }

    const ok = await testAndSave(value)

    if (!ok) {
      // Keep the previous connection and restore the Select to match it
      setSelectedValue(currentSelectValue)
    }
  }

  const saveCustomUrl = async () => {
    const url = normalizeUrl(customUrl)

    if (!/^https?:\/\/.+/i.test(url)) {
      messageApi.error("L'URL doit commencer par http:// ou https://")
      return
    }

    setCustomUrl(url)
    await testAndSave(url)
  }

  const showCustomInput = selectedValue === 'custom'

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        width: 300
      }}
    >
      {contextHolder}

      <Select
        placeholder="Type de connexion"
        options={connections}
        onChange={handleSelect}
        value={selectedValue}
        disabled={testing}
        suffixIcon={testing ? <LoadingOutlined /> : undefined}
      />

      {showCustomInput && (
        <div style={{ display: 'flex', gap: 8 }}>
          <Input
            placeholder="Entrez votre URL personnalisée"
            value={customUrl}
            onChange={(e) => setCustomUrl(e.target.value)}
            disabled={testing}
            onPressEnter={saveCustomUrl}
          />

          <Button type="primary" onClick={saveCustomUrl} loading={testing}>
            Sauvegarder
          </Button>
        </div>
      )}
    </div>
  )
}
