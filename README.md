# BildyApp API

API REST para gestión de usuarios y compañías de la aplicación BildyApp.

## Tecnologías

- Node.js 22+ con ESM
- Express 5
- MongoDB Atlas + Mongoose
- JWT (access + refresh tokens)
- Zod (validación)
- Helmet, rate limiting

## Requisitos

- Node.js 22+
- MongoDB Atlas (cuenta gratuita)

## Instalación

```bash
# Clonar el repositorio
git clone <repo-url>
cd bildyapp-api

# Instalar dependencias
npm install

# Crear archivo .env
cp .env.example .env
```

## Configuración

Editar `.env` con tus datos:

```env
NODE_ENV=development
PORT=3000
DB_URI=mongodb+srv://<usuario>:<password>@<cluster>.mongodb.net/bildyapp
JWT_SECRET=<tu-secret-de-32-caracteres-minimo>
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d
```

## Ejecución

```bash
# Desarrollo (con --watch para recargar automáticamente)
npm run dev

# Producción
npm start
```

## Endpoints

### Autenticación

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | /api/user/register | Registro de usuario |
| PUT | /api/user/validation | Validar email |
| POST | /api/user/login | Iniciar sesión |
| POST | /api/user/refresh | Renovar access token |
| POST | /api/user/logout | Cerrar sesión |

### Usuario

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | /api/user | Obtener usuario autenticado |
| PUT | /api/user/register | Actualizar perfil |
| PUT | /api/user/password | Cambiar contraseña |
| DELETE | /api/user | Eliminar cuenta |
| PATCH | /api/user/company | Crear/unirse a compañía |
| GET | /api/user/company | Ver compañía |
| PUT | /api/user/company | Actualizar compañía |
| PATCH | /api/user/logo | Subir logo |
| POST | /api/user/invite | Invitar usuario |

## Testing

Usar el archivo `requests.http` con REST Client (VS Code) o Postman/Thunder Client.

### Ejemplo con curl

```bash
# Registro
curl -X POST http://localhost:3000/api/user/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"TestPass123","name":"Juan","lastName":"Perez"}'

# Login
curl -X POST http://localhost:3000/api/user/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"TestPass123"}'
```