# Gestor de Citas Medicas - Frontend

Este repositorio contiene el frontend del sistema de citas medicas. Dicho de forma sencilla: esta es la parte visual, la pantalla que usa el usuario para registrarse, iniciar sesion, ver medicos, agendar citas y consultar su historial.

El frontend esta hecho con React. Se comunica con el backend usando Axios, y el backend se encarga de hablar con MySQL.

## Que Hace Este Frontend

El frontend es la cara del sistema.

Desde aqui el usuario puede:

- Registrarse.
- Iniciar sesion.
- Ver medicos disponibles.
- Agendar una cita.
- Ver sus propias citas.
- Filtrar citas por medico, fecha o paciente.
- Cancelar citas.
- Cerrar sesion.

La idea general es esta:

```text
Usuario -> Frontend React -> Backend Express -> MySQL
```

El frontend no guarda los datos importantes en la base. Solo los muestra y envia peticiones al backend.

## Tecnologias Usadas

- React: construye la interfaz.
- Axios: permite enviar peticiones HTTP al backend.
- CSS: da estilo a la aplicacion.
- localStorage: guarda temporalmente la sesion del usuario en el navegador.
- Nginx: sirve la aplicacion cuando se usa Docker.
- Docker: permite empaquetar el frontend como contenedor.

## Requisitos Previos

Para correrlo sin Docker necesitas:

- Node.js.
- npm.
- Backend corriendo en `http://localhost:5000`.
- MySQL activo por medio de XAMPP o Docker, segun el modo que estes usando.

## Estructura Del Frontend

```text
Frontend-main/
  public/
    index.html
    favicon.ico
    manifest.json
    robots.txt
  src/
    App.js
    App.css
    index.js
    index.css
  package.json
  Dockerfile
  nginx.conf
  .dockerignore
```

### `src/index.js`

Es el punto de entrada de React. Su trabajo es montar la aplicacion en el HTML principal.

Normalmente no necesitas tocarlo mucho.

### `src/App.js`

Este es el archivo mas importante del frontend. Aqui esta casi toda la logica visual del sistema.

Maneja estados como:

```js
usuarioActivo
medicos
historial
seleccionado
formulario
filtros
modal
```

En palabras humanas:

- `usuarioActivo`: guarda quien inicio sesion.
- `medicos`: lista de medicos traida desde el backend.
- `historial`: citas del usuario actual.
- `seleccionado`: medico elegido para agendar.
- `formulario`: datos que el usuario escribe para crear cita.
- `filtros`: filtros usados en la tabla de citas.
- `modal`: mensajes de exito o error.

### URL Del Backend

El frontend usa esta linea:

```js
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
```

Eso significa:

- Si existe `REACT_APP_API_URL`, usa esa URL.
- Si no existe, usa `http://localhost:5000/api`.

Esto permite que funcione localmente y tambien en Docker.

## Como Funciona El Registro

Cuando el usuario se registra, el frontend envia datos al backend:

```js
axios.post(`${API_URL}/auth/registro`, datos)
```

Los datos incluyen:

```js
usuario
password
cedula
```

El backend decide si se puede registrar o si el usuario/cedula ya existe.

## Como Funciona El Inicio De Sesion

Cuando el usuario inicia sesion, el frontend envia:

```js
axios.post(`${API_URL}/auth/login`, datos)
```

Si el backend responde bien, se guarda la sesion en `localStorage`:

```js
localStorage.setItem('usuarioCitas', JSON.stringify(res.data.usuario));
```

Esto permite que si recargas la pagina, el frontend recuerde el usuario activo.

Importante: esto es una sesion basica para proyecto academico. En un sistema profesional se usarian tokens, expiracion y validacion desde backend.

## Como Funciona La Consulta De Medicos

Cuando hay usuario activo, el frontend pide los medicos:

```js
axios.get(`${API_URL}/medicos`)
```

El backend responde con la lista y React la muestra en tarjetas.

## Como Funciona El Historial De Citas

Ahora el historial se consulta por usuario:

```js
axios.get(`${API_URL}/citas/historial/${usuarioActivo.id}`)
```

Esto es importante porque evita que una cuenta vea citas de otra cuenta.

Antes el sistema podia mostrar todas las citas juntas. Ahora cada usuario ve solo las suyas.

## Como Funciona Agendar Una Cita

Cuando el usuario agenda una cita, el frontend manda:

```js
const nuevaCita = {
  nombre_paciente: formulario.nombre,
  id_medico: seleccionado.id,
  id_usuario: usuarioActivo.id,
  fecha: formulario.fecha,
  hora: formulario.hora
};
```

Luego envia:

```js
axios.post(`${API_URL}/citas/agendar`, nuevaCita)
```

El backend revisa si el medico ya tiene una cita en esa fecha y hora. Si ya esta ocupado, devuelve error. Si esta libre, guarda la cita.

