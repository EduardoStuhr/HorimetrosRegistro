import React, { useState } from 'react';
import { PainelAdmin } from './components/PainelAdmin';
import { AppOperador } from './components/AppOperador';
import { SuiteQualidade } from './components/SuiteQualidade';
import { DocumentacaoCamadas } from './components/DocumentacaoCamadas';

type ViewMode = 'admin' | 'operador' | 'qualidade' | 'docs';

export default function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('admin');
  const [contadorSincronizacoes, setContadorSincronizacoes] = useState(0);

  return (
    <div className="min-h-screen bg-[#F7F7F4] text-[#1A1A1A] flex flex-col font-sans selection:bg-[#1A1A1A] selection:text-white">
      
      {/* Top Bar Contract (3 zonas, marca em elemento de texto único, sem badges na logo) */}
      <header className="bg-white border-b border-[#E2E2DC] sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          
          {/* Zona 1: Wordmark limpo em texto único */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold tracking-tight text-[#1A1A1A] uppercase font-mono">
              TRANSJAP <span className="text-[#D97706]">·</span> HORÍMETRO
            </span>
          </div>

          {/* Zona 2: Navegação com textos curtos e sem caixas tipo pílula */}
          <nav className="flex items-center gap-6 text-xs font-semibold">
            <button
              onClick={() => setViewMode('admin')}
              className={`py-1 border-b-2 transition-colors whitespace-nowrap ${
                viewMode === 'admin'
                  ? 'border-[#1A1A1A] text-[#1A1A1A]'
                  : 'border-transparent text-zinc-500 hover:text-black'
              }`}
            >
              Painel da Administração (77 Frotas)
            </button>
            <button
              onClick={() => setViewMode('operador')}
              className={`py-1 border-b-2 transition-colors whitespace-nowrap ${
                viewMode === 'operador'
                  ? 'border-[#D97706] text-[#D97706] font-bold'
                  : 'border-transparent text-zinc-500 hover:text-black'
              }`}
            >
              App do Operador (3 Telas de Campo)
            </button>
            <button
              onClick={() => setViewMode('qualidade')}
              className={`py-1 border-b-2 transition-colors whitespace-nowrap ${
                viewMode === 'qualidade'
                  ? 'border-[#1A1A1A] text-[#1A1A1A]'
                  : 'border-transparent text-zinc-500 hover:text-black'
              }`}
            >
              Bateria de Testes & OCR
            </button>
            <button
              onClick={() => setViewMode('docs')}
              className={`py-1 border-b-2 transition-colors whitespace-nowrap ${
                viewMode === 'docs'
                  ? 'border-[#1A1A1A] text-[#1A1A1A]'
                  : 'border-transparent text-zinc-500 hover:text-black'
              }`}
            >
              Requisitos & ADRs (7 Camadas)
            </button>
          </nav>

          {/* Zona 3: Ação Primária / Identificador */}
          <div className="flex items-center gap-3">
            <div className="text-[11px] font-mono text-zinc-500 hidden sm:block">
              Base: <span className="text-zinc-900 font-semibold">PostgreSQL</span>
            </div>
            <button
              onClick={() => setViewMode(viewMode === 'operador' ? 'admin' : 'operador')}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-[#1A1A1A] hover:bg-black rounded-xs transition-colors whitespace-nowrap"
            >
              {viewMode === 'operador' ? 'Abrir Painel Admin' : 'Simular App Campo'}
            </button>
          </div>

        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-6">
        {viewMode === 'admin' && <PainelAdmin key={contadorSincronizacoes} />}
        
        {viewMode === 'operador' && (
          <div className="py-4">
            <div className="max-w-md mx-auto mb-4 text-center">
              <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider block">
                Simulador de Campo — Smartphone do Operador
              </span>
              <p className="text-xs text-zinc-600 mt-0.5">
                Sem login, 100% offline-first. As leituras registradas aqui sincronizam automaticamente com a tabela ao lado.
              </p>
            </div>
            <AppOperador 
              onLeituraRegistradaNoServidor={() => setContadorSincronizacoes(c => c + 1)} 
            />
          </div>
        )}

        {viewMode === 'qualidade' && <SuiteQualidade />}
        {viewMode === 'docs' && <DocumentacaoCamadas />}
      </main>

      {/* Rodapé Industrial Limpo */}
      <footer className="border-t border-[#E2E2DC] bg-white py-4 mt-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-500 font-mono">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-zinc-900">TRANSJAP TERRAPLENAGEM</span>
            <span aria-hidden="true">·</span>
            <span>Sistema de Registro de Horímetro v1.0.0</span>
          </div>
          <div>
            <span>77 Frotas Ativas · Idempotência Garantida · Fila Offline</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
