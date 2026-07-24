# Títulos animados para OBS

Panel Node y sitio estático para diseñar títulos, previsualizarlos y enviarlos a
una fuente de navegador de OBS.

## Uso local

```bash
npm start
```

- Panel: `http://localhost:3000/panel/`
- Visualizador OBS: `http://localhost:3000/visualizador/`

En OBS agrega una **Fuente de navegador** de 1920 × 1080 y usa la URL del
visualizador. El panel y el visualizador deben abrirse en el mismo perfil de
navegador para compartir el estado mediante almacenamiento local.

## Netlify

El repositorio incluye `netlify.toml`. Netlify ejecuta `npm run build` y publica
la carpeta `public`.

Las imágenes elegidas se procesan en el navegador y no se suben a un servidor.
El logo siempre usa `object-fit: contain`, limitado por el ancho y alto máximos
configurados, por lo que conserva su proporción y no se recorta.
