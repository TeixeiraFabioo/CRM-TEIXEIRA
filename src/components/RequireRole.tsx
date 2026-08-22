import React, { useEffect, useRef } from 'react'
import { Navigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useUserRole } from '@/contexts/TenantContext'
import { useToast } from '@/hooks/use-toast'

interface RequireRoleProps {
  allowedRoles: string[]
  children: React.ReactNode
}

/**
 * Route guard that restricts access to users whose role is in `allowedRoles`.
 * If the authenticated user does not have one of the allowed roles, they are
 * redirected to the dashboard (`/`) with a toast notification.
 */
export const RequireRole: React.FC<RequireRoleProps> = ({ allowedRoles, children }) => {
  const { role } = useUserRole()
  const { toast } = useToast()
  const firedRef = useRef(false)

  const isAllowed = role !== null && allowedRoles.includes(role)

  useEffect(() => {
    if (role && !isAllowed && !firedRef.current) {
      firedRef.current = true
      toast({
        title: 'Acesso restrito',
        description: 'Você não tem permissão para acessar esta área.',
        variant: 'destructive',
      })
    }
  }, [role, isAllowed, toast])

  if (role === null) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
      </div>
    )
  }

  if (!isAllowed) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
