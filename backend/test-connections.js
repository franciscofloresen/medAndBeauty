const mysql = require('mysql2/promise');
require('dotenv').config();

async function testConnections() {
    console.log('🔍 Probando conexiones...');
    
    // Probar RDS original
    try {
        console.log('📡 Probando RDS original...');
        const oldDb = await mysql.createConnection({
            host: 'medandbeauty.cdk8q4u6k584.us-east-1.rds.amazonaws.com',
            user: 'admin',
            password: process.env.DB_PASSWORD,
            database: 'productos_db',
            timeout: 10000
        });
        
        const [result] = await oldDb.execute('SELECT 1 as test');
        console.log('✅ RDS original: Conexión exitosa');
        await oldDb.end();
        
    } catch (error) {
        console.error('❌ RDS original: Error de conexión:', error.message);
    }
    
    // Probar Aurora
    try {
        console.log('📡 Probando Aurora...');
        const newDb = await mysql.createConnection({
            host: 'medandbeauty-aurora.cluster-cdk8q4u6k584.us-east-1.rds.amazonaws.com',
            user: 'admin',
            password: process.env.DB_PASSWORD,
            database: 'medandbeauty',
            timeout: 10000
        });
        
        const [result] = await newDb.execute('SELECT 1 as test');
        console.log('✅ Aurora: Conexión exitosa');
        await newDb.end();
        
    } catch (error) {
        console.error('❌ Aurora: Error de conexión:', error.message);
    }
}

testConnections();
