# Live Pages

Construtor de páginas estilo live/VSL com chat sincronizado, moderação, agente de IA e painel admin.

## Local

```bash
npm install
npx prisma migrate dev --name init
npx tsx prisma/seed.ts
npm run dev
```

Acesse `http://localhost:3000/login`

- E-mail: `admin@local.test`
- Senha: `admin123`

Coloque a `OPENAI_API_KEY` no `.env` para gerar comentários e respostas do agente.

## Deploy no EasyPanel

Recomendado: serviço **App** + **Dockerfile**.

1. No EasyPanel, abra o projeto e crie um serviço **App**.
2. Source: GitHub → repositório `victorhamber/live`, branch `main`.
3. Aba **Build**:
   - Método: **Dockerfile**
   - Arquivo: `Dockerfile`
4. Aba **Environment** (cole isto e troque os valores):

```
DATABASE_URL=file:/app/data/prod.db
ADMIN_EMAIL=seu@email.com
ADMIN_PASSWORD=senha-forte
AUTH_SECRET=string-longa-aleatoria-minimo-32-caracteres
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
PORT=3000
HOSTNAME=0.0.0.0
```

5. Aba **Storage / Mounts**: crie um **Volume** com destino `/app/data`. Sem isso o banco some a cada deploy.
6. Aba **Domains**: aponte o domínio e a porta interna `3000`.
7. Deploy.

No primeiro acesso a `/login`, o admin é criado com `ADMIN_EMAIL` e `ADMIN_PASSWORD`.

### Alternativa: Docker Compose

Crie um serviço **Compose**, arquivo `docker-compose.yml`. As variáveis acima entram no Environment do EasyPanel (ele gera o `.env` para interpolação). O volume `live-data` já está declarado no compose.
