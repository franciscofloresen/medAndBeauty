const mysql = require('mysql2/promise');

async function initAurora() {
    console.log('🚀 Inicializando Aurora...');
    
    try {
        // Conectar a Aurora sin especificar base de datos
        console.log('📡 Conectando a Aurora...');
        const db = await mysql.createConnection({
            host: process.env.DB_HOST || 'medandbeauty-aurora.cluster-cdk8q4u6k584.us-east-1.rds.amazonaws.com',
            user: process.env.DB_USER || 'admin',
            password: process.env.DB_PASSWORD || 'Poncho2001!',
            connectTimeout: 30000
        });
        
        // Crear base de datos
        console.log('📋 Creando base de datos medandbeauty...');
        await db.execute('CREATE DATABASE IF NOT EXISTS medandbeauty');
        await db.execute('USE medandbeauty');
        
        // Crear tablas básicas
        console.log('📦 Creando tablas...');
        
        // Tabla Admins
        await db.execute(`
            CREATE TABLE IF NOT EXISTS Admins (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Tabla Productos
        await db.execute(`
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
        
        // Tabla Promociones
        await db.execute(`
            CREATE TABLE IF NOT EXISTS Promociones (
                id INT AUTO_INCREMENT PRIMARY KEY,
                titulo VARCHAR(255) NOT NULL,
                descripcion TEXT,
                descuento DECIMAL(5,2),
                fecha_inicio DATE,
                fecha_fin DATE,
                activa BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Verificar si hay datos
        const [productCount] = await db.execute('SELECT COUNT(*) as count FROM Productos');
        console.log(`📊 Aurora inicializada: ${productCount[0].count} productos`);
        
        if (productCount[0].count === 0) {
            console.log('📥 Aurora vacía, necesita migración de datos');
        }
        
        await db.end();
        console.log('✅ Aurora inicializada correctamente');
        
    } catch (error) {
        console.error('❌ Error inicializando Aurora:', error.message);
        throw error;
    }
}

// Exportar para uso en server.js
module.exports = { initAurora };

// Ejecutar si se llama directamente
if (require.main === module) {
    initAurora().catch(console.error);
}
