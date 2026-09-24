# Roteiro de Testes de Campo Offline — TRANSJAP

Este documento descreve o protocolo obrigatório de testes operacionais e de resiliência antes de liberar o aplicativo para as 77 frotas.

---

## Cenário 1: Modo Avião do Começo ao Fim
- **Objetivo**: Garantir que o operador consiga fazer seu trabalho completo sem nenhuma barra de sinal.
- **Passos**:
  1. No celular de teste, ative o Modo Avião (desligue Wi-Fi e Dados Móveis).
  2. Abra o aplicativo. Observe que a câmera do scanner abre imediatamente, sem spinner de carregamento ou dependência de rede.
  3. Aponte para o QR Code da máquina (ex.: `0016`). O app deve identificar "FROTA 16".
  4. Enquadre o horímetro e dispare a foto.
  5. Observe o valor sugerido pelo OCR local. Digite o valor correto ou confirme.
  6. Toque em **Enviar Leitura**.
- **Resultado Esperado**: O app exibe a mensagem *"Guardado no celular, envia quando tiver sinal"* e retorna imediatamente para o scanner. O contador exibe "1 leitura aguardando envio". Nenhuma foto é perdida.

---

## Cenário 2: Aplicativo Morto/Encerrado no Meio do Envio
- **Objetivo**: Provar que o encerramento forçado do processo pelo sistema operacional ou pelo usuário não corrompe a fila SQLite.
- **Passos**:
  1. Com leituras pendentes na fila local, inicie o processo de envio.
  2. Force a parada do aplicativo pelo gerenciador de tarefas do Android/iOS.
  3. Reabra o aplicativo.
- **Resultado Esperado**: As leituras continuam intactas na fila com status `Pendente` e o processo de sincronização é retomado do ponto exato onde parou.

---

## Cenário 3: Sinal Intermitente (Sinal que oscila a cada 10 segundos)
- **Objetivo**: Validar a política de espera crescente (exponential backoff) e tolerância a conexões instáveis.
- **Passos**:
  1. Conecte o aparelho a um ponto de acesso com quedas programadas a cada 10s.
  2. Dispare múltiplos registros de horímetros.
- **Resultado Esperado**: Requisições interrompidas pela metade falham de forma segura sem crash; a foto só é considerada sincronizada e elegível para limpeza local após o recebimento do `HTTP 200/201` com confirmação do servidor.

---

## Cenário 4: Mesma Leitura Enviada Duas Vezes (Idempotência R9)
- **Objetivo**: Garantir que duplicidade na camada de rede nunca duplique linhas no banco de dados.
- **Passos**:
  1. Capture uma leitura (UUID único é gerado no aparelho).
  2. Simule uma falha onde o servidor processou a leitura com sucesso, mas o pacote de resposta HTTP foi perdido na torre de celular e o app tentou reenviar.
- **Resultado Esperado**: O servidor detecta a chave primária UUID já existente, retorna `HTTP 200 OK` e atualiza apenas a confirmação sem gerar duplicata. A contagem de horas e fechamentos permanece inalterada.

---

## Cenário 5: Celular com Relógio Errado (Descalibração ou Fraude)
- **Objetivo**: Validar a salvaguarda de integridade temporal.
- **Passos**:
  1. Ajuste manualmente as configurações do relógio do celular para 4 dias no futuro ou 40 dias no passado.
  2. Efetue uma leitura normalmente.
- **Resultado Esperado**: O app registra a captura; ao chegar no servidor, o status da leitura é marcado automaticamente como `Alerta` com a observação *"Relógio suspeito: data de captura diverge da chegada ao servidor"*. O fechamento do dia aguarda revisão do administrador.
