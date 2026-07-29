# OVGS — Sistema de Gestão de Ordens de Venda

Documentação de entrega da solução full stack do desafio técnico. O sistema concentra o ciclo de vida das ordens de venda: cadastros, criação e acompanhamento das OVs, agendamento de entregas, monitoramento operacional e auditoria das alterações.

## O que foi entregue

API REST em NestJS com Prisma/PostgreSQL, interface React e stack sobindo via Docker Compose. A aplicação cobre o fluxo operacional pedido no desafio, com autenticação JWT, papéis ADMIN/USER, regras de negócio no backend e interface responsiva para uso diário.

Principais capacidades:

- Cadastro de clientes, tipos de transporte e itens (SKU)
- Criação e edição de ordens de venda, com vínculo a cliente, transporte autorizado e ao menos um item
- Avanço sequencial de status: `CRIADA → PLANEJADA → AGENDADA → EM_TRANSPORTE → ENTREGUE`
- Para ir a `AGENDADA`, a ordem precisa de agendamento confirmado; a partir de uma ordem `PLANEJADA`, o botão de avanço abre o formulário de agendamento e, ao confirmar, agenda e muda o status
- Central de agendamento (criação, confirmação e reagendamento)
- Monitoramento com filtros por status, cliente, transporte e período; o código da ordem abre o detalhe
- Auditoria paginada das alterações, com usuário e estados anterior/posterior
- Busca nas listagens e detalhe de itens da ordem em cards (SKU, nome, quantidade, unidade)
- Perfil USER: pode consultar e operar ordens/agendamento/monitoramento, mas não cria/edita cadastros nem acessa auditoria

## Stack

| Camada | Tecnologia |
|--------|------------|
| Backend | Node.js 20, TypeScript, NestJS, Prisma |
| Banco | PostgreSQL 16 |
| Frontend | React, Vite, TypeScript, React Router |
| Infra | Docker Compose |
| Docs da API | Swagger em `/docs` |

## Como executar

### Tudo via Docker

```bash
docker compose up -d --build
```

Serviços:

| Serviço | URL / porta |
|---------|-------------|
| Frontend | http://localhost:5173 |
| API | http://localhost:3000/api |
| Swagger | http://localhost:3000/docs |
| Health | http://localhost:3000/api/health |
| Postgres | localhost:5544 (usuário/senha/banco: `ovgs`) |

Se o Postgres da imagem estiver limpo, popule o seed (usuários e cadastros de exemplo):

```bash
cd backend
npm install --legacy-peer-deps
npm run prisma:seed
```

Ajuste o `DATABASE_URL` no `.env` do backend se for rodar o seed apontando para o Postgres do Compose (`localhost:5544`).

### Desenvolvimento local

```bash
docker compose up -d postgres

cd backend
npm install --legacy-peer-deps
npx prisma migrate dev
npm run prisma:seed
npm run start:dev

cd frontend
npm install
npm run dev
```

### Credenciais

| E-mail | Senha | Perfil |
|--------|-------|--------|
| admin@gmail.com | 12345678 | ADMIN — acesso completo |
| user@gmail.com | 12345678 | USER — sem gestão de cadastros/auditoria |

Login: `POST /api/auth/login`  
Uso autenticado: header `Authorization: Bearer <token>`

## Domínio e regras

Entidades principais:

- **Client** — documento único; transportes autorizados via `ClientTransport`
- **TransportType** — cadastro dinâmico (nada hardcode nas regras de negócio)
- **Item** — SKU único; precisa existir antes de entrar na OV
- **SalesOrder** — um cliente, um transporte e pelo menos um item
- **DeliverySchedule** — relação 1:1 com a OV (data, janela, confirmação)
- **AuditLog** — ação, entidade, estado anterior/novo, usuário e horário
- **User** — ADMIN ou USER

Regras relevantes:

- Transporte da OV precisa estar autorizado para o cliente
- Transições de status só na ordem do fluxo; pular etapas não é permitido
- `AGENDADA` exige agendamento confirmado
- Agendamento só para ordens `CRIADA` ou `PLANEJADA`; reagendamento bloqueado em `EM_TRANSPORTE` / `ENTREGUE`
- Confirmar agendamento de uma ordem `PLANEJADA` (na tela de agendamento) também avança o status para `AGENDADA`

