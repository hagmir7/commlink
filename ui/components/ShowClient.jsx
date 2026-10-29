import React from 'react'
import { useParams } from 'react-router-dom'
import BackButton from './BackButton'
import ClientForm from './Client/ClientForm'

export default function ShowClient() {
  const { num } = useParams()
  return (
    <div>
      {/* <BackButton /> */}
      <ClientForm />
    </div>
  )
}
