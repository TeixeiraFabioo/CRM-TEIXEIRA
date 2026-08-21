// Hook para gerar comissões automaticamente quando contratos são criados ou atualizados como assinados

onRecordCreate((e) => {
  e.next()

  try {
    const contract = e.record
    if (!contract) return

    const status = (contract.getString('status') || '').toLowerCase()
    const signStatus = (contract.getString('sign_status') || '').toLowerCase()

    const isSigned = status === 'assinado' || signStatus === 'signed'
    if (!isSigned) return

    const tenantId = contract.getString('tenant_id')
    if (!tenantId) return

    const contractId = contract.id
    const contractVal = contract.getNumber('valor') || 0
    const oppId = contract.getString('oportunidade_id')
    const propId = contract.getString('proposta_id')
    const custId = contract.getString('cliente_id')

    // Verificar se já existe comissão para este contrato
    try {
      const existing = $app.findRecordsByFilter(
        'commissions',
        'tenant_id = {:tenantId} && contrato_id = {:contractId}',
        '-created',
        1,
        0,
        { tenantId: tenantId, contractId: contractId },
      )
      if (existing.length > 0) {
        return
      }
    } catch (_) {}

    // Identificar o responsável
    let responsibleUserId = ''
    if (oppId) {
      try {
        const oppRecord = $app.findRecordById('opportunities', oppId)
        if (oppRecord) {
          responsibleUserId =
            oppRecord.getString('assigned_to') || oppRecord.getString('responsavel_id')
        }
      } catch (_) {}
    }

    if (!responsibleUserId && propId) {
      try {
        const propRecord = $app.findRecordById('proposals', propId)
        if (propRecord) {
          responsibleUserId = propRecord.getString('responsavel_id')
        }
      } catch (_) {}
    }

    if (!responsibleUserId && custId) {
      try {
        const custRecord = $app.findRecordById('customers', custId)
        if (custRecord) {
          responsibleUserId = custRecord.getString('responsavel_id')
        }
      } catch (_) {}
    }

    if (!responsibleUserId) {
      try {
        const users = $app.findRecordsByFilter(
          'users',
          'tenant_id = {:tenantId} && active = true',
          'created',
          1,
          0,
          { tenantId: tenantId },
        )
        if (users.length > 0) {
          responsibleUserId = users[0].id
        }
      } catch (_) {}
    }

    if (!responsibleUserId) return

    const defaultPercent = 10
    const commissionValue = contractVal > 0 ? (contractVal * defaultPercent) / 100 : 0

    const commCol = $app.findCollectionByNameOrId('commissions')
    const commRec = new Record(commCol)
    commRec.set('tenant_id', tenantId)
    commRec.set('usuario_id', responsibleUserId)
    commRec.set('contrato_id', contractId)
    if (oppId) commRec.set('oportunidade_id', oppId)
    commRec.set('tipo', 'percentual')
    commRec.set('percentual', defaultPercent)
    commRec.set('valor', commissionValue)
    commRec.set('status', 'pendente')
    commRec.set('data_geracao', new Date().toISOString())
    $app.save(commRec)
  } catch (err) {
    console.log('Erro no hook onRecordCreate de comissões:', err)
  }
}, 'contracts')

onRecordUpdate((e) => {
  e.next()

  try {
    const contract = e.record
    if (!contract) return

    const newStatus = (contract.getString('status') || '').toLowerCase()
    const originalStatus = (contract.original().getString('status') || '').toLowerCase()
    const newSignStatus = (contract.getString('sign_status') || '').toLowerCase()
    const originalSignStatus = (contract.original().getString('sign_status') || '').toLowerCase()

    const isNowSigned =
      (newStatus === 'assinado' && originalStatus !== 'assinado') ||
      (newSignStatus === 'signed' && originalSignStatus !== 'signed')

    if (!isNowSigned) {
      return
    }

    const tenantId = contract.getString('tenant_id')
    if (!tenantId) return

    const contractId = contract.id
    const contractVal = contract.getNumber('valor') || 0
    const oppId = contract.getString('oportunidade_id')
    const propId = contract.getString('proposta_id')
    const custId = contract.getString('cliente_id')

    // Verificar se já existe comissão para este contrato
    try {
      const existing = $app.findRecordsByFilter(
        'commissions',
        'tenant_id = {:tenantId} && contrato_id = {:contractId}',
        '-created',
        1,
        0,
        { tenantId: tenantId, contractId: contractId },
      )
      if (existing.length > 0) {
        return // Já gerou comissão anteriormente
      }
    } catch (_) {}

    // Identificar o responsável (vendedor / advogado)
    let responsibleUserId = ''
    let oppRecord = null

    if (oppId) {
      try {
        oppRecord = $app.findRecordById('opportunities', oppId)
        if (oppRecord) {
          responsibleUserId =
            oppRecord.getString('assigned_to') || oppRecord.getString('responsavel_id')
        }
      } catch (_) {}
    }

    if (!responsibleUserId && propId) {
      try {
        const propRecord = $app.findRecordById('proposals', propId)
        if (propRecord) {
          responsibleUserId = propRecord.getString('responsavel_id')
        }
      } catch (_) {}
    }

    if (!responsibleUserId && custId) {
      try {
        const custRecord = $app.findRecordById('customers', custId)
        if (custRecord) {
          responsibleUserId = custRecord.getString('responsavel_id')
        }
      } catch (_) {}
    }

    // Se ainda não achou, pegar o primeiro usuário ativo do tenant
    if (!responsibleUserId) {
      try {
        const users = $app.findRecordsByFilter(
          'users',
          'tenant_id = {:tenantId} && active = true',
          'created',
          1,
          0,
          { tenantId: tenantId },
        )
        if (users.length > 0) {
          responsibleUserId = users[0].id
        }
      } catch (_) {}
    }

    if (!responsibleUserId) {
      return
    }

    // Regra padrão de comissionamento: 10% do valor do contrato
    const defaultPercent = 10
    const commissionValue = contractVal > 0 ? (contractVal * defaultPercent) / 100 : 0

    const commCol = $app.findCollectionByNameOrId('commissions')
    const commRec = new Record(commCol)
    commRec.set('tenant_id', tenantId)
    commRec.set('usuario_id', responsibleUserId)
    commRec.set('contrato_id', contractId)
    if (oppId) commRec.set('oportunidade_id', oppId)
    commRec.set('tipo', 'percentual')
    commRec.set('percentual', defaultPercent)
    commRec.set('valor', commissionValue)
    commRec.set('status', 'pendente')
    commRec.set('data_geracao', new Date().toISOString())
    $app.save(commRec)

    // Log de auditoria
    try {
      const auditCol = $app.findCollectionByNameOrId('audit_logs')
      const auditRec = new Record(auditCol)
      auditRec.set('tenant_id', tenantId)
      auditRec.set('user_id', responsibleUserId)
      auditRec.set('action', 'commission_generated_from_contract')
      auditRec.set('resource_type', 'commission')
      auditRec.set('resource_id', commRec.id)
      auditRec.set('new_value', {
        contract_id: contractId,
        valor: commissionValue,
        percentual: defaultPercent,
        status: 'pendente',
      })
      $app.save(auditRec)
    } catch (_) {}
  } catch (err) {
    console.log('Erro no hook onRecordUpdate de comissões:', err)
  }
}, 'contracts')
