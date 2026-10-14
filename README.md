# 🧹 Site Data Cleaner & Inspector

Extensión ligera (Manifest V3) para Microsoft Edge y navegadores basados en Chromium que permite inspeccionar en tiempo real y eliminar de forma aislada todos los datos almacenados por el sitio web activo, sin cerrar tus sesiones ni borrar datos de otras páginas.

## ✨ Características principales

* **Inspección detallada en tiempo real:**
  * **Cookies:** Visualiza todas las cookies del dominio activo, incluyendo las protegidas con bandera `HttpOnly`.
  * **Local Storage y Session Storage:** Lista completa de pares `clave: valor` almacenados en la pestaña.
  * **IndexedDB, Cache Storage y Service Workers:** Detecta bases de datos locales, cachés de aplicaciones web progresivas (PWA) y workers registrados.
  * **Cálculo de cuota en disco:** Muestra el espacio exacto ocupado por el origen actual mediante la API `navigator.storage.estimate()`.
* **Limpieza profunda por origen:** Elimina cookies, `localStorage`, `sessionStorage`, `IndexedDB`, `Cache Storage`, `Service Workers`, `FileSystems` y caché de red únicamente del sitio actual.
* **Recarga automática:** Actualiza la pestaña tras la limpieza para aplicar el estado limpio de inmediato.
* **Interfaz oscura (Catppuccin Mocha):** Diseño limpio con barras de desplazamiento personalizadas e integradas.

## 📁 Estructura del proyecto

```text
edge-site-cleaner/
├── icon.png          # Icono de la extensión (128x128)
├── manifest.json     # Configuración y permisos (Manifest V3)
├── popup.html        # Estructura y estilos del modal de inspección
└── popup.js          # Lógica de lectura y limpieza de datos por origen
