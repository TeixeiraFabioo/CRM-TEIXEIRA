migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    // 1. Criar coleção knowledge_base
    const knowledgeBase = new Collection({
      name: 'knowledge_base',
      type: 'base',
      listRule:
        "@request.auth.id != '' && (tenant_id = @request.auth.tenant_id || @request.auth.tenant_id = '' || tenant_id = '')",
      viewRule:
        "@request.auth.id != '' && (tenant_id = @request.auth.tenant_id || @request.auth.tenant_id = '' || tenant_id = '')",
      createRule:
        "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'manager')",
      updateRule:
        "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'manager')",
      deleteRule:
        "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'manager')",
      fields: [
        {
          name: 'tenant_id',
          type: 'text',
          required: true,
        },
        {
          name: 'content',
          type: 'text',
          required: true,
        },
        {
          name: 'updated_by',
          type: 'relation',
          collectionId: users.id,
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_knowledge_base_tenant ON knowledge_base (tenant_id)'],
    })
    app.save(knowledgeBase)

    // 2. Seed initial knowledge base content for existing tenants if any
    try {
      const tenants = app.findRecordsByFilter('tenants', '', '', 100, 0)
      const defaultContent = `# BASE DE CONHECIMENTO & DIRETRIZES TÉCNICAS DO ESCRITÓRIO
## Teixeira & Nascimento — Advogados Associados

### 1. ÁREAS DE ATUAÇÃO E TESES PRINCIPAIS

#### A. DIREITO TRIBUTÁRIO E RECUPERAÇÃO DE CRÉDITOS
- **Exclusão do ICMS da Base de Cálculo do PIS/COFINS (Tema 69 / STF):** Aplicável a empresas no regime do Lucro Real e Lucro Presumido. Prazo prescricional quinquenal (últimos 5 anos). Documentação necessária: EFD-Contribuições, SPED Fiscal e Dacon.
- **Não incidência de contribuição previdenciária patronal (INSS) sobre verbas indenizatórias:** Primeiros 15 dias de auxílio-doença, terço constitucional de férias indenizadas e aviso prévio indenizado.
- **Subvenções de Investimento (ICMS) no IRPJ/CSLL:** Análise com base nas alterações da Lei 14.789/2023.

#### B. DIREITO BANCÁRIO & CONTRATOS EMPRESARIAIS
- **Revisão de Juros Abusivos e Tarifas Bancárias (CCB, Capital de Giro e Conta Garantida):** Análise da taxa média de mercado divulgada pelo Banco Central (Bacen) para o período da contratação. Afastamento de comissão de permanência cumulada com outros encargos.
- **Defesa em Execuções de Título Extrajudicial:** Embargos à execução com pedido de efeito suspensivo mediante garantia ou nulidade de título executivo.

#### C. DIREITO TRABALHISTA CORPORATIVO (DEFESA EMPRESARIAL)
- **Compliance e Auditoria Preventiva de Passivos Trabalhistas:** Revisão de horas extras, equiparação salarial, terceirização de serviços (Lei 13.429/2017) e contratos de PJ/Autônomos.
- **Acordos e Negociações Pré-processuais:** Foco em quitação ampla e irrestrita através de homologação de acordo extrajudicial (art. 855-B da CLT).

---

### 2. POLÍTICAS DE ACORDO E HONORÁRIOS

- **Honorários de Entrada / Pro Labore:** 
  - Mínimo padrão de R$ 5.000,00 a R$ 25.000,00 a depender da complexidade do caso e porte da empresa.
  - Parcelamento em até 6x no boleto ou cartão corporativo.
- **Honorários de Êxito (Ad Exitum):**
  - Recuperação Tributária Administrativa / Compensação: 15% a 20% sobre o proveito econômico obtido.
  - Ações Judiciais Contenciosas: 20% a 30% sobre o valor liquidado.
- **Alçada para Concessão de Descontos:**
  - Consultor Comercial: até 5% no honorário de entrada com pagamento à vista.
  - Gestor da Unidade: até 10% de desconto ou extensão do parcelamento em até 10x.
  - Sócio / Administrador: aprovação exclusiva para percentuais acima de 10% ou carências contratuais.

---

### 3. PROCEDIMENTOS DE ATENDIMENTO E QUALIFICAÇÃO DO LEAD

1. **Primeiro Contato (SLA < 15 minutos):** Confirmar se o interlocutor é decisor (Sócio, Diretor Financeiro ou CFO).
2. **Coleta de Informações Básicas:** Faturamento médio mensal, regime tributário atual (Simples Nacional, Lucro Presumido ou Lucro Real), quantidade de funcionários e existência de passivos ativos.
3. **Agendamento de Consulta de Diagnóstico:** Consulta gratuita de 30 minutos com especialista da área para apresentação da tese.
4. **Envio da Proposta:** Prazo máximo de 24 horas após a reunião de diagnóstico.`

      for (let i = 0; i < tenants.length; i++) {
        const t = tenants[i]
        try {
          const rec = new Record(knowledgeBase)
          rec.set('tenant_id', t.id)
          rec.set('content', defaultContent)
          app.save(rec)
        } catch (_) {}
      }
    } catch (_) {}
  },
  (app) => {
    try {
      const knowledgeBase = app.findCollectionByNameOrId('knowledge_base')
      app.delete(knowledgeBase)
    } catch (_) {}
  },
)
