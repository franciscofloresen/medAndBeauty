// server.js

// 1. Importar dependencias
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Pinecone } = require('@pinecone-database/pinecone');
const google = require('google-it');
require('dotenv').config();

// 2. Configuración de la aplicación y DB
const app = express();
const port = 3001;

// --- CONFIGURACIÓN DE CORS CORREGIDA PARA PRODUCCIÓN ---
const allowedOrigins = ['https://distribuidoramedandbeauty.com'];

const corsOptions = {
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('La política de CORS para este sitio no permite el acceso.'));
        }
    }
};
app.use(cors(corsOptions));
app.use(express.json());


const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE
};
const pool = mysql.createPool(dbConfig).promise();

// --- Configuración de Pinecone ---
const pinecone = new Pinecone();
const pineconeIndex = pinecone.index('medandbeauty-products');


// --- Función para generar embeddings con Gemini ---
async function getEmbedding(text) {
    const model = 'text-embedding-004';
    const apiKey = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${apiKey}`;
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: `models/${model}`, content: { parts: [{ text }] } })
    });
    if (!response.ok) throw new Error(`API de Embeddings falló: ${response.statusText}`);
    const result = await response.json();
    return result.embedding.values;
}

// --- Middleware de Autenticación (sin cambios) ---
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

// --- RUTAS PÚBLICAS ---

// GET /api/promociones - Obtener promociones activas para el carrusel
app.get('/api/promociones', async (req, res) => {
    try {
        const [promociones] = await pool.query(
            'SELECT * FROM Promociones WHERE Activa = TRUE ORDER BY Orden ASC'
        );
        res.json(promociones);
    } catch (error) {
        console.error('Error al obtener promociones:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

// GET /api/productos
app.get('/api/productos', async (req, res) => {
    try {
        const { sortBy, search } = req.query;
        let sqlQuery = 'SELECT ID, Producto, Precio_de_venta_con_IVA, URL_Imagen, Proveedor, Descripcion, Stock FROM Productos';
        const params = [];
        if (search && search.trim() !== '') {
            sqlQuery += ' WHERE Producto LIKE ?';
            params.push(`%${search}%`);
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
        console.error('Error al consultar la base de datos:', error);
        res.status(500).json({ error: 'Error al obtener los productos.' });
    }
});

// GET /api/productos/:id
app.get('/api/productos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [results] = await pool.query('SELECT * FROM Productos WHERE ID = ?', [id]);
        if (results.length === 0) return res.status(404).json({ error: 'Producto no encontrado.' });
        res.json(results[0]);
    } catch (error) {
        console.error('Error al obtener el producto:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

// GET /api/productos/:id/recommendations
app.get('/api/productos/:id/recommendations', async (req, res) => {
    try {
        const { id } = req.params;
        const [productResults] = await pool.query('SELECT Proveedor FROM Productos WHERE ID = ?', [id]);
        if (productResults.length === 0) return res.status(404).json({ error: 'Producto no encontrado.' });
        const proveedor = productResults[0].Proveedor;
        const [recommendations] = await pool.query('SELECT ID, Producto, Precio_de_venta_con_IVA, URL_Imagen, Stock FROM Productos WHERE Proveedor = ? AND ID != ? LIMIT 4', [proveedor, id]);
        res.json(recommendations);
    } catch (error) {
        console.error('Error al obtener recomendaciones:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

// GET /api/proveedores
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

// POST /api/login
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ message: 'Usuario y contraseña son requeridos.' });
    try {
        const [rows] = await pool.query('SELECT * FROM Admins WHERE username = ?', [username]);
        if (rows.length === 0) return res.status(401).json({ message: 'Credenciales inválidas.' });
        const admin = rows[0];
        const isMatch = await bcrypt.compare(password, admin.password_hash);
        if (!isMatch) return res.status(401).json({ message: 'Credenciales inválidas.' });
        const token = jwt.sign({ userId: admin.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.json({ message: 'Login exitoso', token });
    } catch (error) {
        console.error("Error en el login:", error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});


// --- RUTAS DE ADMINISTRACIÓN (PROTEGIDAS) ---

// CRUD de Productos
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
        const [result] = await pool.query(query, [SKU || null, Producto, Precio_de_venta_con_IVA, Stock, Proveedor, URL_Imagen, Descripcion]);
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
        await pool.query(query, [SKU || null, Producto, Precio_de_venta_con_IVA, Stock, Proveedor, URL_Imagen, Descripcion, id]);
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

// CRUD de Promociones
app.get('/api/admin/promociones', authenticateToken, async (req, res) => {
    try {
        const [results] = await pool.query('SELECT * FROM Promociones ORDER BY Orden ASC');
        res.json(results);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener las promociones.' });
    }
});
app.post('/api/admin/promociones', authenticateToken, async (req, res) => {
    const { Titulo, Subtitulo, TextoBoton, EnlaceBoton, URL_Imagen, Activa, Orden } = req.body;
    try {
        const query = 'INSERT INTO Promociones (Titulo, Subtitulo, TextoBoton, EnlaceBoton, URL_Imagen, Activa, Orden) VALUES (?, ?, ?, ?, ?, ?, ?)';
        const [result] = await pool.query(query, [Titulo, Subtitulo, TextoBoton, EnlaceBoton, URL_Imagen, Activa, Orden]);
        res.status(201).json({ message: 'Promoción creada', promoId: result.insertId });
    } catch (error) {
        res.status(500).json({ error: 'Error al crear la promoción.' });
    }
});
app.put('/api/admin/promociones/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { Titulo, Subtitulo, TextoBoton, EnlaceBoton, URL_Imagen, Activa, Orden } = req.body;
    try {
        const query = 'UPDATE Promociones SET Titulo = ?, Subtitulo = ?, TextoBoton = ?, EnlaceBoton = ?, URL_Imagen = ?, Activa = ?, Orden = ? WHERE ID = ?';
        await pool.query(query, [Titulo, Subtitulo, TextoBoton, EnlaceBoton, URL_Imagen, Activa, Orden, id]);
        res.json({ message: 'Promoción actualizada correctamente.' });
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar la promoción.' });
    }
});
app.delete('/api/admin/promociones/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM Promociones WHERE ID = ?', [id]);
        res.json({ message: 'Promoción eliminada correctamente.' });
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar la promoción.' });
    }
});


// --- RUTA DEL CHATBOT ---
app.post('/api/chatbot', async (req, res) => {
    const { message, history } = req.body;

    try {
        // 1. Buscar contexto relevante en Pinecone
        const questionEmbedding = await getEmbedding(message);
        const queryResponse = await pineconeIndex.query({
            vector: questionEmbedding,
            topK: 3,
            includeMetadata: true,
        });

        const context = queryResponse.matches.map(match => match.metadata.text).join('\n\n---\n\n');

        // 2. Lógica de Búsqueda Externa
        let searchResultsText = 'No se realizó búsqueda externa.';
        if (queryResponse.matches.length > 0) {
            const mainProductInfo = queryResponse.matches[0].metadata.text;
            if (mainProductInfo.includes('Descripción: null') || mainProductInfo.includes('Descripción: .')) {
                const descriptiveIntentKeywords = ['consiste', 'descripción', 'qué es', 'para qué sirve', 'dime sobre', 'info', 'acerca de'];
                const userWantsDescription = descriptiveIntentKeywords.some(keyword => message.toLowerCase().includes(keyword));
                if (userWantsDescription) {
                    const productName = mainProductInfo.split('.')[0].replace('Producto: ', '');
                    console.log(`[Chatbot] Descripción no encontrada para "${productName}". Realizando búsqueda externa...`);
                    const searchResults = await google({ query: `qué es ${productName} uso cosmético`, limit: 2 });
                    if (searchResults.length > 0) {
                        searchResultsText = searchResults.map(r => r.snippet).join('\n');
                        console.log('[Chatbot] Búsqueda externa exitosa.');
                    }
                }
            }
        }

        // 3. Construir el prompt para Gemini con el nuevo contexto de búsqueda
        const systemPrompt = `
            Eres 'MB Assist', un asistente experto de la distribuidora Med & Beauty.
            Tu audiencia son profesionales de la salud. Tu propósito es responder sus preguntas basándote en la siguiente información.

            **1. Contexto Relevante de Nuestros Productos (Fuente Principal y Segura):**
            ${context}

            **2. Resultados de Búsqueda Externa (Fuente Secundaria para complementar):**
            ${searchResultsText}
            
            **3. Información Logística General:**
            - Métodos de pago: Efectivo, tarjetas de crédito, débito y transferencias.
            - Tiempos de envío: Entregas el mismo día en Guadalajara.
            - Contacto humano: Llama al 312-201-4849 o escribe a dinmecol@gmail.com.

            **4. Formato de Respuesta (MUY IMPORTANTE):**
            - **REGLA DE CONCISIÓN:** Sé breve y directo. Evita párrafos largos. Cuando un usuario haga una pregunta general sobre una marca (ej. "Qué manejan de EPTQ"), tu objetivo es dar un resumen rápido.
            - **FORMATO PARA RESÚMENES:** En lugar de una descripción larga para cada producto, presenta una lista simple con el nombre del producto, una frase muy corta sobre su uso principal, y su precio.
            - **Ejemplo de formato deseado para un resumen:**
              "Claro, de la línea EPTQ manejamos lo siguiente:
              - EPTQ S500: Es el más denso, ideal para dar volumen a pómulos y mandíbula. Su precio es de 1798.00 MXN.
              - EPTQ S300: Se usa para arrugas moderadas y profundas. Su precio es de 1740.00 MXN.
              - EPTQ S100: Es para líneas finas como patas de gallo y ojeras. Su precio es de 1740.00 MXN."
            - **NO uses NUNCA Markdown.** No uses asteriscos para listas ni para poner texto en negrita. Usa guiones (-) para las listas si es necesario.
            - Tu objetivo es que la respuesta se lea de forma natural y conversacional.

            **Reglas Estrictas:**
            1. Siempre da prioridad a la información del "Contexto Relevante".
            2. Usa los "Resultados de Búsqueda Externa" ÚNICAMENTE para complementar o crear una descripción si la del contexto es nula o vacía.
            3. NUNCA des consejo médico. Si te preguntan '¿cuál es mejor para...?', responde: 'Como asistente, no puedo hacer recomendaciones clínicas. Te puedo proporcionar los datos técnicos de cada producto para que tomes la mejor decisión basada en tu juicio profesional.'
            4. Responde siempre en español.
        `;

        // 4. Llamar a la API de Gemini
        const chatHistory = [
            { role: "user", parts: [{ text: systemPrompt }] },
            { role: "model", parts: [{ text: "Entendido. Soy MB Assist. ¿En qué puedo ayudarte?" }] }
        ];
        history.forEach(turn => chatHistory.push({ role: turn.role, parts: [{ text: turn.message }] }));
        chatHistory.push({ role: "user", parts: [{ text: message }] });

        const payload = { contents: chatHistory };
        const apiKey = process.env.GEMINI_API_KEY;
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

        const apiResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!apiResponse.ok) throw new Error(`API de Gemini falló: ${apiResponse.statusText}`);

        const result = await apiResponse.json();
        const text = result.candidates[0].content.parts[0].text;
        res.json({ reply: text });

    } catch (error) {
        console.error('Error en el chatbot RAG:', error);
        res.status(500).json({ error: 'No se pudo obtener una respuesta del asistente.' });
    }
});


// Iniciar el servidor
app.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
});