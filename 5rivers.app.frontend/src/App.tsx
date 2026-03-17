import React from 'react'
import { Layout } from '@/components/Layout'
import { AppRoutes } from '@/routes'
import { LoginModal, useAuth } from '@/features/auth'

function App() {
  const { isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    return <LoginModal />
  }

  return (
    <Layout>
      <AppRoutes />
    </Layout>
  )
}

export default App
