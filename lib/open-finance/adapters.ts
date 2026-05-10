/**
 * Dispatcher de adaptadores Open Finance.
 *
 * Seleciona o adaptador correto para cada banco com base no slug da instituição.
 * Se o banco não tiver um adaptador específico, usa o adaptador genérico
 * (que exige que o banco siga o contrato padrão da API).
 *
 * Para adicionar suporte a um banco com API diferente:
 *   1. Crie /lib/open-finance/providers/nome-do-banco.ts
 *   2. Implemente a interface BankAdapter
 *   3. Registre o slug no mapa abaixo
 */

import type { BankAdapter } from "./types";
import { genericAdapter } from "./providers/generic";
import { larabankAdapter } from "./providers/larabank";

// Mapa: slug da instituição → adaptador específico
// Bancos não listados aqui usam o adaptador genérico
const adapters: Record<string, BankAdapter> = {
  "larabank": larabankAdapter,
};

/**
 * Retorna o adaptador adequado para a instituição informada.
 * Bancos sem adaptador específico usam o genericAdapter,
 * que espera o contrato padrão Open Finance.
 */
export function getAdapter(institutionSlug: string): BankAdapter {
  return adapters[institutionSlug] ?? genericAdapter;
}

export type { BankAdapter, OpenFinanceAccountData } from "./types";
