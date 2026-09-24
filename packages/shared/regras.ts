import { StatusLeitura } from './types';

export interface ParametrosValidacaoLeitura {
  valorConfirmado: number;
  valorOcr: number;
  capturadoEm: Date;
  recebidoEm: Date;
  ultimaLeituraFrota?: {
    valor: number;
    capturadoEm: Date;
  } | null;
}

export interface ResultadoValidacaoRegras {
  status: StatusLeitura;
  observacaoAlerta: string | null;
  motivoAlerta?: 'regressao' | 'salto_impossivel' | 'relogio_suspeito';
  diferencaOcr: boolean;
}

/**
 * Aplica as regras de negócio da TRANSJAP para definir o status da leitura.
 * A LEITURA É SEMPRE GRAVADA; as regras apenas definem se o status é 'Ok' ou 'Alerta'.
 */
export function avaliarRegrasLeitura(params: ParametrosValidacaoLeitura): ResultadoValidacaoRegras {
  const { valorConfirmado, valorOcr, capturadoEm, recebidoEm, ultimaLeituraFrota } = params;
  
  const diferencaOcr = Math.abs(valorConfirmado - valorOcr) > 0.05;

  // 1. Verificação de Data/Hora Suspeita:
  // Se o relógio do aparelho estiver adiantado (no futuro em relação à chegada no servidor)
  // com tolerância de 15 minutos, ou se tiver sido capturado há mais de 30 dias.
  const diffFuturoMs = capturadoEm.getTime() - recebidoEm.getTime();
  const toleranciaFuturoMs = 15 * 60 * 1000; // 15 minutos de tolerância para fuso/relógio
  const trintaDiasMs = 30 * 24 * 60 * 60 * 1000;
  const diffPassadoMs = recebidoEm.getTime() - capturadoEm.getTime();

  if (diffFuturoMs > toleranciaFuturoMs) {
    return {
      status: 'Alerta',
      observacaoAlerta: `Relógio suspeito: data de captura (${capturadoEm.toLocaleDateString('pt-BR')} ${capturadoEm.toLocaleTimeString('pt-BR')}) está no futuro em relação ao servidor.`,
      motivoAlerta: 'relogio_suspeito',
      diferencaOcr
    };
  }

  if (diffPassadoMs > trintaDiasMs) {
    return {
      status: 'Alerta',
      observacaoAlerta: `Relógio suspeito: data de captura tem mais de 30 dias de atraso (${Math.round(diffPassadoMs / (24 * 60 * 60 * 1000))} dias atrás).`,
      motivoAlerta: 'relogio_suspeito',
      diferencaOcr
    };
  }

  // Se houver histórico anterior para esta máquina:
  if (ultimaLeituraFrota) {
    // 2. Regressão de Horímetro:
    // O horímetro de uma máquina de terraplenagem nunca pode diminuir
    if (valorConfirmado < ultimaLeituraFrota.valor) {
      return {
        status: 'Alerta',
        observacaoAlerta: `Regressão de horímetro: valor informado (${valorConfirmado.toFixed(1)} h) é inferior ao último registrado (${ultimaLeituraFrota.valor.toFixed(1)} h).`,
        motivoAlerta: 'regressao',
        diferencaOcr
      };
    }

    // 3. Salto Impossível de Horas:
    // Uma máquina não pode trabalhar mais de 24 horas por dia.
    // Limite máximo aceitável = 24h × (dias decorridos + 1 dia de margem mínima).
    const tempoDecorridoMs = Math.max(1, capturadoEm.getTime() - ultimaLeituraFrota.capturadoEm.getTime());
    const diasDecorridos = tempoDecorridoMs / (1000 * 60 * 60 * 24);
    const saltoHoras = valorConfirmado - ultimaLeituraFrota.valor;
    const maximoHorasPossivel = Math.max(24, Math.ceil(diasDecorridos * 24) + 1);

    if (saltoHoras > maximoHorasPossivel) {
      return {
        status: 'Alerta',
        observacaoAlerta: `Salto impossível: acréscimo de ${saltoHoras.toFixed(1)} h em ${diasDecorridos.toFixed(1)} dia(s) excede o limite físico de 24h/dia (máx esperado: ${maximoHorasPossivel}h).`,
        motivoAlerta: 'salto_impossivel',
        diferencaOcr
      };
    }
  }

  return {
    status: 'Ok',
    observacaoAlerta: null,
    diferencaOcr
  };
}
