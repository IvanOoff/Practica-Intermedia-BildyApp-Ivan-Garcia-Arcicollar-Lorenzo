import app from './app.js';
import { dbConnect, config } from './config/index.js';

const startServer = async () => {
  await dbConnect();
  app.listen(config.port, () => {
    console.log(`SERVIDOR EN http://localhost:${config.port}`);
    console.log(`ENTORNO: ${config.env}`);
  });
};

startServer();
