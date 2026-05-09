# Deas Finance - Next.js + Open Finance Simulado para Vercel

Este projeto foi ajustado para rodar na Vercel usando Next.js, API Routes e Prisma com PostgreSQL externo.

## O que mudou para funcionar na Vercel

A versão anterior usava um arquivo JSON local como banco de dados. Isso funciona em desenvolvimento, mas não é confiável na Vercel, porque as funções serverless não mantêm arquivos gravados de forma persistente.

Agora o estado do projeto é salvo em PostgreSQL por meio do Prisma, usando a tabela `AppState`. Isso mantém o projeto simples, mas já compatível com deploy.

## Como subir na Vercel

### 1. Crie um banco PostgreSQL

Você pode usar uma destas opções:

- Neon
- Supabase
- Prisma Postgres
- Railway
- Render PostgreSQL

Copie a string de conexão PostgreSQL. Ela geralmente começa com:

```bash
postgresql://...
```

### 2. Envie o projeto para o GitHub

Suba a pasta do projeto para um repositório GitHub.

### 3. Importe o projeto na Vercel

Na Vercel:

1. Clique em **Add New Project**.
2. Selecione o repositório.
3. Framework: **Next.js**.
4. Build Command pode ficar automático, pois existe `vercel.json`.

### 4. Configure as Environment Variables

Na Vercel, vá em:

```txt
Project Settings > Environment Variables
```

Adicione:

```bash
DATABASE_URL="sua_url_postgresql_aqui"
APP_SECRET="uma_chave_grande_e_aleatoria_aqui"
```

Exemplo de `APP_SECRET`:

```bash
APP_SECRET="deasfinance-2026-chave-super-secreta-troque-isso"
```

### 5. Faça o deploy

Clique em **Deploy**.

Durante o build, a Vercel vai executar:

```bash
prisma generate && prisma db push && next build
```

Isso gera o Prisma Client, cria/atualiza as tabelas no PostgreSQL e faz o build do Next.js.

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run db:push
```

## Observação importante

Este projeto ainda usa uma estrutura simplificada de banco, salvando o estado principal em `AppState.data` como JSON. Isso foi proposital para manter o visual e a lógica do seu projeto sem reescrever tudo de uma vez.

Depois, se quiser deixar mais profissional, o próximo passo é trocar o `AppState` por tabelas reais separadas:

- `User`
- `Account`
- `Transaction`
- `OpenFinanceConsent`

Esses models já estão no `schema.prisma`, então a base já está preparada para essa evolução.

## Atualização visual

Nesta versão, a página de login foi preservada e as telas internas foram reorganizadas com um visual mais limpo.

Principais mudanças:

- Dashboard mais leve, com cartões de ação.
- Cada ação principal abre uma página própria: Depósito, Pix, Dívidas, Crédito, Open Finance e Perfil.
- As operações deixaram de ficar amontoadas em vários blocos na mesma tela.
- Open Finance foi reorganizado em telas separadas para conexão e portabilidade de salário.
- Perfil e foto continuam funcionando.
- A estética geral do Deas Finance foi mantida, mas com acabamento mais moderno.
