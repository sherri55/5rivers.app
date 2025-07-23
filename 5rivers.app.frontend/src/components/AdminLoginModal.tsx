import React, { useState } from 'react';

interface AdminLoginModalProps {
  onSuccess: () => void;
}

const USERNAME = 'admin';
const PASSWORD = 'password';

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({ onSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === USERNAME && password === PASSWORD) {
      setError('');
      onSuccess();
    } else {
      setError('Invalid username or password');
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999
    }}>
      <form onSubmit={handleSubmit} style={{
        background: '#fff',
        padding: 32,
        borderRadius: 8,
        boxShadow: '0 2px 16px rgba(0,0,0,0.2)',
        minWidth: 320
      }}>
        <h2 style={{marginBottom: 16}}>Admin Login</h2>
        <div style={{marginBottom: 12}}>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            style={{width: '100%', padding: 8, marginBottom: 8}}
            autoFocus
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={{width: '100%', padding: 8}}
          />
        </div>
        {error && <div style={{color: 'red', marginBottom: 8}}>{error}</div>}
        <button type="submit" style={{width: '100%', padding: 10, background: '#2563eb', color: '#fff', border: 'none', borderRadius: 4}}>Login</button>
      </form>
    </div>
  );
};
