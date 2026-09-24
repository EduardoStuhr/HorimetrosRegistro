# ADR 003 — OCR Local como Sugestão com Confirmação Obrigatória

## Contexto
Horímetros de máquinas pesadas podem ser visores digitais LCD (que sofrem com reflexo solar e poeira) ou tambores mecânicos analógicos com números parcialmente girados. Qualquer algoritmo de OCR (mesmo em nuvem) apresenta margem de erro nessas condições extremas.

## Decisão
1. O OCR é executado **localmente no dispositivo móvel** (sem requisição de rede) através de visão computacional / ML Kit.
2. O OCR tem função **exclusivamente sugestiva**: preenche o campo de digitação, mas o operador tem a obrigação de olhar o número e tocar em "Enviar" ou corrigir manualmente se houver divergência.
3. O servidor registra tanto o `valor_ocr` quanto o `valor_confirmado`, alimentando a métrica contínua de assertividade do modelo de visão.
4. A foto original do visor é preservada no bucket e exibida lado a lado no painel administrativo para dirimir qualquer dúvida de faturamento ou manutenção.

## Consequências
- **Positivas**: Eliminação de erros de digitação grosseiros sem depender de sinal de rede para processar imagens.
- **Negativas**: Exige do operador a atenção de conferir o número na tela antes do envio (interface com números gigantes e alto contraste facilita o processo).
