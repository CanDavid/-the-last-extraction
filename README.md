# The Last Extraction
Juego táctico local en español, TypeScript + Phaser 3 + Vite. Tres operaciones urbanas diseñadas a mano, rescate, escoltas, munición, ruido, refuerzos, extracción, refugio y muerte permanente. Sin backend, cuentas, servicios de pago, analítica ni recursos externos en ejecución.

## Ejecutar
Requiere Node 22+ y npm.
```sh
npm ci
npm run dev
npm run check
npm test
npm run build
npm run preview
# En otra terminal, con preview activo:
npx playwright install chromium
npm run verify:browser
```
Desarrollo y producción usan `/the-last-extraction/`. Abrir la URL completa, por ejemplo `http://localhost:4173/the-last-extraction/`. `dist/` contiene todos los archivos estáticos. Para otro nombre de repositorio: `BASE_PATH=/nombre/ npm run build`. No hay rutas del navegador ni CDN.

## Jugar
Nueva partida abre la primera misión. Toca un personaje, una casilla y Confirmar. Casillas delineadas: alcanzables; ruta clara antes de mover. Cada movimiento (4 casillas, explorador 6), ataque, cura o rescate cuesta 1 de los 2 PA. Toca enemigo para ver daño, consumo y ruido. Soldado añade 1 de daño. Cambiar entre el arma elegida en el refugio y el machete no cuesta PA. El arma principal solo se cambia en el refugio. Escopeta de objetivo único; reserva común por arma, sin recargas. Médico cura 5 con botiquín a sí mismo o aliado adyacente.

Rescata adyacente; el civil sigue rutas libres sin gastar PA y escapa al pisar E. Una escolta muerta deja al civil esperando. Otro personaje puede asumirlo. Entra en E y pulsa Evacuar. Se advierte antes de evacuar al último y abandonar a humanos vivos. Victoria: al menos un civil y un personaje; victoria completa: todos los civiles y equipo superviviente. Terminar turno activa IA local. Infectados ven hasta 6 casillas con línea de visión, investigan el último ruido audible o esperan. Ruido dura el turno actual y siguiente. Oleadas cada 4 turnos, máximo 10 infectados activos.

## Campaña y supuestos
Cada civil aporta 8 suministros, 4 balas y 2 cartuchos. Completar una operación desbloquea la siguiente. El refugio cura automáticamente y permite elegir hasta tres personajes y equipo. Reclutas cuestan 6; si no queda nadie se proporciona uno gratis con munición mínima, evitando bloqueo. Todos los civiles pueden aportar sustitutos a través del reclutamiento genérico. Muertos y abandonados permanecen en la campaña, no vuelven a seleccionarse. Misiones repetibles de 5–10 minutos estimados, duración dependiente del jugador.

## Guardado y copia
IndexedDB separado de reglas. Autoguardado tras acciones completas; turno enemigo calculado desde copia y confirmado completo al final: si se cierra durante animación se retoma el último turno del jugador, sin ataques parciales ni recompensas duplicadas. Errores se muestran en pie. Exportar descarga JSON; importar valida antes de confirmar reemplazo. Exportación traslada partidas manualmente, sin sincronización. Borrar datos del navegador puede eliminar progreso. Safari y app instalada pueden usar almacenamientos distintos. Exporta regularmente. Formato versión 1: versiones desconocidas se rechazan, sin borrado automático.

## PWA, móvil y offline
Primer acceso requiere conexión y contexto seguro (HTTPS o localhost). Espera «LISTO PARA JUGAR SIN CONEXIÓN»: el service worker solo activa tras cachear todos los recursos de dist, con hash de versión. En iPhone/iPad: Safari → Compartir → Añadir a pantalla de inicio. Otros navegadores: menú Instalar/Añadir. No depende de aviso automático ni bloqueo de orientación. Girar a horizontal. Recursos locales y audio sintetizado tras interacción; botón de silencio. Pantallas táctiles y ratón usan los mismos controles.

Actualización queda esperando; se aplica desde el pie fuera de misión, después de guardar. Las cachés son por versión; no se modifica IndexedDB. No cerrar entre pulsar actualizar y recargar. Si el navegador elimina almacenamiento/caché por falta de espacio necesitará conexión de nuevo.

## Publicar en GitHub Pages (pendiente de autorización)
No se han creado repositorios remotos, subido cambios ni activado publicación. El directorio inicial estaba vacío y `.git` de la raíz era de solo lectura. Proyecto independiente en este directorio.
1. Autorizar la subida y crear un repositorio **público** llamado `the-last-extraction` para Pages gratuito con GitHub Free; no cambiar visibilidad de un repositorio existente automáticamente. Si debe ser privado y el plan no permite Pages, no hay publicación gratuita en esas condiciones.
2. Revisar si el destino tiene despliegue automático: advertir antes de subir este workflow y reconciliarlo. No había ninguno local.
3. Desde este directorio: `git init`, `git add .`, `git commit -m "Build The Last Extraction"`, `git branch -M main`, `git remote add origin https://github.com/USUARIO/the-last-extraction.git`, `git push -u origin main` (solo tras autorización).
4. En GitHub: Settings → Pages → Build and deployment → Source: **GitHub Actions**.
5. Actions → Build and deploy Pages → Run workflow → main. El flujo es manual deliberadamente: no publica al subir archivos. Ejecuta comprobaciones, pruebas y build, sube artefacto y despliega con acciones oficiales, permisos mínimos y concurrencia controlada.
6. Abrir `https://USUARIO.github.io/the-last-extraction/`. Esperar preparación offline. El workflow adapta la base al nombre real del repositorio.

## Recursos y estructura
`config.ts`: mapas y equilibrio; `rules.ts`: estado y reglas; `ai.ts`: IA; `navigation.ts`: BFS y visión; `scene.ts`: render Phaser; `main.ts`: interfaz; `persistence.ts`: IndexedDB/validación; `vite.config.ts`: generación SW; `public/`: manifiesto e iconos originales. No se usaron recursos de terceros (excepto librerías con licencias incluidas en npm). Sprites geométricos originales, paisaje CSS e iconos generados para este proyecto. Audio Web Audio original. Fuentes de sistema.

## Límites y verificaciones
Pruebas automatizadas de reglas y persistencia incluidas. Consultar VERIFICATION.md para resultados y pendientes reales. IA deliberadamente sencilla; no patrulla cuando no tiene estímulo. No hay árboles, construcción, multijugador ni sincronización. Gráficos sencillos; el movimiento se resuelve por acción y enemigos se muestran por pasos; no hay animaciones de sprites elaboradas. El equilibrio requiere pruebas con jugadores. No se ha probado Safari ni hardware físico: instalación, zonas seguras e interacción en esos dispositivos requieren comprobación manual.
