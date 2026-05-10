"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Shield, Link2, RefreshCw, X, CheckCircle, Clock, AlertCircle, XCircle } from "lucide-react";
import { useApp } from "@/components/AppShell";

const fmt = (v: number | null | undefined) =>
  v == null ? "—" : Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Institution {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  canShareData: boolean;
  canReceiveData: boolean;
}

interface Consent {
  id: string;
  status: "pendente" | "ativo" | "revogado" | "expirado" | "erro";
  institution: Institution;
  validUntil?: string;
  lastSyncedAt?: string;
  permissions: string[];
  externalBalance: number | null;
  externalDebt: number | null;
  externalLimit: number | null;
  externalScore: number | null;
  estimatedIncome: number | null;
  requestedSalary: number;
}

// ─── Badge de status ──────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: Consent["status"] }) {
  const map: Record<string, { label: string; icon: React.ReactNode; cls: string }> = {
    ativo:    { label: "Ativo",    icon: <CheckCircle size={12} />, cls: "badge-success" },
    pendente: { label: "Pendente", icon: <Clock size={12} />,       cls: "badge-warning" },
    expirado: { label: "Expirado", icon: <AlertCircle size={12} />, cls: "badge-warning" },
    revogado: { label: "Revogado", icon: <XCircle size={12} />,     cls: "badge-danger"  },
    erro:     { label: "Erro",     icon: <AlertCircle size={12} />, cls: "badge-danger"  },
  };
  const s = map[status] ?? map.pendente;
  return (
    <span className={`badge ${s.cls}`} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
      {s.icon}{s.label}
    </span>
  );
}

// ─── Permissões legíveis ──────────────────────────────────────────────────────

const PERMISSION_LABELS: Record<string, string> = {
  ACCOUNTS_READ:     "Dados cadastrais",
  BALANCES_READ:     "Saldos",
  TRANSACTIONS_READ: "Extrato",
  CREDIT_SCORE_READ: "Score simulado",
};

// ─── Página ───────────────────────────────────────────────────────────────────

