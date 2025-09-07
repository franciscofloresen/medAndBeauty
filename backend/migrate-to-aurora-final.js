const mysql = require('mysql2/promise');

async function migrateToAuroraFinal() {
    console.log('🚀 Migrando datos de RDS a Aurora final...\n');
    
    let rdsDb, auroraDb;
    
    try {
        // Conectar a RDS
        console.log('📡 Conectando a RDS...');
        rdsDb = await mysql.createConnection({
            host: 'medandbeauty.cdk8q4u6k584.us-east-1.rds.amazonaws.com',
            user: 'admin',
            password: 'Poncho2001!',
            database: 'productos_db'
        });
        
        // Conectar a Aurora final
        console.log('📡 Conectando a Aurora final...');
        auroraDb = await mysql.createConnection({
            host: 'medandbeauty-aurora-final.cluster-cdk8q4u6k584.us-east-1.rds.amazonaws.com',
            user: 'admin',
            password: 'Poncho2001!',
            database: 'medandbeauty'
        });
        
        // Crear tablas en Aurora
        console.log('📦 Creando tablas en Aurora...');
        
        await auroraDb.execute(`
            CREATE TABLE IF NOT EXISTS Productos (
                ID INT AUTO_INCREMENT PRIMARY KEY,
                SKU VARCHAR(100),
                Producto VARCHAR(255) NOT NULL,
                Precio_de_venta_con_IVA DECIMAL(10,2) NOT NULL,
                Stock INT DEFAULT 0,
                Proveedor VARCHAR(255),
                URL_Imagen TEXT,
                Descripcion TEXT,
                RegistroSanitario BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        await auroraDb.execute(`
            CREATE TABLE IF NOT EXISTS Admins (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Migrar productos
        console.log('📥 Migrando productos...');
        const [productos] = await rdsDb.execute('SELECT * FROM Productos');
        
        for (const producto of productos) {
            await auroraDb.execute(`
                INSERT INTO Productos (ID, SKU, Producto, Precio_de_venta_con_IVA, Stock, Proveedor, URL_Imagen, Descripcion, RegistroSanitario, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                Producto = VALUES(Producto),
                Precio_de_venta_con_IVA = VALUES(Precio_de_venta_con_IVA),
                Stock = VALUES(Stock)
            `, [
                producto.ID,
                producto.SKU || null,
                producto.Producto,
                producto.Precio_de_venta_con_IVA,
                producto.Stock || 0,
                producto.Proveedor || null,
                producto.URL_Imagen || null,
                producto.Descripcion || null,
                producto.RegistroSanitario || false,
                producto.created_at || new Date()
            ]);
        }
        
        // Migrar admins
        console.log('👤 Migrando admins...');
        const [admins] = await rdsDb.execute('SELECT * FROM Admins');
        
        for (const admin of admins) {
            await auroraDb.execute(`
                INSERT INTO Admins (id, username, password_hash, created_at)
                VALUES (?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                password_hash = VALUES(password_hash)
            `, [admin.id, admin.username, admin.password_hash, admin.created_at || new Date()]);
        }
        
        // Verificar migración
        const [auroraProductos] = await auroraDb.execute('SELECT COUNT(*) as count FROM Productos');
        const [auroraAdmins] = await auroraDb.execute('SELECT COUNT(*) as count FROM Admins');
        
        console.log(`✅ Migración completada:`);
        console.log(`   📦 ${auroraProductos[0].count} productos migrados`);
        console.log(`   👤 ${auroraAdmins[0].count} admins migrados`);
        
    } catch (error) {
        console.error('❌ Error durante la migración:', error.message);
        throw error;
    } finally {
        if (rdsDb) await rdsDb.end();
        if (auroraDb) await auroraDb.end();
    }
}

migrateToAuroraFinal();
