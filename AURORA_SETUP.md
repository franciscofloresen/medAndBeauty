# 🚀 Aurora Setup Instructions

## Estado Actual
- ✅ Aurora Serverless v2 creado y disponible
- ✅ Servidor probado y funcionando con RDS
- ⏳ Aurora en modo "paused" (normal para Serverless v2)

## Cuando Aurora despierte (primera conexión):

### 1. Crear tablas en Aurora:
```sql
-- Conectar a Aurora y ejecutar:

CREATE TABLE `Admins` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `Productos` (
  `ID` int NOT NULL AUTO_INCREMENT,
  `SKU` varchar(50) DEFAULT NULL,
  `Producto` varchar(255) NOT NULL,
  `Precio_de_venta_con_IVA` decimal(10,2) NOT NULL,
  `Precio_de_compra` decimal(10,2) DEFAULT NULL,
  `Stock` int DEFAULT '0',
  `Proveedor` varchar(100) DEFAULT NULL,
  `Tipo` varchar(100) DEFAULT NULL,
  `Fecha_de_caducidad` date DEFAULT NULL,
  `URL_Imagen` varchar(255) DEFAULT NULL,
  `Descripcion` text,
  `DescripcionDetallada` text,
  `RegistroSanitario` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`ID`),
  UNIQUE KEY `SKU` (`SKU`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `Promociones` (
  `ID` int NOT NULL AUTO_INCREMENT,
  `Titulo` varchar(255) NOT NULL,
  `Subtitulo` varchar(255) DEFAULT NULL,
  `TextoBoton` varchar(50) NOT NULL,
  `EnlaceBoton` varchar(255) NOT NULL,
  `URL_Imagen` varchar(255) NOT NULL,
  `Activa` tinyint(1) NOT NULL DEFAULT '0',
  `Orden` int DEFAULT '0',
  `FechaCreacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

### 2. Migrar datos:
```bash
cd backend
node migrate-data.js
```

### 3. Verificar funcionamiento:
```bash
node test-connections.js
```

## Ahorro de costos:
- **RDS actual**: ~$17/mes
- **Aurora Serverless v2**: ~$2.50/mes
- **Ahorro**: 85% ($14.50/mes)

## Nota:
Aurora puede tardar 10-15 segundos en despertar en la primera conexión después de estar pausada. Esto es normal y esperado.
