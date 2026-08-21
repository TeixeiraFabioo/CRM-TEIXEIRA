import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { TenantProvider } from '@/contexts/TenantContext'
import Layout from '@/components/Layout'
import { AuthGuard } from '@/components/AuthGuard'

// Auth Pages
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
import NotFound from '@/pages/NotFound'

export default function App() {
  return (
    <TenantProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Auth Routes */}
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
            <Route index element={<DashboardPage />} />

            {/* Leads */}
            <Route path="leads" element={<LeadsPage />} />
            <Route path="leads/:id" element={<LeadDetailPage />} />

            {/* Clientes */}
            <Route path="clientes" element={<CustomersPage />} />
            <Route path="clientes/:id" element={<CustomerDetailPage />} />

            {/* Pessoas & Empresas */}
            <Route path="pessoas" element={<PessoasPage />} />
            <Route path="pessoas/:id" element={<PessoaDetailPage />} />
            <Route path="empresas" element={<EmpresasPage />} />
            <Route path="empresas/:id" element={<EmpresaDetailPage />} />

            {/* Pipeline & Opportunities */}
            <Route path="pipeline" element={<PipelinePage />} />
            <Route path="opportunities" element={<PipelinePage />} />
            <Route path="oportunidades/:id" element={<OpportunityDetailPage />} />

            {/* Sales & Documents */}
            <Route path="tarefas" element={<TarefasPage />} />
            <Route path="propostas" element={<PropostasPage />} />
            <Route path="contratos" element={<ContratosPage />} />
            <Route path="comissoes" element={<ComissoesPage />} />
            <Route path="metas" element={<MetasPage />} />
            <Route path="ranking" element={<RankingPage />} />

            {/* Marketing & Intelligence */}
            <Route path="campanhas" element={<CampanhasPage />} />
            <Route path="marketing" element={<MarketingPage />} />
            <Route path="inteligencia" element={<InteligenciaPage />} />
            <Route path="relatorios" element={<RelatoriosPage />} />
            <Route path="automacoes" element={<AutomacoesPage />} />

            {/* System */}
            <Route path="integrations" element={<IntegrationsPage />} />
            <Route path="settings" element={<SettingsPage />} />

            {/* Fallback */}
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
        <Toaster />
      </BrowserRouter>
    </TenantProvider>
  )
}
