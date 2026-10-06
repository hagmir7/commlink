import React from 'react'
import { useParams } from 'react-router-dom'
import BackButton from './BackButton'

export default function ShowClient() {
  const { num } = useParams()
  return (
    <div>
      <BackButton />
      ShowClient
    </div>
  )
}
