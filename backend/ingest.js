// ingest.js

const mysql = require('mysql2/promise');
const { Pinecone } = require('@pinecone-database/pinecone');
require('dotenv').config();

// --- Función para generar embeddings con la API de Gemini ---
async function getEmbedding(text) {
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

    // 2. Obtener productos de MySQL (CONSULTA CORREGIDA)
    console.log("Obteniendo productos de la base de datos...");
    // --- CAMBIO 1: Seleccionamos solo las columnas que pediste ---
    const [products] = await connection.execute(
        'SELECT ID, Producto, Proveedor, Precio_de_venta_con_IVA, Descripcion, RegistroSanitario FROM Productos'
    );
    console.log(`Se encontraron ${products.length} productos.`);
    await connection.end();

    // 3. Conectar a Pinecone
    console.log("Conectando a Pinecone...");
    const pinecone = new Pinecone();
    const indexName = 'medandbeauty-products';
    const index = pinecone.index(indexName);
    console.log("Conexión a Pinecone exitosa.");

    // 4. Procesar y subir cada producto a Pinecone
    console.log("Procesando y subiendo productos a Pinecone. Esto puede tardar varios minutos...");
    for (const product of products) {
        // --- CAMBIO 2: Construimos el texto solo con los campos que pediste ---
        let registroInfo = '';
        if (product.RegistroSanitario) {
            registroInfo = 'Registro Sanitario: Sí.';
        }

        // Creamos un texto combinado con la información más relevante del producto
        const textToEmbed = `
            Producto: ${product.Producto}.
            Proveedor: ${product.Proveedor}.
            Precio: ${product.Precio_de_venta_con_IVA} MXN.
            Descripción: ${product.Descripcion}.
            ${registroInfo}
        `.trim().replace(/\s+/g, ' '); // Limpiamos espacios extra

        console.log(`- Procesando producto ID: ${product.ID} - ${product.Producto}`);

        const embedding = await getEmbedding(textToEmbed);

        const vector = {
            id: product.ID.toString(),
            values: embedding,
            metadata: {
                text: textToEmbed
            }
        };

        await index.upsert([vector]);
    }

    console.log("\n¡Proceso de ingestión completado exitosamente!");
    console.log(`Se han subido ${products.length} productos a tu base de conocimiento en Pinecone.`);
}

main().catch(error => {
    console.error("\nOcurrió un error durante la ingestión:", error);
});
