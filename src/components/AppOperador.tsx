import React, { useState, useEffect } from 'react';
import { parseQrCode, formatarNumeroFrotaQr } from '../../packages/shared/qr';
import { ItemFilaLocal } from '../../packages/shared/types';
import { TransjapApi } from '../services/api';
import { FROTAS_NUMEROS_SEED } from '../../packages/shared/frotas-seed';

type TelaOperador = 'escanear' | 'foto' | 'confirmar';

interface AppOperadorProps {
  onLeituraRegistradaNoServidor?: () => void;
}

export const AppOperador: React.FC<AppOperadorProps> = ({ onLeituraRegistradaNoServidor }) => {
  const [tela, setTela] = useState<TelaOperador>('escanear');
  const [frotaIdentificada, setFrotaIdentificada] = useState<number | null>(null);
  const [erroQr, setErroQr] = useState<string | null>(null);
  
  // Entrada manual ou simulador de QR Code
  const [qrInput, setQrInput] = useState('');
  
  // Foto e OCR
  const [fotoCapturada, setFotoCapturada] = useState<string | null>(null);
  const [valorOcrSugerido, setValorOcrSugerido] = useState<number>(0);
  const [valorConfirmado, setValorConfirmado] = useState<string>('');
  
  // Mensagem pós-envio
  const [mensagemSucesso, setMensagemSucesso] = useState<{ texto: string; offline: boolean } | null>(null);

  // Simulação de conectividade (Online vs Offline em campo)
  const [modoOffline, setModoOffline] = useState<boolean>(false);

  // Fila Local no Aparelho (SQLite / LocalStorage)
  const [filaLocal, setFilaLocal] = useState<ItemFilaLocal[]>(() => {
    try {
      const salvo = localStorage.getItem('transjap_fila_local');
      return salvo ? JSON.parse(salvo) : [];
    } catch {
      return [];
    }
  });

  // Salva fila no storage local
  useEffect(() => {
    try {
      localStorage.setItem('transjap_fila_local', JSON.stringify(filaLocal));
    } catch {
      // ignore
    }
  }, [filaLocal]);

  // Sincronizador automático em segundo plano quando houver sinal
  useEffect(() => {
    if (modoOffline) return;

    const pendentes = filaLocal.filter(item => item.statusFila === 'Pendente' || item.statusFila === 'Falha');
    if (pendentes.length === 0) return;

    let cancelado = false;

    const sincronizarFila = async () => {
      for (const item of pendentes) {
        if (cancelado) break;

        // Atualiza para 'Enviando'
        setFilaLocal(prev => prev.map(f => f.id === item.id ? { ...f, statusFila: 'Enviando' } : f));

        try {
          await TransjapApi.enviarLeitura({
            id: item.id,
            frotaNumero: item.frotaNumero,
            dispositivoId: 'disp-campo-01',
            valorConfirmado: item.valorConfirmado,
            valorOcr: item.valorOcr,
            capturadoEm: item.capturadoEm,
            fotoDataUrl: item.fotoBase64
          });

          // Marca como sincronizada
          setFilaLocal(prev => prev.map(f => f.id === item.id ? { ...f, statusFila: 'Sincronizada' } : f));
          if (onLeituraRegistradaNoServidor) onLeituraRegistradaNoServidor();
        } catch (err: any) {
          setFilaLocal(prev => prev.map(f => f.id === item.id ? { 
            ...f, 
            statusFila: 'Falha', 
            tentativas: f.tentativas + 1,
            erroMsg: err?.message || 'Falha de rede' 
          } : f));
        }
      }
    };

    sincronizarFila();

    return () => { cancelado = true; };
  }, [modoOffline, filaLocal.length]);

  // Limpa leituras sincronizadas com mais de 10 segundos da fila visual
  const limparSincronizadas = () => {
    setFilaLocal(prev => prev.filter(f => f.statusFila !== 'Sincronizada'));
  };

  // Contagem de pendentes
  const pendentesCount = filaLocal.filter(f => f.statusFila === 'Pendente' || f.statusFila === 'Enviando' || f.statusFila === 'Falha').length;

  // Processamento do QR Code
  const processarTextoQr = (texto: string) => {
    const res = parseQrCode(texto);
    if (res.valido && res.frotaNumero !== null) {
      setFrotaIdentificada(res.frotaNumero);
      setErroQr(null);
      // Avança diretamente para a Tela 2: Foto
      setTela('foto');
    } else {
      setFrotaIdentificada(null);
      setErroQr(res.mensagemErro || 'Código QR inválido');
    }
  };

  // Simulador de foto de horímetro com OCR local embutido
  const capturarFotoHorimetro = (tipo: 'digital' | 'analogico' = 'digital') => {
    // Gera um valor verossímil baseado no número da frota
    const base = (frotaIdentificada || 16) * 45 + 1200;
    const decimal = Math.floor(Math.random() * 9);
    const valorGerado = Number((base + (Math.random() * 8)).toFixed(1));

    const bg = tipo === 'digital' ? '#2A2C2B' : '#E8E8E2';
    const textCol = tipo === 'digital' ? '#78FFAA' : '#111111';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="280" viewBox="0 0 480 280">
      <rect width="480" height="280" fill="#18191A"/>
      <rect x="24" y="24" width="432" height="232" rx="4" fill="#0F1011" stroke="#3E4042" stroke-width="4"/>
      <rect x="60" y="65" width="360" height="130" rx="2" fill="${bg}" stroke="#222" stroke-width="2"/>
      <text x="85" y="150" font-family="monospace" font-size="52" font-weight="bold" fill="${textCol}" letter-spacing="4">${valorGerado.toFixed(1)}</text>
      <text x="350" y="165" font-family="sans-serif" font-size="14" fill="#888">HORAS</text>
      <text x="60" y="225" font-family="sans-serif" font-size="12" fill="#888">TRANSJAP TERRAPLENAGEM — FROTA ${frotaIdentificada}</text>
    </svg>`;
    const dataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

    setFotoCapturada(dataUrl);
    setValorOcrSugerido(valorGerado);
    setValorConfirmado(valorGerado.toFixed(1));
    // Avança para Tela 3: Confirmar
    setTela('confirmar');
  };

  // Envio final pelo operador
  const handleEnviarLeitura = () => {
    const valorNumerico = parseFloat(valorConfirmado.replace(',', '.'));
    if (isNaN(valorNumerico) || valorNumerico < 0) {
      alert('Por favor, informe um valor numérico válido para o horímetro.');
      return;
    }

    if (!frotaIdentificada) return;

    // UUID v4 gerado no aparelho (Garantia de Idempotência R9)
    const leituraId = 'leitura-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
    const capturadoEmIso = new Date().toISOString();

    const novoItemFila: ItemFilaLocal = {
      id: leituraId,
      frotaNumero: frotaIdentificada,
      valorOcr: valorOcrSugerido,
      valorConfirmado: valorNumerico,
      capturadoEm: capturadoEmIso,
      fotoBase64: fotoCapturada || undefined,
      statusFila: 'Pendente',
      tentativas: 0
    };

    // Adiciona na fila local
    setFilaLocal(prev => [novoItemFila, ...prev]);

    // Mensagem pós-envio conforme regra de negócio da TRANSJAP
    if (modoOffline) {
      setMensagemSucesso({
        texto: 'Guardado no celular, envia quando tiver sinal',
        offline: true
      });
    } else {
      setMensagemSucesso({
        texto: 'Registrado com sucesso',
        offline: false
      });
    }

    // Reseta estado para nova leitura
    setTimeout(() => {
      setMensagemSucesso(null);
      setFotoCapturada(null);
      setFrotaIdentificada(null);
      setValorConfirmado('');
      setTela('escanear');
    }, 2400);
  };

  const cancelarEVoltarScanner = () => {
    setTela('escanear');
    setFrotaIdentificada(null);
    setFotoCapturada(null);
    setErroQr(null);
  };

  return (
    <div className="max-w-md mx-auto bg-white border border-[#E2E2DC] shadow-sm rounded-xs overflow-hidden flex flex-col min-h-[640px]">
      
      {/* Barra de Status do Aparelho (Modo Campo) */}
      <div className="bg-[#1A1A1A] text-white px-4 py-2.5 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold tracking-wider uppercase text-[11px] text-[#E5A00D]">TRANSJAP CAMPO</span>
          <span className="text-zinc-500">|</span>
          <span className="text-zinc-400">Sem login</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Alternador de Sinal (Simulador de Campo Offline) */}
          <button
            onClick={() => setModoOffline(!modoOffline)}
            className={`px-2 py-0.5 text-[10px] font-mono rounded-xs border transition-colors ${
              modoOffline 
                ? 'bg-amber-600/30 text-amber-300 border-amber-500' 
                : 'bg-emerald-950 text-emerald-300 border-emerald-700'
            }`}
            title="Clique para alternar entre modo online e offline (sem sinal de celular)"
          >
            {modoOffline ? 'OFFLINE (SEM SINAL)' : '4G CONECTADO'}
          </button>
        </div>
      </div>

      {/* Indicador de Fila R4/R5: "N leituras aguardando envio" */}
      {pendentesCount > 0 && (
        <div className="bg-[#FFF8E7] border-b border-[#F0D597] px-4 py-2 flex items-center justify-between text-xs text-[#8A5600]">
          <span className="font-medium font-mono-numbers">
            {pendentesCount} leitura{pendentesCount > 1 ? 's' : ''} aguardando envio no aparelho
          </span>
          {modoOffline ? (
            <span className="text-[11px] font-mono text-[#B37400]">Armazenado localmente</span>
          ) : (
            <span className="text-[11px] font-mono text-emerald-700 animate-pulse">Sincronizando...</span>
          )}
        </div>
      )}

      {/* Feedback de Envio Sucesso */}
      {mensagemSucesso && (
        <div className={`p-6 text-center text-white ${mensagemSucesso.offline ? 'bg-[#92400E]' : 'bg-[#1E3A2F]'}`}>
          <div className="text-3xl font-mono-numbers font-bold mb-2">
            FROTA {frotaIdentificada}
          </div>
          <div className="text-base font-semibold">
            {mensagemSucesso.texto}
          </div>
          <p className="text-xs text-zinc-300 mt-2">
            Retornando à câmera para a próxima máquina...
          </p>
        </div>
      )}

      {/* CORPO PRINCIPAL: 3 TELAS ESTRITAS */}
      {!mensagemSucesso && (
        <div className="flex-1 flex flex-col p-4">
          
          {/* ========================================================
              TELA 1: ESCANEAR QR CODE
              ======================================================== */}
          {tela === 'escanear' && (
            <div className="flex-1 flex flex-col">
              <div className="text-center mb-3">
                <span className="text-[11px] font-mono uppercase text-zinc-500 tracking-wider">Passo 1 de 3</span>
                <h2 className="text-xl font-bold text-[#1A1A1A]">Aponte para o QR da máquina</h2>
              </div>

              {/* Moldura Grande do Scanner (Visão do Operador) */}
              <div className="relative bg-zinc-900 border-2 border-[#1A1A1A] rounded-xs aspect-square flex flex-col items-center justify-center p-6 text-center text-white overflow-hidden">
                {/* Linhas de canto da mira do QR */}
                <div className="absolute top-4 left-4 w-8 h-8 border-t-4 border-l-4 border-[#D97706]" />
                <div className="absolute top-4 right-4 w-8 h-8 border-t-4 border-r-4 border-[#D97706]" />
                <div className="absolute bottom-4 left-4 w-8 h-8 border-b-4 border-l-4 border-[#D97706]" />
                <div className="absolute bottom-4 right-4 w-8 h-8 border-b-4 border-r-4 border-[#D97706]" />

                <div className="z-10 px-4">
                  <div className="w-16 h-16 mx-auto mb-3 border-2 border-dashed border-zinc-500 flex items-center justify-center">
                    <span className="font-mono text-xs text-zinc-400">QR</span>
                  </div>
                  <p className="text-xs text-zinc-300 font-medium">
                    Centralize o adesivo com o QR Code de 4 dígitos da frota
                  </p>
                </div>

                <div className="absolute bottom-3 text-[10px] text-zinc-500 font-mono">
                  Validação contra 77 frotas ativas
                </div>
              </div>

              {/* Mensagem de Erro de QR Inválido */}
              {erroQr && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 text-red-900 text-xs rounded-xs font-medium">
                  {erroQr}
                </div>
              )}

              {/* Seletor Rápido de Teste de Campo / Digitação de QR */}
              <div className="mt-4 pt-3 border-t border-[#E2E2DC]">
                <label className="block text-[11px] font-semibold text-zinc-600 mb-1.5">
                  Simulação de Leitura de QR (ou Digite o código de 4 dígitos):
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={qrInput}
                    onChange={(e) => setQrInput(e.target.value)}
                    placeholder="Ex: 0016, 0068, 0080, 0294"
                    maxLength={10}
                    className="flex-1 px-3 py-2 text-sm font-mono border border-[#C8C8C2] rounded-xs bg-[#FAF9F5] focus:outline-none focus:border-[#1A1A1A]"
                  />
                  <button
                    onClick={() => {
                      if (qrInput) processarTextoQr(qrInput);
                    }}
                    className="px-4 py-2 bg-[#1A1A1A] text-white text-xs font-semibold rounded-xs hover:bg-black transition-colors"
                  >
                    Ler QR
                  </button>
                </div>

                {/* Atalhos rápidos para frotas reais da lista das 77 */}
                <div className="mt-2 flex flex-wrap gap-1.5 items-center">
                  <span className="text-[10px] text-zinc-500 font-mono">Exemplos reais:</span>
                  {[16, 68, 70, 80, 114, 204, 294].map((num) => (
                    <button
                      key={num}
                      onClick={() => processarTextoQr(formatarNumeroFrotaQr(num))}
                      className="px-2 py-0.5 text-[11px] font-mono bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 rounded-xs text-zinc-800"
                    >
                      {formatarNumeroFrotaQr(num)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              TELA 2: FOTOGRAFAR HORÍMETRO
              ======================================================== */}
          {tela === 'foto' && (
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-mono uppercase text-zinc-500">Passo 2 de 3</span>
                  <button
                    onClick={cancelarEVoltarScanner}
                    className="text-xs text-zinc-500 underline hover:text-black"
                  >
                    Trocar máquina
                  </button>
                </div>

                {/* Letra Enorme com a Frota Identificada conforme especificação */}
                <div className="bg-[#1A1A1A] text-white p-3 rounded-xs text-center mb-3">
                  <div className="text-[11px] uppercase tracking-wider text-[#E5A00D] font-mono">Máquina Identificada</div>
                  <div className="text-3xl font-extrabold font-mono tracking-wider">
                    FROTA {frotaIdentificada}
                  </div>
                </div>

                {/* Moldura-guia para enquadrar o horímetro */}
                <div className="relative bg-zinc-900 border-2 border-zinc-800 rounded-xs aspect-video flex flex-col items-center justify-center p-4 text-center text-white overflow-hidden">
                  <div className="w-4/5 h-2/3 border-2 border-[#D97706] rounded-xs flex items-center justify-center bg-black/40">
                    <span className="text-xs font-mono text-amber-200">
                      Enquadre o visor ou tambor do horímetro aqui
                    </span>
                  </div>
                  <p className="mt-2 text-[10px] text-zinc-400">
                    Evite sombras e reflexo direto do sol
                  </p>
                </div>
              </div>

              {/* Botão de Disparo Grande (Apto para Luva e Sol Forte) */}
              <div className="mt-6 space-y-2">
                <button
                  onClick={() => capturarFotoHorimetro('digital')}
                  className="w-full py-4 bg-[#D97706] hover:bg-[#B45309] text-white font-bold text-base rounded-xs uppercase tracking-wider transition-colors shadow-sm"
                >
                  Fotografar Horímetro
                </button>
                <div className="flex justify-between items-center px-1">
                  <button
                    onClick={() => capturarFotoHorimetro('analogico')}
                    className="text-[11px] text-zinc-500 underline"
                  >
                    Simular Horímetro Mecânico/Tambor
                  </button>
                  <button
                    onClick={cancelarEVoltarScanner}
                    className="text-[11px] text-zinc-500 hover:text-black"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              TELA 3: CONFIRMAR VALOR E ENVIAR
              ======================================================== */}
          {tela === 'confirmar' && (
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-mono uppercase text-zinc-500">Passo 3 de 3 — Conferência</span>
                  <span className="text-xs font-mono font-bold text-[#1A1A1A]">FROTA {frotaIdentificada}</span>
                </div>

                {/* Foto pequena no alto preservando o registro original */}
                {fotoCapturada && (
                  <div className="border border-zinc-300 rounded-xs overflow-hidden mb-3 bg-zinc-900">
                    <img 
                      src={fotoCapturada} 
                      alt="Foto do Horímetro" 
                      className="w-full h-32 object-cover"
                    />
                    <div className="bg-zinc-800 text-[10px] text-zinc-300 px-2 py-1 flex justify-between font-mono">
                      <span>Foto original salva no aparelho</span>
                      <span>Sugestão OCR: {valorOcrSugerido.toFixed(1)} h</span>
                    </div>
                  </div>
                )}

                {/* Campo de valor grande e editável para sol forte e luva */}
                <div className="bg-[#FAF9F5] border-2 border-[#1A1A1A] p-4 rounded-xs text-center">
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">
                    Horímetro Lido (Confirme ou Corrija):
                  </label>
                  <div className="relative inline-block w-full">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={valorConfirmado}
                      onChange={(e) => setValorConfirmado(e.target.value)}
                      className="w-full text-center text-4xl font-extrabold font-mono text-[#1A1A1A] bg-white border border-[#C8C8C2] rounded-xs py-2 focus:outline-none focus:border-[#D97706]"
                    />
                    <span className="text-xs text-zinc-500 font-mono mt-1 block">
                      HORAS DECIMAIS (EX: 4244.1)
                    </span>
                  </div>
                </div>

                <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded-xs text-[11px] text-amber-900">
                  <strong>Atenção:</strong> O valor numérico acima é o que será oficializado no fechamento contábil. A foto original será guardada junto para auditoria.
                </div>
              </div>

              {/* Botão Enviar Leitura */}
              <div className="mt-6 space-y-2">
                <button
                  onClick={handleEnviarLeitura}
                  className="w-full py-4 bg-[#1A1A1A] hover:bg-black text-white font-bold text-base rounded-xs uppercase tracking-wider transition-colors shadow-sm"
                >
                  Enviar Leitura
                </button>
                <button
                  onClick={() => setTela('foto')}
                  className="w-full py-2 text-xs text-zinc-600 hover:text-black"
                >
                  Tirar outra foto
                </button>
              </div>
            </div>
          )}

        </div>
      )}

      {/* Rodapé da Fila do Aparelho */}
      <div className="border-t border-[#E2E2DC] bg-[#F7F7F4] px-4 py-2 text-[11px] text-zinc-500 flex items-center justify-between font-mono">
        <span>Fila: {filaLocal.length} itens</span>
        {filaLocal.some(f => f.statusFila === 'Sincronizada') && (
          <button 
            onClick={limparSincronizadas}
            className="text-zinc-500 hover:text-black underline text-[10px]"
          >
            Limpar sincronizadas
          </button>
        )}
      </div>
    </div>
  );
};
