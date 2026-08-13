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

A chave e o modelo da OpenAI são configurados no painel: **Configurações**.

## Deploy no EasyPanel

Recomendado: serviço **App** + **Dockerfile**.

1. No EasyPanel, abra o projeto e crie um serviço **App**.
2. Source: GitHub → repositório `victorhamber/live`, branch `main`.
3. Aba **Build**:
   - Método: **Dockerfile**
   - Arquivo: `Dockerfile`
4. Aba **Environment**:

```
DATABASE_URL=file:/app/data/prod.db
ADMIN_EMAIL=seu@email.com
ADMIN_PASSWORD=senha-forte
AUTH_SECRET=string-longa-aleatoria-minimo-32-caracteres
PORT=3000
HOSTNAME=0.0.0.0
```

5. Aba **Storage / Mounts**: crie um **Volume** com destino `/app/data`. Sem isso o banco some a cada deploy.
6. Aba **Domains**: aponte o domínio e a porta interna `3000`.
7. Deploy.

No primeiro acesso a `/login`, o admin é criado com `ADMIN_EMAIL` e `ADMIN_PASSWORD`. Depois, em **Configurações**, cole a chave da OpenAI e o modelo.

### Alternativa: Docker Compose

Crie um serviço **Compose**, arquivo `docker-compose.yml`. As variáveis acima entram no Environment do EasyPanel. O volume `live-data` já está declarado no compose.
