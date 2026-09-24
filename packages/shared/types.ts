export type StatusLeitura = 'Ok' | 'Alerta' | 'Revisada';

export interface Frota {
  id: number;
  numero: number;
  descricao: string;
  casasDecimais: number;
  ativa: boolean;
}

export interface Dispositivo {
  id: string; // uuid
  tokenHash: string;
  apelido: string;
  ultimoContato: string; // ISO datetime
  revogado: boolean;
}

export interface Leitura {
  id: string; // uuid gerado no cliente
  frotaId: number;
  frotaNumero: number;
  dispositivoId: string;
  valorConfirmado: number;
  valorOcr: number;
  capturadoEm: string; // ISO datetime no aparelho
  recebidoEm: string; // ISO datetime no servidor
  status: StatusLeitura;
  lat: number | null;
  lng: number | null;
  observacaoAlerta?: string | null;
  fotoUrl?: string;
  fotoChave?: string;
}

export interface FotoRegistro {
  leituraId: string;
  chaveBucket: string;
  hashSha256: string;
  bytes: number;
  enviadaEm: string;
}

export interface FechamentoDia {
  id?: string;
  frotaId: number;
  frotaNumero: number;
  dia: string; // YYYY-MM-DD
  inicial: number;
  final: number;
  horas: number;
  qtdLeituras: number;
  diasSemLeituraAnteriores: number;
}

export interface AdminUser {
  id: string;
  email: string;
  senhaHash: string;
  ativo: boolean;
}

export interface RegistroAuditoria {
  id: string;
  quando: string;
  quem: string;
  acao: string;
  alvo: string;
  detalhes?: string;
}

export interface ResumoFrotaPainel {
  frotaId: number;
  numero: number;
  descricao: string;
  ultimoHorimetro: number | null;
  dataUltimaLeitura: string | null;
  diasSemLeitura: number;
  alertasAbertos: number;
  ultimoContatoAparelho: string | null;
  statusGeral: 'normal' | 'alerta' | 'sem_leitura';
}

export interface ItemFilaLocal {
  id: string; // uuid gerado no celular
  frotaNumero: number;
  valorOcr: number;
  valorConfirmado: number;
  capturadoEm: string; // ISO date
  fotoBlobUrl?: string;
  fotoBase64?: string;
  statusFila: 'Pendente' | 'Enviando' | 'Sincronizada' | 'Falha';
  tentativas: number;
  erroMsg?: string;
}
