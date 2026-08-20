import React, { useState } from 'react'
import { Plus, UserPlus, Target, FileText, Calendar, Megaphone, Briefcase } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { useNavigate } from 'react-router-dom'

interface QuickActionMenuProps {
  onNewLead?: () => void
  onNewOpportunity?: () => void
  onNewTask?: () => void
}

export function QuickActionMenu({ onNewLead, onNewOpportunity, onNewTask }: QuickActionMenuProps) {
  const navigate = useNavigate()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="sm"
          className="h-9 gap-1.5 bg-[#0A1F3F] hover:bg-[#0A1F3F]/90 text-white dark:bg-blue-600 dark:hover:bg-blue-700 shadow-sm"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline font-semibold text-xs">Novo Registro</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52 shadow-xl border-border/80">
        <DropdownMenuItem
          onClick={() => {
            if (onNewLead) onNewLead()
            else navigate('/leads?novo=true')
          }}
          className="cursor-pointer gap-2 py-2"
        >
          <UserPlus className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <span className="text-xs font-medium">Novo Lead Jurídico</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            if (onNewOpportunity) onNewOpportunity()
            else navigate('/pipeline?nova=true')
          }}
          className="cursor-pointer gap-2 py-2"
        >
          <Target className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <span className="text-xs font-medium">Nova Oportunidade</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            if (onNewTask) onNewTask()
            else navigate('/tarefas?nova=true')
          }}
          className="cursor-pointer gap-2 py-2"
        >
          <Calendar className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-xs font-medium">Nova Tarefa / Reunião</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => navigate('/propostas?nova=true')}
          className="cursor-pointer gap-2 py-2"
        >
          <FileText className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          <span className="text-xs font-medium">Nova Proposta de Honorários</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => navigate('/campanhas?nova=true')}
          className="cursor-pointer gap-2 py-2"
        >
          <Megaphone className="h-4 w-4 text-rose-600 dark:text-rose-400" />
          <span className="text-xs font-medium">Nova Campanha Tráfego</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
