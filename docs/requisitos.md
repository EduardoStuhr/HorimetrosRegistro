# Documento de Requisitos — Horímetro TRANSJAP

## 1. Visão Geral do Produto
O sistema de registro de horímetro da TRANSJAP foi concebido para eliminar a anotação manual em pranchetas e a digitação em planilhas na operação de terraplenagem. É composto por:
1. **Aplicativo do Operador**: Operação móvel em campo, sem login, com fluxo estrito em 3 passos (Escanear QR -> Fotografar horímetro -> Confirmar/Corrigir valor -> Enviar).
2. **Servidor & API**: Recebimento idempotente, validação de regras de integridade e alertas, armazenamento em PostgreSQL e bucket S3-compatível.
3. **Painel da Administração**: Monitoramento diário das 77 frotas, histórico dia a dia com fotos, conferência de alertas e exportação de relatórios.

---

## 2. Requisitos do Sistema (R1 – R9)

| ID | Requisito | Tipo | Descrição e Regra de Negócio |
|---|---|---|---|
| **R1** | Ler QR code e identificar a frota | Funcional | O operador aponta a câmera para o QR code fixado na máquina. O conteúdo do QR é o número da frota com 4 dígitos (ex.: `0016` para a Frota 16). O sistema valida contra a lista local das 77 frotas ativas. QRs inválidos geram aviso visual imediato e amigável sem travar o aplicativo. |
| **R2** | Foto do horímetro comprimida e salva | Funcional | A foto do horímetro (painel digital ou tambor mecânico) é comprimida no aparelho (~1600px de largura, JPEG de alta fidelidade com poucas centenas de KB) antes de entrar na fila de envio. A foto original é salva no banco/bucket e NUNCA é descartada ou sobrescrita. |
| **R3** | OCR local com confirmação obrigatória | Funcional | O reconhecimento de texto (OCR local) sugere o valor numérico em campo de destaque. O OCR tem papel estritamente sugestivo: o operador é sempre obrigado a confirmar o valor ou corrigi-lo manualmente antes do envio. |
| **R4** | Operação 100% offline | Não funcional | Câmera, leitura de QR, captura de foto, OCR e gravação local em fila SQLite/IndexedDB funcionam sem qualquer dependência de sinal de internet (Wi-Fi ou 4G). |
| **R5** | Envio automático sem perda de dados | Não funcional | Quando o dispositivo recuperar conectividade (detectado via NetInfo ou reinício do app), as leituras enfileiradas são transmitidas em segundo plano, respeitando tentativas com espera progressiva (exponential backoff). A foto local só é removida do aparelho após a confirmação positiva (HTTP 200/201) do servidor. |
| **R6** | Painel: Horímetro por frota e dia a dia | Funcional | O painel administrativo exibe a tabela das 77 máquinas com o último horímetro e dias sem leitura. Ao selecionar uma frota, exibe o dia a dia (horímetro inicial, horímetro final, horas trabalhadas no dia) e permite inspecionar a foto original ao lado com o valor lido pelo OCR e o valor confirmado. |
| **R7** | Alertas de leitura suspeita e exportação | Funcional | O servidor sinaliza automaticamente leituras com status `Alerta` quando: (a) o valor regredir em relação à leitura anterior; (b) o salto de horas for fisicamente impossível (> 24h × dias decorridos); (c) a data/hora do dispositivo for suspeita (no futuro ou > 30 dias no passado). O painel permite exportar relatórios em Excel (XLSX/CSV) e PDF. |
| **R8** | Acesso administrativo protegido | Segurança | Apenas administradores autorizados têm acesso ao painel web, com autenticação segura (sessão por cookie HttpOnly, hash de senhas em Argon2). O app do operador NÃO possui login de usuário individual; cada aparelho possui um token criptográfico único registrado no servidor. |
| **R9** | Idempotência e tolerância a falhas | Não funcional | O identificador único da leitura (UUID v4) é gerado no aparelho no momento da captura. O reenvio da mesma leitura (por oscilação de rede ou repetição) nunca cria duplicatas no banco de dados. Leituras jamais são perdidas se o aplicativo for fechado no meio da operação. |

---

## 3. Escopo Fora do MVP (Previsto para Fases Futuras)

Os seguintes itens foram mapeados na arquitetura e deixados expressamente fora da versão MVP para manter a agilidade e simplicidade de campo:
- **Login individual por operador com senha ou PIN**: O controle atual é por aparelho registrado.
- **Geofence e cerca eletrônica de canteiro de obras**: Não há bloqueio por localização geográfica.
- **Rastreamento de GPS visível**: Coordenadas lat/lng permanecem nulas no MVP para evitar consumo excessivo de bateria.
- **Conferência de OCR no servidor**: Validação cruzada com modelo de IA na nuvem (o OCR local + confirmação humana cobre 100% da garantia).
- **Envio de contingência por SMS**: O canal exclusivo de transmissão é HTTPS via fila local quando houver rede de dados.
- **Menus, histórico ou perfis no app do operador**: O operador tem apenas as 3 telas essenciais de coleta.
