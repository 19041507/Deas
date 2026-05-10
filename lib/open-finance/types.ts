/**
 * Tipos e interface padrão do Open Finance.
 *
 * Todos os adaptadores de banco devem retornar dados neste formato,
 * independente de como a API do banco externo organiza as informações.
 */

export interface OpenFinanceAccountData {
  availableBalance: number;
  debt: number;
  limit: number;
  loans: number;
  investments: number;
  estimatedIncome: number;
  externalScore: number;
}

export interface OpenFinanceTransaction {
  id: string;
  type: "entrada" | "saída";
  description: string;
  amount: number;
  date: string;
}

export interface OpenFinanceProfile {
  fullName: string;
  /** Em projeto real: CPF/CNPJ. Aqui usamos e-mail como identificador global. */
  globalIdentifier: string;
}

export interface OpenFinanceData {
  profile: OpenFinanceProfile;
  account: OpenFinanceAccountData;
  transactions: OpenFinanceTransaction[];
}

/** Resposta padronizada de erro vindo de uma API externa */
export interface OpenFinanceError {
  error: true;
  code:
    | "BANK_UNAVAILABLE"
    | "TOKEN_EXPIRED"
    | "CONSENT_REVOKED"
    | "INSUFFICIENT_PERMISSIONS"
    | "USER_NOT_FOUND"
    | "UNKNOWN";
  message: string;
}

/** Contrato que cada adaptador de banco deve implementar */
export interface BankAdapter {
  /**
   * Busca todos os dados financeiros do usuário na API do banco externo.
   * @param accessToken Token OAuth obtido no fluxo de consentimento
   * @param apiBaseUrl  URL base da API do banco (salva na tabela Institution)
   */
  fetchAccountData(
    accessToken: string,
    apiBaseUrl: string
  ): Promise<OpenFinanceAccountData>;

  /**
   * Notifica o banco externo que o consentimento foi revogado.
   * Em uma implementação real, chamaria DELETE /open-finance/consents/:id
   */
  revokeConsent(
    accessToken: string,
    apiBaseUrl: string,
    consentId: string
  ): Promise<void>;
}
