import { Routes, Route } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { Dashboard } from '@/pages/Dashboard'
import { Companies } from '@/pages/Companies'
import { Drivers } from '@/pages/Drivers'
import { Units } from '@/pages/Units'
import { Dispatchers } from '@/pages/Dispatchers'
import { Jobs } from '@/pages/Jobs'
import { JobTypes } from '@/pages/JobTypes'
import { Invoices } from '@/pages/Invoices'
import { NotFound } from '@/pages/NotFound'
import React, { useEffect, useState } from 'react'
import { AdminLoginModal } from '@/components/AdminLoginModal'

function App() {
  const [authenticated, setAuthenticated] = useState(false)

  useEffect(() => {
    const auth = localStorage.getItem('admin-auth')
    if (auth === 'true') {
      setAuthenticated(true)
    }
  }, [])

  const handleSuccess = () => {
    setAuthenticated(true)
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000)
    localStorage.setItem('admin-auth', 'true')
    localStorage.setItem('admin-auth-expiry', expires.toISOString())
  }

  useEffect(() => {
    if (authenticated) {
      const expiry = localStorage.getItem('admin-auth-expiry')
      if (expiry && new Date(expiry) < new Date()) {
        localStorage.removeItem('admin-auth')
        localStorage.removeItem('admin-auth-expiry')
        setAuthenticated(false)
      }
    }
  }, [authenticated])

  if (!authenticated) {
    return <AdminLoginModal onSuccess={handleSuccess} />
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/companies" element={<Companies />} />
        <Route path="/drivers" element={<Drivers />} />
        <Route path="/units" element={<Units />} />
        <Route path="/dispatchers" element={<Dispatchers />} />
        <Route path="/jobs" element={<Jobs />} />
        <Route path="/job-types" element={<JobTypes />} />
        <Route path="/invoices" element={<Invoices />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  )
}

export default App
