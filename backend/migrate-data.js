const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrateData() {
    console.log('🚀 Iniciando migración de datos...');
    
    // Conexión a RDS original
    const oldDb = await mysql.createConnection({
        host: 'medandbeauty.cdk8q4u6k584.us-east-1.rds.amazonaws.com',
        user: 'admin',
        password: 'Poncho2001!',
        database: 'productos_db'  // Base de datos actual
    });
    
    // Conexión a Aurora Serverless v2
    const newDb = await mysql.createConnection({
        host: 'medandbeauty-aurora.cluster-cdk8q4u6k584.us-east-1.rds.amazonaws.com',
        user: 'admin',
        password: 'Poncho2001!',  // Usar el mismo password
        database: 'medandbeauty'
    });
    
    try {
        console.log('📋 Obteniendo estructura de tablas...');
        
        // Obtener lista de tablas
        const [tables] = await oldDb.execute('SHOW TABLES');
        console.log(`📊 Encontradas ${tables.length} tablas para migrar`);
        
        for (const table of tables) {
            const tableName = Object.values(table)[0];
            console.log(`📦 Migrando tabla: ${tableName}`);
            
            // Obtener estructura de la tabla
            const [createTable] = await oldDb.execute(`SHOW CREATE TABLE ${tableName}`);
            const createStatement = createTable[0]['Create Table'];
            
            // Crear tabla en Aurora
            try {
                await newDb.execute(createStatement);
                console.log(`✅ Tabla ${tableName} creada`);
            } catch (err) {
                if (err.code === 'ER_TABLE_EXISTS_ERROR') {
                    console.log(`⚠️  Tabla ${tableName} ya existe, limpiando...`);
                    await newDb.execute(`DELETE FROM ${tableName}`);
                } else {
                    throw err;
                }
            }
            
            // Copiar datos
            const [rows] = await oldDb.execute(`SELECT * FROM ${tableName}`);
            
            if (rows.length > 0) {
                // Obtener nombres de columnas
                const [columns] = await oldDb.execute(`DESCRIBE ${tableName}`);
                const columnNames = columns.map(col => col.Field).join(', ');
                const placeholders = columns.map(() => '?').join(', ');
                
                const insertQuery = `INSERT INTO ${tableName} (${columnNames}) VALUES (${placeholders})`;
                
                for (const row of rows) {
                    const values = Object.values(row);
                    await newDb.execute(insertQuery, values);
                }
                
                console.log(`✅ ${rows.length} registros migrados en ${tableName}`);
            } else {
                console.log(`⚠️  Tabla ${tableName} está vacía`);
            }
        }
        
        console.log('🎉 Migración completada exitosamente!');
        console.log('📝 Ahora actualiza tu .env para usar Aurora:');
        console.log('DB_HOST=medandbeauty-aurora.cluster-cdk8q4u6k584.us-east-1.rds.amazonaws.com');
        console.log('DB_DATABASE=medandbeauty');
        
    } catch (error) {
        console.error('❌ Error durante la migración:', error);
    } finally {
        await oldDb.end();
        await newDb.end();
    }
}

migrateData();
