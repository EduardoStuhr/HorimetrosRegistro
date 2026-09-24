import { transjapStore } from './store';
import { LeituraInputSchema, AdminAjusteLeituraSchema } from '../../packages/shared/schemas';
import { Leitura, ResumoFrotaPainel, FechamentoDia, Frota } from '../../packages/shared/types';

/**
 * Cliente da API do Sistema de Horímetro TRANSJAP.
 * Implementa com exatidão os endpoints especificados na arquitetura (Camada 4).
 */
export const TransjapApi = {
  // --- Rotas do App do Operador ---
  
  /**
   * POST /v1/dispositivos
   * Primeiro contato do aparelho: devolve o token do dispositivo.
   */
  async registrarDispositivo(dados: { chaveInstalacao: string; apelido: string }) {
    const id = dados.chaveInstalacao || `disp-${Date.now().toString(36)}`;
    const disp = transjapStore.registrarDispositivo(id, dados.apelido);
    return {
      sucesso: true,
      dispositivoId: disp.id,
      token: `bearer_${disp.tokenHash}`,
      dataRegistro: disp.ultimoContato
    };
  },

  /**
   * GET /v1/frotas
   * Retorna a lista oficial das 77 frotas para cópia offline local no aplicativo.
   */
  async listarFrotas(): Promise<Frota[]> {
    return transjapStore.listarFrotas();
  },

  /**
   * POST /v1/leituras
   * Criação de leitura com verificação estrita de IDEMPOTÊNCIA pelo UUID.
   */
  async enviarLeitura(dados: {
    id: string; // UUID v4 gerado no aparelho
    frotaNumero: number;
    dispositivoId: string;
    valorConfirmado: number;
    valorOcr: number;
    capturadoEm: string; // ISO datetime
    fotoDataUrl?: string;
  }): Promise<{ statusHttp: 200 | 201; leitura: Leitura; idempotente: boolean }> {
    // Validação com schema Zod compartilhado
    LeituraInputSchema.parse({
      id: dados.id,
      frotaNumero: dados.frotaNumero,
      dispositivoId: dados.dispositivoId,
      valorConfirmado: dados.valorConfirmado,
      valorOcr: dados.valorOcr,
      capturadoEm: dados.capturadoEm
    });

    const resultado = transjapStore.criarLeitura(dados);

    return {
      statusHttp: resultado.jaExistia ? 200 : 201,
      leitura: resultado.leitura,
      idempotente: resultado.jaExistia
    };
  },

  /**
   * POST /v1/leituras/:id/foto
   * Confirmação de upload da foto do horímetro.
   */
  async enviarFotoLeitura(leituraId: string, fotoBase64: string) {
    const leitura = transjapStore.obterLeitura(leituraId);
    if (!leitura) {
      throw new Error(`Leitura ${leituraId} não encontrada para upload de foto.`);
    }
    leitura.fotoUrl = fotoBase64;
    return {
      sucesso: true,
      leituraId,
      chaveBucket: `fotos/2026/${leitura.frotaNumero}/${leitura.id}.jpg`
    };
  },

  // --- Rotas do Painel Administrativo ---

  /**
   * GET /admin/frotas
   * Visão geral das 77 frotas para a tabela de trabalho da administração.
   */
  async obterResumoFrotas(): Promise<ResumoFrotaPainel[]> {
    return transjapStore.obterResumoPainel();
  },

  /**
   * GET /admin/frotas/:numero/dias
   * Histórico dia a dia com cálculo de horas e dias sem leitura acumulados.
   */
  async obterDiasFrota(frotaNumero: number): Promise<{
    fechamentos: FechamentoDia[];
    leituras: Leitura[];
  }> {
    return {
      fechamentos: transjapStore.listarFechamentosDaFrota(frotaNumero),
      leituras: transjapStore.listarLeiturasDaFrota(frotaNumero)
    };
  },

  /**
   * GET /admin/leituras/:id
   */
  async obterLeituraDetalhe(id: string): Promise<Leitura | undefined> {
    return transjapStore.obterLeitura(id);
  },

  /**
   * PATCH /admin/leituras/:id
   * Correção de valor com registro obrigatório de auditoria.
   */
  async ajustarLeitura(params: {
    leituraId: string;
    novoValor: number;
    motivo: string;
    adminEmail?: string;
  }): Promise<Leitura> {
    AdminAjusteLeituraSchema.parse({
      novoValor: params.novoValor,
      motivo: params.motivo,
      marcarRevisada: true
    });

    return transjapStore.ajustarLeituraPorAdmin({
      leituraId: params.leituraId,
      novoValor: params.novoValor,
      motivo: params.motivo,
      adminEmail: params.adminEmail || 'admin@transjap.com.br'
    });
  },

  /**
   * GET /admin/alertas
   */
  async listarAlertas(): Promise<Leitura[]> {
    return transjapStore.listarAlertas();
  },

  /**
   * GET /admin/auditoria
   */
  async listarAuditoria() {
    return transjapStore.listarAuditorias();
  }
};
