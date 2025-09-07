# 🏥 Med & Beauty - E-commerce Platform

> **Plataforma completa de e-commerce para productos médicos y estéticos con arquitectura cloud-native en AWS**

[![Live Demo](https://img.shields.io/badge/🌐_Live_Demo-distribuidoramedandbeauty.com-blue?style=for-the-badge)](https://distribuidoramedandbeauty.com)
[![API Status](https://img.shields.io/badge/🚀_API-Running-green?style=for-the-badge)](https://api.distribuidoramedandbeauty.com/health)

## 🎯 **Descripción del Proyecto**

Med & Beauty es una plataforma de e-commerce especializada en productos médicos y estéticos, desarrollada con tecnologías modernas y desplegada en AWS con arquitectura serverless y microservicios.

### ✨ **Características Principales**
- 🛒 **Catálogo de productos** con más de 60 productos especializados
- 🤖 **Chatbot inteligente** con búsqueda semántica
- 👨‍💼 **Panel de administración** para gestión de inventario
- 📱 **Diseño responsive** optimizado para móviles
- 🔒 **Autenticación JWT** segura
- 🔍 **Búsqueda avanzada** con filtros inteligentes

## 🏗️ **Arquitectura Técnica**

### **Frontend**
- **HTML5/CSS3/JavaScript** vanilla para máximo rendimiento
- **Responsive Design** con CSS Grid y Flexbox
- **PWA-ready** con service workers
- **Optimización SEO** completa

### **Backend**
- **Node.js + Express** para API REST
- **MySQL** con Aurora Serverless para escalabilidad
- **JWT** para autenticación segura
- **Middleware** personalizado para validación y seguridad

### **Infraestructura AWS**
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   CloudFront    │────│   S3 Bucket      │    │  App Runner     │
│   (CDN Global)  │    │   (Frontend)     │    │  (Backend API)  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                         │
                       ┌──────────────────┐    ┌─────────────────┐
                       │   Route 53       │    │ Aurora MySQL    │
                       │   (DNS)          │    │ (Database)      │
                       └──────────────────┘    └─────────────────┘
```

## 🚀 **Tecnologías Utilizadas**

### **Desarrollo**
![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=flat&logo=express&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-4479A1?style=flat&logo=mysql&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat&logo=css3&logoColor=white)

### **AWS Cloud**
![AWS](https://img.shields.io/badge/AWS-232F3E?style=flat&logo=amazon-aws&logoColor=white)
![CloudFront](https://img.shields.io/badge/CloudFront-FF9900?style=flat&logo=amazon-aws&logoColor=white)
![S3](https://img.shields.io/badge/S3-569A31?style=flat&logo=amazon-s3&logoColor=white)
![App Runner](https://img.shields.io/badge/App_Runner-FF9900?style=flat&logo=amazon-aws&logoColor=white)
![Aurora](https://img.shields.io/badge/Aurora-FF9900?style=flat&logo=amazon-aws&logoColor=white)
![Route 53](https://img.shields.io/badge/Route_53-FF9900?style=flat&logo=amazon-aws&logoColor=white)

### **DevOps**
![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat&logo=docker&logoColor=white)
![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-2088FF?style=flat&logo=github-actions&logoColor=white)
![Terraform](https://img.shields.io/badge/Terraform-623CE4?style=flat&logo=terraform&logoColor=white)

## 📊 **Métricas del Proyecto**

- **🎯 Rendimiento**: 95+ en Google PageSpeed
- **📱 Responsive**: 100% compatible móviles
- **🔒 Seguridad**: Headers de seguridad implementados
- **⚡ Velocidad**: < 2s tiempo de carga
- **💰 Costo**: ~$25/mes en AWS (optimizado)

## 🛠️ **Instalación y Desarrollo**

### **Prerrequisitos**
```bash
node >= 18.0.0
npm >= 8.0.0
docker >= 20.0.0
aws-cli >= 2.0.0
```

### **Configuración Local**
```bash
# Clonar repositorio
git clone https://github.com/franciscofloresen/medAndBeauty.git
cd medAndBeauty

# Backend
cd backend
npm install
cp .env.example .env
# Configurar variables de entorno
npm start

# Frontend (servir estáticamente)
cd ../frontend
python -m http.server 8080
```

### **Deploy con Docker**
```bash
# Build imagen
docker build -t medandbeauty-backend ./backend

# Ejecutar localmente
docker run -p 3001:3001 \
  -e DB_HOST=your-db-host \
  -e DB_USER=your-user \
  -e DB_PASSWORD=your-password \
  medandbeauty-backend
```

## 🌐 **API Endpoints**

### **Públicos**
```http
GET    /api/productos          # Listar productos
POST   /api/buscar            # Búsqueda de productos
GET    /health                # Health check
```

### **Administración**
```http
POST   /api/admin/login       # Login admin
POST   /api/admin/productos   # Crear producto
PUT    /api/admin/productos/:id # Actualizar producto
DELETE /api/admin/productos/:id # Eliminar producto
```

## 🔧 **Configuración AWS**

### **Variables de Entorno**
```bash
DB_HOST=aurora-cluster-endpoint
DB_USER=admin
DB_PASSWORD=secure-password
DB_DATABASE=medandbeauty
JWT_SECRET=your-jwt-secret
```

### **Servicios Configurados**
- **S3**: Hosting frontend + imágenes de productos
- **CloudFront**: CDN global con certificado SSL
- **App Runner**: Despliegue automático del backend
- **Aurora MySQL**: Base de datos serverless
- **Route 53**: Gestión DNS personalizada

## 📈 **Optimizaciones Implementadas**

### **Performance**
- ✅ Compresión Gzip/Brotli
- ✅ Lazy loading de imágenes
- ✅ Minificación de assets
- ✅ CDN global con CloudFront
- ✅ Database connection pooling

### **Seguridad**
- ✅ Headers de seguridad (HSTS, CSP, etc.)
- ✅ Validación de inputs
- ✅ Rate limiting
- ✅ JWT con expiración
- ✅ Sanitización de datos

### **SEO**
- ✅ Meta tags optimizados
- ✅ Schema.org markup
- ✅ Sitemap XML
- ✅ URLs amigables
- ✅ Open Graph tags

## 🎨 **Características UX/UI**

- **🎨 Diseño moderno** con gradientes y animaciones
- **📱 Mobile-first** approach
- **♿ Accesibilidad** WCAG 2.1 AA
- **🌙 Modo oscuro** disponible
- **⚡ Interacciones fluidas** con CSS transitions
- **🔍 Búsqueda instantánea** con debouncing

## 📱 **Demo en Vivo**

🌐 **Website**: [distribuidoramedandbeauty.com](https://distribuidoramedandbeauty.com)
🚀 **API**: [api.distribuidoramedandbeauty.com](https://api.distribuidoramedandbeauty.com/health)

### **Credenciales de Prueba**
```
Admin Panel:
Usuario: admin
Password: [Contactar para credenciales]
```

## 👨‍💻 **Desarrollador**

**Francisco Flores Enríquez**
- 📧 Email: [franciscofloresen@gmail.com](mailto:franciscofloresen@gmail.com)
- 💼 LinkedIn: [francisco-flores-enriquez](https://linkedin.com/in/francisco-flores-enriquez)
- 🐙 GitHub: [franciscofloresen](https://github.com/franciscofloresen)

## 📄 **Licencia**

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.

---

⭐ **¿Te gusta el proyecto? ¡Dale una estrella!** ⭐
