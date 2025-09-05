const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const { Pinecone } = require('@pinecone-database/pinecone');
require('dotenv').config();

const app = express();
const port = 3001;

// Rate limiting
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'Demasiadas solicitudes' }
});

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { error: 'Demasiados intentos de login' }
});

// CORS corregido
const allowedOrigins = [
    'https://distribuidoramedandbeauty.com',
    'http://localhost:3000',
    'http://127.0.0.1:3000'
];

const corsOptions = {
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('CORS policy violation'));
        }
    },
    credentials: true
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use('/api/', apiLimiter);

// Validación
function validateProduct(req, res, next) {
    const { Producto, Precio_de_venta_con_IVA, Stock } = req.body;
    
    if (!Producto || Producto.trim().length < 3) {
        return res.status(400).json({ error: 'Producto debe tener al menos 3 caracteres' });
    }
    
    if (!Precio_de_venta_con_IVA || Precio_de_venta_con_IVA <= 0) {
        return res.status(400).json({ error: 'Precio debe ser mayor a 0' });
    }
    
    if (Stock < 0) {
        return res.status(400).json({ error: 'Stock no puede ser negativo' });
    }
    
    next();
}

function sanitize(str) {
    return typeof str === 'string' ? str.trim().replace(/[<>]/g, '') : str;
}

// DB Config
const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    acquireTimeout: 60000,
    timeout: 60000,
    reconnect: true,
    connectionLimit: 10
};

const pool = mysql.createPool(dbConfig).promise();

// Pinecone
const pinecone = new Pinecone();
const pineconeIndex = pinecone.index('medandbeauty-products');

// Health check
app.get('/health', async (req, res) => {
    try {
        await pool.execute('SELECT 1');
        res.json({ status: 'healthy', timestamp: new Date().toISOString() });
    } catch (error) {
        res.status(503).json({ status: 'unhealthy', error: error.message });
    }
});

// Auth middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) return res.sendStatus(401);
    
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
}

// Error handler
function handleError(error, res, message = 'Error interno del servidor') {
    console.error(error);
    res.status(500).json({ error: message });
}

// Búsqueda segura interna
async function searchProducts(query) {
    try {
        const [results] = await pool.query(
            'SELECT * FROM Productos WHERE Producto LIKE ? OR Descripcion LIKE ? LIMIT 10',
            [`%${sanitize(query)}%`, `%${sanitize(query)}%`]
        );
        return results;
    } catch (error) {
        console.error('Error en búsqueda:', error);
        return [];
    }
}

// RUTAS PÚBLICAS
app.get('/api/productos', async (req, res) => {
    try {
        const { sortBy, search, proveedor } = req.query;
        let sqlQuery = 'SELECT ID, Producto, Precio_de_venta_con_IVA, URL_Imagen, Proveedor, Descripcion, Stock FROM Productos WHERE 1=1';
        const params = [];

        if (search && search.trim() !== '') {
            sqlQuery += ' AND Producto LIKE ?';
            params.push(`%${sanitize(search)}%`);
        }

        if (proveedor && proveedor !== 'todos') {
            sqlQuery += ' AND Proveedor = ?';
            params.push(sanitize(proveedor));
        }

        let orderByClause = ' ORDER BY ID ASC';
        switch (sortBy) {
            case 'proveedor_az': orderByClause = ' ORDER BY Proveedor ASC, Producto ASC'; break;
            case 'precio_asc': orderByClause = ' ORDER BY Precio_de_venta_con_IVA ASC'; break;
            case 'precio_desc': orderByClause = ' ORDER BY Precio_de_venta_con_IVA DESC'; break;
        }
        
        sqlQuery += orderByClause;
        const [results] = await pool.query(sqlQuery, params);
        res.json(results);
    } catch (error) {
        handleError(error, res, 'Error al obtener productos');
    }
});

app.get('/api/productos/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });
        
        const [results] = await pool.query('SELECT * FROM Productos WHERE ID = ?', [id]);
        if (results.length === 0) return res.status(404).json({ error: 'Producto no encontrado' });
        
        res.json(results[0]);
    } catch (error) {
        handleError(error, res, 'Error al obtener producto');
    }
});

app.get('/api/proveedores', async (req, res) => {
    try {
        const [results] = await pool.query('SELECT DISTINCT Proveedor FROM Productos WHERE Proveedor IS NOT NULL AND Proveedor != "" ORDER BY Proveedor ASC');
        res.json(results.map(row => row.Proveedor));
    } catch (error) {
        handleError(error, res, 'Error al obtener proveedores');
    }
});

app.post('/api/buscar', async (req, res) => {
    try {
        const { query } = req.body;
        if (!query || query.trim().length < 2) {
            return res.status(400).json({ error: 'Query debe tener al menos 2 caracteres' });
        }
        
        const results = await searchProducts(query);
        res.json(results);
    } catch (error) {
        handleError(error, res, 'Error en búsqueda');
    }
});

// Login con rate limiting
app.post('/api/login', loginLimiter, async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ message: 'Usuario y contraseña requeridos' });
        }

        const [rows] = await pool.query('SELECT * FROM Admins WHERE username = ?', [sanitize(username)]);
        if (rows.length === 0) {
            return res.status(401).json({ message: 'Credenciales inválidas' });
        }

        const admin = rows[0];
        const isMatch = await bcrypt.compare(password, admin.password_hash);
        if (!isMatch) {
            return res.status(401).json({ message: 'Credenciales inválidas' });
        }

        const token = jwt.sign({ userId: admin.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.json({ message: 'Login exitoso', token });
    } catch (error) {
        handleError(error, res, 'Error en login');
    }
});

// RUTAS PROTEGIDAS
app.post('/api/productos', authenticateToken, validateProduct, async (req, res) => {
    try {
        const { SKU, Producto, Precio_de_venta_con_IVA, Stock, Proveedor, URL_Imagen, Descripcion, RegistroSanitario } = req.body;
        
        const query = 'INSERT INTO Productos (SKU, Producto, Precio_de_venta_con_IVA, Stock, Proveedor, URL_Imagen, Descripcion, RegistroSanitario) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
        const [result] = await pool.query(query, [
            sanitize(SKU) || null,
            sanitize(Producto),
            Precio_de_venta_con_IVA,
            Stock,
            sanitize(Proveedor),
            sanitize(URL_Imagen),
            sanitize(Descripcion),
            RegistroSanitario || false
        ]);
        
        res.status(201).json({ message: 'Producto creado', productId: result.insertId });
    } catch (error) {
        handleError(error, res, 'Error al crear producto');
    }
});

// Error handlers
app.use((error, req, res, next) => {
    console.error(error.stack);
    res.status(500).json({ error: 'Algo salió mal' });
});

app.use('*', (req, res) => {
    res.status(404).json({ error: 'Endpoint no encontrado' });
});

const server = app.listen(port, () => {
    console.log(`✅ Servidor seguro ejecutándose en puerto ${port}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🔄 Cerrando servidor...');
    server.close(() => {
        pool.end();
        console.log('✅ Servidor cerrado');
    });
});

module.exports = app;
