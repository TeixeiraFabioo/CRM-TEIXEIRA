# WhatsApp Webhook Worker (Cloudflare Workers)

Este Cloudflare Worker atua como proxy do Webhook da **Meta WhatsApp Cloud API** para a instância do **PocketBase** no Teixeira'sHub CRM.

Como o PocketBase no ambiente de nuvem possui restrição no registro dinâmico de rotas HTTP personalizadas via `routerAdd`, este Worker leve e de alta disponibilidade recebe as requisições da Meta e as encaminha diretamente para a API REST de registros do PocketBase (`/api/collections/...`).

---

## Recursos do Worker

1. **GET (Meta Challenge Handshake):**
   - Recebe `hub.mode`, `hub.challenge` e `hub.verify_token`.
   - Se `hub.verify_token` coincidir com o configurado (`skip_hub_crm_whatsapp_verify_token` ou variável de ambiente), devolve o `hub.challenge` com status HTTP 200 em texto plano.

2. **POST (Mensagens & Status de Entrega):**
   - Recebe as notificações de mensagens enviadas por clientes via WhatsApp.
   - Identifica o `tenant_id` a partir das configurações de integração salvas no PocketBase.
   - Cria o Lead automaticamente na coleção `leads` se ainda não existir.
   - Registra a mensagem na coleção `lead_messages` (com suporte a texto, imagem, documento, áudio, localização e botões).
   - Atualiza os status de entrega (`delivered`, `read`, `failed`, `sent`).

---

## Como Fazer o Deploy no Cloudflare Workers

O Cloudflare Workers possui um plano gratuito generoso com até **100.000 requisições diárias**.

### Passo 1: Instalar o Wrangler (CLI da Cloudflare)

Caso ainda não tenha o Wrangler instalado:

```bash
npm install -g wrangler
# ou utilize via npx diretamente
```

### Passo 2: Fazer login na Cloudflare

```bash
npx wrangler login
```

### Passo 3: Criar o arquivo `wrangler.toml` (na mesma pasta do worker ou na raiz)

Crie um arquivo `wrangler.toml` com a seguinte estrutura:

```toml
name = "teixeirashub-whatsapp-webhook"
main = "whatsapp-webhook.js"
compatibility_date = "2024-01-01"

[vars]
POCKETBASE_URL = "https://teixeiranascimento.goskip.app"
WHATSAPP_VERIFY_TOKEN = "skip_hub_crm_whatsapp_verify_token"
# Opcional: caso queira fixar um tenant padrão
DEFAULT_TENANT_ID = ""
```

### Passo 4: Configurar a Secret do Token da API (Opcional se coleções forem públicas para criação)

Para definir o token de autenticação do PocketBase de forma segura:

```bash
npx wrangler secret put POCKETBASE_API_TOKEN
```

Cole seu token de autenticação do PocketBase quando solicitado.

### Passo 5: Executar o Deploy

```bash
npx wrangler deploy
```

O Wrangler exibirá a URL pública do seu Worker, por exemplo:
`https://teixeirashub-whatsapp-webhook.<seu-subdominio>.workers.dev`

---

## Configuração na Meta (Facebook Developers)

1. Acesse o [Meta App Dashboard](https://developers.facebook.com/apps).
2. Selecione o seu aplicativo do **WhatsApp Business**.
3. Vá em **WhatsApp** > **Configuração** (Configuration).
4. Em **Webhook**, clique em **Editar** (Edit):
   - **URL de retorno (Callback URL):** `https://teixeirashub-whatsapp-webhook.<seu-subdominio>.workers.dev`
   - **Token de verificação (Verify Token):** `skip_hub_crm_whatsapp_verify_token` (ou o valor definido na sua variável `WHATSAPP_VERIFY_TOKEN`).
5. Clique em **Verificar e Salvar**.
6. Nos campos de assinatura do Webhook, ative a opção **messages**.
