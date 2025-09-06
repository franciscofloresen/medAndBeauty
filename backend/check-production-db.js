const mysql = require('mysql2/promise');

async function checkProductionDB() {
    console.log('🔍 Verificando qué base de datos está usando la aplicación...\n');
    
    // Verificar RDS original
    try {
        console.log('📡 Verificando RDS original...');
        const rdsDb = await mysql.createConnection({
            host: 'medandbeauty.cdk8q4u6k584.us-east-1.rds.amazonaws.com',
            user: 'admin',
            password: 'Poncho2001!',
            database: 'productos_db'
        });
        
        const [rdsResult] = await rdsDb.execute('SELECT COUNT(*) as productos FROM Productos');
        console.log(`✅ RDS: ${rdsResult[0].productos} productos`);
        
        // Verificar conexiones activas
        const [connections] = await rdsDb.execute('SHOW PROCESSLIST');
        const appConnections = connections.filter(conn => 
            conn.Host && conn.Host.includes('awsapprunner') || 
            conn.User === 'admin' && conn.db === 'productos_db'
        );
        console.log(`🔗 RDS: ${connections.length} conexiones totales, ${appConnections.length} de App Runner`);
        
        await rdsDb.end();
        
    } catch (error) {
        console.log('❌ RDS: No accesible');
    }
    
    // Verificar Aurora
    try {
        console.log('\n📡 Verificando Aurora...');
        const auroraDb = await mysql.createConnection({
            host: 'medandbeauty-aurora.cluster-cdk8q4u6k584.us-east-1.rds.amazonaws.com',
            user: 'admin',
            password: 'Poncho2001!',
            database: 'medandbeauty'
        });
        
        const [auroraResult] = await auroraDb.execute('SELECT COUNT(*) as productos FROM Productos');
        console.log(`✅ Aurora: ${auroraResult[0].productos} productos`);
        
        // Verificar conexiones activas
        const [connections] = await auroraDb.execute('SHOW PROCESSLIST');
        const appConnections = connections.filter(conn => 
            conn.Host && conn.Host.includes('awsapprunner') || 
            conn.User === 'admin' && conn.db === 'medandbeauty'
        );
        console.log(`🔗 Aurora: ${connections.length} conexiones totales, ${appConnections.length} de App Runner`);
        
        await auroraDb.end();
        
    } catch (error) {
        console.log('❌ Aurora: No accesible o pausada');
    }
    
    // Verificar endpoint de la aplicación
    console.log('\n📡 Verificando aplicación en producción...');
    try {
        const response = await fetch('https://3wikbcpkaq.us-east-1.awsapprunner.com/api/productos?limit=1');
        if (response.ok) {
            const data = await response.json();
            console.log(`✅ App Runner: Respondiendo correctamente (${data.length} productos en respuesta)`);
        }
    } catch (error) {
        console.log('❌ App Runner: No responde');
    }
}

checkProductionDB();
