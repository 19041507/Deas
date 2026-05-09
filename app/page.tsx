import Script from "next/script";

const LOGO_SVG = `<svg viewBox="0 0 96 96" aria-hidden="true" focusable="false" class="deas-svg-logo"><path d="M48 7 78 17v30c0 19-12 34-30 42-18-8-30-23-30-42V17L48 7Zm0 8.6L26 23v23.8c0 13.8 8.1 25.4 22 32.6 13.9-7.2 22-18.8 22-32.6V23l-22-7.4Z" fill="#f2b84b"/><path d="M31 55h9v14h-9V55Zm14-10h9v24h-9V45Zm14-12h9v36h-9V33Z" fill="#ffd977"/><path d="M17 66c17 18 48 8 61-22" fill="none" stroke="#f2b84b" stroke-width="7" stroke-linecap="round"/><circle cx="80" cy="36" r="5.5" fill="#ffd977"/></svg>`;

export default function Home() {
  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: `
<div id="toast-container"></div>

<!-- ========== AUTH PAGE ========== -->
<main class="auth-page" id="authPage">
  <div class="auth-shell">
    <section class="brand-panel">
      <div class="login-logo">
        <div class="deas-logo-icon">${LOGO_SVG}</div>
        <div class="deas-wordmark"><span>Deas</span><b>Finance</b></div>
      </div>
      <div class="brand-copy">
        <h2>Controle financeiro com segurança e clareza.</h2>
        <p>Gerencie saldo, limite, movimentações e conexões Open Finance numa experiência digital simples, privada e profissional.</p>
      </div>
      <div class="login-benefits">
        <div class="benefit-card">
          <span class="benefit-label">Segurança</span>
          <strong>Conta protegida</strong>
          <p>Acesso seguro e consentimento claro em cada conexão.</p>
        </div>
        <div class="benefit-card">
          <span class="benefit-label">Crédito</span>
          <strong>Análise inteligente</strong>
          <p>Limite e empréstimos avaliados com dados precisos.</p>
        </div>
      </div>
      <div class="login-note">🔐 Open Finance com privacidade: compartilhamento mínimo, autorização do usuário e uma experiência simples para gerenciar sua vida financeira.</div>
    </section>

    <section class="auth-card">
      <div class="auth-tabs">
        <button class="tab active" type="button" data-auth-tab="login">Entrar</button>
        <button class="tab" type="button" data-auth-tab="register">Criar conta</button>
      </div>
      <form id="loginForm" class="form active">
        <h2>Acesse sua conta</h2>
        <p class="muted">Entre para visualizar seu painel financeiro.</p>
        <label class="field">E-mail<input type="email" id="loginEmail" placeholder="voce@email.com" required /></label>
        <label class="field">Senha<input type="password" id="loginPassword" placeholder="Sua senha" required /></label>
        <label class="check-row"><input type="checkbox" id="acceptTerms" /><span>Li e aceito os <a href="#" id="openTerms">termos de privacidade</a></span></label>
        <button class="primary-btn" type="submit">Entrar no banco</button>
      </form>
      <form id="registerForm" class="form">
        <h2>Abra sua conta</h2>
        <p class="muted">Crie sua conta Deas Finance gratuitamente.</p>
        <label class="field">Nome completo<input type="text" id="registerName" placeholder="Seu nome completo" required /></label>
        <label class="field">E-mail<input type="email" id="registerEmail" placeholder="voce@email.com" required /></label>
        <label class="field">Senha<input type="password" id="registerPassword" placeholder="Mínimo 6 caracteres" required minlength="6" /></label>
        <button class="primary-btn" type="submit">Criar conta</button>
      </form>
    </section>
  </div>
</main>

<!-- ========== APP PAGE ========== -->
<main class="app-page hidden" id="appPage">
  <!-- SIDEBAR -->
  <aside class="sidebar">
    <div class="sidebar-logo">
      <div class="deas-logo-icon small">${LOGO_SVG}</div>
      <div class="brand-name"><span>Deas</span><b>Finance</b></div>
    </div>

    <span class="sidebar-section-label">Menu</span>
    <nav>
      <button class="nav-btn active" type="button" data-view="dashboard">
        <span class="nav-icon">🏠</span>Início
      </button>
      <button class="nav-btn" type="button" data-view="depositPage">
        <span class="nav-icon">⬇️</span>Depósito
      </button>
      <button class="nav-btn" type="button" data-view="pixPage">
        <span class="nav-icon">⚡</span>Pix
      </button>
      <button class="nav-btn" type="button" data-view="debtPage">
        <span class="nav-icon">📋</span>Dívidas
      </button>
      <button class="nav-btn" type="button" data-view="credit">
        <span class="nav-icon">💳</span>Crédito
      </button>
      <button class="nav-btn" type="button" data-view="openFinance">
        <span class="nav-icon">🔗</span>Open Finance
      </button>
      <button class="nav-btn" type="button" data-view="profile">
        <span class="nav-icon">👤</span>Perfil
      </button>
    </nav>

    <div class="sidebar-spacer"></div>

    <div class="sidebar-mini-balance">
      <span class="sb-label">Saldo disponível</span>
      <div class="sb-amount" id="sidebarBalance">R$ 0,00</div>
    </div>

    <button class="logout-btn" type="button" id="logoutBtn">
      <span>🚪</span> Sair da conta
    </button>
  </aside>

  <!-- CONTENT -->
  <section class="content">
    <!-- TOPBAR -->
    <header class="topbar">
      <div class="topbar-left">
        <p class="eyebrow" id="pageEyebrow">Painel Deas Finance</p>
        <h2 id="welcomeName">Olá, Usuário</h2>
      </div>
      <div class="topbar-right">
        <span class="topbar-date" id="topbarDate"></span>
        <div class="profile-pill" role="button" tabindex="0" data-view="profile">
          <img id="profilePhoto" alt="Foto do usuário" src="" />
          <span id="userDisplayName">Cliente Deas</span>
        </div>
      </div>
    </header>

    <!-- ========== DASHBOARD ========== -->
    <section class="view active" id="dashboard" data-title="Início" data-eyebrow="Painel Deas Finance">
      
      <!-- HERO CARD -->
      <div class="hero-card" style="margin-bottom:18px">
        <div class="hero-left">
          <div>
            <p class="eyebrow">Conta digital</p>
            <h1>Seu dinheiro organizado.</h1>
            <p class="muted" style="margin-top:10px">Acesse depósitos, Pix, crédito e Open Finance de forma rápida e segura.</p>
          </div>
          <div class="hero-actions">
            <button class="primary-btn" type="button" data-view="pixPage">⚡ Fazer Pix</button>
            <button class="secondary-btn" type="button" data-view="depositPage">⬇️ Depositar</button>
            <button class="secondary-btn" type="button" data-view="openFinance">🔗 Open Finance</button>
          </div>
        </div>
        <div class="balance-card">
          <button class="balance-toggle" id="balanceToggle" title="Ocultar/mostrar saldo">👁</button>
          <span class="balance-label">Saldo disponível</span>
          <div class="balance-amount" id="balanceValue">R$ 0,00</div>
          <div class="balance-limit">Limite: <b id="limitValue">R$ 0,00</b></div>
        </div>
      </div>

      <!-- QUICK ACTIONS -->
      <div class="actions-grid" style="margin-bottom:18px">
        <button class="action-card" type="button" data-view="depositPage">
          <div class="action-icon">⬇️</div>
          <strong>Depositar</strong>
        </button>
        <button class="action-card" type="button" data-view="pixPage">
          <div class="action-icon">⚡</div>
          <strong>Pix</strong>
        </button>
        <button class="action-card" type="button" data-view="debtPage">
          <div class="action-icon">📋</div>
          <strong>Dívidas</strong>
        </button>
        <button class="action-card" type="button" data-view="credit">
          <div class="action-icon">💳</div>
          <strong>Crédito</strong>
        </button>
        <button class="action-card" type="button" data-view="openFinance">
          <div class="action-icon">🔗</div>
          <strong>Open Finance</strong>
        </button>
        <button class="action-card" type="button" data-view="profile">
          <div class="action-icon">👤</div>
          <strong>Perfil</strong>
        </button>
      </div>

      <!-- METRICS ROW -->
      <div class="metrics-row" style="margin-bottom:18px">
        <div class="metric-card mc-gold">
          <div class="mc-icon">📊</div>
          <span class="mc-label">Score de crédito</span>
          <span class="mc-value" id="scoreMetric">500</span>
          <span class="mc-sub" id="scoreCategory">Calculando...</span>
        </div>
        <div class="metric-card mc-red">
          <div class="mc-icon">📉</div>
          <span class="mc-label">Dívida atual</span>
          <span class="mc-value" id="debtValue">R$ 0,00</span>
          <span class="mc-sub">Clique para pagar</span>
        </div>
        <div class="metric-card mc-green">
          <div class="mc-icon">✅</div>
          <span class="mc-label">Pré-aprovado</span>
          <span class="mc-value" id="preApprovedMetric">R$ 0,00</span>
          <span class="mc-sub">Empréstimo disponível</span>
        </div>
        <div class="metric-card mc-blue">
          <div class="mc-icon">🔗</div>
          <span class="mc-label">Open Finance</span>
          <span class="mc-value" id="ofStatusMetric">Inativo</span>
          <span class="mc-sub" id="ofStatusSub">Conecte o DeasBank</span>
        </div>
      </div>

      <!-- CHART + TRANSACTIONS ROW -->
      <div class="grid-2" style="margin-bottom:18px">
        <div class="card">
          <div class="section-head-row" style="margin-bottom:14px">
            <div>
              <p class="eyebrow">Movimentação</p>
              <h3 style="font-size:16px;margin-top:3px">Últimas semanas</h3>
            </div>
            <div class="chart-legend">
              <div class="chart-legend-item"><div class="chart-legend-dot" style="background:#34D399"></div>Entradas</div>
              <div class="chart-legend-item"><div class="chart-legend-dot" style="background:#F87171"></div>Saídas</div>
            </div>
          </div>
          <div class="mini-chart-wrap" id="spendingChart"></div>
          <div class="chart-labels" id="chartLabels"></div>
        </div>

        <div class="card">
          <div class="score-section">
            <div class="score-ring-wrap">
              <svg viewBox="0 0 120 120">
                <circle class="score-ring-bg" cx="60" cy="60" r="50"/>
                <circle class="score-ring-fill" id="scoreRingFill" cx="60" cy="60" r="50" stroke-dasharray="314" stroke-dashoffset="314" stroke="#F2B84B"/>
              </svg>
              <div class="score-ring-value" id="creditScore">500</div>
            </div>
            <div class="score-info">
              <span class="score-label">Score de crédito</span>
              <div class="score-category" id="scoreCategoryText">Regular</div>
              <p class="score-desc" id="creditReason">Conecte um banco parceiro para melhorar a análise.</p>
            </div>
          </div>
        </div>
      </div>

      <!-- TRANSACTIONS TABLE -->
      <div class="card">
        <div class="section-header">
          <div>
            <p class="eyebrow">Histórico</p>
            <h3>Movimentações recentes</h3>
          </div>
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
            <div class="filter-tabs">
              <button class="filter-tab active" data-filter="all">Todas</button>
              <button class="filter-tab" data-filter="entrada">Entradas</button>
              <button class="filter-tab" data-filter="saída">Saídas</button>
            </div>
            <button class="secondary-btn" style="padding:9px 14px;font-size:13px" type="button" data-view="pixPage">+ Nova</button>
          </div>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Descrição</th>
                <th>Data</th>
                <th>Valor</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody id="transactionsBody">
              <tr><td colspan="4" class="tx-empty">Carregando movimentações...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <!-- ========== DEPÓSITO ========== -->
    <section class="view" id="depositPage" data-title="Depósito" data-eyebrow="Entrada de dinheiro">
      <div class="page-shell">
        <button class="back-btn" type="button" data-view="dashboard">← Voltar ao início</button>
        <div class="form-card">
          <p class="eyebrow">Depósito</p>
          <h3>Adicionar saldo disponível</h3>
          <p class="muted">Simule dinheiro entrando na sua conta Deas Finance.</p>
          <form id="depositForm" class="clean-form">
            <label class="field">Valor do depósito
              <input id="depositAmount" type="number" min="1" step="0.01" value="500" required>
            </label>
            <div class="info-box">💡 O valor será creditado imediatamente e aparecerá no seu extrato.</div>
            <button class="primary-btn" type="submit">⬇️ Confirmar depósito</button>
          </form>
        </div>
      </div>
    </section>

    <!-- ========== PIX ========== -->
    <section class="view" id="pixPage" data-title="Pix" data-eyebrow="Transferência instantânea">
      <div class="page-shell">
        <button class="back-btn" type="button" data-view="dashboard">← Voltar ao início</button>
        <div class="form-card">
          <p class="eyebrow">Pix</p>
          <h3>Enviar transferência</h3>
          <p class="muted">Registre uma saída usando seu saldo disponível. Rápido e seguro.</p>
          <form id="pixForm" class="clean-form">
            <label class="field">Favorecido
              <input id="pixName" placeholder="Nome do destinatário" required value="Favorecido Pix">
            </label>
            <label class="field">Valor
              <input id="pixAmount" type="number" min="1" step="0.01" value="100" required>
            </label>
            <div class="info-box" id="pixBalanceInfo">Saldo disponível: <b id="pixBalanceDisplay">R$ 0,00</b></div>
            <button class="primary-btn" type="submit">⚡ Enviar Pix</button>
          </form>
        </div>
      </div>
    </section>

    <!-- ========== DÍVIDAS ========== -->
    <section class="view" id="debtPage" data-title="Dívidas" data-eyebrow="Organização financeira">
      <div class="page-shell">
        <button class="back-btn" type="button" data-view="dashboard">← Voltar ao início</button>
        <div class="form-card">
          <p class="eyebrow">Dívida pendente</p>
          <h3 id="debtValuePage">Consulte e pague sua dívida</h3>
          <p class="muted">O pagamento usa seu saldo disponível e recalcula o score automaticamente.</p>
          <form id="payDebtForm" class="clean-form">
            <label class="field">Valor a pagar
              <input id="payDebtAmount" type="number" min="1" step="0.01" value="500" required>
            </label>
            <div class="info-box">📊 Pagar dívidas melhora seu score de crédito e aumenta o limite pré-aprovado.</div>
            <button class="primary-btn" type="submit">📋 Pagar dívida</button>
          </form>
        </div>
      </div>
    </section>

    <!-- ========== CRÉDITO ========== -->
    <section class="view" id="credit" data-title="Crédito" data-eyebrow="Score e empréstimo">
      <div class="page-shell wide">
        <button class="back-btn" type="button" data-view="dashboard">← Voltar ao início</button>
        <div class="credit-grid">
          <div class="form-card">
            <p class="eyebrow">Empréstimo Deas</p>
            <h3>Valor pré-aprovado</h3>
            <div class="big-amount" id="preApprovedValue">R$ 0,00</div>
            <p class="muted" style="margin-bottom:0">A aprovação considera score, saldo, dívida e dados do Open Finance quando disponíveis.</p>
            <form id="loanForm" class="clean-form">
              <label class="field">Valor desejado
                <input id="loanAmount" type="number" min="100" step="50" value="1000" required>
              </label>
              <button class="primary-btn" type="submit">💳 Solicitar empréstimo</button>
            </form>
          </div>
          <div class="form-card">
            <p class="eyebrow">Score e histórico</p>
            <h3>Empréstimos realizados</h3>
            <div class="big-amount" id="loansTotal">R$ 0,00</div>
            <p class="muted" style="margin-bottom:16px">Conectar o DeasBank melhora a análise com mais informações financeiras.</p>
            <div style="margin-top:auto">
              <div class="score-section" style="margin-bottom:20px">
                <div class="score-ring-wrap" style="width:90px;height:90px">
                  <svg viewBox="0 0 120 120">
                    <circle class="score-ring-bg" cx="60" cy="60" r="50"/>
                    <circle class="score-ring-fill" id="scoreRingFill2" cx="60" cy="60" r="50" stroke-dasharray="314" stroke-dashoffset="314" stroke="#F2B84B"/>
                  </svg>
                  <div class="score-ring-value" id="creditScore2" style="font-size:22px">500</div>
                </div>
                <div class="score-info">
                  <span class="score-label">Score atual</span>
                  <div class="score-category" id="scoreCategoryCredit" style="font-size:18px">Regular</div>
                </div>
              </div>
              <button class="secondary-btn" style="width:100%" type="button" data-view="openFinance">🔗 Ir para Open Finance</button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ========== OPEN FINANCE ========== -->
    <section class="view" id="openFinance" data-title="Open Finance" data-eyebrow="Conexão com DeasBank">
      <div class="page-shell wide">
        <button class="back-btn" type="button" data-view="dashboard">← Voltar ao início</button>
        
        <div class="of-hero">
          <div class="of-hero-text">
            <p class="eyebrow">Open Finance</p>
            <h3>Conecte o DeasBank</h3>
            <p>Compartilhe dados financeiros com segurança e melhore seu score. Autorização transparente em cada etapa.</p>
          </div>
          <div class="of-hero-actions">
            <button class="primary-btn" type="button" data-view="openFinanceConnect">🔗 Conectar DeasBank</button>
            <button class="secondary-btn" type="button" id="syncOpenFinanceBtn">🔄 Sincronizar</button>
            <button class="secondary-btn danger-soft hidden" type="button" id="disconnectOpenFinanceBtn">❌ Desconectar</button>
          </div>
        </div>

        <!-- PROGRESS STEPS -->
        <div class="of-steps" style="margin-bottom:18px">
          <div class="of-step" id="ofStep1">
            <div class="of-step-num">1</div>
            <div>
              <strong style="font-size:13px;display:block;margin-bottom:2px">Conexão</strong>
              <span style="font-size:12px">Vincular o DeasBank</span>
            </div>
          </div>
          <div class="of-step" id="ofStep2">
            <div class="of-step-num">2</div>
            <div>
              <strong style="font-size:13px;display:block;margin-bottom:2px">Portabilidade</strong>
              <span style="font-size:12px">Trazer salário</span>
            </div>
          </div>
          <div class="of-step" id="ofStep3">
            <div class="of-step-num">3</div>
            <div>
              <strong style="font-size:13px;display:block;margin-bottom:2px">Score</strong>
              <span style="font-size:12px">Análise aprimorada</span>
            </div>
          </div>
        </div>

        <div class="of-grid">
          <!-- CONNECTION OVERVIEW -->
          <div class="card">
            <div class="section-head-row" style="margin-bottom:14px">
              <div>
                <p class="eyebrow">Conexão atual</p>
                <h3 id="connectionTitleFinance" style="font-size:17px;margin-top:4px">Nenhuma conexão ativa</h3>
              </div>
              <span class="badge" id="ofConnectionBadge">Sem conexão</span>
            </div>
            <div id="connectionsList">
              <div class="of-empty">
                <strong>Nenhuma instituição conectada</strong>
                <p style="font-size:13px;margin-top:4px">Conecte o DeasBank para começar.</p>
              </div>
            </div>
          </div>

          <!-- SALARY PORTABILITY -->
          <div class="card hidden" id="dataTransferCard">
            <p class="eyebrow">Portabilidade</p>
            <h3 style="font-size:17px;margin:6px 0 10px">Trazer salário</h3>
            <p class="muted" style="font-size:13.5px;margin-bottom:18px">Transfira sua renda do DeasBank para o Deas Finance e melhore seu score.</p>
            <button class="primary-btn" style="width:100%" type="button" data-view="salaryPage">💰 Abrir portabilidade</button>
          </div>
        </div>

        <!-- UNIFIED DATA -->
        <div class="card" id="ofUnifiedDataCard" style="margin-top:16px">
          <div class="section-head-row" style="margin-bottom:14px">
            <div>
              <p class="eyebrow">Dados recebidos</p>
              <h3 style="font-size:17px;margin-top:4px">Visão unificada DeasBank</h3>
            </div>
            <span class="badge badge-success">Com consentimento</span>
          </div>
          <div class="of-data-grid">
            <div class="of-data-item"><small>Salário trazido</small><strong id="ofImportedSalaryFinance">R$ 0,00</strong></div>
            <div class="of-data-item"><small>Saldo DeasBank</small><strong id="ofExternalBalanceFinance">R$ 0,00</strong></div>
            <div class="of-data-item"><small>Dívidas externas</small><strong id="ofExternalDebtFinance">R$ 0,00</strong></div>
            <div class="of-data-item"><small>Limite externo</small><strong id="ofExternalLimitFinance">R$ 0,00</strong></div>
            <div class="of-data-item"><small>Empréstimos</small><strong id="ofExternalLoansFinance">R$ 0,00</strong></div>
            <div class="of-data-item"><small>Investimentos</small><strong id="ofExternalInvestmentsFinance">R$ 0,00</strong></div>
            <div class="of-data-item"><small>Score DeasBank</small><strong id="ofExternalScoreFinance">—</strong></div>
            <div class="of-data-item"><small>Renda estimada</small><strong id="ofExternalIncomeFinance">R$ 0,00</strong></div>
          </div>
          <p class="muted" id="ofRelationshipSummaryFinance" style="font-size:13px;margin-top:14px">Nenhum dado do DeasBank recebido ainda.</p>
        </div>
      </div>
    </section>

    <!-- ========== CONECTAR OPEN FINANCE ========== -->
    <section class="view" id="openFinanceConnect" data-title="Conectar DeasBank" data-eyebrow="Consentimento">
      <div class="page-shell">
        <button class="back-btn" type="button" data-view="openFinance">← Voltar ao Open Finance</button>
        <div class="form-card">
          <p class="eyebrow">Conexão</p>
          <h3>Solicitar vínculo com o DeasBank</h3>
          <p class="muted" style="margin-bottom:0">Esta etapa conecta a conta da mesma pessoa. Dados financeiros só são solicitados depois.</p>
          <form id="openFinanceForm" class="clean-form">
            <label class="field">Instituição
              <select id="partnerInstitution" required>
                <option value="deasbank" selected>DeasBank</option>
              </select>
            </label>
            <div class="consent-box">
              <strong>Você está autorizando:</strong>
              <ul class="mini-list">
                <li>Enviar uma solicitação de conexão ao DeasBank.</li>
                <li>Confirmar que a conta pertence ao mesmo usuário.</li>
                <li>Não transferir renda, saldo ou dívidas nessa etapa.</li>
              </ul>
              <label class="check-row" style="margin-top:12px">
                <input type="checkbox" id="openFinanceConsent" required>
                <span>Autorizo solicitar conexão com o DeasBank</span>
              </label>
            </div>
            <button class="primary-btn" type="submit">🔗 Enviar conexão</button>
          </form>
        </div>
      </div>
    </section>

    <!-- ========== PORTABILIDADE DE SALÁRIO ========== -->
    <section class="view" id="salaryPage" data-title="Trazer salário" data-eyebrow="Portabilidade">
      <div class="page-shell">
        <button class="back-btn" type="button" data-view="openFinance">← Voltar ao Open Finance</button>
        <div class="form-card">
          <p class="eyebrow">Portabilidade de salário</p>
          <h3>Trazer salário do DeasBank</h3>
          <p class="muted">O valor só entra no Deas Finance se a conexão estiver ativa.</p>
          <form id="openFinanceDataForm" class="clean-form">
            <label class="field">Quanto de salário/renda quer trazer?
              <input id="ofSalaryAmount" type="number" min="0" step="100" value="3200" required>
            </label>
            <input id="ofSalaryRange" type="range" min="0" max="15000" step="100" value="3200" style="width:100%;accent-color:var(--gold)">
            <div class="consent-box">
              <strong>Você está ciente de que serão solicitados:</strong>
              <ul class="mini-list">
                <li>Renda/salário para transferência entre contas.</li>
                <li>Saldo atual e faixa de movimentação do DeasBank.</li>
                <li>Dívidas, empréstimos, limite, score e relacionamento de crédito.</li>
              </ul>
              <label class="check-row" style="margin-top:12px">
                <input type="checkbox" id="openFinanceDataConsent" required>
                <span>Estou ciente e autorizo essa solicitação</span>
              </label>
            </div>
            <button class="primary-btn" type="submit">💰 Trazer salário</button>
          </form>
        </div>
      </div>
    </section>

    <!-- ========== PERFIL ========== -->
    <section class="view" id="profile" data-title="Perfil" data-eyebrow="Dados da conta">
      <div class="page-shell">
        <button class="back-btn" type="button" data-view="dashboard">← Voltar ao início</button>
        <div class="profile-header">
          <img id="profilePhotoLarge" class="profile-avatar" alt="Foto do perfil" src="" />
          <div class="profile-info">
            <p class="eyebrow">Cliente Deas Finance</p>
            <h3 id="profileName">Cliente Deas</h3>
            <p class="profile-email" id="profileEmail">cliente@deasfinance.com</p>
            <div class="profile-actions">
              <button class="primary-btn" type="button" data-open-modal="photoDialog">📷 Alterar foto</button>
              <button class="secondary-btn" type="button" id="resetPhotoBtn">🔄 Avatar automático</button>
            </div>
          </div>
        </div>
        <div class="card">
          <p class="eyebrow" style="margin-bottom:10px">Segurança da conta</p>
          <p class="muted" style="font-size:14px">Conta protegida pela API própria do Deas Finance. Dados salvos no banco PostgreSQL com senhas criptografadas. Nenhuma informação é compartilhada sem sua autorização explícita.</p>
        </div>
      </div>
    </section>
  </section>
</main>

<!-- ========== MODAIS ========== -->

<!-- TERMOS -->
<dialog id="termsDialog">
  <div class="modal-head">
    <h3>Termos de Privacidade</h3>
    <p class="muted">Uso dos dados no Deas Finance.</p>
  </div>
  <div class="modal-body">
    <p class="muted">O Deas Finance utiliza seus dados para autenticação, histórico financeiro, simulação de crédito e integrações autorizadas. Senhas nunca são compartilhadas com terceiros.</p>
    <button class="primary-btn" type="button" id="acceptTermsBtn">✅ Aceitar termos</button>
  </div>
</dialog>

<!-- LOGOUT -->
<dialog id="confirmLogout">
  <div class="modal-head">
    <h3>Deseja sair?</h3>
    <p class="muted">Você será desconectado da sua conta.</p>
  </div>
  <div class="modal-body">
    <div class="modal-actions">
      <button class="secondary-btn" type="button" data-close-modal>Cancelar</button>
      <button class="primary-btn danger-bg" type="button" id="confirmLogoutBtn">🚪 Sair</button>
    </div>
  </div>
</dialog>

<!-- RECEIPT -->
<dialog id="receiptDialog">
  <div class="modal-head">
    <h3>Comprovante</h3>
    <p class="muted" id="receiptTitle">Transação realizada</p>
  </div>
  <div class="modal-body">
    <div class="receipt-icon" id="receiptIcon">✅</div>
    <div class="receipt-amount" id="receiptAmount">R$ 0,00</div>
    <p class="receipt-desc" id="receiptDesc">Transação processada com sucesso</p>
    <div id="receiptRows"></div>
    <button class="primary-btn" style="width:100%;margin-top:8px" type="button" data-close-modal>Fechar comprovante</button>
  </div>
</dialog>

<!-- FOTO -->
<dialog id="photoDialog">
  <form class="modal-body" id="photoForm">
    <div class="modal-head" style="padding:0 0 16px">
      <h3>Alterar foto de perfil</h3>
      <p class="muted">Escolha uma foto do computador ou cole um link.</p>
    </div>
    <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
      <img id="photoPreview" class="photo-preview" alt="Prévia da foto" src="">
      <div>
        <span class="profile-photo-badge">Prévia em tempo real</span>
        <p class="security-note">A imagem é otimizada para o perfil.</p>
      </div>
    </div>
    <div class="photo-uploader" id="photoDropZone">
      <strong>Solte sua foto aqui</strong>
      <small>Ou clique em "Escolher foto". Também funciona colando um link abaixo.</small>
      <button class="secondary-btn" type="button" id="choosePhotoBtn">Escolher foto</button>
      <input id="photoFileInput" class="file-hidden" type="file" accept="image/*">
    </div>
    <div class="photo-tools">
      <label class="field">Link da foto<input id="photoUrlInput" type="url" placeholder="https://exemplo.com/foto.jpg"></label>
      <div class="photo-source-row">
        <button class="ghost-btn" type="button" id="clearPhotoChoiceBtn">Limpar</button>
        <button class="secondary-btn" type="button" id="useCurrentPhotoBtn">Usar atual</button>
      </div>
    </div>
    <div class="modal-actions">
      <button class="secondary-btn" type="button" data-close-modal>Cancelar</button>
      <button class="primary-btn" type="submit">💾 Salvar foto</button>
    </div>
  </form>
</dialog>
` }} />
      <Script src="/client/app.js" type="module" strategy="afterInteractive" />
    </>
  );
}
