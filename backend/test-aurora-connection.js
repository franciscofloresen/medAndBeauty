const mysql = require('mysql2/promise');

async function testAuroraConnection() {
    console.log('🔍 Probando conexión a Aurora desde App Runner...');
    
    const endpoints = [
        'medandbeauty-aurora-public.cluster-cdk8q4u6k584.us-east-1.rds.amazonaws.com',
        'medandbeauty-aurora-public-instance.cdk8q4u6k584.us-east-1.rds.amazonaws.com'
    ];
    
    for (const endpoint of endpoints) {
        try {
            console.log(`📡 Probando ${endpoint}...`);
            
            const db = await mysql.createConnection({
                host: endpoint,
                user: 'admin',
                password: 'Poncho2001!',
                connectTimeout: 10000
            });
            
            console.log(`✅ Conectado a ${endpoint}`);
            
            // Crear base de datos si no existe
            await db.execute('CREATE DATABASE IF NOT EXISTS medandbeauty');
            await db.execute('USE medandbeauty');
            
            // Crear tabla de prueba
            await db.execute(`
                CREATE TABLE IF NOT EXISTS test_connection (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    message VARCHAR(255)
                )
            `);
            
            // Insertar registro de prueba
            await db.execute('INSERT INTO test_connection (message) VALUES (?)', ['Conexión exitosa desde App Runner']);
            
            // Verificar
            const [rows] = await db.execute('SELECT COUNT(*) as count FROM test_connection');
            console.log(`📊 ${rows[0].count} registros en tabla de prueba`);
            
            await db.end();
            console.log(`🎉 Aurora funcionando en ${endpoint}`);
            return endpoint;
            
        } catch (error) {
            console.log(`❌ Error en ${endpoint}: ${error.message}`);
        }
    }
    
    console.log('❌ No se pudo conectar a ningún endpoint de Aurora');
    return null;
}

// Ejecutar si se llama directamente
if (require.main === module) {
    testAuroraConnection().catch(console.error);
}

module.exports = { testAuroraConnection };
