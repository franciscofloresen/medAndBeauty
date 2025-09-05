#!/bin/bash

echo "🔒 Instalando dependencias de seguridad..."

cd backend

# Instalar express-rate-limit
npm install express-rate-limit@^7.1.5

# Instalar nodemon para desarrollo
npm install --save-dev nodemon@^3.0.0

# Auditoría de seguridad
npm audit

echo "✅ Dependencias de seguridad instaladas"
echo "⚠️  IMPORTANTE: Configura las variables de entorno en producción"
echo "📝 Variables necesarias:"
echo "   - DB_PASSWORD"
echo "   - JWT_SECRET" 
echo "   - GEMINI_API_KEY"
echo "   - PINECONE_API_KEY"
