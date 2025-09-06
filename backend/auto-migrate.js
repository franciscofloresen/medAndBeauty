const mysql = require('mysql2/promise');

async function autoMigrate() {
    console.log('🔄 Verificando si necesita migración a Aurora...');
    
    try {
        // Verificar si Aurora tiene datos
        const auroraDb = await mysql.createConnection({
            host: 'medandbeauty-aurora.cluster-cdk8q4u6k584.us-east-1.rds.amazonaws.com',
            user: 'admin',
            password: process.env.DB_PASSWORD,
            database: 'medandbeauty',
            connectTimeout: 10000
        });
        
        const [productCount] = await auroraDb.execute('SELECT COUNT(*) as count FROM Productos');
        
        if (productCount[0].count > 0) {
            console.log(`✅ Aurora ya tiene ${productCount[0].count} productos`);
            await auroraDb.end();
            return;
        }
        
        console.log('📦 Aurora vacía, iniciando migración...');
        
        // Conectar a RDS original
        const rdsDb = await mysql.createConnection({
            host: 'medandbeauty.cdk8q4u6k584.us-east-1.rds.amazonaws.com',
            user: 'admin',
            password: process.env.DB_PASSWORD,
            database: 'productos_db'
        });
        
        // Migrar solo datos esenciales
        const tables = ['Admins', 'Productos', 'Promociones'];
        
        for (const tableName of tables) {
            console.log(`📋 Migrando ${tableName}...`);
            
            // Obtener estructura
            const [createTable] = await rdsDb.execute(`SHOW CREATE TABLE ${tableName}`);
            const createStatement = createTable[0]['Create Table'];
            
            // Crear tabla
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
                
                console.log(`✅ ${rows.length} registros migrados`);
            }
        }
        
        await rdsDb.end();
        await auroraDb.end();
        
        console.log('🎉 Migración completada!');
        
    } catch (error) {
        console.log('⚠️ Aurora no disponible o migración no necesaria:', error.message);
    }
}

// Solo ejecutar si se llama directamente
if (require.main === module) {
    autoMigrate();
}

module.exports = { autoMigrate };
