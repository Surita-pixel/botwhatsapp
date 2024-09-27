# Bot de Registro para WhatsApp

Este proyecto implementa un bot de mensajería para WhatsApp que permite la recopilación automatizada de información personal. Utiliza `Baileys` como proveedor de conexión y la librería `@bot-whatsapp/bot` para la creación de flujos conversacionales interactivos.

## Características

- Recopilación de datos personales (nombres, apellidos, género, edad, departamento, municipio).
- Validación en tiempo real de la información ingresada por el usuario.
- Flujo conversacional guiado y dinámico con manejo de tiempos de inactividad.
- Opción para cancelar el proceso en cualquier momento.
- Resumen final de los datos proporcionados.
- Integración con API externa para validación de documentos (configuración pendiente).
- Portal web personalizado para escaneo de código QR.

## Requisitos Previos

- Node.js (versión 14.x o superior)
- npm (gestor de paquetes de Node.js)

## Dependencias Principales

- `@bot-whatsapp/bot`: Core del bot de WhatsApp
- `@bot-whatsapp/database/mock`: Base de datos simulada para pruebas
- `@bot-whatsapp/provider/baileys`: Proveedor de conexión para WhatsApp
- `@whiskeysockets/baileys`: Librería para interactuar con WhatsApp
- `axios`: Cliente HTTP para realizar peticiones a APIs externas
- `pino`: Logger para la aplicación

## Instalación

1. Clona este repositorio:
   ```bash
   git clone https://github.com/Surita-pixel/botwhatsapp
   cd botwhatsapp
   ```

2. Instala las dependencias necesarias:
   ```bash
   npm install
   ```

## Configuración

1. Asegúrate de tener un archivo `const.js` con las constantes `MUNICIPIOS` y `DEPARTAMENTOS` definidas.
2. Configura las URL de las APIs externas en las funciones `validarDocumento` y `enviarDatosApi`.

## Uso

Para iniciar el bot, ejecuta el siguiente comando:

```bash
node index.js
```

El bot iniciará un portal web para escanear el código QR y conectarse a WhatsApp.

## Flujo de Conversación

1. El bot inicia el proceso de registro cuando recibe el comando "registro".
2. Solicita la siguiente información en orden:
   - Nombres
   - Apellidos
   - Género (opción múltiple)
   - Edad (con validación de rango 18-100)
   - Departamento (lista dinámica)
   - Municipio (lista filtrada según el departamento seleccionado)
3. Después de cada entrada, el bot valida la información proporcionada.
4. El usuario puede cancelar el proceso en cualquier momento escribiendo "cancelar".
5. Se implementa un sistema de temporizadores para manejar la inactividad del usuario.
6. Al finalizar, el bot presenta un resumen de la información recopilada.

## Características Técnicas

- Utiliza un adaptador de base de datos mock para pruebas.
- Implementa un sistema de temporizadores para manejar la inactividad del usuario.
- Tiene la capacidad de validar documentos y enviar datos a una API externa (URLs pendientes de configuración).

## Desarrollo

El código está estructurado en flujos conversacionales utilizando la librería `@bot-whatsapp/bot`. Cada paso del proceso de registro está definido como un flujo separado para mayor modularidad.

## Contribución

Las contribuciones son bienvenidas. Por favor, abre un issue para discutir cambios mayores antes de crear un pull request.

