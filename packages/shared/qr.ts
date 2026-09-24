import { FROTAS_SEED_MAP } from './frotas-seed';

export interface QrParseResult {
  valido: boolean;
  frotaNumero: number | null;
  mensagemErro?: string;
  textoOriginal: string;
}

/**
 * Decodifica o conteúdo de QR codes de frotas da TRANSJAP.
 * O padrão é um número com 4 dígitos (ex.: "0016" -> frota 16, "0294" -> frota 294).
 * Também aceita formatos comuns como "FROTA 16", "FROTA 0016", "FROTA: 0016" ou "16".
 */
export function parseQrCode(textoBruto: string): QrParseResult {
  const limpo = (textoBruto || '').trim();
  
  if (!limpo) {
    return {
      valido: false,
      frotaNumero: null,
      mensagemErro: 'QR code vazio ou ilegível',
      textoOriginal: textoBruto
    };
  }

  // Tenta extrair dígitos: se for padrão 4 dígitos "0016" ou texto "FROTA 0016"
  let numeroExtraido: number | null = null;

  // Regex para número direto de 1 a 4 dígitos ou precedido de "FROTA"
  const matchComPrefixo = limpo.match(/(?:frota|maq|equipamento)?\s*[:#-]?\s*(\d{1,4})/i);
  if (matchComPrefixo && matchComPrefixo[1]) {
    numeroExtraido = parseInt(matchComPrefixo[1], 10);
  } else if (/^\d{1,4}$/.test(limpo)) {
    numeroExtraido = parseInt(limpo, 10);
  }

  if (numeroExtraido === null || isNaN(numeroExtraido)) {
    return {
      valido: false,
      frotaNumero: null,
      mensagemErro: `QR Code não reconhecido ("${limpo.slice(0, 16)}"). O padrão é 4 dígitos (ex: 0016).`,
      textoOriginal: textoBruto
    };
  }

  // Validação contra as 77 frotas ativas da TRANSJAP
  if (!FROTAS_SEED_MAP.has(numeroExtraido)) {
    return {
      valido: false,
      frotaNumero: numeroExtraido,
      mensagemErro: `Frota ${numeroExtraido} não pertence ao cadastro ativo de frotas da TRANSJAP.`,
      textoOriginal: textoBruto
    };
  }

  return {
    valido: true,
    frotaNumero: numeroExtraido,
    textoOriginal: textoBruto
  };
}

/**
 * Formata o número da frota para exibição no padrão de 4 dígitos do QR
 */
export function formatarNumeroFrotaQr(numero: number): string {
  return numero.toString().padStart(4, '0');
}
