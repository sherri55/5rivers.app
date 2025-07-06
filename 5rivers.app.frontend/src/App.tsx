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

function App() {
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
