// ═══════════════════════════════════════════════════════════════════
// NUBCEO — Sync Calendar → Google Sheets → Dashboard
// ─ Ejecutar como: bautista.lanusse@nubceo.com
// ─ Requiere: Servicios avanzados > Google Calendar API (v3)
//
// PASOS DE CONFIGURACIÓN:
//  1. Ir a script.google.com → Nuevo proyecto → Pegar este código
//  2. Nombre del proyecto: "Nubceo Sync"
//  3. Servicios (ícono +) → Google Calendar API → Agregar
//  4. Crear un Google Sheet en blanco → copiar su ID de la URL
//     (la parte entre /d/ y /edit)
//  5. Pegar el ID en SHEET_ID abajo
//  6. Ejecutar "setupTrigger" una vez (autorizar permisos cuando pida)
//  7. Implementar > Nueva implementación > Web App
//     - Ejecutar como: Yo (bautista.lanusse@nubceo.com)
//     - Quién puede acceder: Cualquier persona
//  8. Copiar la URL de implementación
//  9. Pegarla en APPS_SCRIPT_URL en el dashboard (index.html)
// ═══════════════════════════════════════════════════════════════════

const SHEET_ID       = 'TU_SHEET_ID_AQUI'; // ← pegar ID del Google Sheet
const AGENDA_VIRTUAL = 'agenda.virtual@nubceo.com'; // email del grupo (para filtrar attendees)
const MY_CALENDAR    = 'primary'; // leer desde el calendario de quien ejecuta el script

// Mapa email → id de vendedor (igual que en el dashboard)
const VENDOR_EMAILS = {
  'hernan.perez@nubceo.com':       'hernan',
  'mateo.lissarrague@nubceo.com':  'mateo',
  'luciano.rodriguez@nubceo.com':  'luciano',
  'lucia.pignata@nubceo.com':      'lucia',
  'omar.batalla@nubceo.com':       'omar',
  'vanessa.aguilar@nubceo.com':    'vanessa',
  'emiliana.gomezgiza@nubceo.com': 'emiliana',
  'federico.sabe@nubceo.com':      'federico',
  'pablo.arce@nubceo.com':         'pablo_arce',
  'pablo.illich@nubceo.com':       'pablo_illich',
  'bautista.lanusse@nubceo.com':   'bautista',
  'gc@nubceo.com':                 'gonzalo',
};

// Emails de Nubceo que NO son externos (ignorar para detectar clientes)
const SKIP_EMAILS = [
  'agenda.virtual@nubceo.com',
  'producto@nubceo.com',
  'clientes@nubceo.com',
  'direccioncomercial@nubceo.com',
  'implementacion@nubceo.com',
  'team.cx@nubceo.com',
  'controlpreventivo@nubceo.com',
  'dev.backend@nubceo.com',
  'dev.frontend@nubceo.com',
  'team.qa@nubceo.com',
  'funcionales@nubceo.com',
  'conectoruniversal@nubceo.com',
  'directores@nubceo.com',
];

// ─── SINCRONIZACIÓN PRINCIPAL ────────────────────────────────────────────────

