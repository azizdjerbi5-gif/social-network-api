import 'dotenv/config';
import mongoose from 'mongoose';
import app from './src/app.mjs';
import config from './src/config/index.mjs';

try {
  await mongoose.connect(config.mongoUri);
  console.log(`✅ MongoDB connecté (${mongoose.connection.name})`);
  app.listen(config.port, () => {
    console.log(`🚀 API démarrée sur http://localhost:${config.port}`);
    console.log(`📚 Documentation : http://localhost:${config.port}/docs`);
  });
} catch (err) {
  console.error('❌ Impossible de se connecter à MongoDB :', err.message);
  process.exit(1);
}
