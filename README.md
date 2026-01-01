# Polaris Backend

## Visão Geral

Este repositório contém o backend do Polaris, um sistema de gerenciamento de galerias fotográficas profissionais. O backend é construído em Node.js com TypeScript, utilizando Express, Drizzle ORM e PostgreSQL. Ele fornece autenticação segura via cookies httpOnly, integração com Google Drive para armazenamento de imagens, e uma API RESTful para gerenciamento de usuários, projetos, fotos e seleções.

## Estrutura do Projeto

- `src/server.ts`: Ponto de entrada do servidor Express.
- `src/controllers/`: Lógica dos endpoints (auth, drive, gallery, project, selection).
- `src/db/`: Configuração do banco de dados, migrações e seeds.
- `src/middleware/`: Middlewares de autenticação, erros, etc.
- `src/repositories/`: Acesso a dados e queries customizadas.
- `src/routes/`: Definição das rotas da API.
- `src/services/`: Serviços de autenticação, integração com Google Drive, regras de negócio.

## Principais Tecnologias

- Node.js 20+
- TypeScript
- Express
- Drizzle ORM
- PostgreSQL 14+
- Google Drive API v3
- JWT (cookies httpOnly)
- Helmet, CORS, Rate Limiting

## Configuração e Execução

1. Instale as dependências:
   ```sh
   npm install
   ```
2. Configure o arquivo `.env` com as variáveis de ambiente necessárias (exemplo em `.env.example`).
3. Execute as migrações do banco de dados:
   ```sh
   npm run db:migrate
   ```
4. Inicie o servidor em modo desenvolvimento:
   ```sh
   npm run dev
   ```

## Scripts Úteis

- `npm run dev` — Inicia o servidor com hot reload
- `npm run build` — Compila o projeto para produção
- `npm run start` — Inicia o servidor em produção
- `npm run db:migrate` — Executa as migrações do banco
- `npm run db:seed` — Popula o banco com dados de exemplo

## Observações

- O backend não armazena arquivos de imagem, apenas metadados e IDs do Google Drive.
- O acesso à API requer autenticação via cookie httpOnly.
- Para integração com o Google Drive, configure as credenciais no `.env`.
