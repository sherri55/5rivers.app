import './index.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { ApolloProvider } from '@apollo/client';
import { apolloClient } from './lib/apollo-client';
import { AuthProvider, LoginModal, useAuth } from './features/auth';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

function AppGate() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <LoginModal />;
  return <App />;
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AuthProvider>
      <ApolloProvider client={apolloClient}>
        <AppGate />
      </ApolloProvider>
    </AuthProvider>
  </React.StrictMode>
);
