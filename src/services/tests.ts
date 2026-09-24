import { parseQrCode } from '../../packages/shared/qr';
import { avaliarRegrasLeitura } from '../../packages/shared/regras';
import { calcularFechamentoDiaParaFrota } from '../../packages/shared/fechamento';
import { TransjapApi } from './api';
import { Leitura } from '../../packages/shared/types';

export interface TestResultItem {
  id: string;
  suite: string;
  nome: string;
  passou: boolean;
  mensagem: string;
  detalhes?: string;
}

export async function executarBateriaTestesQualidade(): Promise<TestResultItem[]> {
  const resultados: TestResultItem[] = [];

  // 1. Testes do Parser de QR Code (R1)
  try {
    const r1 = parseQrCode('0016');
    const passou1 = r1.valido && r1.frotaNumero === 16;
    resultados.push({
      id: 'qr-01',
      suite: 'Parser de QR Code',
      nome: 'Decodificação de 4 dígitos padrão "0016" -> Frota 16',
      passou: passou1,
      mensagem: passou1 ? 'Frota 16 identificada corretamente' : `Falha: ${r1.mensagemErro}`
    });

    const r2 = parseQrCode('FROTA 0294');
    const passou2 = r2.valido && r2.frotaNumero === 294;
    resultados.push({
      id: 'qr-02',
      suite: 'Parser de QR Code',
      nome: 'Decodificação com prefixo "FROTA 0294" -> Frota 294',
      passou: passou2,
      mensagem: passou2 ? 'Frota 294 identificada corretamente' : `Falha: ${r2.mensagemErro}`
    });

    const r3 = parseQrCode('0999'); // 999 não está no seed das 77
    const passou3 = !r3.valido && Boolean(r3.mensagemErro?.includes('não pertence ao cadastro ativo'));
    resultados.push({
      id: 'qr-03',
      suite: 'Parser de QR Code',
      nome: 'Rejeição segura de frota não cadastrada ("0999")',
      passou: passou3,
      mensagem: passou3 ? 'Rejeitou corretamente código fora das 77 frotas ativas' : 'Falha: aceitou frota inexistente'
    });

    const r4 = parseQrCode('texto_invalido_sem_numero');
    const passou4 = !r4.valido;
    resultados.push({
      id: 'qr-04',
      suite: 'Parser de QR Code',
      nome: 'Tratamento de QR com texto corrompido sem travamento',
      passou: passou4,
      mensagem: passou4 ? 'Retornou mensagem amigável sem lançar exceção' : 'Falhou ao tratar string inválida'
    });
  } catch (err: any) {
    resultados.push({
      id: 'qr-err',
      suite: 'Parser de QR Code',
      nome: 'Erro fatal no parser de QR',
      passou: false,
      mensagem: err?.message || 'Erro inesperado'
    });
  }

  // 2. Testes de Regras de Validação e Alertas (R7)
  try {
    const agora = new Date();
    const ontem = new Date(agora.getTime() - 24 * 3600 * 1000);

    // 2.1 Regressão
    const resRegressao = avaliarRegrasLeitura({
      valorConfirmado: 4000.0,
      valorOcr: 4000.0,
      capturadoEm: agora,
      recebidoEm: agora,
      ultimaLeituraFrota: {
        valor: 4050.0, // regressão de 50 horas!
        capturadoEm: ontem
      }
    });
    const passouRegressao = resRegressao.status === 'Alerta' && resRegressao.motivoAlerta === 'regressao';
    resultados.push({
      id: 'reg-01',
      suite: 'Regras de Alerta',
      nome: 'Detecção de Regressão de Horímetro (4050h -> 4000h)',
      passou: passouRegressao,
      mensagem: passouRegressao ? 'Sinalizou Alerta de Regressão com sucesso' : 'Falha: não gerou alerta de regressão'
    });

    // 2.2 Salto Impossível (> 24h * dias)
    const resSalto = avaliarRegrasLeitura({
      valorConfirmado: 4100.0, // salto de 100h em 1 dia!
      valorOcr: 4100.0,
      capturadoEm: agora,
      recebidoEm: agora,
      ultimaLeituraFrota: {
        valor: 4000.0,
        capturadoEm: ontem
      }
    });
    const passouSalto = resSalto.status === 'Alerta' && resSalto.motivoAlerta === 'salto_impossivel';
    resultados.push({
      id: 'reg-02',
      suite: 'Regras de Alerta',
      nome: 'Detecção de Salto Impossível (+100h em 24 horas)',
      passou: passouSalto,
      mensagem: passouSalto ? 'Sinalizou Alerta de Salto Impossível com sucesso' : 'Falha: permitiu salto impossível'
    });

    // 2.3 Relógio Suspeito (Data no Futuro)
    const dataFuturo = new Date(agora.getTime() + 48 * 3600 * 1000);
    const resFuturo = avaliarRegrasLeitura({
      valorConfirmado: 4010.0,
      valorOcr: 4010.0,
      capturadoEm: dataFuturo,
      recebidoEm: agora,
      ultimaLeituraFrota: null
    });
    const passouFuturo = resFuturo.status === 'Alerta' && resFuturo.motivoAlerta === 'relogio_suspeito';
    resultados.push({
      id: 'reg-03',
      suite: 'Regras de Alerta',
      nome: 'Detecção de Relógio Suspeito (Data 48h no futuro)',
      passou: passouFuturo,
      mensagem: passouFuturo ? 'Sinalizou Alerta de Relógio Adiantado com sucesso' : 'Falha: aceitou data no futuro'
    });
  } catch (err: any) {
    resultados.push({
      id: 'reg-err',
      suite: 'Regras de Alerta',
      nome: 'Erro fatal nas regras de integridade',
      passou: false,
      mensagem: err?.message || 'Erro inesperado'
    });
  }

  // 3. Teste de Idempotência Estrita (R9)
  try {
    const uuidTeste = crypto.randomUUID();
    const dados = {
      id: uuidTeste,
      frotaNumero: 16,
      dispositivoId: 'disp-campo-01',
      valorConfirmado: 4250.0,
      valorOcr: 4250.0,
      capturadoEm: new Date().toISOString()
    };

    // 1º envio -> Deve ser 201 Created
    const resp1 = await TransjapApi.enviarLeitura(dados);
    // 2º envio com mesmo UUID -> Deve ser 200 OK (idempotente, sem criar duplicata)
    const resp2 = await TransjapApi.enviarLeitura(dados);

    const passouIdempotencia = resp1.statusHttp === 201 && resp2.statusHttp === 200 && resp2.idempotente;
    resultados.push({
      id: 'idemp-01',
      suite: 'Idempotência (R9)',
      nome: 'Reenvio de leitura com o mesmo UUID v4 não gera duplicata',
      passou: passouIdempotencia,
      mensagem: passouIdempotencia 
        ? '1º envio HTTP 201, 2º envio HTTP 200 (idempotência confirmada)' 
        : `Falhou: resp1=${resp1.statusHttp}, resp2=${resp2.statusHttp}`
    });
  } catch (err: any) {
    resultados.push({
      id: 'idemp-err',
      suite: 'Idempotência (R9)',
      nome: 'Erro no teste de idempotência',
      passou: false,
      mensagem: err?.message || 'Erro inesperado'
    });
  }

  // 4. Teste de Fechamento Diário e Dias Acumulados
  try {
    const leituraOntem: Leitura = {
      id: 'leit-ant',
      frotaId: 1,
      frotaNumero: 16,
      dispositivoId: 'disp-01',
      valorConfirmado: 4000.0,
      valorOcr: 4000.0,
      capturadoEm: '2026-09-20T17:00:00Z',
      recebidoEm: '2026-09-20T17:00:00Z',
      status: 'Ok',
      lat: null,
      lng: null
    };

    const leituraHoje: Leitura = {
      id: 'leit-hoje',
      frotaId: 1,
      frotaNumero: 16,
      dispositivoId: 'disp-01',
      valorConfirmado: 4022.5,
      valorOcr: 4022.5,
      capturadoEm: '2026-09-24T17:00:00Z', // 4 dias depois
      recebidoEm: '2026-09-24T17:00:00Z',
      status: 'Ok',
      lat: null,
      lng: null
    };

    const fechamento = calcularFechamentoDiaParaFrota({
      frotaId: 1,
      frotaNumero: 16,
      diaIso: '2026-09-24',
      leiturasDoDia: [leituraHoje],
      ultimaLeituraAnterior: leituraOntem
    });

    const horasEsperadas = 22.5; // 4022.5 - 4000.0
    const passouHoras = fechamento !== null && fechamento.horas === horasEsperadas;
    const passouDiasAcumulados = fechamento !== null && fechamento.diasSemLeituraAnteriores === 3;

    resultados.push({
      id: 'fech-01',
      suite: 'Cálculo de Fechamento',
      nome: 'Cálculo de horas trabalhadas no dia (Final − Inicial)',
      passou: passouHoras,
      mensagem: passouHoras ? `Horas calculadas com precisão: ${horasEsperadas}h` : 'Erro no cálculo de horas'
    });

    resultados.push({
      id: 'fech-02',
      suite: 'Cálculo de Fechamento',
      nome: 'Acumulado de N dias sem leitura (sem estimativa linear)',
      passou: passouDiasAcumulados,
      mensagem: passouDiasAcumulados 
        ? `Identificou corretamente 3 dias sem leitura anteriores` 
        : `Erro: dias acumulados = ${fechamento?.diasSemLeituraAnteriores}`
    });
  } catch (err: any) {
    resultados.push({
      id: 'fech-err',
      suite: 'Cálculo de Fechamento',
      nome: 'Erro no cálculo de fechamento',
      passou: false,
      mensagem: err?.message || 'Erro inesperado'
    });
  }

  return resultados;
}
