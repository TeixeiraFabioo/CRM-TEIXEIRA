import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { TenantProvider } from '@/contexts/TenantContext'
import Layout from '@/components/Layout'
import { AuthGuard } from '@/components/AuthGuard'
import { RequireRole } from '@/components/RequireRole'
import type { UserRole } from '@/contexts/TenantContext'

// Public Pages
import LandingPage from '@/pages/LandingPage'
import LoginPage from '@/pages/Login'
import RegisterPage from '@/pages/Register'

// CRM Pages
import DashboardPage from '@/pages/Index'
import LeadsPage from '@/pages/Leads'
import LeadDetailPage from '@/pages/LeadDetail'
import CustomersPage from '@/pages/Customers'
import CustomerDetailPage from '@/pages/CustomerDetail'
import PipelinePage from '@/pages/Pipeline'
import OpportunityDetailPage from '@/pages/OpportunityDetail'
import PessoasPage from '@/pages/Pessoas'
import PessoaDetailPage from '@/pages/PessoaDetail'
import EmpresasPage from '@/pages/Empresas'
import EmpresaDetailPage from '@/pages/EmpresaDetail'
import TarefasPage from '@/pages/Tarefas'
import PropostasPage from '@/pages/Propostas'
import ContratosPage from '@/pages/Contratos'
import ComissoesPage from '@/pages/Comissoes'
import MetasPage from '@/pages/Metas'
import RankingPage from '@/pages/Ranking'
import CampanhasPage from '@/pages/Campanhas'
import MarketingPage from '@/pages/Marketing'
import InteligenciaPage from '@/pages/Inteligencia'
import RelatoriosPage from '@/pages/Relatorios'
import AutomacoesPage from '@/pages/Automacoes'
import IntegrationsPage from '@/pages/Integrations'
import SettingsPage from '@/pages/Settings'
import MeuPerfilPage from '@/pages/MeuPerfil'
import KnowledgeBasePage from '@/pages/KnowledgeBase'
import AuditLogPage from '@/pages/AuditLog'
import NotFound from '@/pages/NotFound'

