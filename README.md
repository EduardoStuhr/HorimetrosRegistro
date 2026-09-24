# Sistema de Registro de Horímetro — TRANSJAP (Terraplenagem)

Sistema completo de ponta a ponta para registro e conferência de horímetros de frotas de máquinas pesadas. Desenvolvido para operação em condições extremas de campo (sol forte, operadores com luva, poeira e ausência de sinal de internet).

---

## 1. Estrutura do Monorepo

```
.
├── docs/
│   ├── requisitos.md              # Requisitos R1 a R9 e escopo fora do MVP
│   ├── roteiro-campo-offline.md   # Protocolo de testes de campo offline
│   └── adr/                       # Registros de Decisão de Arquitetura (001 a 005)
│       ├── 001-monolito-modular.md
│       ├── 002-offline-first-fila.md
│       ├── 003-ocr-local-confirmacao.md
│       ├── 004-postgresql-drizzle.md
│       └── 005-token-por-aparelho.md
├── packages/
│   └── shared/                    # Contratos Zod compartilhados, tipos e regras
│       ├── frotas-seed.ts         # As 77 frotas ativas da TRANSJAP (16 a 294)
│       ├── qr.ts                  # Parser e validador de QR codes (0016 -> frota 16)
│       ├── regras.ts              # Regras de alerta (regressão, salto, relógio)
│       ├── fechamento.ts          # Algoritmo de fechamento diário e acumulação
│       ├── schemas.ts             # Schemas Zod de validação de payload
│       ├── types.ts               # Tipagem TypeScript
│       └── index.ts
├── drizzle/
│   └── migrations/
│       └── 0000_transjap_init.sql # Esquema relacional com índice composto
├── src/
│   ├── components/
│   │   ├── AppOperador.tsx        # App do celular em 3 telas (Scanner, Foto, Confirmação)
│   │   ├── PainelAdmin.tsx        # Tabela das 77 máquinas, fotos e auditoria
│   │   ├── SuiteQualidade.tsx     # Bateria automatizada de testes e acurácia OCR
│   │   └── DocumentacaoCamadas.tsx# Consulta viva da arquitetura
│   ├── services/
│   │   ├── api.ts                 # Endpoints da API (App + Painel Admin)
│   │   ├── store.ts               # Banco relacional e persistência
│   │   └── tests.ts               # Testes de unidade e regras de negócio
│   ├── App.tsx                    # Shell principal com alternador de ambiente
│   ├── index.css                  # Tipografia IBM Plex e acabamento industrial
│   └── main.tsx
├── scripts/
│   ├── medir-ocr.ts               # Benchmark de acurácia de OCR com fotos reais e CSV
│   └── backup-db.sh               # Rotina de dump diário e rotação de 30 dias
├── apps/
│   └── mobile/
│       └── eas.json               # Configuração do build de APK Android via EAS
├── .github/
│   └── workflows/
│       └── ci.yml                 # Pipeline de lint, testes e build
├── Dockerfile                     # Imagem de produção da API
├── docker-compose.yml             # Orquestração: PostgreSQL + API + Caddy HTTPS
├── Caddyfile                      # Configuração de proxy reverso e SSL
└── .env.example                   # Variáveis de ambiente de referência
```

---

## 2. Como Rodar Tudo Localmente

### Pré-requisitos
- Node.js 20+ ou Bun
- Docker e Docker Compose (opcional para o banco de dados)

### Passos de Instalação e Execução
```bash
# 1. Instalar dependências
npm install

# 2. Iniciar ambiente de desenvolvimento (API + Frontend Integrado)
npm run dev

# 3. Acessar no navegador:
# URL: http://localhost:3000
```

### Executar Testes Automatizados
```bash
# Executa a bateria de testes de unidade, parser de QR, alertas e idempotência
npx tsx -e "import('./src/services/tests').then(m => m.executarBateriaTestesQualidade()).then(console.log)"
```

### Executar Medição de Acurácia do OCR (com Fotos Reais)
```bash
# Coloque suas 50+ fotos em ./fotos-campo/ e preencha ./gabarito.csv
npx tsx scripts/medir-ocr.ts
```

---

## 3. Como Fazer o Deploy em Produção

O deploy é padronizado em container Docker único com proxy reverso Caddy e PostgreSQL:

```bash
# 1. No servidor VPS (Ubuntu 22.04 LTS ou Debian 12):
git clone https://github.com/transjap/horimetro.git
cd horimetro

# 2. Configurar variáveis de ambiente
cp .env.example .env
nano .env

# 3. Subir a stack completa com HTTPS automático
docker compose up -d --build

# 4. Configurar rotina diária de backup no cron do servidor:
chmod +x scripts/backup-db.sh
(crontab -l 2>/dev/null; echo "0 2 * * * /root/horimetro/scripts/backup-db.sh >> /var/log/transjap_backup.log 2>&1") | crontab -
```

---

## 4. Passo a Passo do Piloto de Campo (3–5 Frotas / 2 Semanas)

### Semana 1: Calibração e Validação
1. **Seleção das Máquinas**: Selecionar 4 máquinas com diferentes tipos de visor:
   - **Frota 16**: Escavadeira hidráulica (visor digital LCD).
   - **Frota 68**: Rolo compactador (horímetro analógico de tambor mecânico).
   - **Frota 80**: Trator de esteira (visor digital em ambiente de muita poeira).
   - **Frota 294**: Caminhão traçado (painel digital de alta frequência de uso).
2. **Distribuição**: Instalar o APK gerado via EAS nos smartphones corporativos de 4 operadores.
3. **Colagem de Adesivos**: Fixar adesivos plastificados foscos com o QR Code de 4 dígitos (`0016`, `0068`, `0080`, `0294`) na coluna da cabine de cada máquina.
4. **Operação Paralela**: Nos primeiros 7 dias, os operadores continuam preenchendo a prancheta de papel enquanto realizam o registro no app no início e fim do turno.

### Semana 2: Homologação e Desmame do Papel
1. Conferência diária pelo encarregado no **Painel da Administração**:
   - Bater os números do painel contra a prancheta de papel.
   - Avaliar a taxa de fotos legíveis e divergências de OCR.
   - Revisar se alguma leitura entrou em status `Alerta`.
2. Teste do **Roteiro de Campo Offline**: Forçar o desligamento do sinal de rede durante 2 dias e verificar se a sincronização em lote ocorre sem perdas na volta à sede.
3. **Critério de Saída para as 77 Frotas**: Zero leituras perdidas ou duplicadas, e taxa de assertividade do OCR $\ge 85\%$.

---

## 5. O que Ficou para as Próximas Fases (Pós-MVP)

- **Login individual por operador com PIN de 4 dígitos**: Rastrear qual operador específico conduziu a máquina no dia.
- **Geofence e cerca eletrônica do canteiro**: Alerta automático caso a máquina seja ligada fora do polígono da obra.
- **Coleta de coordenadas GPS em segundo plano**: Mapeamento de deslocamento de frotas sobre mapa georreferenciado.
- **Conferência de OCR na nuvem**: Pipeline secundário assíncrono para confrontar imagens com modelo Vision multimodal.
- **Canal de contingência por SMS**: Envio de dados mínimos via modem GSM caso o celular fique semanas sem sinal 4G.
