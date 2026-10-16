# Batalla Espacial Matemática — multijugador en línea

Proyecto Node.js + Socket.IO. Hasta 5 participantes por sala, preguntas simultáneas, 25 rondas y 5 niveles, puntuación en vivo, sonidos y escudos.

## Prueba local

1. Instala Node.js 18 o posterior.
2. Ejecuta `npm install` y `npm start` en esta carpeta.
3. Abre `http://localhost:3000`.

## Publicar en internet

Sube esta carpeta a GitHub y crea un servicio web Node.js en un proveedor que admita WebSockets (por ejemplo Render). Configura comando de instalación `npm install`, comando de inicio `npm start`, y usa la URL HTTPS pública proporcionada. Los alumnos abren esa misma URL en sus celulares, ingresan nombre y código de sala.

**Nota:** Las salas y puntos se guardan en memoria; se pierden si el servidor se reinicia. El anfitrión debe permanecer conectado. Esta versión no incluye cuentas ni base de datos y es apropiada para una partida de aula pequeña.
