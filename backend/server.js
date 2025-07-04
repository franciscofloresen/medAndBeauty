// server.js

// 1. Importar las dependencias necesarias
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// 2. Configuración de la aplicación
const app = express();
const port = 3001;

// 3. Middlewares
app.use(cors());
app.use(express.json());

// 4. Configuración de la Base de Datos
const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE
};
const pool = mysql.createPool(dbConfig).promise();

// 5. Rutas Públicas

// Ruta para obtener todos los productos, con filtro opcional por proveedor
app.get('/api/productos', async (req, res) => {
    try {
        const { proveedor } = req.query; // Captura el parámetro de la URL, si existe

        let sqlQuery = 'SELECT Producto, Precio_de_venta_con_IVA, URL_Imagen, Proveedor, Descripcion FROM Productos';
        const params = [];

        if (proveedor) {
            sqlQuery += ' WHERE Proveedor = ?';
            params.push(proveedor);
        }

        const [results] = await pool.query(sqlQuery, params);
        res.json(results);
    } catch (error) {
        console.error('Error al consultar la base de datos:', error);
        res.status(500).json({ error: 'Error al obtener los productos.' });
    }
});

// NUEVA RUTA: Obtener lista única de proveedores
app.get('/api/proveedores', async (req, res) => {
    try {
        const [results] = await pool.query('SELECT DISTINCT Proveedor FROM Productos WHERE Proveedor IS NOT NULL AND Proveedor != "" ORDER BY Proveedor ASC');
        const proveedores = results.map(row => row.Proveedor);
        res.json(proveedores);
    } catch (error) {
        console.error('Error al obtener los proveedores:', error);
        res.status(500).json({ error: 'Error al obtener los proveedores.' });
    }
});


// 6. Ruta de Autenticación
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ message: 'Usuario y contraseña son requeridos.' });
    }
    try {
        const [rows] = await pool.query('SELECT * FROM Admins WHERE username = ?', [username]);
        if (rows.length === 0) {
            return res.status(401).json({ message: 'Credenciales inválidas.' });
        }
        const admin = rows[0];
        const isMatch = await bcrypt.compare(password, admin.password_hash);
        if (!isMatch) {
            return res.status(401).json({ message: 'Credenciales inválidas.' });
        }
        const token = jwt.sign({ userId: admin.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.json({ message: 'Login exitoso', token });
    } catch (error) {
        console.error("Error en el login:", error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});

// 7. Middleware de Autenticación
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401);
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
}

// 8. Rutas Protegidas (CRUD)
app.get('/api/admin/productos', authenticateToken, async (req, res) => {
    try {
        const [results] = await pool.query('SELECT * FROM Productos');
        res.json(results);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener los productos.' });
    }
});

app.post('/api/productos', authenticateToken, async (req, res) => {
    const { SKU, Producto, Precio_de_venta_con_IVA, Stock, Proveedor, URL_Imagen, Descripcion } = req.body;
    try {
        const query = 'INSERT INTO Productos (SKU, Producto, Precio_de_venta_con_IVA, Stock, Proveedor, URL_Imagen, Descripcion) VALUES (?, ?, ?, ?, ?, ?, ?)';
        const [result] = await pool.query(query, [SKU, Producto, Precio_de_venta_con_IVA, Stock, Proveedor, URL_Imagen, Descripcion]);
        res.status(201).json({ message: 'Producto creado', productId: result.insertId });
    } catch (error) {
        res.status(500).json({ error: 'Error al crear el producto.' });
    }
});

app.put('/api/productos/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { SKU, Producto, Precio_de_venta_con_IVA, Stock, Proveedor, URL_Imagen, Descripcion } = req.body;
    try {
        const query = 'UPDATE Productos SET SKU = ?, Producto = ?, Precio_de_venta_con_IVA = ?, Stock = ?, Proveedor = ?, URL_Imagen = ?, Descripcion = ? WHERE ID = ?';
        await pool.query(query, [SKU, Producto, Precio_de_venta_con_IVA, Stock, Proveedor, URL_Imagen, Descripcion, id]);
        res.json({ message: 'Producto actualizado correctamente.' });
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar el producto.' });
    }
});

app.delete('/api/productos/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM Productos WHERE ID = ?', [id]);
        res.json({ message: 'Producto eliminado correctamente.' });
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar el producto.' });
    }
});

// 9. Iniciar el servidor
app.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
});