export default function OpenFinancePage() {
  const { refresh: refreshAccount, toast } = useApp();

  const [consents, setConsents] = useState<Consent[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [view, setView] = useState<"main" | "connect" | "salary">("main");

  // ── Connect form ──
  const [selectedInstitutionId, setSelectedInstitutionId] = useState("");
  const [consent1, setConsent1] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // ── Salary form ──
  const [salConsentId, setSalConsentId] = useState("");
  const [salAmount, setSalAmount] = useState("");
  const [consent2, setConsent2] = useState(false);

  // ── URL feedback (após callback OAuth) ──
  const [urlFeedback, setUrlFeedback] = useState<string | null>(null);

  // ── Carrega dados ──
  const load = useCallback(async () => {
    try {
      const [cr, ir] = await Promise.all([
        fetch("/api/open-finance"),
        fetch("/api/open-finance/institutions"),
      ]);
      const [cd, id] = await Promise.all([cr.json(), ir.json()]);
      setConsents(Array.isArray(cd) ? cd : []);
      setInstitutions(Array.isArray(id) ? id : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    // Lê feedback da URL após retorno do callback OAuth
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "conectado") {
      setUrlFeedback("success");
      window.history.replaceState({}, "", "/open-finance");
    } else if (params.get("error")) {
      setUrlFeedback("error:" + params.get("error"));
      window.history.replaceState({}, "", "/open-finance");
    }
  }, [load]);

  useEffect(() => {
    if (urlFeedback === "success") toast("Banco conectado com sucesso!", "success");
    else if (urlFeedback?.startsWith("error:")) toast("Erro ao conectar. Tente novamente.", "error");
  }, [urlFeedback, toast]);

  // ── Iniciar conexão ──
  async function connect(e: React.FormEvent) {
    e.preventDefault();
    if (!consent1) { toast("Autorização obrigatória.", "warning"); return; }
    if (!selectedInstitutionId) { toast("Selecione uma instituição.", "warning"); return; }
    setSubmitting(true);
    try {
      const r = await fetch("/api/open-finance/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ institutionId: selectedInstitutionId }),
      });
      const d = await r.json();
      if (!r.ok) { toast(d.message || "Erro.", "error"); return; }

      // Em ambiente simulado, o callback é chamado automaticamente via redirect
      // Em produção: window.location.href = d.authorizationUrl
      window.location.href = d.authorizationUrl;
    } finally {
      setSubmitting(false);
    }
  }

  // ── Sincronizar ──
  async function sync() {
    setSyncing(true);
    try {
      const r = await fetch("/api/open-finance/sync", { method: "POST" });
      const d = await r.json();
      await load();
      await refreshAccount();
      toast(d.message || "Sincronizado!", "success");
    } finally {
      setSyncing(false);
    }
  }

  // ── Revogar ──
  async function disconnect(id: string, institutionName: string) {
    if (!confirm(`Revogar conexão com ${institutionName}?`)) return;
    const r = await fetch("/api/open-finance/disconnect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const d = await r.json();
    if (r.ok) {
      await load(); await refreshAccount();
      toast("Conexão revogada.", "info");
    } else {
      toast(d.message || "Erro ao revogar.", "error");
    }
  }

  // ── Portabilidade salarial ──
  function handleSalChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, "");
    if (!raw) { setSalAmount(""); return; }
    const n = parseInt(raw, 10) / 100;
    setSalAmount(n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  }

  async function salary(e: React.FormEvent) {
    e.preventDefault();
    if (!consent2) { toast("Autorização obrigatória.", "warning"); return; }
    const val = parseFloat(salAmount.replace(/\./g, "").replace(",", ".")) || 0;
    if (val < 1) { toast("Valor inválido.", "error"); return; }
    setSubmitting(true);
    try {
      const r = await fetch("/api/open-finance/salary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: val, consentId: salConsentId || undefined }),
      });
      const d = await r.json();
      if (!r.ok) { toast(d.message || "Erro.", "error"); return; }
      await load(); await refreshAccount();
      toast("Portabilidade realizada com sucesso!", "success");
      setView("main");
    } finally {
      setSubmitting(false);
    }
  }

  const active = consents.filter((c) => c.status === "ativo");
  const activeInstitutionIds = new Set(active.map((c) => c.institution.id));

  // ─── View: Conectar ───────────────────────────────────────────────────────
  if (view === "connect") {
    const selectedInst = institutions.find((i) => i.id === selectedInstitutionId);
    return (
      <div className="page-wrap narrow">
        <button className="back-link" onClick={() => setView("main")}>← Voltar</button>
        <div className="form-card">
          <p className="eyebrow">Open Finance</p>
          <h3>Conectar instituição</h3>
          <p className="sub">Vincule uma conta externa com consentimento explícito.</p>
          <form className="f-grid mt12" onSubmit={connect}>
            <label className="field">Instituição financeira
              <select
                className="fi"
                value={selectedInstitutionId}
                onChange={(e) => { setSelectedInstitutionId(e.target.value); setConsent1(false); }}
                required
              >
                <option value="">Selecione…</option>
                {institutions
                  .filter((i) => i.canShareData && !activeInstitutionIds.has(i.id))
                  .map((i) => (
                    <option key={i.id} value={i.id}>{i.name}</option>
                  ))}
              </select>
            </label>

            {selectedInst && (
              <div className="consent-box">
                <strong>Você está autorizando o {selectedInst.name} a:</strong>
                <ul className="clist">
                  <li>Confirmar que a conta pertence ao mesmo usuário.</li>
                  <li>Compartilhar dados básicos para análise de crédito.</li>
                  <li>Fornecer saldo, extrato e score ao Deas Finance.</li>
                </ul>
                <div style={{ marginTop: 8, fontSize: 12, color: "var(--tx-3)" }}>
                  <strong>Permissões solicitadas:</strong>{" "}
                  {["ACCOUNTS_READ", "BALANCES_READ", "TRANSACTIONS_READ", "CREDIT_SCORE_READ"]
                    .map((p) => PERMISSION_LABELS[p])
                    .join(", ")}
                </div>
                <label className="check-row mt8">
                  <input type="checkbox" checked={consent1} onChange={(e) => setConsent1(e.target.checked)} required />
                  <span>Autorizo a conexão com o {selectedInst.name}</span>
                </label>
              </div>
            )}

            <button
              className="btn btn-primary btn-w"
              type="submit"
              disabled={submitting || !consent1 || !selectedInstitutionId}
            >
              {submitting ? "Conectando…" : "Confirmar conexão"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ─── View: Portabilidade salarial ─────────────────────────────────────────
  if (view === "salary") {
    const salConsent = salConsentId
      ? active.find((c) => c.id === salConsentId)
      : active[0];

    return (
      <div className="page-wrap narrow">
        <button className="back-link" onClick={() => setView("main")}>← Voltar</button>
        <div className="form-card">
          <p className="eyebrow">Portabilidade salarial</p>
          <h3>Trazer salário de outro banco</h3>
          <p className="sub">Transfira sua renda para o Deas Finance e melhore seu score.</p>
          <form className="f-grid mt12" onSubmit={salary}>
            {active.length > 1 && (
              <label className="field">Banco de origem
                <select className="fi" value={salConsentId} onChange={(e) => setSalConsentId(e.target.value)}>
                  <option value="">Primeiro banco ativo</option>
                  {active.map((c) => (
                    <option key={c.id} value={c.id}>{c.institution.name}</option>
                  ))}
                </select>
              </label>
            )}

            <label className="field">Valor a transferir
              <div className="money-input-wrap">
                <span className="money-prefix">R$</span>
                <input
                  className="fi"
                  inputMode="numeric"
                  placeholder="0,00"
                  value={salAmount}
                  onChange={handleSalChange}
                  required
                />
              </div>
            </label>

            {salConsent && salConsent.estimatedIncome && (
              <p style={{ fontSize: 12, color: "var(--tx-3)" }}>
                Renda estimada em {salConsent.institution.name}:{" "}
                <strong>{fmt(salConsent.estimatedIncome)}</strong>
              </p>
            )}

            <div className="consent-box">
              <strong>Você está autorizando:</strong>
              <ul className="clist">
                <li>Transferência de renda {salConsent ? `do ${salConsent.institution.name}` : "do banco selecionado"}.</li>
                <li>Compartilhamento de saldo, histórico e score externo.</li>
              </ul>
              <label className="check-row mt8">
                <input type="checkbox" checked={consent2} onChange={(e) => setConsent2(e.target.checked)} required />
                <span>Estou ciente e autorizo</span>
              </label>
            </div>

            <button className="btn btn-primary btn-w" type="submit" disabled={submitting || !consent2}>
              {submitting ? "Transferindo…" : "Confirmar portabilidade"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ─── View: Principal ──────────────────────────────────────────────────────
  return (
    <div className="page-wrap medium">
      <Link href="/dashboard" className="back-link">← Voltar</Link>
      <div className="demo-bar mb16">🔬 Ambiente de demonstração — conexão Open Finance simulada</div>

      <div className="of-hero">
        <div>
          <p className="eyebrow mb8">Open Finance</p>
          <h3>Conecte instituições financeiras</h3>
          <p>Compartilhe dados financeiros com segurança e obtenha uma análise de crédito ampliada.</p>
        </div>
        <div className="of-btns">
          <button className="btn btn-primary" onClick={() => setView("connect")}>
            <Link2 size={15} />Conectar instituição
          </button>
          {active.length > 0 && (
            <button className="btn btn-secondary" onClick={() => setView("salary")}>
              💰 Portabilidade
            </button>
          )}
          <button className="btn btn-ghost" onClick={sync} disabled={syncing}>
            <RefreshCw size={14} className={syncing ? "spin" : ""} />
            {syncing ? "Sincronizando…" : "Sincronizar"}
          </button>
        </div>
      </div>

      <div className="of-steps mb16">
        {[
          { l: "Conexão",     d: "Vincular instituição" },
          { l: "Portabilidade", d: "Trazer salário" },
          { l: "Score",       d: "Análise ampliada" },
        ].map((s, i) => {
          const isDone =
            i === 0 ? active.length > 0
            : i === 1 ? active.some((c) => c.requestedSalary > 0)
            : active.some((c) => c.requestedSalary > 0);
          return (
            <div key={i} className={`of-step ${isDone ? "done" : i === 0 && !active.length ? "active" : ""}`}>
              <div className="osn">{isDone ? "✓" : i + 1}</div>
              <div>
                <span className="osl" style={{ display: "block", fontWeight: 700, marginBottom: 2 }}>{s.l}</span>
                <span style={{ fontSize: 11, color: "var(--tx-3)" }}>{s.d}</span>
              </div>
            </div>
          );
        })}
      </div>

      {loading ? (
        <div className="sk" style={{ height: 120, borderRadius: 16 }} />
      ) : consents.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "40px 20px" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔗</div>
          <strong style={{ fontSize: 15, display: "block", marginBottom: 8 }}>
            Nenhuma instituição conectada
          </strong>
          <p style={{ fontSize: 13, color: "var(--tx-2)", marginBottom: 16 }}>
            Conecte um banco externo para receber uma análise de crédito mais completa.
          </p>
          <button className="btn btn-primary" onClick={() => setView("connect")}>
            Conectar agora
          </button>
        </div>
      ) : (
        consents.map((c) => (
          <div key={c.id} className="card mb12">
            <div className="sec-hdr mb16">
              <div>
                <p className="eyebrow mb8">Instituição conectada</p>
                <h3>{c.institution.name}</h3>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <StatusBadge status={c.status} />
                {c.status === "ativo" && (
                  <button
                    className="btn btn-danger-soft btn-sm"
                    onClick={() => disconnect(c.id, c.institution.name)}
                  >
                    <X size={13} />Revogar
                  </button>
                )}
              </div>
            </div>

            {c.validUntil && (
              <p style={{ fontSize: 12, color: "var(--tx-3)", marginBottom: 14 }}>
                Consentimento válido até: {new Date(c.validUntil).toLocaleDateString("pt-BR")}
                {c.lastSyncedAt && (
                  <> · Última sincronização: {new Date(c.lastSyncedAt).toLocaleString("pt-BR")}</>
                )}
              </p>
            )}

            {c.permissions.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <p style={{ fontSize: 11, color: "var(--tx-3)", marginBottom: 6 }}>Permissões concedidas</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {c.permissions.map((p) => (
                    <span key={p} style={{ fontSize: 11, background: "var(--surface-2)", borderRadius: 6, padding: "2px 8px" }}>
                      {PERMISSION_LABELS[p] ?? p}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {c.status === "ativo" && (
              <div className="of-data">
                {[
                  ["Saldo externo",    fmt(c.externalBalance)],
                  ["Dívidas",          fmt(c.externalDebt)],
                  ["Limite",           fmt(c.externalLimit)],
                  ["Score externo",    c.externalScore ?? "—"],
                  ["Salário trazido",  fmt(c.requestedSalary)],
                  ["Renda estimada",   fmt(c.estimatedIncome)],
                ].map(([k, v]) => (
                  <div key={k as string} className="of-data-item">
                    <small>{k as string}</small>
                    <strong>{v as string}</strong>
                  </div>
                ))}
              </div>
            )}

            {(c.status === "pendente") && (
              <div style={{ padding: "12px", background: "var(--surface-2)", borderRadius: 10, fontSize: 13, color: "var(--tx-2)" }}>
                ⏳ Aguardando autorização do banco…
              </div>
            )}

            {(c.status === "erro" || c.status === "expirado") && (
              <div style={{ padding: "12px", background: "var(--surface-2)", borderRadius: 10, fontSize: 13, color: "var(--tx-2)" }}>
                ⚠️ {c.status === "erro" ? "Erro na última sincronização. Tente reconectar." : "Consentimento expirado."}
              </div>
            )}
          </div>
        ))
      )}

      {consents.length > 0 && (
        <div style={{ marginTop: 16, padding: "14px 20px", background: "var(--surface-2)", borderRadius: 14, fontSize: 12, color: "var(--tx-3)" }}>
          <Shield size={12} style={{ display: "inline", marginRight: 6 }} />
          O Banco Central do Brasil exige consentimento explícito do cliente para todo compartilhamento de dados.
          Você pode revogar o acesso a qualquer momento.
        </div>
      )}
    </div>
  );
}
