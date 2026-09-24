import React, { useState, useEffect, useMemo } from 'react';
import { ResumoFrotaPainel, FechamentoDia, Leitura } from '../../packages/shared/types';
import { TransjapApi } from '../services/api';

export const PainelAdmin: React.FC = () => {
  const [frotas, setFrotas] = useState<ResumoFrotaPainel[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'com_alerta' | 'sem_leitura'>('todos');
  
  // Frota selecionada para visualização do dia a dia
  const [frotaSelecionada, setFrotaSelecionada] = useState<number | null>(16);
  const [diasFrota, setDiasFrota] = useState<FechamentoDia[]>([]);
  const [leiturasFrota, setLeiturasFrota] = useState<Leitura[]>([]);
  
  // Leitura selecionada para exibição da foto e auditoria lado a lado
  const [leituraSelecionada, setLeituraSelecionada] = useState<Leitura | null>(null);

  // Modal / Ação de Ajuste de Horímetro pelo Admin
  const [modoAjuste, setModoAjuste] = useState(false);
  const [novoValorAjuste, setNovoValorAjuste] = useState('');
  const [motivoAjuste, setMotivoAjuste] = useState('');
  const [erroAjuste, setErroAjuste] = useState<string | null>(null);
  const [sucessoAjuste, setSucessoAjuste] = useState<string | null>(null);

  // Alertas globais
  const [alertas, setAlertas] = useState<Leitura[]>([]);

  // Carrega dados do servidor
  const carregarDados = async () => {
    try {
      setLoading(true);
      const [resumo, listaAlertas] = await Promise.all([
        TransjapApi.obterResumoFrotas(),
        TransjapApi.listarAlertas()
      ]);
      setFrotas(resumo);
      setAlertas(listaAlertas);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  // Carrega histórico diário da frota selecionada
  useEffect(() => {
    if (frotaSelecionada === null) return;

    TransjapApi.obterDiasFrota(frotaSelecionada).then(res => {
      setDiasFrota(res.fechamentos);
      setLeiturasFrota(res.leituras);
      if (res.leituras.length > 0) {
        setLeituraSelecionada(res.leituras[0]);
      } else {
        setLeituraSelecionada(null);
      }
    });
  }, [frotaSelecionada]);

  // Filtragem da tabela das 77 frotas
  const frotasFiltradas = useMemo(() => {
    return frotas.filter(f => {
      const matchNumero = f.numero.toString().includes(filtroTexto) || 
                          f.descricao.toLowerCase().includes(filtroTexto.toLowerCase());
      if (!matchNumero) return false;

      if (filtroStatus === 'com_alerta') return f.alertasAbertos > 0;
      if (filtroStatus === 'sem_leitura') return f.diasSemLeitura > 2 || f.ultimoHorimetro === null;
      return true;
    });
  }, [frotas, filtroTexto, filtroStatus]);

  // Executa o ajuste de leitura com auditoria
  const executarAjusteLeitura = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leituraSelecionada) return;

    const val = parseFloat(novoValorAjuste.replace(',', '.'));
    if (isNaN(val) || val <= 0) {
      setErroAjuste('Informe um valor numérico válido.');
      return;
    }
    if (!motivoAjuste || motivoAjuste.trim().length < 5) {
      setErroAjuste('O motivo da alteração é obrigatório para o registro de auditoria (mínimo 5 caracteres).');
      return;
    }

    try {
      const leituraAtualizada = await TransjapApi.ajustarLeitura({
        leituraId: leituraSelecionada.id,
        novoValor: val,
        motivo: motivoAjuste
      });

      setSucessoAjuste('Valor revisado com sucesso. Registro gravado na auditoria.');
      setLeituraSelecionada(leituraAtualizada);
      setModoAjuste(false);
      setNovoValorAjuste('');
      setMotivoAjuste('');
      setErroAjuste(null);

      // Recarrega
      if (frotaSelecionada) {
        const res = await TransjapApi.obterDiasFrota(frotaSelecionada);
        setDiasFrota(res.fechamentos);
        setLeiturasFrota(res.leituras);
      }
      carregarDados();
    } catch (err: any) {
      setErroAjuste(err.message || 'Erro ao ajustar leitura');
    }
  };

  // Exportação Excel / CSV
  const exportarCsv = () => {
    let csv = 'Numero Frota;Descricao;Data Fechamento;Horimetro Inicial;Horimetro Final;Horas Trabalhadas;Leituras no Dia;Dias Acumulados\n';
    
    // Se estiver com frota selecionada, exporta a frota; se não, todas com histórico
    diasFrota.forEach(d => {
      csv += `${d.frotaNumero};Frota ${d.frotaNumero};${d.dia};${d.inicial.toFixed(1)};${d.final.toFixed(1)};${d.horas.toFixed(1)};${d.qtdLeituras};${d.diasSemLeituraAnteriores}\n`;
    });

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `transjap-horimetros-frota-${frotaSelecionada || 'todas'}-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      
      {/* Barra de Filtros e Ferramentas da Tabela */}
      <div className="bg-white border border-[#E2E2DC] p-4 rounded-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div>
            <input
              type="text"
              value={filtroTexto}
              onChange={(e) => setFiltroTexto(e.target.value)}
              placeholder="Buscar frota (ex: 16, 68, escavadeira)..."
              className="px-3 py-1.5 text-xs font-mono border border-[#C8C8C2] rounded-xs bg-[#FAF9F5] focus:outline-none focus:border-[#1A1A1A] w-64"
            />
          </div>

          <div className="flex items-center gap-1 bg-[#F0EFEA] p-0.5 rounded-xs border border-[#DFDFD8]">
            <button
              onClick={() => setFiltroStatus('todos')}
              className={`px-3 py-1 text-xs font-medium rounded-xs transition-colors ${
                filtroStatus === 'todos' ? 'bg-white text-[#1A1A1A] shadow-xs' : 'text-zinc-600 hover:text-black'
              }`}
            >
              Todas as 77 Frotas
            </button>
            <button
              onClick={() => setFiltroStatus('com_alerta')}
              className={`px-3 py-1 text-xs font-medium rounded-xs transition-colors ${
                filtroStatus === 'com_alerta' ? 'bg-[#92400E] text-white' : 'text-amber-800 hover:text-amber-950'
              }`}
            >
              Com Alerta ({alertas.length})
            </button>
            <button
              onClick={() => setFiltroStatus('sem_leitura')}
              className={`px-3 py-1 text-xs font-medium rounded-xs transition-colors ${
                filtroStatus === 'sem_leitura' ? 'bg-zinc-800 text-white' : 'text-zinc-600 hover:text-black'
              }`}
            >
              Sem Leitura Recente
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={carregarDados}
            className="px-3 py-1.5 text-xs font-medium text-zinc-700 bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 rounded-xs transition-colors"
          >
            Atualizar Dados
          </button>
          <button
            onClick={exportarCsv}
            className="px-3 py-1.5 text-xs font-medium text-white bg-[#1A1A1A] hover:bg-black rounded-xs transition-colors flex items-center gap-1.5"
          >
            <span>Exportar CSV / Excel</span>
          </button>
        </div>
      </div>

      {/* Grid Principal: Tabela das 77 Frotas + Detalhamento Dia a Dia */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* Coluna Esquerda: Tabela com as 77 Máquinas */}
        <div className="xl:col-span-6 bg-white border border-[#E2E2DC] rounded-xs overflow-hidden flex flex-col">
          <div className="bg-[#FAF9F5] px-4 py-3 border-b border-[#E2E2DC] flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#1A1A1A]">
              Frotas TRANSJAP ({frotasFiltradas.length} de 77)
            </span>
            <span className="text-[11px] font-mono text-zinc-500">
              Clique em uma linha para inspecionar
            </span>
          </div>

          <div className="overflow-x-auto max-h-[560px] overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#F0EFEA] sticky top-0 z-10 border-b border-[#D5D5CF] text-zinc-700 font-semibold font-mono">
                <tr>
                  <th className="py-2.5 px-3">Frota</th>
                  <th className="py-2.5 px-3">Descrição do Equipamento</th>
                  <th className="py-2.5 px-3 text-right">Último Horímetro</th>
                  <th className="py-2.5 px-3 text-center">Dias s/ Leitura</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAEAE5]">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-zinc-500 font-mono">
                      Carregando cadastro de frotas...
                    </td>
                  </tr>
                ) : frotasFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-zinc-500">
                      Nenhuma máquina encontrada para os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  frotasFiltradas.map((frota) => {
                    const isSelected = frotaSelecionada === frota.numero;
                    return (
                      <tr
                        key={frota.numero}
                        onClick={() => setFrotaSelecionada(frota.numero)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-[#FFF8E7] font-medium text-black'
                            : 'hover:bg-zinc-50 text-zinc-800'
                        }`}
                      >
                        <td className="py-2.5 px-3 font-mono font-bold">
                          {frota.numero.toString().padStart(4, '0')}
                        </td>
                        <td className="py-2.5 px-3 truncate max-w-[200px]" title={frota.descricao}>
                          {frota.descricao}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono-numbers">
                          {frota.ultimoHorimetro !== null ? `${frota.ultimoHorimetro.toFixed(1)} h` : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono">
                          {frota.ultimoHorimetro !== null ? `${frota.diasSemLeitura}d` : 'Sem reg.'}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {frota.alertasAbertos > 0 ? (
                            <span className="text-[10px] font-mono font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded-xs">
                              {frota.alertasAbertos} ALERTA
                            </span>
                          ) : frota.ultimoHorimetro === null ? (
                            <span className="text-[10px] font-mono text-zinc-500">
                              PENDENTE
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono text-emerald-800">
                              NORMAL
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Coluna Direita: Detalhamento da Frota Selecionada (Dia a Dia + Foto da Leitura) */}
        <div className="xl:col-span-6 space-y-6">
          
          {/* Tabela Dia a Dia da Frota */}
          <div className="bg-white border border-[#E2E2DC] rounded-xs overflow-hidden">
            <div className="bg-[#FAF9F5] px-4 py-3 border-b border-[#E2E2DC] flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Histórico de Fechamento</span>
                <h3 className="text-sm font-bold text-[#1A1A1A]">
                  FROTA {frotaSelecionada?.toString().padStart(4, '0')} — Dia a Dia
                </h3>
              </div>
              <span className="text-xs font-mono text-zinc-600">
                {diasFrota.length} dia(s) registrados
              </span>
            </div>

            <div className="overflow-x-auto max-h-[260px] overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#F0EFEA] border-b border-[#D5D5CF] text-zinc-700 font-semibold font-mono">
                  <tr>
                    <th className="py-2 px-3">Data</th>
                    <th className="py-2 px-3 text-right">Inicial</th>
                    <th className="py-2 px-3 text-right">Final</th>
                    <th className="py-2 px-3 text-right">Horas</th>
                    <th className="py-2 px-3 text-center">Observação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAEAE5]">
                  {diasFrota.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-zinc-500 font-mono">
                        Nenhum fechamento registrado para esta frota ainda.
                      </td>
                    </tr>
                  ) : (
                    diasFrota.map((dia) => (
                      <tr key={dia.dia} className="hover:bg-zinc-50 text-zinc-800">
                        <td className="py-2 px-3 font-mono font-medium">
                          {dia.dia}
                        </td>
                        <td className="py-2 px-3 text-right font-mono-numbers">
                          {dia.inicial.toFixed(1)} h
                        </td>
                        <td className="py-2 px-3 text-right font-mono-numbers">
                          {dia.final.toFixed(1)} h
                        </td>
                        <td className="py-2 px-3 text-right font-mono-numbers font-bold text-zinc-950">
                          {dia.horas.toFixed(1)} h
                        </td>
                        <td className="py-2 px-3 text-center font-mono text-[11px]">
                          {dia.diasSemLeituraAnteriores > 0 ? (
                            <span className="text-amber-800 font-semibold bg-amber-50 px-1 py-0.5 rounded-xs">
                              Acumulado {dia.diasSemLeituraAnteriores}d
                            </span>
                          ) : (
                            <span className="text-zinc-500">Regular</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Inspeção da Foto Original da Leitura + Conferência OCR x Confirmado */}
          <div className="bg-white border border-[#E2E2DC] rounded-xs p-4">
            <div className="flex items-center justify-between border-b border-[#E2E2DC] pb-3 mb-3">
              <div>
                <span className="text-[10px] font-mono uppercase text-zinc-500">Comprovação Fotográfica Original</span>
                <h4 className="text-xs font-bold text-[#1A1A1A]">
                  {leituraSelecionada ? `Leitura em ${new Date(leituraSelecionada.capturadoEm).toLocaleDateString('pt-BR')} às ${new Date(leituraSelecionada.capturadoEm).toLocaleTimeString('pt-BR')}` : 'Nenhuma leitura selecionada'}
                </h4>
              </div>

              {leituraSelecionada && (
                <div className="flex items-center gap-2">
                  {leituraSelecionada.status === 'Alerta' && (
                    <span className="text-[10px] font-mono font-bold bg-[#92400E] text-white px-2 py-0.5 rounded-xs">
                      ALERTA ABERTO
                    </span>
                  )}
                  {leituraSelecionada.status === 'Revisada' && (
                    <span className="text-[10px] font-mono font-bold bg-blue-900 text-white px-2 py-0.5 rounded-xs">
                      REVISADA PELO ADMIN
                    </span>
                  )}
                  <button
                    onClick={() => {
                      setModoAjuste(!modoAjuste);
                      setNovoValorAjuste(leituraSelecionada.valorConfirmado.toString());
                      setErroAjuste(null);
                    }}
                    className="px-2.5 py-1 text-[11px] font-semibold text-zinc-800 bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 rounded-xs"
                  >
                    {modoAjuste ? 'Cancelar Ajuste' : 'Corrigir Valor'}
                  </button>
                </div>
              )}
            </div>

            {leituraSelecionada ? (
              <div className="space-y-4">
                {/* Foto Salva Original */}
                {leituraSelecionada.fotoUrl ? (
                  <div className="border border-zinc-300 rounded-xs overflow-hidden bg-black">
                    <img
                      src={leituraSelecionada.fotoUrl}
                      alt="Registro do Horímetro"
                      className="w-full h-44 object-contain"
                    />
                    <div className="bg-zinc-900 px-3 py-1.5 text-[10px] font-mono text-zinc-400 flex justify-between">
                      <span>ID da Leitura: {leituraSelecionada.id}</span>
                      <span>Dispositivo: {leituraSelecionada.dispositivoId}</span>
                    </div>
                  </div>
                ) : (
                  <div className="h-32 bg-zinc-100 border border-dashed border-zinc-300 rounded-xs flex items-center justify-center text-xs text-zinc-500 font-mono">
                    Foto não enviada ou em trânsito
                  </div>
                )}

                {/* Métricas de OCR vs Confirmado */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-[#FAF9F5] border border-[#E2E2DC] rounded-xs">
                    <span className="text-[10px] font-mono uppercase text-zinc-500 block">Sugestão do OCR Local</span>
                    <span className="text-xl font-bold font-mono-numbers text-zinc-800">
                      {leituraSelecionada.valorOcr.toFixed(1)} h
                    </span>
                  </div>
                  <div className="p-3 bg-[#FAF9F5] border border-[#E2E2DC] rounded-xs">
                    <span className="text-[10px] font-mono uppercase text-zinc-500 block">Valor Confirmado pelo Operador</span>
                    <span className="text-xl font-bold font-mono-numbers text-[#1A1A1A]">
                      {leituraSelecionada.valorConfirmado.toFixed(1)} h
                    </span>
                  </div>
                </div>

                {/* Alerta de Divergência ou Inconsistência */}
                {leituraSelecionada.observacaoAlerta && (
                  <div className="p-3 bg-amber-50 border border-amber-300 rounded-xs text-xs text-amber-900">
                    <strong className="block font-semibold mb-0.5">Observação da Regra de Integridade:</strong>
                    {leituraSelecionada.observacaoAlerta}
                  </div>
                )}

                {/* Formulário de Correção / Auditoria */}
                {modoAjuste && (
                  <form onSubmit={executarAjusteLeitura} className="p-3 bg-zinc-50 border border-zinc-300 rounded-xs space-y-3">
                    <div className="text-xs font-bold text-zinc-900">
                      Correção Administrativa com Auditoria
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-700 mb-1">
                        Novo Valor Correto do Horímetro (h):
                      </label>
                      <input
                        type="text"
                        value={novoValorAjuste}
                        onChange={(e) => setNovoValorAjuste(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs font-mono border border-zinc-300 rounded-xs bg-white"
                        placeholder="Ex: 4244.5"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-700 mb-1">
                        Motivo da Alteração (Justificativa para Auditoria):
                      </label>
                      <input
                        type="text"
                        value={motivoAjuste}
                        onChange={(e) => setMotivoAjuste(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs border border-zinc-300 rounded-xs bg-white"
                        placeholder="Ex: Operador digitou 4210 ao invés de 4240 conforme foto anexa"
                      />
                    </div>

                    {erroAjuste && (
                      <div className="text-[11px] text-red-700 font-medium">{erroAjuste}</div>
                    )}

                    <div className="flex gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => setModoAjuste(false)}
                        className="px-3 py-1 text-xs text-zinc-600 hover:text-black"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="px-3 py-1 text-xs font-semibold bg-[#1A1A1A] text-white rounded-xs hover:bg-black"
                      >
                        Salvar Correção no Banco
                      </button>
                    </div>
                  </form>
                )}

                {sucessoAjuste && (
                  <div className="text-[11px] text-emerald-800 bg-emerald-50 p-2 border border-emerald-200 rounded-xs">
                    {sucessoAjuste}
                  </div>
                )}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-zinc-500 font-mono">
                Selecione uma leitura para inspecionar a fotografia e parâmetros.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
