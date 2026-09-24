export interface FrotaSeedItem {
  numero: number;
  descricao: string;
  casasDecimais: number;
  ativa: boolean;
}

export const FROTAS_NUMEROS_SEED = [
  16, 68, 70, 74, 76, 80, 84, 86, 88, 90, 92, 94,
  108, 112, 114, 118, 122, 124, 128, 142, 156, 164, 166, 168,
  182, 184, 186, 188, 190, 192, 194, 196, 200, 202, 204, 206,
  212, 214, 218, 220, 222, 224, 226, 228, 230, 232, 234, 236,
  238, 240, 242, 244, 246, 248, 250, 252, 254, 256, 258, 260,
  262, 264, 266, 268, 270, 272, 274, 276, 278, 280, 282, 284,
  286, 288, 290, 292, 294
] as const;

export const FROTAS_SEED_MAP = new Set<number>(FROTAS_NUMEROS_SEED);

// Classificação padrão por tipo de máquina da terraplenagem TRANSJAP
function getDescricaoFrota(numero: number): string {
  if (numero <= 94) return `Escavadeira Hidráulica — Frota ${numero}`;
  if (numero <= 168) return `Motoniveladora / Rolo Compactador — Frota ${numero}`;
  if (numero <= 230) return `Trator de Esteira — Frota ${numero}`;
  return `Caminhão Basculante Traçado — Frota ${numero}`;
}

export const FROTAS_SEED_DATA: FrotaSeedItem[] = FROTAS_NUMEROS_SEED.map((num) => ({
  numero: num,
  descricao: getDescricaoFrota(num),
  casasDecimais: 1,
  ativa: true
}));
