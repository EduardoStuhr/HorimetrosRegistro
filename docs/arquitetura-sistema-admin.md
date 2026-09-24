# Arquitetura de Software — Sistema Administrativo de Horímetros TRANSJAP

## Contexto

Análise aprofundada consolidada a partir do repositório `EduardoStuhr/HorimetrosRegistro` (branch main). O repositório apresenta uma estrutura de monorepo com documentação arquitetural, contratos compartilhados, migration PostgreSQL, frontend React, simulador mobile, CI e arquivos de deploy.

## Principais Conclusões

### Diferença entre arquitetura documentada e implementação atual

O projeto declara React, Vite, TypeScript, Express e Zod, mas o `package.json` não apresenta as dependências necessárias para conectar efetivamente a aplicação ao PostgreSQL via Drizzle, apesar de PostgreSQL + Drizzle serem decisões arquiteturais documentadas.

A chamada "API" atual é, tecnicamente, um objeto TypeScript importado diretamente pelo frontend. Os métodos possuem comentários como `POST /v1/leituras`, `GET /admin/frotas` e `PATCH /admin/leituras/:id`, porém o código executa chamadas diretamente contra `transjapStore`. Não há servidor Express com `app.get`, `app.post` ou `listen` correspondente. Portanto, esses nomes devem hoje ser tratados como **contratos pretendidos**, e não como evidência de uma API HTTP publicada.

A persistência ativa do protótipo usa estruturas `Map` em memória para frotas, dispositivos, leituras, fotos, fechamentos e auditorias. Adequado para demonstração, mas não para produção.

### Gaps identificados

1. **Sem barreira de autenticação** — O frontend inicia diretamente no modo admin sem auth antes de abrir o painel administrativo.
2. **Mobile é simulador web** — O diretório `apps/mobile` contém apenas configuração EAS, não uma aplicação Expo/React Native completa.
3. **Gap de deploy** — O Dockerfile executa `node dist/server.js`, mas o script de build é `vite build`; precisa de build explícito do servidor.
4. **Drift de configuração** — `.env.example` usa `ADMIN_JWT_SECRET`, enquanto o Compose referencia `ADMIN_SECRET_KEY`.
5. **Defaults inseguros** — `docker-compose.yml` contém defaults de senha/segredo e publica a porta 5432 do banco.

## Arquitetura Proposta

```
Aplicativo Mobile Offline-First
        │
        │ HTTPS + token por dispositivo
        ▼
Caddy / Reverse Proxy / TLS
        │
        ▼
Monólito Modular Node.js + TypeScript
   ├── API Mobile
   ├── Auth de dispositivos
   ├── Auth/RBAC administrativo
   ├── Frotas
   ├── Leituras
   ├── Fotos
   ├── Alertas
   ├── Fechamentos
   ├── Auditoria
   ├── Exportações
   └── Worker/Outbox
        │
        ├──────────────► Object Storage S3/R2/MinIO
        │
        ▼
     PostgreSQL
        │
        ▼
OpenTelemetry + Logs + Métricas + Traces
```

### Decisões principais

- **Monólito modular** — Preserva a decisão existente do ADR; faz sentido para 77 máquinas e ~100–250 requisições diárias.
- **REST como contrato principal** — Encaixa bem em sincronização offline, idempotência e upload de arquivos. GraphQL como alternativa futura.
- **PostgreSQL como fonte de verdade** — Modelo expandido para incluir revisões de leitura, alertas explícitos, roles, vínculos de usuários, outbox, operadores e obras/canteiros.
- **Segurança** — Sessão segura, RBAC (Admin, Operações, Super Admin, Auditor, Suporte, Gestor, Operador de Campo), Argon2id para password hashing.
- **Observabilidade** — OpenTelemetry no backend Node.js com requestId, traceId, usuário/dispositivo e operação.
- **Mensageria** — Transactional outbox + worker baseado em PostgreSQL no MVP (ao invés de Kafka/RabbitMQ).

## Modelo de Dados

Mudança relevante: uma correção administrativa **não deve sobrescrever** a leitura original. A proposta preserva `valor_confirmado_original` e cria uma entidade de **revisão da leitura**, permitindo reconstruir o histórico de antes/depois e recalcular fechamentos de forma auditável.

### Entidades

