const mysql = require('mysql2/promise');

async function wakeAuroraAndMigrate() {
    console.log('🚀 Despertando Aurora y migrando datos...');
    
    let auroraDb;
    let attempts = 0;
    const maxAttempts = 10;
    
    // Despertar Aurora con reintentos
    while (attempts < maxAttempts) {
        try {
            console.log(`📡 Intento ${attempts + 1}/${maxAttempts} - Conectando a Aurora...`);
            
            auroraDb = await mysql.createConnection({
                host: 'medandbeauty-aurora.cluster-cdk8q4u6k584.us-east-1.rds.amazonaws.com',
                user: 'admin',
                password: 'Poncho2001!',
                connectTimeout: 30000,
                acquireTimeout: 30000
            });
            
            console.log('✅ Aurora despierta!');
            break;
            
        } catch (error) {
            attempts++;
            console.log(`⏳ Aurora pausada, esperando 10 segundos...`);
            await new Promise(resolve => setTimeout(resolve, 10000));
        }
    }
    
    if (!auroraDb) {
        console.log('❌ No se pudo despertar Aurora después de 10 intentos');
        return;
    }
    
    try {
        // Crear base de datos
        console.log('📋 Creando base de datos medandbeauty...');
        await auroraDb.execute('CREATE DATABASE IF NOT EXISTS medandbeauty');
        await auroraDb.execute('USE medandbeauty');
        
        // Conectar a RDS original para obtener datos
        console.log('📡 Conectando a RDS original...');
        const rdsDb = await mysql.createConnection({
            host: 'medandbeauty.cdk8q4u6k584.us-east-1.rds.amazonaws.com',
            user: 'admin',
            password: 'Poncho2001!',
            database: 'productos_db'
        });
        
        // Migrar tablas
        const tables = ['Admins', 'Productos', 'Promociones'];
        
        for (const tableName of tables) {
            console.log(`📦 Migrando tabla: ${tableName}`);
            
            // Obtener estructura
            const [createTable] = await rdsDb.execute(`SHOW CREATE TABLE ${tableName}`);
            const createStatement = createTable[0]['Create Table'];
            
            // Crear tabla en Aurora
            await auroraDb.execute(`DROP TABLE IF EXISTS ${tableName}`);
            await auroraDb.execute(createStatement);
            
            // Copiar datos
            const [rows] = await rdsDb.execute(`SELECT * FROM ${tableName}`);
            
            if (rows.length > 0) {
                const [columns] = await rdsDb.execute(`DESCRIBE ${tableName}`);
                const columnNames = columns.map(col => col.Field).join(', ');
                const placeholders = columns.map(() => '?').join(', ');
                
                const insertQuery = `INSERT INTO ${tableName} (${columnNames}) VALUES (${placeholders})`;
                
                for (const row of rows) {
                    const values = Object.values(row);
                    await auroraDb.execute(insertQuery, values);
                }
                
                console.log(`✅ ${rows.length} registros migrados en ${tableName}`);
            }
        }
        
        // Verificar migración
        const [productCount] = await auroraDb.execute('SELECT COUNT(*) as count FROM Productos');
        console.log(`🎉 Migración completada! ${productCount[0].count} productos en Aurora`);
        
        await rdsDb.end();
        await auroraDb.end();
        
        console.log('\n📝 Ahora actualiza App Runner con:');
        console.log('DB_HOST=medandbeauty-aurora.cluster-cdk8q4u6k584.us-east-1.rds.amazonaws.com');
        console.log('DB_DATABASE=medandbeauty');
        
    } catch (error) {
        console.error('❌ Error durante la migración:', error);
        if (auroraDb) await auroraDb.end();
    }
}

wakeAuroraAndMigrate();
