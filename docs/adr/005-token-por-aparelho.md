# ADR 005 — Autenticação por Token de Dispositivo

## Contexto
Operadores no campo de terraplenagem trocam de turno rapidamente, usam luvas de raspa/couro e frequentemente dividem aparelhos corporativos da obra. Exigir e-mail, senha ou códigos por SMS no início do trabalho cria atrito, esquecimentos e resistência ao uso.

## Decisão
1. **Sem login no aplicativo móvel**: O aplicativo não possui tela de login, cadastro ou perfil de operador no MVP.
2. Na primeira inicialização, o app efetua handshake com a API gerando e recebendo um **Token Criptográfico de Dispositivo** (`Bearer <token>`). O hash SHA-256 do token é salvo na tabela `dispositivos`.
3. Se o aparelho for ligado pela primeira vez sem internet, a requisição de registro de dispositivo entra na mesma fila offline e é disparada assim que houver sinal.
4. O administrador tem autoridade no painel web para **revogar o acesso** de qualquer dispositivo extraviado ou obsoleto.
5. O painel administrativo mantém autenticação estrita com e-mail e senha segura (Argon2 / cookies HttpOnly).

## Consequências
- **Positivas**: Redução para zero de fricção no uso pelos operadores de campo; agilidade imediata.
- **Negativas**: O sistema rastreia o dispositivo físico, e não o CPF do operador (requisito plenamente aceito e validado para a fase de MVP da TRANSJAP).
