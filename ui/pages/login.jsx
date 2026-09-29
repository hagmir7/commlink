import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Form, Input, Button, Alert, Typography, Modal, AutoComplete, Badge } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../utils/api'
import Connection from '../components/Connection'
import { Link } from 'lucide-react'
import TitleBar from '../components/TitleBar'

const { Title, Text } = Typography

// Default connection
const DEFAULT_CONNECTION = 'http://192.168.1.38:30/api/'

// Sage palette (matches DesktopWindow)
const SAGE = {
  50: '#F4F6F1',
  100: '#E7EBE0',
  200: '#D2DAC4',
  400: '#93A47C',
  600: '#5F7052',
  800: '#37402F'
}

const Login = () => {
  const [form] = Form.useForm()
  const navigate = useNavigate()

  const { login, loading, message } = useAuth()

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [appVersion, setAppVersion] = useState('')
  const [errorType, setErrorType] = useState(null)

  const [usernames, setUsernames] = useState(() => {
    try {
      const saved = localStorage.getItem('usernames')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    if (window.api?.getVersion) {
      window.api.getVersion().then(setAppVersion)
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('usernames', JSON.stringify(usernames))
  }, [usernames])

  useEffect(() => {
    if (!localStorage.getItem('connection_url')) {
      localStorage.setItem('connection_url', DEFAULT_CONNECTION)
    }

    form.setFieldsValue({
      login: import.meta.env.MODE === 'development' ? '<Administrateur>' : '',
      password: import.meta.env.MODE === 'development' ? '' : ''
    })

    checkAuth()
  }, [form])

  const handleSubmit = async (values) => {
    try {
      setErrorType(null)

      await login(values)

      const token = localStorage.getItem('authToken')

      if (!token) {
        setErrorType('auth')
        return
      }

      const updated = Array.from(new Set([values.login, ...usernames]))

      localStorage.setItem('usernames', JSON.stringify(updated))

      setUsernames(updated)
    } catch (error) {
      console.error('Login error:', error)

      if (
        error?.message?.includes('Network') ||
        error?.code === 'ERR_NETWORK' ||
        error?.code === 'ECONNREFUSED' ||
        !navigator.onLine
      ) {
        setErrorType('network')
      } else {
        setErrorType('auth')
      }
    }
  }

  const checkAuth = async () => {
    const token = localStorage.getItem('authToken')

    if (!token) {
      return
    }

    try {
      const response = await api.get('auth/me')

      if (window.api) {
        console.log(token)
        await window.api.user({ user: response.data, access_token: token })
      } else {
        navigate('/')
      }
    } catch (error) {
      console.error('Auth check failed:', error)

      localStorage.removeItem('authToken')
    }
  }

  const getErrorMessage = () => {
    if (errorType === 'network') {
      return (
        <div>
          <div className="font-semibold mb-1">Erreur de connexion réseau</div>

          <div className="text-sm opacity-90">
            Impossible de se connecter au serveur. Veuillez vérifier votre connexion ou changer le
            type de connexion.
          </div>
        </div>
      )
    }

    return message
  }

  return (
    <div
      className="relative min-h-screen w-full overflow-hidden flex flex-col"
      style={{ backgroundColor: SAGE[50] }}
    >
      {/* Title bar */}
      <TitleBar title="Comlink — Connexion" />
      {/* Main content */}
      <div className="relative flex-1 w-full flex items-center justify-center">
        {/* Background gradient */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: `radial-gradient(circle at 15% 20%, ${SAGE[100]} 0%, transparent 45%), radial-gradient(circle at 85% 80%, ${SAGE[200]} 0%, transparent 50%), linear-gradient(160deg, ${SAGE[50]} 0%, ${SAGE[100]} 45%, ${SAGE[200]} 100%)`
          }}
        />

        {/* Background pattern */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.10]"
          style={{
            backgroundImage: `repeating-linear-gradient(45deg, ${SAGE[800]} 0px, ${SAGE[800]} 1px, transparent 1px, transparent 22px)`
          }}
        />

        {/* Login container */}
        <div className="relative w-full sm:max-w-md md:max-w-lg px-6 py-10 sm:px-10">
          {/* Logo + title */}
          <div className="relative z-10 text-center inline justify-center mb-8">
            <div className="flex w-full justify-center">
              <img
                className="h-14 mx-auto text-center mb-5"
                alt="Intercocina"
                src="https://www.intercocina.com/_next/image?url=https%3A%2F%2Fapp.intercocina.com%2Fassets%2Fimgs%2Fintercocina-logo.png&w=256&q=75"
              />
            </div>

            <Title level={4} className="!mb-1 mt-0 pt-0" style={{ color: SAGE[800] }}>
              Connectez-vous
            </Title>

            <Text style={{ color: SAGE[600] }}>
              Entrez vos identifiants pour accéder à votre compte.
            </Text>
          </div>

          {/* Error */}
          {(message || errorType === 'network') && (
            <Alert
              message={getErrorMessage()}
              type={errorType === 'network' ? 'warning' : 'error'}
              showIcon
              className="relative z-10 mb-6 rounded-lg"
              action={
                errorType === 'network' && (
                  <Button
                    size="small"
                    type="link"
                    onClick={() => setIsModalOpen(true)}
                    className="whitespace-nowrap"
                    style={{ color: SAGE[800] }}
                  >
                    Changer la connexion
                  </Button>
                )
              }
            />
          )}

          {/* Login form */}
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            requiredMark={false}
            className="relative z-10"
          >
            {/* Login */}
            <Form.Item
              name="login"
              label={
                <span className="font-medium" style={{ color: SAGE[800] }}>
                  E-mail ou Matricule
                </span>
              }
              rules={[
                {
                  required: true,
                  message: 'Veuillez entrer votre identifiant'
                }
              ]}
            >
              <AutoComplete
                options={usernames.map((username) => ({
                  value: username
                }))}
                placeholder="Entrez votre identifiant"
                size="large"
                className="w-full"
              >
                <Input
                  prefix={<UserOutlined style={{ color: SAGE[600] }} />}
                  size="large"
                  className="rounded-lg"
                  style={{ backgroundColor: '#ffffff', borderColor: SAGE[200] }}
                />
              </AutoComplete>
            </Form.Item>

            {/* Password */}
            <Form.Item
              name="password"
              label={
                <span className="font-medium" style={{ color: SAGE[800] }}>
                  Mot de passe
                </span>
              }
              rules={[
                {
                  required: true,
                  message: 'Veuillez entrer votre mot de passe'
                }
              ]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: SAGE[600] }} />}
                placeholder="Entrez votre mot de passe"
                size="large"
                className="rounded-lg"
                style={{ backgroundColor: '#ffffff', borderColor: SAGE[200] }}
              />
            </Form.Item>

            {/* Login button */}
            <Form.Item className="mt-6 mb-2">
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                size="middle"
                className="border-none rounded-lg h-9 font-semibold shadow-sm"
                style={{ backgroundColor: SAGE[600], color: '#ffffff' }}
              >
                {loading ? 'Connexion...' : 'Se connecter'}
              </Button>
            </Form.Item>
          </Form>

          {/* Connection configuration */}
          <div className="relative z-10 mt-6 flex items-center justify-center">
            <Button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 rounded-lg"
              style={{
                backgroundColor: '#ffffff',
                borderColor: SAGE[200],
                color: SAGE[800]
              }}
            >
              <Link size={16} />

              <span className="text-sm">Configurer la connexion</span>
            </Button>
          </div>

          {/* App version */}
          {window.api && (
            <div className="flex w-full justify-center">
              <Badge
                className="relative z-10 text-center font-bold mt-6 text-xs leading-4"
                style={{ color: SAGE[600] }}
              >
                v{appVersion}
              </Badge>
            </div>
          )}
        </div>
      </div>
      {/* Connection modal */}
      <Modal
        title="Type de connexion"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={false}
        width="90%"
        style={{
          maxWidth: 480
        }}
      >
        <Connection />
      </Modal>
    </div>
  )
}

export default Login
