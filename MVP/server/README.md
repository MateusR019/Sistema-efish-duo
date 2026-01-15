# API Backend

## Setup
```bash
cd server
npm install
npm run dev
```

Configure `.env` (already created) with:
```
PORT=4000
JWT_SECRET=super-secret-key
ADMIN_EMAILS=mateusrogerio777@example.com
DATA_FILE=./data/database.json
```

## Endpoints
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/products`
- `POST /api/products` (admin)
- `POST /api/orders` (autenticado)
- `GET /api/orders` (admin)

Use `npm run build` then `npm start` para produção local.
