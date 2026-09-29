import { Button, Dropdown } from 'antd'
import { DownOutlined } from '@ant-design/icons'
import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

export default function DocumentsActionBar({
  onNouveau,
  onOpen,
  onDelete,
  onClose,
  canOpen,
  canDelete
}) {
  const navigate = useNavigate()

  const handleLogout = useCallback(async () => {
    localStorage.removeItem('authToken')
    localStorage.removeItem('user')

    try {
      if (window.api) {
        await window.api.logout()
      } else {
        navigate('/login')
      }
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }, [navigate])

  return (
    <div className="flex items-center justify-between px-3 py-2 border-t border-gray-300 bg-[#f0f0f0]">
      <Dropdown
        menu={{
          items: [
            { key: 'logout', label: 'Déconnexion', onClick: handleLogout },
            { key: 'print', label: 'Imprimer' }
          ]
        }}
        trigger={['click']}
      >
        <Button size="small">
          Actions <DownOutlined style={{ fontSize: 9 }} />
        </Button>
      </Dropdown>

      <div className="flex items-center gap-2">
        <Button size="small" disabled={!canOpen} onClick={onOpen}>
          Ouvrir
        </Button>
        <Button size="small" type="primary" onClick={onNouveau}>
          Nouveau
        </Button>
        <Button size="small" danger disabled={!canDelete} onClick={onDelete}>
          Supprimer
        </Button>
        <Button size="small">Fermer</Button>
      </div>
    </div>
  )
}
