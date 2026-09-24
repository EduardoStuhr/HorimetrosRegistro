# ADR 001 — Monolito Modular no Servidor

## Contexto
O sistema atende uma frota de 77 máquinas de terraplenagem com aproximadamente 1 a 3 leituras de horímetro por máquina por dia (cerca de 100 a 250 requisições diárias). A equipe de engenharia e manutenção é enxuta.

## Decisão
Adotar uma arquitetura de **Monolito Modular** em Node.js com TypeScript, onde a API de ingestão dos dispositivos móveis, a lógica de fechamento de horas e os endpoints do painel administrativo residem no mesmo serviço, conectados a um único banco de dados relacional.

## Consequências
- **Positivas**: Simplicidade operacional máxima, custo de infraestrutura próximo do mínimo viável, transações atômicas diretas no banco de dados e facilidade de implantação com um único container Docker.
- **Negativas**: Em caso de falha de processo, tanto o painel quanto a API reiniciam juntos (mitigado pelo reinício automático do Docker/Caddy). Microserviços trariam complexidade e sobrecarga sem qualquer ganho para o volume de dados do projeto.
