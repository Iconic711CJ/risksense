import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'sonner'
import './index.css'
import AppRouter from './router'
import AuthProvider from './components/auth/AuthProvider'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <AppRouter />
      <Toaster position="top-right" closeButton richColors />
    </AuthProvider>
  </StrictMode>,
)
