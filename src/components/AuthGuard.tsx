import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useTenant } from '@/contexts/TenantContext'
import { Loader2 } from 'lucide-react'

export const AuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useTenant()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#061224] flex flex-col items-center justify-center text-slate-100 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
        <div className="text-xs tracking-widest uppercase font-legal-serif text-slate-300">
          Carregando Sessão Jurídica...
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}
