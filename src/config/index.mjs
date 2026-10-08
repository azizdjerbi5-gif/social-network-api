const config = {
  port: Number(process.env.PORT) || 3000,
  // L'adresse MongoDB (avec identifiants) est lue dans .env, jamais écrite dans le code
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/social-network-api',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-a-changer',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '2h',
  // URL publique du front (utilisée pour les liens de partage)
  publicUrl: process.env.PUBLIC_URL || 'http://localhost:3000'
};

if (!process.env.JWT_SECRET) {
  console.warn('⚠️  JWT_SECRET non défini : utilisation d’un secret de développement.');
}

export default config;
