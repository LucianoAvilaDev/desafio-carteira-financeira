# Carteira Financeira - API

API de transferência de saldo com reversão transacional, feita com NestJS + PostgreSQL + Docker.

## O que a API faz

- Cadastro e login com JWT
- Cada usuário tem uma carteira com saldo
- Transferência de saldo entre usuários (transacional - ou transfere tudo ou não transfere nada)
- Reversão de transferência (devolve o saldo)
- Documentação automática no Swagger

## Tecnologias

- **Node.js 24.22.2** + **TypeScript**
- **NestJS 12**
- **PostgreSQL 16**
- **TypeORM**
- **JWT + Passport**
- **pnpm 12.15.0**
- **Docker + Docker Compose**
- **Jest + Supertest** - testes unitários, integração e e2e

---

## 1. Pré-requisitos

Antes de começar, precisa ter instalado:

- [Node.js 24.22.2](https://nodejs.org/) - `node -v` tem que mostrar `v24.22.2`.
- [pnpm](https://pnpm.io/installation) - `pnpm -v`
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) - tem que estar aberto e com o ícone verde e status Engine Running.
- [Git](https://git-scm.com/)

---

## 2. Clonar o projeto

```bash
# Clona o projeto
git clone https://github.com/LucianoAvilaDev/carteira-financeira-oficial.git

# Acessa a pasta com o projeto
cd carteira-financeira-oficial

# Instala dependências
pnpm install

# Pelo docker não precisa rodar migrations, seeders e nem start porque estão automatizado
# Caso não for usar o docker, rode-os.
pnpm migration:run

pnpm seed:run

# Se for modo dev com watch
pnpm start:dev

# Se for modo dev com watch e debugger (pode usar breakpoints)
pnpm start:debug

# Sem watch
pnpm start

# Modo produção - compila na pasta dist e roda ela
pnpm start:prod
```

Após qualquer alteração em qualquer entity, é necessário rodar as migrations.

```bash
pnpm migration:generate src/migrations/<NomeDoAjuste>

pnpm migration:run
```

---

## 3. Configurar as variáveis de ambiente

- Crie o arquivo `.env` na raiz do projeto.
- Copie o conteúdo do `.env.example` para ele e preencha.

```env
# Main
API_URL="http://localhost"
PORT=3000

# JWT
JWT_SECRET="4669e404312f0caa876b14a67f4cdb6fe93eeedb2ca2b02af4ab1ba5d6bab2b0"
JWT_EXPIRES_IN="1d"

# Postgres
DB_HOST="localhost"
DB_PORT=5432
DB_USER="postgres"
DB_PASSWORD="postgres123"
DB_NAME="carteira"
DB_SYNC=true

# Swagger
SWAGGER_TITLE="Carteira Financeira - API"
SWAGGER_DESCRIPTION="API de transferência de saldo com reversão transacional - PostgreSQL"
SWAGGER_VERSION="1.0"
SWAGGER_PATH="/api/documentation"
```

---

## 4. Rodar com Docker (recomendado)

- **WINDOWS** - Inicie o Docker desktop e aguarde o status _ENGINE RUNNING_.
- **LINUX**:
  ```bash
  # Inicia o docker engine
  sudo systemctl start docker

  # Para o docker engine
  sudo systemctl stop docker

  # Reinicia (para e inicia) o docker engine
  sudo systemctl restart docker

  # Confere se o docker engine está rodando
  sudo systemctl status docker
  ```

---

### 5. Subir tudo - banco + API

- Modo desenvolvimento

```bash
# Inicia
pnpm docker:dev

# Para
pnpm docker:dev:down

# Remove container,volumes e imagens
pnpm docker:dev:delete
```

- Modo produção

```bash
# Inicia
pnpm docker:prod

# Para
pnpm docker:prod:down

# Remove container,volumes e imagens
pnpm docker:prod:delete
```

| O que                | Link                                    |
| -------------------- | --------------------------------------- |
| API rodando          | http://localhost:3000/                  |
| Saúde da API         | http://localhost:3000/health            |
| Documentação Swagger | http://localhost:3000/api/documentation |

---

## 6. Como usar a API

**Cadastro, Login e autenticação**

- Após iniciar o docker ou local, acesse a [documentação no Swagger](http://localhost:3000/api/documentation).
- Criar usuário em **POST /auth/register**.
- Faz login com o usuário criado em **POST /auth/login** e copia o _access_token_ do body do response.
- Clique em **Authorize** no topo e cole (sem o Bearer) e confirme.
- Para conferir seus dados acesse **GET /users/me**.

**Realizar transferência**

- Cadastre outro usuário em **/auth/register**.
- Copie o id do user que vem no body do response.
- Caso queira ver a lista de usuários cadastrados vá em **GET /users**.
- Para transferir use o endpoint **POST /transfers**.
- Para conferir suas próprias transações use **GET /transfers**.

---

## 7. Testes

```bash
# Rodar uma folha de teste específica
pnpm test <path-do-teste.spec.ts> --runInBand --forceExit

# Rodar os testes unitários de um módulo específico
pnpm test <path-do-modulo> --runInBand --forceExit

# Rodar todos os testes unitários
pnpm test:unit

# Rodar os testes de integração (/test/integration)
pnpm test:integration

# Rodar o teste e2e
pnpm test:e2e

# Rodar todos os testes - Roda na ordem: **unitário → integração → e2e**.
pnpm test:all
```

| Tipo       | Pasta                  | O que testa                                                   |
| ---------- | ---------------------- | ------------------------------------------------------------- |
| Unitário   | `src/**/*.spec.ts`     | Service e Controller com mock, sem banco                      |
| Integração | `test/integration/`    | Service + banco real `carteira_test`                          |
| E2E        | `test/app.e2e-spec.ts` | Fluxo completo: `register → login → transfer → list` via HTTP |

---