## Como Funciona Cancelar Una Cita

Para cancelar, el frontend manda el id de la cita y tambien el id del usuario:

```js
axios.delete(`${API_URL}/citas/${id}`, {
  data: { id_usuario: usuarioActivo.id }
})
```

Esto permite que el backend valide que esa cita pertenece al usuario que esta intentando borrarla.

## Instalacion Del Frontend

Desde PowerShell:

```powershell
cd C:\Users\SKAIRLER\Documents\Codex\2026-05-05\gestor-citas-medicas\frontend_zip\Frontend-main
npm install
```

## Ejecucion Del Frontend

Primero asegurese de tener el backend corriendo en:

```text
http://localhost:5000
```

Luego ejecutar:

```powershell
npm start
```

La aplicacion normalmente abre en:

```text
http://localhost:3000
```

Si el puerto 3000 esta ocupado, React puede preguntar si quieres usar otro puerto. Puedes responder `yes`, pero lo ideal es cerrar el proceso que ocupa el 3000.

## Uso Con Docker

El frontend tiene un `Dockerfile` que hace dos cosas:

1. Usa Node.js para construir la aplicacion React.
2. Usa Nginx para servir la version final.

La version Docker no usa `npm start`. En Docker se usa una version compilada con:

```bash
npm run build
```

Luego Nginx entrega los archivos finales al navegador.

## Explicacion De Seguridad Del Frontend

El frontend ayuda con algunas cosas, pero la seguridad real debe estar en el backend.

### 1. No Muestra Citas De Otros Usuarios

El frontend pide el historial usando el id del usuario activo. Eso mejora la privacidad visual.

Pero la validacion importante tambien esta en backend, porque el frontend puede manipularse desde el navegador.

### 2. Guarda Una Sesion Basica

El usuario se guarda en `localStorage`.

Esto sirve para mantener la sesion mientras se usa la app, pero no es seguridad fuerte. En una app real se usaria JWT o sesiones en servidor.

### 3. Valida Cedula En La Interfaz

El frontend limpia la cedula para aceptar solo numeros y maximo 10 digitos.

Aun asi, el backend tambien valida la cedula. Eso es correcto, porque nunca se debe confiar solo en el frontend.

### 4. Maneja Mensajes De Error

Cuando el backend devuelve error, el frontend muestra un modal claro. Esto ayuda al usuario, pero no reemplaza las validaciones del backend.

## Donde Tocar Si Quieres Cambiar Algo

Si quieres cambiar textos, botones o formularios:

```text
src/App.js
```

Si quieres cambiar colores, tamanos, tarjetas o distribucion visual:

```text
src/App.css
src/index.css
```

Si quieres cambiar la URL del backend:

```text
src/App.js
```

Busca:

```js
API_URL
```

Si quieres cambiar imagenes, favicon o archivos publicos:

```text
public/
```

Si quieres cambiar como se sirve en Docker:

```text
Dockerfile
nginx.conf
```

## Guia De Ramas Git

Actualmente este repo trabaja sobre la rama:

```text
develop
```

Una rama es una linea de trabajo separada. Piensalo asi:

- `main`: version principal o estable.
- `develop`: version donde se hacen mejoras antes de pasarlas a main.
- una rama nueva: un espacio para probar un cambio sin ensuciar develop.

Ejemplo:

```powershell
git checkout -b mejora-login
```

Eso crea una rama llamada `mejora-login` y te mueve a ella.

## Comandos Git Utiles Para Este Proyecto

Ver en que rama estas:

```powershell
git branch
```

Ver cambios pendientes:

```powershell
git status
```

Ver que cambiaste dentro de los archivos:

```powershell
git diff
```

Traer cambios desde GitHub:

```powershell
git pull origin develop
```

Preparar archivos para commit:

```powershell
git add .
```

Preparar solo un archivo:

```powershell
git add src/App.js
```

Crear commit:

```powershell
git commit -m "Describe el cambio"
```

Subir cambios a GitHub:

```powershell
git push origin develop
```

Crear una rama nueva:

```powershell
git checkout -b nombre-de-la-rama
```

Cambiar a develop:

```powershell
git checkout develop
```

Ver historial de commits:

```powershell
git log --oneline
```

Descartar cambios de un archivo especifico:

```powershell
git restore src/App.js
```

Ver remotos configurados:

```powershell
git remote -v
```

## Flujo Recomendado Para Hacer Cambios

1. Entrar al repo.
2. Asegurarte de estar en `develop`.
3. Traer lo ultimo de GitHub.
4. Hacer cambios.
5. Probar la app.
6. Revisar `git status`.
7. Hacer commit.
8. Subir a GitHub.

Comandos:

```powershell
git checkout develop
git pull origin develop
# hacer cambios
git status
git add .
git commit -m "Explica que cambiaste"
git push origin develop
```
