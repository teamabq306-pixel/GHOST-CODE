# 👻 Ghost Code v2.0

Sitio web completo para empresa de desarrollo de software.

## 🚀 Inicio rápido

```bash
node server.js
```

Visita: **http://localhost:3000**

---

## 📁 Estructura del proyecto

```
ghostcode/
├── server.js              ← Servidor Node.js (sin dependencias externas)
├── package.json
├── data.json              ← Se crea automáticamente (contactos + portafolio)
├── backend/
│   └── config.js          ← Puerto, sesiones, datos de empresa
└── public/
    ├── index.html          ← Homepage
    ├── servicios.html      ← Página de servicios
    ├── nosotros.html       ← Página nosotros
    ├── portafolio.html     ← Portafolio dinámico
    ├── contacto.html       ← Formulario de contacto
    ├── admin.html          ← Panel de administración
    ├── 404.html
    ├── css/
    │   ├── style.css       ← Estilos principales
    │   └── admin.css       ← Estilos del panel admin
    ├── js/
    │   ├── app.js          ← JS compartido (navbar, counter, contacto)
    │   ├── portfolio.js    ← JS del portafolio público
    │   └── admin.js        ← JS del panel admin
    ├── images/
    │   ├── logo.png        ← Reemplaza con tu logo (o .svg)
    │   └── bg.jpg          ← Imagen de fondo del hero (sube desde el admin)
    ├── portfolio/          ← Imágenes de proyectos (se crea automáticamente)
    └── uploads/            ← Carpeta de subidas
```

---

## 🔑 Acceso al panel admin

- **URL:** http://localhost:3000/admin.html
- **Usuario:** `admin`
- **Contraseña:** `Admin@GhostCode2024`

---

## ✨ Funcionalidades

### Sitio público
- **Homepage** — Hero con animación typewriter, stats animados, tarjetas preview
- **Servicios** — Página independiente con todos los servicios
- **Nosotros** — Historia, valores y filosofía
- **Portafolio** — Galería dinámica con filtros por categoría y modal detalle
- **Contacto** — Formulario con validación y feedback visual

### Panel Admin (`/admin.html`)
- **Login seguro** — Sesión con cookie HttpOnly, delay anti-brute force
- **Overview** — Stats de proyectos y mensajes
- **Gestión de Portafolio** — Agregar/eliminar proyectos con imagen, título, descripción, categoría, tags y link
- **Mensajes de Contacto** — Visualiza todos los mensajes recibidos
- **Apariencia** — Sube imagen de fondo del hero desde tus carpetas de imágenes

---

## 🖼️ Personalización

### Cambiar fondo del hero
1. Ve a `/admin.html` → **Apariencia**
2. Arrastra o selecciona una imagen (JPG, PNG, WebP — máx 10MB)
3. Haz clic en **Subir Fondo**

### Cambiar logo
Reemplaza `public/images/logo.png` con tu logo. Si no existe el archivo, se muestra el texto "GHOSTCODE" automáticamente.

### Cambiar datos de contacto
Edita `backend/config.js`:
```js
company: {
  name: 'Tu Empresa',
  email: 'tu@email.com',
  phone: '+1 (555) 000-0000',
  location: 'Tu Ciudad'
}
```

### Cambiar contraseña de admin
El servidor carga la contraseña desde código. Para cambiarla, edita `server.js` en la función `db.init()`:
```js
const { hash, salt } = security.hashPassword('TuNuevaContraseña');
```

---

## 🔒 Seguridad incluida
- Rate limiting (200 req/min)
- Headers de seguridad (CSP, X-Frame-Options, etc.)
- Sesiones con tokens aleatorios (HttpOnly, SameSite)
- Sanitización de inputs
- Protección contra path traversal
- Delay anti-brute force en login
- Validación de tipo y tamaño en subida de archivos

---

## 📦 Sin dependencias
Solo requiere **Node.js ≥ 18**. Sin npm install.
