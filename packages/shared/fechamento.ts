import { FechamentoDia, Leitura } from './types';

/**
 * Calcula o fechamento diário de uma frota para um dia específico.
 * 
 * Regras estritas da TRANSJAP:
 * - final = última leitura do dia
 * - inicial = última leitura da frota ANTES do dia (ou a primeira leitura do dia, se for a primeira da história)
 * - horas = final - inicial
 * - Se a frota ficou N dias sem leitura, as horas acumuladas aparecem no dia da próxima leitura,
 *   marcadas como "acumulado de N dias". Nada é distribuído por estimativa linear.
 */
export function calcularFechamentoDiaParaFrota(params: {
  frotaId: number;
  frotaNumero: number;
  diaIso: string; // "YYYY-MM-DD"
  leiturasDoDia: Leitura[]; // ordenadas por capturadoEm ASC
  ultimaLeituraAnterior?: Leitura | null;
}): FechamentoDia | null {
  const { frotaId, frotaNumero, diaIso, leiturasDoDia, ultimaLeituraAnterior } = params;

  if (!leiturasDoDia || leiturasDoDia.length === 0) {
    return null;
  }

  // Ordena por data de captura crescente
  const ordenadas = [...leiturasDoDia].sort(
    (a, b) => new Date(a.capturadoEm).getTime() - new Date(b.capturadoEm).getTime()
  );

  const finalLeitura = ordenadas[ordenadas.length - 1];
  const final = finalLeitura.valorConfirmado;

  let inicial: number;
  let diasSemLeituraAnteriores = 0;

  if (ultimaLeituraAnterior) {
    inicial = ultimaLeituraAnterior.valorConfirmado;
    // Calcula a quantidade de dias civis entre a última leitura e a atual
    const dataAnterior = new Date(ultimaLeituraAnterior.capturadoEm);
    const dataAtual = new Date(diaIso + 'T00:00:00');
    const diffTime = dataAtual.getTime() - new Date(dataAnterior.toISOString().slice(0, 10) + 'T00:00:00').getTime();
    const diffDias = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    diasSemLeituraAnteriores = Math.max(0, diffDias - 1);
  } else {
    // Se for a primeira leitura da história da máquina
    inicial = ordenadas[0].valorConfirmado;
    diasSemLeituraAnteriores = 0;
  }

  const horas = Math.max(0, Number((final - inicial).toFixed(1)));

  return {
    frotaId,
    frotaNumero,
    dia: diaIso,
    inicial: Number(inicial.toFixed(1)),
    final: Number(final.toFixed(1)),
    horas,
    qtdLeituras: ordenadas.length,
    diasSemLeituraAnteriores
  };
}
