# ADR 002 — Fila Offline-First com Sincronização Idempotente

## Contexto
O trabalho de terraplenagem ocorre frequentemente em áreas rurais, rodovias em construção e canteiros de obras sem sinal de celular (3G/4G) ou Wi-Fi.

## Decisão
Implementar uma arquitetura estritamente **offline-first**:
1. Todo o fluxo de captura (QR code, foto, OCR e validação do operador) é concluído localmente no aparelho.
2. A leitura é persistida imediatamente em uma fila local (SQLite / IndexedDB) com status `Pendente`.
3. O identificador da leitura (`id`) é gerado como um **UUID v4 no próprio celular**.
4. Quando a conexão é restabelecida, um sincronizador em segundo plano despacha as leituras via `POST /v1/leituras`. O servidor utiliza o UUID como chave primária de idempotência: se a leitura já existir no banco de dados, o servidor responde `HTTP 200 OK` sem recriar ou duplicar registros.

## Consequências
- **Positivas**: O operador nunca é impedido de trabalhar por falta de internet. Zero risco de duplicidade no reenvio.
- **Negativas**: O painel administrativo exibe leituras com diferença entre a data de captura física (`capturado_em`) e a data de chegada ao servidor (`recebido_em`). O painel resolve isso exibindo explicitamente o indicador "Último contato do aparelho".