## Interface

Rotas da SPA:

| Rota | Função |
|------|--------|
| `/` | Monitoramento (filtros automáticos ao mudar status/cliente/transporte) |
| `/ordens` | Criação, detalhe, avanço de status e alteração de transporte |
| `/agendamento` | Agenda, confirma e reagenda |
| `/clientes`, `/transportes`, `/itens` | Cadastros (edição restrita a ADMIN) |
| `/auditoria` | Eventos paginados (somente ADMIN) |

Detalhes:

- Layout responsivo (menu mobile, tabelas em cards no celular)
- Busca textual nas tabelas
- Paginação na auditoria (10/20/50 por página)
- Máscaras de CPF/CNPJ e telefone no formulário de cliente
- Formulários de cadastro em modal

## Arquitetura

Backend organizado em módulos NestJS por contexto (auth, clients, items, transport-types, sales-orders, scheduling, audit, health):

- Controllers — HTTP
- Services — regras
- Repositories onde faz sentido — acesso Prisma
- DTOs + `class-validator` — entrada
- Guards JWT + Roles — autenticação e autorização
- Filter global — erros padronizados
- AuditService + eventos — registro das mudanças

Frontend é SPA com rotas protegidas; ADMIN enxerga auditoria e ações de cadastro; USER cai nessas rotas/redirecionamentos quando não tem permissão.

Persistência via Prisma, migrações em `backend/prisma/migrations`. Índices em status, cliente, transporte, datas e campos usados em filtros.

## API (visão geral)

| Recurso | Rotas |
|---------|-------|
| Auth | `POST /api/auth/login`, `GET /api/auth/me` |
| Clientes | `GET/POST/PATCH /api/clients` (POST/PATCH: ADMIN) |
| Transportes | `GET/POST/PATCH /api/transport-types` (POST/PATCH: ADMIN) |
| Itens | `GET/POST/PATCH /api/items` (POST/PATCH: ADMIN) |
| Ordens | `GET/POST /api/sales-orders`, `PATCH .../status`, `PATCH .../transport` (listagem paginada) |
| Agendamento | `GET/POST/PATCH /api/scheduling`, `POST .../confirm` |
| Auditoria | `GET /api/audit` (ADMIN; `page` e `limit`) |
| Saúde | `GET /api/health`, `GET /api/health/metrics` |

Documentação interativa: http://localhost:3000/docs

## Testes

```bash
cd backend
npm test
npm run test:cov
npm run test:e2e
```

Há testes unitários das regras (status, transporte autorizado, agendamento, auth, cadastros) e e2e do fluxo feliz até `ENTREGUE`, filtros, auditoria e bloqueio do perfil USER em cadastros/auditoria.

## Decisões e limites

Algumas escolhas conscientes para o escopo do desafio:

- JWT sem refresh token; papéis em dois níveis (ADMIN/USER), suficiente para o caso pedido
- Agendamento com data e janela, sem capacidade de frota ou grades complexas
- Código da OV gerado por sequência (`OV-000001`); em produção faria sentido sequência de banco ou ULID
- NestJS modular em vez de Clean Architecture completa — prioriza clareza e prazo
- Busca nas tabelas é no conjunto já carregado (na auditoria, na página atual); listagens de cadastro ainda sem paginação na UI
- UI própria, sem design system externo

## Estrutura do repositório

```
desafio/
├── docker-compose.yml
├── README.md
├── checklist.md
├── backend/       # NestJS + Prisma + testes
└── frontend/      # React + Vite
```

## Observação sobre Docker

A imagem da API usa Alpine com OpenSSL e engines Prisma para `linux-musl` (incluindo ARM64, comum em Mac Apple Silicon). Se o build falhar por timeout no Docker Hub ao baixar `node:20-alpine`, vale tentar de novo quando a rede responder; o compose já está preparado para subir postgres, api e web juntos.
