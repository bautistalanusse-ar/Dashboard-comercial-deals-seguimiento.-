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
const AGENDA_VIRTUAL = 'agenda.virtual@nubceo.com';
const MY_CALENDAR    = 'primary';

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
  const startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endDate   = new Date(now.getFullYear(), now.getMonth() + 2, 1);

  Logger.log('Sincronizando desde ' + startDate.toDateString() + ' hasta ' + endDate.toDateString());

  let pageToken = null;
  const allEvents = [];

  do {
    const opts = {
      timeMin:       startDate.toISOString(),
      timeMax:       endDate.toISOString(),
      singleEvents:  true,
      orderBy:       'startTime',
      maxResults:    2500,
      showDeleted:   true, // incluir canceladas
    };
    if (pageToken) opts.pageToken = pageToken;

    const resp = Calendar.Events.list(MY_CALENDAR, opts);
    (resp.items || []).forEach(e => allEvents.push(e));
    pageToken = resp.nextPageToken || null;
  } while (pageToken);

  Logger.log('Eventos encontrados (incl. cancelados): ' + allEvents.length);

  // Helpers
  function getAttendees(event) { return event.attendees || []; }

  function isCommercial(event) {
    const attendees = getAttendees(event);
    return attendees.some(a => (a.email || '').toLowerCase() === AGENDA_VIRTUAL);
  }

  function getExternals(event) {
    return getAttendees(event).filter(a => {
      const email = (a.email || '').toLowerCase();
      return !email.endsWith('@nubceo.com') && !SKIP_EMAILS.includes(email);
    });
  }

  function getVendors(event) {
    const ids = [];
    // Solo attendees — NO organizer (Bautista/Gonzalo crean reuniones ajenas)
    const emails = getAttendees(event).map(a => (a.email || '').toLowerCase());
    for (const email of emails) {
      const vid = VENDOR_EMAILS[email];
      if (vid && !ids.includes(vid)) ids.push(vid);
    }
    return ids;
  }

  function getCompanyKey(event) {
    const ext = getExternals(event);
    if (ext.length > 0) return ext[0].email.split('@')[1] || event.summary || '';
    return event.summary || '';
  }

  const TZ = 'America/Argentina/Buenos_Aires';

  // Separar canceladas y activas (ambas comerciales con fecha válida)
  const cancelled = [];
  const active    = [];

  for (const event of allEvents) {
    if (!event.start || !event.start.dateTime) continue;
    if (!isCommercial(event)) continue;

    const externals = getExternals(event);
    if (externals.length === 0) continue;

    const vendors = getVendors(event);
    if (vendors.length === 0) continue;

    if (event.status === 'cancelled') {
      cancelled.push(event);
    } else {
      active.push(event);
    }
  }

  // Mapa: companyKey → fecha de cancelación (para detectar reagendadas)
  // vendorId+companyKey → dateStr de la reunión cancelada
  const cancelledMap = {}; // `${vid}|${companyKey}` → dateStr

  for (const event of cancelled) {
    const vendors    = getVendors(event);
    const companyKey = getCompanyKey(event);
    const startDT    = new Date(event.start.dateTime);
    const dateStr    = Utilities.formatDate(startDT, TZ, 'yyyy-MM-dd');
    for (const vid of vendors) {
      const key = vid + '|' + companyKey;
      // Guardar la fecha más reciente de cancelación
      if (!cancelledMap[key] || cancelledMap[key] < dateStr) {
        cancelledMap[key] = dateStr;
      }
    }
  }

  const meetings       = [];
  const companyHistory = {}; // vendorId → Set<companyKey> para primera/seguimiento

  // Procesar activas en orden cronológico
  active.sort((a, b) => a.start.dateTime.localeCompare(b.start.dateTime));

  for (const event of active) {
    const attendees  = getAttendees(event);
    const externals  = getExternals(event);
    const vendors    = getVendors(event);
    const companyKey = getCompanyKey(event);

    const startDT = new Date(event.start.dateTime);
    const endDT   = new Date(event.end.dateTime);
    const dateStr = Utilities.formatDate(startDT, TZ, 'yyyy-MM-dd');
    const timeStr = Utilities.formatDate(startDT, TZ, 'HH:mm');
    const duration = Math.round((endDT - startDT) / 60000);

    // Meet link
    let meetCode = null;
    if (event.conferenceData && event.conferenceData.entryPoints) {
      for (const ep of event.conferenceData.entryPoints) {
        if (ep.entryPointType === 'video' && ep.uri) {
          const match = ep.uri.match(/meet\.google\.com\/([\w-]+)/);
          if (match) { meetCode = match[1]; break; }
        }
      }
    }

    // Estado: reagendada si esta empresa tuvo una cancelación previa con este vendedor
    let st = '';
    for (const vid of vendors) {
      const cancelKey = vid + '|' + companyKey;
      if (cancelledMap[cancelKey] && cancelledMap[cancelKey] < dateStr) {
        st = 'reagendada';
        break;
      }
    }

    // primera vs seguimiento (ignorando reagendadas — son continuación del mismo cliente)
    let tipo = 'primera';
    for (const vid of vendors) {
      if (companyHistory[vid] && companyHistory[vid].has(companyKey)) {
        tipo = 'seguimiento';
        break;
      }
    }
    for (const vid of vendors) {
      if (!companyHistory[vid]) companyHistory[vid] = new Set();
      companyHistory[vid].add(companyKey);
    }

    meetings.push([
      dateStr,
      timeStr,
      duration,
      event.summary || 'Sin título',
      JSON.stringify(vendors),
      tipo,
      event.summary || '',
      JSON.stringify(externals.map(a => a.email)),
      meetCode || '',
      '',   // ctx
      st,   // cancelled / reagendada / ''
    ]);
  }

  // Agregar canceladas al final (para que el dashboard las muestre tachadas)
  for (const event of cancelled) {
    const externals  = getExternals(event);
    const vendors    = getVendors(event);
    const companyKey = getCompanyKey(event);

    const startDT = new Date(event.start.dateTime);
    const endDT   = event.end && event.end.dateTime ? new Date(event.end.dateTime) : startDT;
    const dateStr = Utilities.formatDate(startDT, TZ, 'yyyy-MM-dd');
    const timeStr = Utilities.formatDate(startDT, TZ, 'HH:mm');
    const duration = Math.round((endDT - startDT) / 60000) || 60;

    // Solo incluir canceladas que NO fueron reagendadas (para no duplicar)
    let wasRescheduled = false;
    for (const vid of vendors) {
      const cancelKey = vid + '|' + companyKey;
      if (cancelledMap[cancelKey]) {
        // Ver si hay una activa posterior
        const hasActive = meetings.some(m => {
          const mvs = JSON.parse(m[4] || '[]');
          return mvs.includes(vid) && m[0] > dateStr &&
            (m[3] || '').toLowerCase().includes(companyKey.split('.')[0]);
        });
        if (hasActive) { wasRescheduled = true; break; }
      }
    }

    meetings.push([
      dateStr,
      timeStr,
      duration,
      event.summary || 'Sin título',
      JSON.stringify(vendors),
      'primera',
      event.summary || '',
      JSON.stringify(externals.map(a => a.email)),
      '',
      '',
      wasRescheduled ? 'reagendada' : 'cancelled',
    ]);
  }

  // Ordenar todo por fecha y hora
  meetings.sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]));

  // Escribir en el Sheet
  const ss    = SpreadsheetApp.openById(SHEET_ID);
  let   sheet = ss.getSheetByName('meetings');
  if (!sheet) sheet = ss.insertSheet('meetings');

  sheet.clearContents();
  const headers = ['d','t','dur','co','vs','tp','s','cnt','m','ctx','st'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  if (meetings.length > 0) {
    sheet.getRange(2, 1, meetings.length, headers.length).setValues(meetings);
  }

  let meta = ss.getSheetByName('meta');
  if (!meta) meta = ss.insertSheet('meta');
  meta.getRange('A1').setValue(new Date().toISOString());
  meta.getRange('B1').setValue(meetings.length);

  Logger.log('✓ Sync completado: ' + meetings.length + ' reuniones (' + cancelled.length + ' canceladas)');
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
    if (!m.m)   delete m.m;
    if (!m.st)  delete m.st;
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
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));

  ScriptApp.newTrigger('syncMeetings')
    .timeBased()
    .everyHours(1)
    .create();

  Logger.log('✓ Trigger horario creado.');
  Logger.log('Corriendo sync inicial...');
  syncMeetings();
  Logger.log('✓ Listo. Ahora deployar como Web App.');
}
