import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ApolloProvider } from '@apollo/client'
import App from './App.tsx'
import './index.css'
import { apolloClient } from './lib/apollo-client'
import { AuthProvider } from '@/features/auth'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { Toaster } from '@/components/ui/sonner'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <ApolloProvider client={apolloClient}>
          <BrowserRouter>
            <App />
            <Toaster />
          </BrowserRouter>
        </ApolloProvider>
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
