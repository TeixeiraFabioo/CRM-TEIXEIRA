import React, { useEffect, useRef } from 'react'
import { Navigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useUserRole, type UserRole } from '@/contexts/TenantContext'
import { useToast } from '@/hooks/use-toast'

interface RequireRoleProps {
  /** Canonical roles allowed to view this route (admin | gestor | advogado). */
  allowedRoles: UserRole[]
  children: React.ReactNode
}

/**
 * Route guard that restricts access to users whose role is in `allowedRoles`.
 * If the authenticated user does not have one of the allowed roles, they are
 * redirected to the dashboard (`/`) with a toast notification. This blocks
 * direct URL access — typing a restricted path into the address bar still
 * hits this guard and bounces the user away.
 */
export const RequireRole: React.FC<RequireRoleProps> = ({ allowedRoles, children }) => {
  const { role, isLoading } = useUserRole()
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
    // Reset the toast latch when switching back to an allowed route so a
    // future denial can fire again.
    if (isAllowed) firedRef.current = false
  }, [role, isAllowed, toast])

  // Still resolving the auth session — show a spinner instead of flashing
  // a redirect. AuthGuard handles the unauthenticated case before we get here,
  // but keep this so the guard is safe to use in isolation.
  if (isLoading || role === null) {
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
