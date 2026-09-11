migrate(
  (app) => {
    // 1. Adicionar campo error_message (text, opcional) à coleção integration_configs se não existir
    const icCol = app.findCollectionByNameOrId('integration_configs')
    if (!icCol.fields.getByName('error_message')) {
      icCol.fields.add(new TextField({ name: 'error_message' }))
      app.save(icCol)
    }

    // 2. Unificar config -> config_json e api_key -> api_token em integration_configs
    // api_token = api_key onde api_token está vazio e api_key preenchido
    app
      .db()
      .newQuery(`
    UPDATE integration_configs 
    SET api_token = api_key 
    WHERE (api_token IS NULL OR api_token = '') 
      AND api_key IS NOT NULL 
      AND api_key != ''
  `)
      .execute()

    // config_json = config onde config_json está vazio e config preenchido
    app
      .db()
      .newQuery(`
    UPDATE integration_configs 
    SET config_json = config 
    WHERE (config_json IS NULL OR config_json = '' OR config_json = '{}') 
      AND config IS NOT NULL 
      AND config != '' 
      AND config != '{}'
  `)
      .execute()

    // 3. Atualizar roles na coleção users:
    // Permitir temporariamente os novos valores no select role caso users.role tenha restrição
    const usersCol = app.findCollectionByNameOrId('users')
    const roleField = usersCol.fields.getByName('role')
    if (roleField) {
      const vals = roleField.values || []
      if (!vals.includes('advogado')) vals.push('advogado')
      if (!vals.includes('gestor')) vals.push('gestor')
      roleField.values = vals
      if (roleField.maxSelect > vals.length) {
        roleField.maxSelect = vals.length
      }
      app.save(usersCol)
    }

    // Obter id da role "Vendedor / Atendente" ou equivalente para associar role_id caso exista
    let defaultRoleId = ''
    try {
      const rolesList = app.findRecordsByFilter(
        'roles',
        'name ~ "Vendedor" || is_default = true',
        'created',
        1,
        0,
      )
      if (rolesList && rolesList.length > 0) {
        defaultRoleId = rolesList[0].id
      }
    } catch (_) {}

    // Mudar Mariana Costa (zp3cxpjhb8jicrs), Rodrigo Albuquerque (giut41tni01tzuc) e Aline Marques (xpq36ph7o3a3qss) para 'advogado'
    const targetUserIds = ['zp3cxpjhb8jicrs', 'giut41tni01tzuc', 'xpq36ph7o3a3qss']
    for (let i = 0; i < targetUserIds.length; i++) {
      const uid = targetUserIds[i]
      try {
        const uRecord = app.findFirstRecordByData('users', 'id', uid)
        if (uRecord) {
          uRecord.set('role', 'advogado')
          if (defaultRoleId && !uRecord.getString('role_id')) {
            uRecord.set('role_id', defaultRoleId)
          }
          app.save(uRecord)
        }
      } catch (_) {}
    }

    // 4. Consolidação da coleção leads:
    // - responsavel_id é o campo canônico: copiar assigned_to -> responsavel_id onde vazio
    app
      .db()
      .newQuery(`
    UPDATE leads 
    SET responsavel_id = assigned_to 
    WHERE (responsavel_id IS NULL OR responsavel_id = '') 
      AND assigned_to IS NOT NULL 
      AND assigned_to != ''
  `)
      .execute()

    // - team_owner é canônico: copiar team -> team_owner onde team_owner vazio e team é comercial/juridico/financeiro
    app
      .db()
      .newQuery(`
    UPDATE leads 
    SET team_owner = team 
    WHERE (team_owner IS NULL OR team_owner = '') 
      AND team IN ('comercial', 'juridico', 'financeiro')
  `)
      .execute()

    // - origem é canônico: copiar source -> origem onde vazio
    app
      .db()
      .newQuery(`
    UPDATE leads 
    SET origem = source 
    WHERE (origem IS NULL OR origem = '') 
      AND source IS NOT NULL 
      AND source != ''
  `)
      .execute()

    // - campaign/conjunto/anuncio são canônicos: copiar ad_set -> conjunto, ad -> anuncio
    app
      .db()
      .newQuery(`
    UPDATE leads 
    SET conjunto = ad_set 
    WHERE (conjunto IS NULL OR conjunto = '') 
      AND ad_set IS NOT NULL 
      AND ad_set != ''
  `)
      .execute()

    app
      .db()
      .newQuery(`
    UPDATE leads 
    SET anuncio = ad 
    WHERE (anuncio IS NULL OR anuncio = '') 
      AND ad IS NOT NULL 
      AND ad != ''
  `)
      .execute()

    // - soft_delete (bool) é a única flag de lixeira:
    // UPDATE leads SET soft_delete = true WHERE deleted IS NOT NULL AND deleted != '' AND (soft_delete IS NULL OR soft_delete = false)
    // Preserva estritamente as exclusões do usuário, NÃO restaurando leads excluídos
    app
      .db()
      .newQuery(`
    UPDATE leads 
    SET soft_delete = true 
    WHERE deleted IS NOT NULL 
      AND deleted != '' 
      AND (soft_delete IS NULL OR soft_delete = false)
  `)
      .execute()

    // 5. Migração de status de leads (texto livre -> códigos canônicos):
    // 'Novo Lead'/vazio -> 'novo'
    // 'Qualificado por IA' -> 'qualificado_ia'
    // 'Em Atendimento' -> 'em_contato'
    // 'Reunião Agendada' -> 'reuniao_agendada'
    // 'Proposta Enviada' -> 'proposta_enviada'
    // 'Convertido / Ganho' -> 'ganho'
    // 'Perdido'/'Desqualificado' -> 'perdido'
    app
      .db()
      .newQuery(`
    UPDATE leads SET status = 'novo' WHERE status = 'Novo Lead' OR status IS NULL OR status = ''
  `)
      .execute()

    app
      .db()
      .newQuery(`
    UPDATE leads SET status = 'qualificado_ia' WHERE status = 'Qualificado por IA' OR status = 'Qualificado IA'
  `)
      .execute()

    app
      .db()
      .newQuery(`
    UPDATE leads SET status = 'em_contato' WHERE status = 'Em Atendimento' OR status = 'Em contato'
  `)
      .execute()

    app
      .db()
      .newQuery(`
    UPDATE leads SET status = 'reuniao_agendada' WHERE status = 'Reunião Agendada' OR status = 'Reunião Marcada'
  `)
      .execute()

    app
      .db()
      .newQuery(`
    UPDATE leads SET status = 'proposta_enviada' WHERE status = 'Proposta Enviada'
  `)
      .execute()

    app
      .db()
      .newQuery(`
    UPDATE leads SET status = 'ganho' WHERE status = 'Convertido / Ganho' OR status = 'Ganho'
  `)
      .execute()

    app
      .db()
      .newQuery(`
    UPDATE leads SET status = 'perdido' WHERE status = 'Perdido' OR status = 'Desqualificado'
  `)
      .execute()
  },
  (app) => {
    // Revert opcional
  },
)
