import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const config = {
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 3000,
  dbUri: process.env.DB_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
  refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173'
};

const dbConnect = async () => {
  if (!config.dbUri) {
    console.error('ERROR: DB_URI no esta definida en .env');
    process.exit(1);
  }

  try {
    await mongoose.connect(config.dbUri);
    console.log('CONECTADO A MONGODB');
  } catch (error) {
    console.error('ERROR conectando a MongoDB:', error.message);
    process.exit(1);
  }
};

mongoose.connection.on('disconnected', () => {
  console.warn('ADVERTENCIA: Desconectado de MongoDB');
});

process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('CONEXION A MONGODB CERRADA');
  process.exit(0);
});

export { config, dbConnect };
export default config;
