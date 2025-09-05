const mysql = require('mysql2/promise');

async function setupAurora() {
    console.log('🚀 Configurando Aurora...');
    
    // Obtener estructura de RDS
    const oldDb = await mysql.createConnection({
        host: 'medandbeauty.cdk8q4u6k584.us-east-1.rds.amazonaws.com',
        user: 'admin',
        password: 'Poncho2001!',
        database: 'productos_db'
    });
    
    console.log('📋 Obteniendo estructura de tablas...');
    const [tables] = await oldDb.execute('SHOW TABLES');
    
    for (const table of tables) {
        const tableName = Object.values(table)[0];
        const [createTable] = await oldDb.execute(`SHOW CREATE TABLE ${tableName}`);
        console.log(`📝 Estructura de ${tableName}:`);
        console.log(createTable[0]['Create Table']);
        console.log('---');
    }
    
    await oldDb.end();
    console.log('✅ Estructura obtenida. Usar estos CREATE TABLE en Aurora cuando despierte.');
}

setupAurora().catch(console.error);
