# ADR 004 — Armazenamento em PostgreSQL com Drizzle ORM

## Contexto
O sistema precisa de forte consistência transacional para auditoria, integridade referencial entre frotas, leituras e fotos, além de suporte nativo a tipos numéricos com ponto fixo (`NUMERIC(10,1)`) para evitar erros de ponto flutuante em cálculos de horas e fechamentos contábeis.

## Decisão
Utilizar **PostgreSQL** com **Drizzle ORM** (ou MySQL/SQLite equivalente nos ambientes de desenvolvimento/teste).
1. `leituras`: Chave primária UUID v4, campos `valor_confirmado NUMERIC(10,1)`, `valor_ocr NUMERIC(10,1)`, `capturado_em TIMESTAMPTZ`, `recebido_em TIMESTAMPTZ`, com índice composto obrigatório `(frota_id, capturado_em DESC)` para otimizar as consultas mais frequentes.
2. `fechamentos_dia`: Registro consolidado de cada dia por frota com horas calculadas e contagem de dias acumulados.
3. `auditoria`: Tabela imutável que registra todas as alterações manuais feitas por administradores.

## Consequências
- **Positivas**: Tipagem segura de ponta a ponta (TypeScript + Drizzle), consultas analíticas com índices de alta performance e cálculo auditável de horas.
- **Negativas**: Exige provisionamento de banco relacional e execução controlada de migrações.
