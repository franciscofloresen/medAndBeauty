const mysql = require('mysql2/promise');

async function checkAuroraPublic() {
    console.log('🔍 Verificando Aurora público...\n');
    
    try {
        console.log('📡 Probando Aurora público...');
        const auroraDb = await mysql.createConnection({
            host: 'medandbeauty-aurora-public.cluster-cdk8q4u6k584.us-east-1.rds.amazonaws.com',
            user: 'admin',
            password: 'Poncho2001!',
            database: 'medandbeauty'
        });
        
        const [auroraResult] = await auroraDb.execute('SELECT COUNT(*) as productos FROM Productos');
        console.log(`✅ Aurora público: ${auroraResult[0].productos} productos`);
        
        // Verificar conexiones activas
        const [connections] = await auroraDb.execute('SHOW PROCESSLIST');
        const appConnections = connections.filter(conn => 
            conn.Host && (conn.Host.includes('awsapprunner') || conn.Host.includes('amazonaws'))
        );
        console.log(`🔗 Aurora público: ${connections.length} conexiones totales, ${appConnections.length} de App Runner`);
        
        await auroraDb.end();
        
        if (auroraResult[0].productos > 0) {
            console.log('\n🎉 ¡Aurora público funcionando con datos!');
        } else {
            console.log('\n📥 Aurora público funcionando pero vacío - necesita migración');
        }
        
    } catch (error) {
        console.log('❌ Aurora público: Error -', error.message);
    }
}

checkAuroraPublic();
