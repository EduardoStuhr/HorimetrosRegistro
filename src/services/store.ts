import { 
  Frota, 
  Dispositivo, 
  Leitura, 
  FotoRegistro, 
  FechamentoDia, 
  RegistroAuditoria, 
  ResumoFrotaPainel,
  StatusLeitura 
} from '../../packages/shared/types';
import { FROTAS_SEED_DATA } from '../../packages/shared/frotas-seed';
import { avaliarRegrasLeitura } from '../../packages/shared/regras';
import { calcularFechamentoDiaParaFrota } from '../../packages/shared/fechamento';

// Banco de dados em memória persistente com snapshot local
class TransjapDatabase {
  private frotas: Map<number, Frota> = new Map();
  private dispositivos: Map<string, Dispositivo> = new Map();
  private leituras: Map<string, Leitura> = new Map();
  private fotos: Map<string, FotoRegistro> = new Map();
  private fechamentos: Map<string, FechamentoDia> = new Map(); // key: `${frotaId}_${dia}`
  private auditorias: RegistroAuditoria[] = [];

  constructor() {
    this.seedInitialData();
  }

  private seedInitialData() {
    // 1. Seed das 77 Frotas
    FROTAS_SEED_DATA.forEach((item, index) => {
      this.frotas.set(item.numero, {
        id: index + 1,
        numero: item.numero,
        descricao: item.descricao,
        casasDecimais: item.casasDecimais,
        ativa: item.ativa
      });
    });

    // 2. Dispositivo padrão de campo
    const disp1: Dispositivo = {
      id: 'disp-campo-01',
      tokenHash: 'hash_sha256_aparelho_01',
      apelido: 'Samsung XCover Pro — Obra Rodovia Leste',
      ultimoContato: new Date().toISOString(),
      revogado: false
    };
    const disp2: Dispositivo = {
      id: 'disp-campo-02',
      tokenHash: 'hash_sha256_aparelho_02',
      apelido: 'Motorola Defy — Frente de Terraplenagem 02',
      ultimoContato: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
      revogado: false
    };
    this.dispositivos.set(disp1.id, disp1);
    this.dispositivos.set(disp2.id, disp2);

    // 3. Seed de Leituras Históricas nos últimos 5 dias para frotas selecionadas
    const hoje = new Date();
    
    // Função auxiliar para data retroativa formatada em ISO
    const diasAtras = (dias: number, horas: number = 17, minutos: number = 30): Date => {
      const d = new Date(hoje);
      d.setDate(d.getDate() - dias);
      d.setHours(horas, minutos, 0, 0);
      return d;
    };

    // Imagem base SVG representativa de horímetro em alta fidelidade para os registros
    const getSvgHorimetro = (valor: string, tipo: 'digital' | 'analogico' = 'digital') => {
      const bg = tipo === 'digital' ? '#2A2C2B' : '#E8E8E2';
      const textCol = tipo === 'digital' ? '#78FFAA' : '#111111';
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="240" viewBox="0 0 400 240">
        <rect width="400" height="240" fill="#1C1D1F"/>
        <rect x="20" y="20" width="360" height="200" rx="6" fill="#121314" stroke="#444648" stroke-width="4"/>
        <rect x="50" y="55" width="300" height="110" rx="3" fill="${bg}" stroke="#222" stroke-width="2"/>
        <text x="70" y="130" font-family="monospace" font-size="44" font-weight="bold" fill="${textCol}" letter-spacing="4">${valor}</text>
        <text x="290" y="145" font-family="sans-serif" font-size="14" fill="#999">HORAS</text>
        <circle cx="340" cy="185" r="4" fill="#D97706"/>
        <text x="50" y="195" font-family="sans-serif" font-size="11" fill="#666">TRANSJAP REGISTRO FOTOGRÁFICO DE CAMPO</text>
      </svg>`;
      return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
    };

    // Histórico para a Frota 16 (Escavadeira Principal)
    const leiturasF16 = [
      { id: 'leit-f16-01', valor: 4210.5, ocr: 4210.5, data: diasAtras(4), status: 'Ok' as StatusLeitura },
      { id: 'leit-f16-02', valor: 4218.2, ocr: 4218.2, data: diasAtras(3), status: 'Ok' as StatusLeitura },
      { id: 'leit-f16-03', valor: 4227.0, ocr: 4227.0, data: diasAtras(2), status: 'Ok' as StatusLeitura },
      { id: 'leit-f16-04', valor: 4235.8, ocr: 4235.8, data: diasAtras(1), status: 'Ok' as StatusLeitura },
      { id: 'leit-f16-05', valor: 4244.1, ocr: 4244.1, data: diasAtras(0), status: 'Ok' as StatusLeitura },
    ];

    leiturasF16.forEach(l => {
      this.leituras.set(l.id, {
        id: l.id,
        frotaId: 1,
        frotaNumero: 16,
        dispositivoId: 'disp-campo-01',
        valorConfirmado: l.valor,
        valorOcr: l.ocr,
        capturadoEm: l.data.toISOString(),
        recebidoEm: l.data.toISOString(),
        status: l.status,
        lat: null,
        lng: null,
        fotoUrl: getSvgHorimetro(l.valor.toFixed(1))
      });
    });

    // Frota 68: com Alerta de Regressão proposital para auditoria
    const leiturasF68 = [
      { id: 'leit-f68-01', valor: 1850.0, ocr: 1850.0, data: diasAtras(2), status: 'Ok' as StatusLeitura },
      { 
        id: 'leit-f68-02', 
        valor: 1842.0, 
        ocr: 1842.0, 
        data: diasAtras(1), 
        status: 'Alerta' as StatusLeitura,
        obs: 'Regressão de horímetro: valor informado (1842.0 h) é inferior ao último registrado (1850.0 h).' 
      }
    ];
    leiturasF68.forEach(l => {
      this.leituras.set(l.id, {
        id: l.id,
        frotaId: 2,
        frotaNumero: 68,
        dispositivoId: 'disp-campo-02',
        valorConfirmado: l.valor,
        valorOcr: l.ocr,
        capturadoEm: l.data.toISOString(),
        recebidoEm: l.data.toISOString(),
        status: l.status,
        lat: null,
        lng: null,
        observacaoAlerta: l.obs,
        fotoUrl: getSvgHorimetro(l.valor.toFixed(1), 'analogico')
      });
    });

    // Frota 70: leitura com divergência de OCR (operador corrigiu o valor sugerido)
    const leitF70 = {
      id: 'leit-f70-01',
      frotaId: 3,
      frotaNumero: 70,
      dispositivoId: 'disp-campo-01',
      valorConfirmado: 3105.4,
      valorOcr: 3105.1, // OCR errou a casa decimal e operador corrigiu
      capturadoEm: diasAtras(0).toISOString(),
      recebidoEm: diasAtras(0).toISOString(),
      status: 'Ok' as StatusLeitura,
      lat: null,
      lng: null,
      fotoUrl: getSvgHorimetro('3105.4')
    };
    this.leituras.set(leitF70.id, leitF70);

    // Frota 80: Salto de horas excessivo (Alerta)
    const leiturasF80 = [
      { id: 'leit-f80-01', valor: 900.0, ocr: 900.0, data: diasAtras(1), status: 'Ok' as StatusLeitura },
      { 
        id: 'leit-f80-02', 
        valor: 940.0, 
        ocr: 940.0, 
        data: diasAtras(0), 
        status: 'Alerta' as StatusLeitura,
        obs: 'Salto impossível: acréscimo de 40.0 h em 1 dia excede o limite físico de 24h/dia.' 
      }
    ];
    leiturasF80.forEach(l => {
      this.leituras.set(l.id, {
        id: l.id,
        frotaId: 6,
        frotaNumero: 80,
        dispositivoId: 'disp-campo-01',
        valorConfirmado: l.valor,
        valorOcr: l.ocr,
        capturadoEm: l.data.toISOString(),
        recebidoEm: l.data.toISOString(),
        status: l.status,
        lat: null,
        lng: null,
        observacaoAlerta: l.obs,
        fotoUrl: getSvgHorimetro(l.valor.toFixed(1))
      });
    });

    // Recalcula os fechamentos dos dados seed
    this.recalcularTodosFechamentos();
  }

  // --- Operações de Frotas ---
  public listarFrotas(): Frota[] {
    return Array.from(this.frotas.values()).sort((a, b) => a.numero - b.numero);
  }

  public buscarFrotaPorNumero(numero: number): Frota | undefined {
    return this.frotas.get(numero);
  }

  // --- Operações de Dispositivos ---
  public registrarDispositivo(id: string, apelido: string): Dispositivo {
    const existente = this.dispositivos.get(id);
    if (existente) {
      existente.ultimoContato = new Date().toISOString();
      return existente;
    }
    const novo: Dispositivo = {
      id,
      tokenHash: `token_hash_${id.slice(0, 8)}`,
      apelido: apelido || `Dispositivo ${id.slice(0, 6)}`,
      ultimoContato: new Date().toISOString(),
      revogado: false
    };
    this.dispositivos.set(id, novo);
    return novo;
  }

  public atualizarContatoDispositivo(id: string) {
    const disp = this.dispositivos.get(id);
    if (disp) {
      disp.ultimoContato = new Date().toISOString();
    }
  }

  // --- Operações de Leituras ---
  public criarLeitura(dados: {
    id: string; // UUID v4 do cliente (Idempotência)
    frotaNumero: number;
    dispositivoId: string;
    valorConfirmado: number;
    valorOcr: number;
    capturadoEm: string;
    fotoDataUrl?: string;
  }): { leitura: Leitura; jaExistia: boolean } {
    // 1. Verificação de IDEMPOTÊNCIA (R9): se o UUID já existir, não duplica!
    const existente = this.leituras.get(dados.id);
    if (existente) {
      return { leitura: existente, jaExistia: true };
    }

    const frota = this.frotas.get(dados.frotaNumero);
    if (!frota) {
      throw new Error(`Frota ${dados.frotaNumero} não encontrada.`);
    }

    // Atualiza o contato do aparelho
    this.atualizarContatoDispositivo(dados.dispositivoId);

    // Obtém a última leitura registrada para esta máquina (para validação de regras)
    const leiturasAnteriores = this.listarLeiturasDaFrota(dados.frotaNumero)
      .filter(l => new Date(l.capturadoEm).getTime() < new Date(dados.capturadoEm).getTime());
    
    const ultimaLeitura = leiturasAnteriores.length > 0 ? leiturasAnteriores[0] : null;

    const dataCaptura = new Date(dados.capturadoEm);
    const dataRecebimento = new Date();

    // Aplica regras de negócio para definir o status (Ok ou Alerta)
    const resultadoRegras = avaliarRegrasLeitura({
      valorConfirmado: dados.valorConfirmado,
      valorOcr: dados.valorOcr,
      capturadoEm: dataCaptura,
      recebidoEm: dataRecebimento,
      ultimaLeituraFrota: ultimaLeitura ? {
        valor: ultimaLeitura.valorConfirmado,
        capturadoEm: new Date(ultimaLeitura.capturadoEm)
      } : null
    });

    const novaLeitura: Leitura = {
      id: dados.id,
      frotaId: frota.id,
      frotaNumero: frota.numero,
      dispositivoId: dados.dispositivoId,
      valorConfirmado: dados.valorConfirmado,
      valorOcr: dados.valorOcr,
      capturadoEm: dados.capturadoEm,
      recebidoEm: dataRecebimento.toISOString(),
      status: resultadoRegras.status,
      lat: null,
      lng: null,
      observacaoAlerta: resultadoRegras.observacaoAlerta,
      fotoUrl: dados.fotoDataUrl
    };

    this.leituras.set(novaLeitura.id, novaLeitura);

    // Recalcula o fechamento do dia correspondente à data da leitura
    this.recalcularFechamentosDaFrota(frota.numero);

    return { leitura: novaLeitura, jaExistia: false };
  }

  public listarLeiturasDaFrota(frotaNumero: number): Leitura[] {
    const list = Array.from(this.leituras.values())
      .filter(l => l.frotaNumero === frotaNumero)
      .sort((a, b) => new Date(b.capturadoEm).getTime() - new Date(a.capturadoEm).getTime());
    return list;
  }

  public obterLeitura(id: string): Leitura | undefined {
    return this.leituras.get(id);
  }

  public ajustarLeituraPorAdmin(params: {
    leituraId: string;
    novoValor: number;
    adminEmail: string;
    motivo: string;
  }): Leitura {
    const leitura = this.leituras.get(params.leituraId);
    if (!leitura) {
      throw new Error(`Leitura ${params.leituraId} não encontrada`);
    }

    const valorAntigo = leitura.valorConfirmado;
    leitura.valorConfirmado = params.novoValor;
    leitura.status = 'Revisada';
    leitura.observacaoAlerta = `Ajustado pelo admin (${params.motivo}). Valor anterior: ${valorAntigo.toFixed(1)} h.`;

    // Grava registro de auditoria imutável
    this.auditorias.push({
      id: `aud-${Date.now()}`,
      quando: new Date().toISOString(),
      quem: params.adminEmail,
      acao: 'AJUSTE_VALOR_HORIMETRO',
      alvo: `Leitura ${leitura.id} (Frota ${leitura.frotaNumero})`,
      detalhes: `Alterado de ${valorAntigo.toFixed(1)} h para ${params.novoValor.toFixed(1)} h. Motivo: ${params.motivo}`
    });

    // Recalcula os fechamentos diários após o ajuste
    this.recalcularFechamentosDaFrota(leitura.frotaNumero);

    return leitura;
  }

  // --- Operações de Fechamento Diário ---
  public recalcularFechamentosDaFrota(frotaNumero: number) {
    const frota = this.frotas.get(frotaNumero);
    if (!frota) return;

    // Obtém todas as leituras ordenadas cronologicamente
    const todas = Array.from(this.leituras.values())
      .filter(l => l.frotaNumero === frotaNumero)
      .sort((a, b) => new Date(a.capturadoEm).getTime() - new Date(b.capturadoEm).getTime());

    if (todas.length === 0) return;

    // Agrupa leituras por dia (YYYY-MM-DD)
    const porDia = new Map<string, Leitura[]>();
    todas.forEach(l => {
      const diaIso = l.capturadoEm.slice(0, 10);
      const lista = porDia.get(diaIso) || [];
      lista.push(l);
      porDia.set(diaIso, lista);
    });

    const diasOrdenados = Array.from(porDia.keys()).sort();
    let ultimaLeituraDiaAnterior: Leitura | null = null;

    diasOrdenados.forEach(diaIso => {
      const leiturasDoDia = porDia.get(diaIso)!;
      const fechamento = calcularFechamentoDiaParaFrota({
        frotaId: frota.id,
        frotaNumero: frota.numero,
        diaIso,
        leiturasDoDia,
        ultimaLeituraAnterior: ultimaLeituraDiaAnterior
      });

      if (fechamento) {
        this.fechamentos.set(`${frota.id}_${diaIso}`, fechamento);
      }

      ultimaLeituraDiaAnterior = leiturasDoDia[leiturasDoDia.length - 1];
    });
  }

  public recalcularTodosFechamentos() {
    this.frotas.forEach(f => {
      this.recalcularFechamentosDaFrota(f.numero);
    });
  }

  public listarFechamentosDaFrota(frotaNumero: number): FechamentoDia[] {
    const frota = this.frotas.get(frotaNumero);
    if (!frota) return [];

    return Array.from(this.fechamentos.values())
      .filter(f => f.frotaId === frota.id)
      .sort((a, b) => b.dia.localeCompare(a.dia));
  }

  // --- Resumo do Painel Admin (Tabela das 77 Frotas) ---
  public obterResumoPainel(): ResumoFrotaPainel[] {
    const agora = new Date();
    const resultado: ResumoFrotaPainel[] = [];

    this.frotas.forEach(frota => {
      const leiturasFrota = this.listarLeiturasDaFrota(frota.numero);
      const ultimaLeitura = leiturasFrota.length > 0 ? leiturasFrota[0] : null;

      let diasSemLeitura = 999;
      if (ultimaLeitura) {
        const dataUlt = new Date(ultimaLeitura.capturadoEm);
        const diffMs = agora.getTime() - dataUlt.getTime();
        diasSemLeitura = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      }

      const alertasAbertos = leiturasFrota.filter(l => l.status === 'Alerta').length;

      let ultimoContatoAparelho: string | null = null;
      if (ultimaLeitura) {
        const disp = this.dispositivos.get(ultimaLeitura.dispositivoId);
        ultimoContatoAparelho = disp ? disp.ultimoContato : ultimaLeitura.recebidoEm;
      }

      let statusGeral: 'normal' | 'alerta' | 'sem_leitura' = 'normal';
      if (alertasAbertos > 0) {
        statusGeral = 'alerta';
      } else if (!ultimaLeitura || diasSemLeitura > 3) {
        statusGeral = 'sem_leitura';
      }

      resultado.push({
        frotaId: frota.id,
        numero: frota.numero,
        descricao: frota.descricao,
        ultimoHorimetro: ultimaLeitura ? ultimaLeitura.valorConfirmado : null,
        dataUltimaLeitura: ultimaLeitura ? ultimaLeitura.capturadoEm : null,
        diasSemLeitura,
        alertasAbertos,
        ultimoContatoAparelho,
        statusGeral
      });
    });

    return resultado.sort((a, b) => a.numero - b.numero);
  }

  public listarAlertas(): Leitura[] {
    return Array.from(this.leituras.values())
      .filter(l => l.status === 'Alerta')
      .sort((a, b) => new Date(b.capturadoEm).getTime() - new Date(a.capturadoEm).getTime());
  }

  public listarAuditorias(): RegistroAuditoria[] {
    return [...this.auditorias].reverse();
  }
}

// Instância Singleton do Store da TRANSJAP
export const transjapStore = new TransjapDatabase();
