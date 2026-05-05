# Instructivo: Conectar Dashboard con Google Calendar API

## Paso 1 — Google Cloud Console (una sola vez, 10 min)

1. Ir a https://console.cloud.google.com
2. Crear proyecto → nombre: "Nubceo Dashboard"
3. Menú izquierdo → "APIs y servicios" → "Biblioteca"
4. Buscar "Google Calendar API" → Habilitar
5. Menú → "APIs y servicios" → "Credenciales" → "Crear credencial" → "ID de cliente OAuth 2.0"
6. Tipo: **Aplicación web**
7. Nombre: "Dashboard Comercial"
8. Orígenes JS autorizados: agregar `http://localhost` y `file://`
9. Copiar el **Client ID** generado (formato: `xxxx.apps.googleusercontent.com`)
10. Pegarlo en el dashboard donde dice `REEMPLAZA_CON_TU_CLIENT_ID`

## Paso 2 — Compartir el calendario agenda.virtual

1. Abrir Google Calendar con la cuenta `agenda.virtual@nubceo.com`
2. En la lista de calendarios (izquierda) → click en los 3 puntitos del calendario principal
3. "Configuración y uso compartido"
4. Sección "Compartir con personas específicas" → Agregar cada email del equipo (@nubceo.com) con permiso "Ver todos los detalles"
5. Alternativamente: si todos son del mismo Workspace, habilitar "Ver todos los detalles" para toda la organización

## Paso 3 — Emails exactos de cada vendedor

Confirmar los emails reales para que el sistema los detecte automáticamente:

| Vendedor | Email @nubceo.com (completar) |
|----------|-------------------------------|
| Luciano R. | luciano.rodriguez@nubceo.com |
| Vanessa A. | vanessa.aguilar@nubceo.com |
| Mateo L. | mateo.lissarrague@nubceo.com |
| Hernán P. | hernan.pelosi@nubceo.com |
| Lucía P. | lucia.??? |
| Emiliana G. | emiliana.gomezgiza@nubceo.com |
| Federico S. | federico.???@nubceo.com |
| Pablo Arce | pablo.arce@nubceo.com |
| Pablo Illich | pablo.illich@nubceo.com |
| Omar B. | omar.???@nubceo.com |
| Bautista | bautista.???@nubceo.com |

## Resultado final

Con el Client ID configurado:
- Cada vendedor entra → hace login con su cuenta Google @nubceo.com
- El sistema lee las reuniones en vivo desde el calendario agenda.virtual
- Los admins ven todo el equipo; los vendedores ven su agenda destacada
- Botón "Unirse" activo cuando la reunión está en curso