| Entidade | Campos principais | Chaves/Índices | Fase |
|----------|-------------------|----------------|------|
| frotas | id, numero, descricao, casas_decimais, ativa | UNIQUE(numero) | MVP |
| dispositivos | id, token_hash, apelido, ultimo_contato, revogado | PK(id) | MVP |
| operadores | id, nome, dispositivo_id | FK(dispositivo_id) | MVP |
| leituras | id (UUID), frota_id, dispositivo_id, valor_confirmado, valor_ocr, capturado_em | UNIQUE(id) idempotência, idx(frota, data) | MVP |
| leitura_revisoes | id, leitura_id, valor_anterior, valor_novo, admin_id, motivo, criado_em | FK(leitura_id) | MVP |
| fotos | id, leitura_id, chave_bucket, hash, bytes, metadata | FK(leitura_id) | MVP |
| fechamentos_dia | id, frota_id, dia, horas_trabalhadas, acumulado | idx(frota, dia) | MVP |
| alertas | id, leitura_id, tipo, severidade, mensagem | FK(leitura_id) | MVP |
| admins | id, email, password_hash, role, ativo | UNIQUE(email) | MVP |
| auditoria | id, admin_id, acao, entidade, entidade_id, metadata, criado_em | FK(admin_id) | MVP |
| outbox | id, aggregate_id, tipo_evento, payload, status, criado_em | idx(status) | MVP |
| obras_canteiros | id, nome, localizacao | — | Fase 3 |

## Contratos REST

### Autenticação e Sessão Admin
- `POST /admin/auth/login` — Login com email/senha, retorna sessão
- `POST /admin/auth/logout` — Encerra sessão
- `GET /admin/auth/me` — Dados do admin logado

### Dispositivos
- `POST /v1/dispositivos` — Enrolment de dispositivo (retorna token)
- `DELETE /v1/dispositivos/:id` — Revogação de dispositivo

### Catálogo de Frotas
- `GET /v1/frotas` — Lista oficial para cópia offline

### Leituras
- `POST /v1/leituras` — Criação idempotente (UUID)
- `GET /admin/frotas` — Dashboard administrativo
- `GET /admin/frotas/:numero/dias` — Histórico por frota
- `GET /admin/leituras/:id` — Detalhe de leitura
- `PATCH /admin/leituras/:id` — Revisão de leitura (preserva valor original)

### Fotos
- `POST /v1/leituras/:id/foto-url` — API gera URL pré-assinada
- App envia diretamente ao object storage
- `POST /v1/leituras/:id/foto-confirmacao` — Confirma upload (chave, hash, bytes)

### Alertas, Auditoria, Exportações
- `GET /admin/alertas` — Lista de alertas
- `GET /admin/auditoria` — Trilha de auditoria
- `POST /admin/exportacoes` — Exportação assíncrona (CSV/Excel)

## Upload de Fotos (fluxo pré-assinado)

Substitui transferência Base64 por:

1. API gera URL pré-assinada
2. Aplicativo envia diretamente ao object storage (S3/R2/MinIO)
3. Aplicativo confirma upload
4. PostgreSQL armazena apenas chave do objeto, hash, bytes e metadados

## Mensageria

**MVP:** Transactional outbox + worker baseado em PostgreSQL.

**Futuro (comparativo):** BullMQ/Redis, SQS, RabbitMQ, Kafka — avaliados conforme volume evoluir.

## Roadmap

### MVP (~18–29 semanas-pessoa)
- Backend real (Express + TypeScript)
- PostgreSQL + Drizzle ORM
- Autenticação/RBAC administrativo
- Credenciais de dispositivos
- Ingestão idempotente de leituras
- Object storage (URL pré-assinada)
- Painel conectado à API
- Auditoria com revisões
- Alertas
- Observabilidade (OpenTelemetry)
- CI/CD ampliado
- Testes (unit, integração, E2E)

### Fase 2
- App mobile real (Expo/React Native)
- Sincronização offline-first
- OCR local
- Exportações assíncronas

### Fase 3
- Obras/canteiros
- Row-Level Security (multi-tenant)
- Dashboard analítico avançado

## Estratégia de QA

- **Unitários** — Regras de negócio, parser QR, alertas, idempotência
- **Integração** — PostgreSQL real, migrations
- **Contratos** — OpenAPI
- **E2E Painel** — Fluxos administrativos
- **E2E Offline→Online** — Sincronização mobile
- **Segurança** — Auth, RBAC, OWASP
- **Performance** — Volume de requisições
- **Resiliência** — Reinícios, falhas de rede

## Fontes

- Repositório: `EduardoStuhr/HorimetrosRegistro` (branch main)
- Documentação oficial PostgreSQL
- Documentação oficial OpenTelemetry
- Guias técnicos OWASP (segurança)
