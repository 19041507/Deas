/**
 * Utilitários de CPF — validação completa com dígitos verificadores.
 *
 * Algoritmo oficial: módulo 11 com pesos 10→2 (1º dígito) e 11→2 (2º dígito).
 * Referência: Receita Federal do Brasil.
 */

/** Remove tudo que não for dígito */
export function cpfDigitsOnly(cpf: string): string {
  return cpf.replace(/\D/g, "");
}

/** Aplica máscara: 000.000.000-00 */
export function maskCpf(raw: string): string {
  const d = cpfDigitsOnly(raw).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

/**
 * Valida CPF completo (formato + dígitos verificadores).
 *
 * Rejeita:
 * - Menos de 11 dígitos
 * - Sequências repetidas (ex: 111.111.111-11)
 * - Dígitos verificadores incorretos
 */
export function isValidCpf(cpf: string): boolean {
  const d = cpfDigitsOnly(cpf);

  if (d.length !== 11) return false;

  // Rejeita sequências repetidas (ex: 00000000000)
  if (/^(\d)\1{10}$/.test(d)) return false;

  // Calcula 1º dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(d[i]) * (10 - i);
  let rem = (sum * 10) % 11;
  if (rem === 10 || rem === 11) rem = 0;
  if (rem !== parseInt(d[9])) return false;

  // Calcula 2º dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(d[i]) * (11 - i);
  rem = (sum * 10) % 11;
  if (rem === 10 || rem === 11) rem = 0;
  if (rem !== parseInt(d[10])) return false;

  return true;
}

/** Formata para salvar no banco: apenas dígitos (11 chars) */
export function sanitizeCpf(cpf: string): string {
  return cpfDigitsOnly(cpf);
}

/** Formata para exibição: 000.000.000-00 */
export function formatCpf(cpf: string): string {
  return maskCpf(cpf);
}

/** Ofusca para exibição segura: ***.456.789-** */
export function obfuscateCpf(cpf: string): string {
  const d = cpfDigitsOnly(cpf);
  if (d.length !== 11) return "***.***.***-**";
  return `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**`;
}
