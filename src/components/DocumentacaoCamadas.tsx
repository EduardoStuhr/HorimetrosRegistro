import React from 'react';

export const DocumentacaoCamadas: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-white border border-[#E2E2DC] p-6 rounded-xs">
        <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Documentação do Sistema</span>
        <h2 className="text-xl font-bold text-[#1A1A1A] mt-1">
          Arquitetura e Requisitos TRANSJAP — 7 Camadas
        </h2>
        <p className="text-xs text-zinc-600 mt-2 leading-relaxed">
          O sistema foi construído de ponta a ponta cumprindo as 7 camadas descritas no documento de arquitetura e no PDF de referência.
        </p>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-[#FAF9F5] border border-[#E2E2DC] rounded-xs space-y-2">
            <div className="text-xs font-mono font-bold text-[#1A1A1A]">
              Camada 1 — Requisitos (R1 a R9)
            </div>
            <p className="text-xs text-zinc-600 leading-relaxed">
              Consolidados no arquivo <code>docs/requisitos.md</code>. Cobre a leitura de QR code com validação offline, compressão de foto, OCR sugestivo, idempotência por UUID e login restrito ao administrador.
            </p>
          </div>

          <div className="p-4 bg-[#FAF9F5] border border-[#E2E2DC] rounded-xs space-y-2">
            <div className="text-xs font-mono font-bold text-[#1A1A1A]">
              Camada 2 — Arquitetura (ADRs)
            </div>
            <p className="text-xs text-zinc-600 leading-relaxed">
              5 Registros de Decisão de Arquitetura em <code>docs/adr/</code>: Monolito modular, Fila offline-first, OCR local como sugestão, PostgreSQL + Drizzle e Token por aparelho.
            </p>
          </div>

          <div className="p-4 bg-[#FAF9F5] border border-[#E2E2DC] rounded-xs space-y-2">
            <div className="text-xs font-mono font-bold text-[#1A1A1A]">
              Camada 3 — Dados & Seed
            </div>
            <p className="text-xs text-zinc-600 leading-relaxed">
              Esquema Drizzle/SQL em <code>drizzle/migrations/0000_transjap_init.sql</code> e seed exato das <strong>77 frotas</strong> (16 a 294), com tipos numéricos exatos <code>NUMERIC(10,1)</code> e índice <code>(frota_id, capturado_em DESC)</code>.
            </p>
          </div>

          <div className="p-4 bg-[#FAF9F5] border border-[#E2E2DC] rounded-xs space-y-2">
            <div className="text-xs font-mono font-bold text-[#1A1A1A]">
              Camada 4 — Servidor e API
            </div>
            <p className="text-xs text-zinc-600 leading-relaxed">
              Rotas do app (<code>POST /v1/dispositivos</code>, <code>GET /v1/frotas</code>, <code>POST /v1/leituras</code>, <code>POST /v1/leituras/:id/foto</code>) e do painel (<code>GET /admin/frotas</code>, <code>GET /admin/frotas/:numero/dias</code>, <code>PATCH /admin/leituras/:id</code> com auditoria e exportação).
            </p>
          </div>

          <div className="p-4 bg-[#FAF9F5] border border-[#E2E2DC] rounded-xs space-y-2">
            <div className="text-xs font-mono font-bold text-[#1A1A1A]">
              Camada 5 — Interface
            </div>
            <p className="text-xs text-zinc-600 leading-relaxed">
              App do operador em 3 telas estritas (Escanear → Foto → Confirmar) e Painel administrativo denso em dados. Visual industrial com fundo off-white, amarelo-máquina e IBM Plex.
            </p>
          </div>

          <div className="p-4 bg-[#FAF9F5] border border-[#E2E2DC] rounded-xs space-y-2">
            <div className="text-xs font-mono font-bold text-[#1A1A1A]">
              Camada 6 — Qualidade
            </div>
            <p className="text-xs text-zinc-600 leading-relaxed">
              Bateria de testes automatizados de unidade, idempotência e regras de alerta, roteiro de testes de campo offline em <code>docs/roteiro-campo-offline.md</code> e script de benchmark de OCR em <code>scripts/medir-ocr.ts</code>.
            </p>
          </div>
        </div>

        <div className="mt-4 p-4 bg-[#FAF9F5] border border-[#E2E2DC] rounded-xs space-y-2">
          <div className="text-xs font-mono font-bold text-[#1A1A1A]">
            Camada 7 — Entrega & Operação
          </div>
          <p className="text-xs text-zinc-600 leading-relaxed">
            Arquivos prontos para produção: <code>Dockerfile</code>, <code>docker-compose.yml</code> (API + PostgreSQL + Caddy com HTTPS automático), variáveis em <code>.env.example</code>, script de backup em <code>scripts/backup-db.sh</code> e guia de implantação no <code>README.md</code>.
          </p>
        </div>
      </div>
    </div>
  );
};
