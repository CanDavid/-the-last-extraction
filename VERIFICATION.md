# Verificación realizada

Entorno: Node 24, Chromium headless de Playwright, compilación estática Vite, URL `http://localhost:4173/the-last-extraction/`. No se desplegó en GitHub.

- `npm test`: 15 pruebas, todas correctas. Rutas ortogonales y bloqueos; PA; daño, alcance y visión; munición agotada y machete; investigación del ruido; refuerzos; rescate, seguimiento y extracción; muerte de escolta y sustitución; bloqueo en fase enemiga; clasificación de abandonados; recompensas idempotentes; muerte permanente y reclutamiento de emergencia; roundtrip IndexedDB y JSON; archivos inválidos sin pérdida; accesibilidad de civiles y extracción en los tres mapas.
- Una prueba recorre la misión inicial completa desde el estado inicial con decisiones automáticas legales, IA y oleadas activas, hasta victoria y recompensa. No sustituye pruebas de equilibrio con personas.
- `npm run build`: TypeScript estricto y producción en `dist/`, sin errores.
- `npm run verify:browser`, con preview activo: inicia partida, confirma un movimiento mediante toque emulado sobre canvas, termina turno, lee el guardado real de IndexedDB, descarga exportación, rechaza JSON incompatible y conserva progreso. Desconecta red, recarga la URL del proyecto y continúa el turno guardado con Phaser funcional.
- Navegador: vistas 1280×800, 844×390, 1024×768 y aviso de giro 390×844. Capturas locales en `test-results/` (no versionadas). Sin errores JavaScript en el recorrido.
- Actualización: la prueba sustituye temporalmente el identificador de la caché del SW en dist, solicita actualización y comprueba que se difiere durante misión; importa un estado de refugio válido, aplica actualización y verifica turno y campaña conservados en IndexedDB. Restaura el SW original al terminar.

## Comprobaciones manuales pendientes

Safari real e instalación en iPhone/iPad; Android físico; límites de memoria, suspensión y borrado por presión de almacenamiento; zonas seguras reales; audio en esos dispositivos; tacto y legibilidad a distintos tamaños; equilibrio y duración con jugadores; despliegue final sobre GitHub Pages. La instalación no se ha probado en hardware físico y no se promete almacenamiento compartido entre Safari y aplicación de inicio.

Los cambios de versión incompatibles se rechazan, no hay migración de versiones históricas porque este proyecto parte vacío. Movimiento y efectos son gráficos sencillos, no una colección de animaciones elaboradas. No hay sincronización automática.