function syncMeetings() {
  const now       = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);       // Mes anterior
  const endDate   = new Date(now.getFullYear(), now.getMonth() + 2, 1);       // Inicio mes siguiente+1

  Logger.log('Sincronizando desde ' + startDate.toDateString() + ' hasta ' + endDate.toDateString());

  // Usar Calendar API avanzado para obtener conferenceData (link de Meet)
  let pageToken = null;
  const allEvents = [];

  do {
    const opts = {
      timeMin:       startDate.toISOString(),
      timeMax:       endDate.toISOString(),
      singleEvents:  true,
      orderBy:       'startTime',
      maxResults:    2500,
    };
    if (pageToken) opts.pageToken = pageToken;

    const resp = Calendar.Events.list(MY_CALENDAR, opts);
    (resp.items || []).forEach(e => allEvents.push(e));
    pageToken = resp.nextPageToken || null;
  } while (pageToken);

  Logger.log('Eventos encontrados: ' + allEvents.length);

  const meetings        = [];
  const companyHistory  = {}; // vendorId → Set<companyKey> para detectar primera/seguimiento

  for (const event of allEvents) {
    // Saltar eventos de día completo o cancelados como instancia
    if (!event.start || !event.start.dateTime) continue;
    if (event.status === 'cancelled') continue;

    const attendees = event.attendees || [];

    // Solo procesar eventos donde agenda.virtual fue invitada (= reunión comercial)
    const hasAgendaVirtual = attendees.some(a =>
      (a.email || '').toLowerCase() === AGENDA_VIRTUAL
    );
    if (!hasAgendaVirtual) continue;

    // Detectar externos (fuera de @nubceo.com y no en lista de skip)
    const externalAttendees = attendees.filter(a => {
      const email = (a.email || '').toLowerCase();
      return !email.endsWith('@nubceo.com') && !SKIP_EMAILS.includes(email);
    });

    if (externalAttendees.length === 0) continue; // Reunión interna → saltar

    // Detectar vendedores en la reunión (solo attendees, no organizer — Bautista/Gonzalo crean reuniones ajenas)
    const vendorIds = [];
    const allEmails = attendees.map(a => (a.email || '').toLowerCase());

    for (const email of allEmails) {
      const vid = VENDOR_EMAILS[email];
      if (vid && !vendorIds.includes(vid)) vendorIds.push(vid);
    }

    if (vendorIds.length === 0) continue; // No se puede atribuir

    // Parsear fecha y hora en zona Argentina
    const TZ       = 'America/Argentina/Buenos_Aires';
    const startDT  = new Date(event.start.dateTime);
    const endDT    = new Date(event.end.dateTime);
    const dateStr  = Utilities.formatDate(startDT, TZ, 'yyyy-MM-dd');
    const timeStr  = Utilities.formatDate(startDT, TZ, 'HH:mm');
    const duration = Math.round((endDT - startDT) / 60000);

    // Extraer código de Meet desde conferenceData
    let meetCode = null;
    if (event.conferenceData && event.conferenceData.entryPoints) {
      for (const ep of event.conferenceData.entryPoints) {
        if (ep.entryPointType === 'video' && ep.uri) {
          const match = ep.uri.match(/meet\.google\.com\/([\w-]+)/);
          if (match) { meetCode = match[1]; break; }
        }
      }
    }

    // Clasificar primera vs seguimiento por dominio del cliente
    const companyKey = externalAttendees[0].email.split('@')[1] || event.summary;
    let tipo = 'primera';
    for (const vid of vendorIds) {
      if (companyHistory[vid] && companyHistory[vid].has(companyKey)) {
        tipo = 'seguimiento';
        break;
      }
    }
    for (const vid of vendorIds) {
      if (!companyHistory[vid]) companyHistory[vid] = new Set();
      companyHistory[vid].add(companyKey);
    }

    meetings.push([
      dateStr,
      timeStr,
      duration,
      event.summary || 'Sin título',          // co
      JSON.stringify(vendorIds),               // vs
      tipo,                                    // tp
      event.summary || '',                     // s
      JSON.stringify(externalAttendees.map(a => a.email)), // cnt
      meetCode || '',                          // m
      '',                                      // ctx (el dashboard enriquece desde static)
      '',                                      // st (cancelled/rescheduled)
    ]);
  }

  // Ordenar por fecha y hora
  meetings.sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]));

  // Escribir en el Sheet
  const ss      = SpreadsheetApp.openById(SHEET_ID);
  let   sheet   = ss.getSheetByName('meetings');
  if (!sheet) sheet = ss.insertSheet('meetings');

  sheet.clearContents();
  const headers = ['d','t','dur','co','vs','tp','s','cnt','m','ctx','st'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  if (meetings.length > 0) {
    sheet.getRange(2, 1, meetings.length, headers.length).setValues(meetings);
  }

  // Guardar timestamp
  let meta = ss.getSheetByName('meta');
  if (!meta) meta = ss.insertSheet('meta');
  meta.getRange('A1').setValue(new Date().toISOString());
  meta.getRange('B1').setValue(meetings.length);

  Logger.log('✓ Sync completado: ' + meetings.length + ' reuniones guardadas');
}

// ─── WEB APP — Sirve el JSON al dashboard ────────────────────────────────────

function doGet(e) {
  const ss       = SpreadsheetApp.openById(SHEET_ID);
  const sheet    = ss.getSheetByName('meetings');
  const meta     = ss.getSheetByName('meta');
  const lastSync = meta ? meta.getRange('A1').getValue() : null;

  if (!sheet || sheet.getLastRow() < 2) {
    return _json({ meetings: [], lastSync: lastSync || null, count: 0 });
  }

  const data    = sheet.getDataRange().getValues();
  const headers = data[0];

  const meetings = data.slice(1).map(row => {
    const m = {};
    headers.forEach((h, i) => { m[h] = row[i]; });

    try { m.vs  = JSON.parse(m.vs);  } catch(e2) { m.vs  = []; }
    try { m.cnt = JSON.parse(m.cnt); } catch(e2) { m.cnt = []; }

    m.dur = parseInt(m.dur) || 60;
    if (!m.m)  delete m.m;
    if (!m.st) delete m.st;
    if (!m.ctx) delete m.ctx;

    return m;
  });

  return _json({ meetings, lastSync: lastSync || null, count: meetings.length });
}

function _json(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ─── CONFIGURACIÓN — Ejecutar una sola vez ───────────────────────────────────

function setupTrigger() {
  // Borrar triggers existentes
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));

  // Trigger horario
  ScriptApp.newTrigger('syncMeetings')
    .timeBased()
    .everyHours(1)
    .create();

  Logger.log('✓ Trigger horario creado.');
  Logger.log('Corriendo sync inicial...');
  syncMeetings();
  Logger.log('✓ Listo. Ahora deployar como Web App.');
}
