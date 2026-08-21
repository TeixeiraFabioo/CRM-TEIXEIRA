// ZapSign and Electronic Signature Adapter for PocketBase pb_hooks
// Implements the signature provider adapter pattern:
// createDocument(data), getDocumentStatus(id), handleWebhook(payload)

routerAdd("POST", "/api/signatures/test-connection", (e) => {
  const reqBody = e.requestInfo().body || {}
  const token = reqBody.token || $os.getenv("ZAPSIGN_API_TOKEN") || ""
  const sandbox = !!reqBody.sandbox

  if (!token) {
    return e.json(400, {
      success: false,
      message: "Token do ZapSign não informado nem configurado nas variáveis de ambiente.",
    })
  }

  const baseUrl = sandbox
    ? "https://sandbox.api.zapsign.com.br/api/v1/docs/"
    : "https://api.zapsign.com.br/api/v1/docs/"

  try {
    const res = $http.send({
      url: baseUrl + "?page=1",
      method: "GET",
      headers: {
        Authorization: "Bearer " + token.trim(),
        "Content-Type": "application/json",
      },
      timeout: 15,
    })

    if (res.statusCode >= 200 && res.statusCode < 300) {
      return e.json(200, {
        success: true,
        status: "connected",
        message: "Conexão com ZapSign validada com sucesso!",
        data: res.json,
      })
    } else {
      return e.json(res.statusCode, {
        success: false,
        status: "error",
        statusCode: res.statusCode,
        message:
          (res.json && (res.json.detail || res.json.message || JSON.stringify(res.json))) ||
          "Falha de autenticação com a API do ZapSign.",
      })
    }
  } catch (err) {
    return e.json(500, {
      success: false,
      status: "error",
      message: "Erro ao comunicar com a API do ZapSign: " + (err.message || String(err)),
    })
  }
}, $apis.requireAuth())
