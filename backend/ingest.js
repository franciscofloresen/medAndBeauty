// ingest.js
// Este script se ejecuta una sola vez (o cada vez que quieras actualizar la base de conocimiento)
// para leer tus productos de MySQL y guardarlos en Pinecone.

const mysql = require('mysql2/promise');
const { Pinecone } = require('@pinecone-database/pinecone');
require('dotenv').config();

// --- Función para generar embeddings con la API de Gemini ---
async function getEmbedding(text) {
    // Usamos un modelo específico para embeddings, no el de chat.
    const model = 'text-embedding-004';
    const apiKey = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${apiKey}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: `models/${model}`,
            content: { parts: [{ text }] }
        })
    });

    if (!response.ok) {
        throw new Error(`Error en la API de Embeddings: ${response.statusText}`);
    }

    const result = await response.json();
    return result.embedding.values;
}


// --- Función Principal ---
async function main() {
    console.log("Iniciando el proceso de ingestión de datos...");

    // 1. Conectar a la Base de Datos MySQL
    console.log("Conectando a MySQL...");
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE
    });
    console.log("Conexión a MySQL exitosa.");

    // 2. Obtener productos de MySQL
    console.log("Obteniendo productos de la base de datos...");
    const [products] = await connection.execute('SELECT ID, Producto, Descripcion, Proveedor, Precio_de_venta_con_IVA FROM Productos');
    console.log(`Se encontraron ${products.length} productos.`);
    await connection.end();

    // 3. Conectar a Pinecone (FORMA CORREGIDA)
    console.log("Conectando a Pinecone...");
    // La nueva versión de la librería ya no necesita el 'environment' aquí.
    // Automáticamente usará la variable de entorno PINECONE_API_KEY.
    const pinecone = new Pinecone();

    const indexName = 'medandbeauty-products'; // El nombre que le diste a tu índice
    const index = pinecone.index(indexName);
    console.log("Conexión a Pinecone exitosa.");

    // 4. Procesar y subir cada producto a Pinecone
    console.log("Procesando y subiendo productos a Pinecone. Esto puede tardar varios minutos...");
    for (const product of products) {
        // Creamos un texto combinado con la información más relevante del producto
        const textToEmbed = `
            Producto: ${product.Producto}.
            Descripción: ${product.Descripcion}.
            Proveedor: ${product.Proveedor}.
            Precio: ${product.Precio_de_venta_con_IVA} MXN.
        `;

        console.log(`- Procesando producto ID: ${product.ID} - ${product.Producto}`);

        // Generamos el vector (embedding) para este texto
        const embedding = await getEmbedding(textToEmbed);

        // Preparamos el objeto para subir a Pinecone
        const vector = {
            id: product.ID.toString(), // El ID debe ser un string
            values: embedding,
            metadata: { // Guardamos información adicional que queramos recuperar
                text: textToEmbed
            }
        };

        // Subimos el vector al índice de Pinecone
        await index.upsert([vector]);
    }

    console.log("\n¡Proceso de ingestión completado exitosamente!");
    console.log(`Se han subido ${products.length} productos a tu base de conocimiento en Pinecone.`);
}

main().catch(error => {
    console.error("\nOcurrió un error durante la ingestión:", error);
});