export default function App() {
  return (
    <TenantProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/landing" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/cadastro" element={<RegisterPage />} />

          {/* Protected CRM Application Routes */}
          <Route
            path="/"
            element={
              <AuthGuard>
                <Layout />
              </AuthGuard>
            }
          >
            {/* Dashboard — everyone */}

            {/* Leads — admin+gestor see all; advogado sees only their own (enforced by API rules) */}
            <Route
              index
              element={
                <RequireRole allowedRoles={['admin', 'gestor', 'advogado']}>
                  <DashboardPage />
                </RequireRole>
              }
            />
            <Route
              path="leads"
              element={
                <RequireRole allowedRoles={['admin', 'gestor', 'advogado']}>
                  <LeadsPage />
                </RequireRole>
              }
            />
            <Route
              path="leads/:id"
              element={
                <RequireRole allowedRoles={['admin', 'gestor', 'advogado']}>
                  <LeadDetailPage />
                </RequireRole>
              }
            />

            {/* Clientes — advogado sees only records under their responsibility */}
            <Route
              path="clientes"
              element={
                <RequireRole allowedRoles={['admin', 'gestor', 'advogado']}>
                  <CustomersPage />
                </RequireRole>
              }
            />
            <Route
              path="clientes/:id"
              element={
                <RequireRole allowedRoles={['admin', 'gestor', 'advogado']}>
                  <CustomerDetailPage />
                </RequireRole>
              }
            />

            {/* Pessoas & Empresas — admin + gestor only */}
            <Route
              path="pessoas"
              element={
                <RequireRole allowedRoles={['admin', 'gestor']}>
                  <PessoasPage />
                </RequireRole>
              }
            />
            <Route
              path="pessoas/:id"
              element={
                <RequireRole allowedRoles={['admin', 'gestor']}>
                  <PessoaDetailPage />
                </RequireRole>
              }
            />
            <Route
              path="empresas"
              element={
                <RequireRole allowedRoles={['admin', 'gestor']}>
                  <EmpresasPage />
                </RequireRole>
              }
            />
            <Route
              path="empresas/:id"
              element={
                <RequireRole allowedRoles={['admin', 'gestor']}>
                  <EmpresaDetailPage />
                </RequireRole>
              }
            />

            {/* Pipeline & Opportunities */}
            <Route
              path="pipeline"
              element={
                <RequireRole allowedRoles={['admin', 'gestor', 'advogado']}>
                  <PipelinePage />
                </RequireRole>
              }
            />
            <Route
              path="opportunities"
              element={
                <RequireRole allowedRoles={['admin', 'gestor', 'advogado']}>
                  <PipelinePage />
                </RequireRole>
              }
            />
            <Route
              path="oportunidades/:id"
              element={
                <RequireRole allowedRoles={['admin', 'gestor', 'advogado']}>
                  <OpportunityDetailPage />
                </RequireRole>
              }
            />

            {/* Sales & Documents */}
            <Route
              path="tarefas"
              element={
                <RequireRole allowedRoles={['admin', 'gestor', 'advogado']}>
                  <TarefasPage />
                </RequireRole>
              }
            />
            <Route
              path="propostas"
              element={
                <RequireRole allowedRoles={['admin', 'gestor']}>
                  <PropostasPage />
                </RequireRole>
              }
            />
            <Route
              path="contratos"
              element={
                <RequireRole allowedRoles={['admin', 'gestor']}>
                  <ContratosPage />
                </RequireRole>
              }
            />
            <Route
              path="comissoes"
              element={
                <RequireRole allowedRoles={['admin', 'gestor']}>
                  <ComissoesPage />
                </RequireRole>
              }
            />
            <Route
              path="metas"
              element={
                <RequireRole allowedRoles={['admin', 'gestor']}>
                  <MetasPage />
                </RequireRole>
              }
            />
            <Route
              path="ranking"
              element={
                <RequireRole allowedRoles={['admin', 'gestor']}>
                  <RankingPage />
                </RequireRole>
              }
            />

            {/* Marketing & Intelligence */}
            <Route
              path="campanhas"
              element={
                <RequireRole allowedRoles={['admin', 'gestor']}>
                  <CampanhasPage />
                </RequireRole>
              }
            />
            <Route
              path="marketing"
              element={
                <RequireRole allowedRoles={['admin', 'gestor']}>
                  <MarketingPage />
                </RequireRole>
              }
            />
            <Route
              path="inteligencia"
              element={
                <RequireRole allowedRoles={['admin', 'gestor']}>
                  <InteligenciaPage />
                </RequireRole>
              }
            />
            <Route
              path="relatorios"
              element={
                <RequireRole allowedRoles={['admin', 'gestor']}>
                  <RelatoriosPage />
                </RequireRole>
              }
            />
            <Route
              path="automacoes"
              element={
                <RequireRole allowedRoles={['admin', 'gestor']}>
                  <AutomacoesPage />
                </RequireRole>
              }
            />

            {/* System — admin only */}
            <Route
              path="integrations"
              element={
                <RequireRole allowedRoles={['admin']}>
                  <IntegrationsPage />
                </RequireRole>
              }
            />
            <Route
              path="settings"
              element={
                <RequireRole allowedRoles={['admin', 'gestor']}>
                  <SettingsPage />
                </RequireRole>
              }
            />
            <Route
              path="meu-perfil"
              element={
                <RequireRole allowedRoles={['admin', 'gestor', 'advogado']}>
                  <MeuPerfilPage />
                </RequireRole>
              }
            />
            <Route
              path="auditoria"
              element={
                <RequireRole allowedRoles={['admin']}>
                  <AuditLogPage />
                </RequireRole>
              }
            />
            <Route
              path="base-conhecimento"
              element={
                <RequireRole allowedRoles={['admin', 'gestor', 'advogado']}>
                  <KnowledgeBasePage />
                </RequireRole>
              }
            />

            {/* Fallback */}
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
        <Toaster />
      </BrowserRouter>
    </TenantProvider>
  )
}
