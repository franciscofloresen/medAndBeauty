const mysql = require('mysql2/promise');

async function checkCurrentDB() {
    console.log('🔍 Verificando qué base de datos está en uso...\n');
    
    // Verificar RDS original
    try {
        console.log('📡 Probando RDS original...');
        const rdsDb = await mysql.createConnection({
            host: 'medandbeauty.cdk8q4u6k584.us-east-1.rds.amazonaws.com',
            user: 'admin',
            password: 'Poncho2001!',
            database: 'productos_db'
        });
        
        const [rdsResult] = await rdsDb.execute('SELECT COUNT(*) as productos FROM Productos');
        console.log(`✅ RDS: ${rdsResult[0].productos} productos`);
        await rdsDb.end();
        
    } catch (error) {
        console.log('❌ RDS: No accesible');
    }
    
    // Verificar Aurora
    try {
        console.log('📡 Probando Aurora...');
        const auroraDb = await mysql.createConnection({
            host: 'medandbeauty-aurora.cluster-cdk8q4u6k584.us-east-1.rds.amazonaws.com',
            user: 'admin',
            password: 'Poncho2001!',
            database: 'medandbeauty'
        });
        
        const [auroraResult] = await auroraDb.execute('SELECT COUNT(*) as productos FROM Productos');
        console.log(`✅ Aurora: ${auroraResult[0].productos} productos`);
        await auroraDb.end();
        
    } catch (error) {
        console.log('❌ Aurora: No accesible o sin datos');
    }
    
    console.log('\n📋 Para cambiar a Aurora:');
    console.log('1. Migrar datos: node backend/migrate-data.js');
    console.log('2. Actualizar App Runner con nuevas variables:');
    console.log('   DB_HOST=medandbeauty-aurora.cluster-cdk8q4u6k584.us-east-1.rds.amazonaws.com');
    console.log('   DB_DATABASE=medandbeauty');
}

checkCurrentDB();
