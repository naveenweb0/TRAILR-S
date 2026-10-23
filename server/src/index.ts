import dotenv from 'dotenv';
dotenv.config();

import { app } from './app.js';

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`🚀 SCHOOLDEST API Server is running on http://localhost:${PORT}`);
  console.log(`📡 Healthcheck available at: http://localhost:${PORT}/api/v1/health`);
});
