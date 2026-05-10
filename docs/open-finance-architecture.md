# Open Finance — Arquitetura do Deas Finance

## Visão geral

O Deas Finance implementa Open Finance como **consumidor e provedor** de dados:

- **Consumidor**: conecta-se a bancos externos, obtém consentimento e sincroniza dados
- **Provedor**: expõe dados do Deas Finance via API padronizada para outros bancos

---

## Estrutura de arquivos

```
app/api/open-finance/
├── route.ts                    # GET  — lista consentimentos com últimos snapshots
├── institutions/route.ts       # GET  — lista bancos disponíveis (dinâmico, não fixo)
├── connect/route.ts            # POST — inicia fluxo OAuth, cria consentimento "pendente"
├── callback/route.ts           # GET  — recebe retorno OAuth, ativa consentimento, sincroniza
├── sync/route.ts               # POST — sincroniza TODOS os bancos conectados
├── disconnect/route.ts         # POST — revoga consentimento local + notifica banco externo
├── salary/route.ts             # POST — portabilidade salarial
├── provider/route.ts           # GET  — expõe dados do Deas Finance para bancos externos
└── external-sim/[bankSlug]/
    └── route.ts                # Simulação de API de banco externo (apenas para demo)

lib/open-finance/
├── types.ts                    # Interfaces padrão (OpenFinanceAccountData, BankAdapter, etc.)
├── adapters.ts                 # Dispatcher: escolhe adaptador por slug da instituição
├── bank-simulator.ts           # Gerador de dados simulados (substitui seedValues)
└── providers/
    └── generic.ts              # Adaptador genérico para bancos com API padrão
```

---

## Fluxo de consentimento

```
1. Usuário abre /open-finance → front busca GET /api/open-finance/institutions
2. Usuário seleciona banco → front POST /api/open-finance/connect
3. Back-end cria consentimento com status "pendente" + gera oauthState
4. Back-end retorna authorizationUrl → front redireciona usuário
5. Banco autoriza → redireciona para GET /api/open-finance/callback?code=...&state=...
6. Callback verifica state (anti-CSRF) → troca code por accessToken
7. Callback ativa consentimento + faz primeira sincronização
8. Usuário é redirecionado de volta para /open-finance
```

---

## Sincronização de dados

O botão "Sincronizar" chama `POST /api/open-finance/sync`, que:

1. Busca todos os consentimentos ativos do usuário
2. Para cada banco: chama API externa com `accessToken`
3. Salva snapshot dos dados recebidos em `OpenFinanceSnapshot`
4. Recalcula score considerando todos os bancos

**Antes**: recarregava dados do DB local (não consultava APIs externas)  
**Agora**: consulta API de cada banco, salva histórico de snapshots

---

## Score multi-banco

`refreshScore()` em `lib/account.ts` agora considera **todos** os bancos ativos:

- Soma renda estimada de todos os bancos
- Soma dívidas externas de todos os bancos
- Calcula média ponderada dos scores externos
- Aplica fórmula: `72% score local + 28% média scores externos`

**Antes**: usava apenas o primeiro consentimento ativo  
**Agora**: agrega dados de N bancos conectados

---

## Adicionar um novo banco

### Banco com API padrão

Basta inserir na tabela `Institution`:

```sql
INSERT INTO "Institution" (id, name, slug, apiBaseUrl, active)
VALUES (gen_random_uuid(), 'Novo Banco', 'novo-banco', 'https://api.novobanco.com/open-finance', true);
```

O adaptador genérico (`lib/open-finance/providers/generic.ts`) cuidará da integração, desde que o banco siga o contrato:

```
GET  {apiBaseUrl}/accounts   → { account: { availableBalance, debt, limit, ... } }
DELETE {apiBaseUrl}/consents/:id → revogação
```

### Banco com API diferente

1. Crie `lib/open-finance/providers/nome-do-banco.ts` implementando `BankAdapter`
2. Registre no mapa em `lib/open-finance/adapters.ts`:

```typescript
import { nomeDoBancoAdapter } from "./providers/nome-do-banco";

const adapters: Record<string, BankAdapter> = {
  "nome-do-banco": nomeDoBancoAdapter,
};
```

---

## Variáveis de ambiente

```env
DATABASE_URL=...
JWT_SECRET=...
NEXT_PUBLIC_APP_URL=http://localhost:3000

# OAuth do Deas Finance como cliente
OPEN_FINANCE_CLIENT_ID=...
OPEN_FINANCE_CLIENT_SECRET=...
OPEN_FINANCE_REDIRECT_URI=.../api/open-finance/callback

# Criptografia de tokens (produção)
TOKEN_ENCRYPTION_KEY=...
```

---

## Status de consentimento

| Status    | Descrição                                      |
|-----------|------------------------------------------------|
| `pendente`| Consentimento criado, aguardando autorização   |
| `ativo`   | Autorizado, token válido, dados sincronizados  |
| `revogado`| Usuário revogou o acesso                       |
| `expirado`| Validade vencida                               |
| `erro`    | Falha na última sincronização (token expirado) |

---

## Eventos de auditoria

| Ação                          | Quando ocorre                        |
|-------------------------------|--------------------------------------|
| `OF_CONSENT_CREATED`          | Usuário inicia conexão               |
| `OF_CONSENT_APPROVED`         | Callback OAuth bem-sucedido          |
| `OF_CONSENT_FAILED`           | Callback OAuth com erro              |
| `OF_CONSENT_REVOKED`          | Usuário revoga conexão               |
| `OF_SYNC_STARTED`             | Sincronização iniciada               |
| `OF_SYNC_SUCCESS`             | Todos os bancos sincronizados        |
| `OF_SYNC_PARTIAL`             | Alguns bancos com erro               |
| `OF_SCORE_RECALCULATED`       | Score recalculado (N bancos)         |
| `OF_SALARY_PORTABILITY_REQUESTED` | Portabilidade salarial concluída |

---

## Notas para produção

- **Tokens**: armazene criptografados. Veja `TOKEN_ENCRYPTION_KEY` no `.env`
- **PKCE**: implemente para autenticação OAuth robusta
- **Certificados**: o Open Finance real exige certificação pelo Banco Central
- **MTLS**: autenticação mútua entre servidores em produção
- **Refresh de tokens**: implemente renovação automática antes do vencimento
- **Logs**: nunca registre `accessToken` ou `refreshToken` em `AuditLog`
