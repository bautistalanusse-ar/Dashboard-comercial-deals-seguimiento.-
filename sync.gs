// ═══════════════════════════════════════════════════════════════════
// NUBCEO — Sync Calendar → Google Sheets → Dashboard
// ─ Ejecutar como: bautista.lanusse@nubceo.com
// ─ Requiere: Servicios avanzados > Google Calendar API (v3)
// ═══════════════════════════════════════════════════════════════════

const SHEET_ID       = 'TU_SHEET_ID_AQUI'; // ← pegar ID del Google Sheet
const AGENDA_VIRTUAL = 'agenda.virtual@nubceo.com';
const MY_CALENDAR    = 'primary';

// Directores: aparecen en reuniones ajenas como soporte — no se atribuyen si hay otro vendor
const DIRECTOR_IDS = ['bautista', 'gonzalo'];

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
      showDeleted:   true,
    };
    if (pageToken) opts.pageToken = pageToken;

    const resp = Calendar.Events.list(MY_CALENDAR, opts);
    (resp.items || []).forEach(e => allEvents.push(e));
    pageToken = resp.nextPageToken || null;
  } while (pageToken);

  Logger.log('Eventos encontrados (incl. cancelados): ' + allEvents.length);

  function getAttendees(event) { return event.attendees || []; }

  function isCommercial(event) {
    return getAttendees(event).some(a => (a.email || '').toLowerCase() === AGENDA_VIRTUAL);
  }

  function getExternals(event) {
    return getAttendees(event).filter(a => {
      const email = (a.email || '').toLowerCase();
      return !email.endsWith('@nubceo.com') && !SKIP_EMAILS.includes(email);
    });
  }

  function getVendors(event) {
    // Incluir attendees + organizer si el organizer NO es director
    // (ej: Luciano crea reunión presencial sin invitar al cliente → Luciano está solo como organizer)
    const attendeeEmails = getAttendees(event).map(a => (a.email || '').toLowerCase());
    const allEmails = [...attendeeEmails];

    const organizerEmail = event.organizer ? (event.organizer.email || '').toLowerCase() : null;
    if (organizerEmail) {
      const orgVid = VENDOR_EMAILS[organizerEmail];
      // Agregar el organizer si es vendor, no es director, y no está ya en attendees
      if (orgVid && !DIRECTOR_IDS.includes(orgVid) && !allEmails.includes(organizerEmail)) {
        allEmails.push(organizerEmail);
      }
    }

    const ids = [];
    for (const email of allEmails) {
      const vid = VENDOR_EMAILS[email];
      if (vid && !ids.includes(vid)) ids.push(vid);
    }

    // Si hay vendors "reales" (no directores), excluir directores
    const nonDirectors = ids.filter(v => !DIRECTOR_IDS.includes(v));
    return nonDirectors.length > 0 ? nonDirectors : ids;
  }

  function getCompanyKey(event) {
    const ext = getExternals(event);
    if (ext.length > 0) return ext[0].email.split('@')[1] || event.summary || '';
    // Presencial sin attendee externo: usar título del evento
    return (event.summary || '').toLowerCase().replace(/nubceo[\s\-\/|]*/gi, '').trim() || event.id;
  }

  const TZ = 'America/Argentina/Buenos_Aires';

  const cancelled = [];
  const active    = [];

  for (const event of allEvents) {
    if (!event.start || !event.start.dateTime) continue;
    if (!isCommercial(event)) continue;

    const vendors = getVendors(event);
    if (vendors.length === 0) continue;

    // Incluir aunque no haya externos si hay location (presencial sin invitado)
    const externals = getExternals(event);
    if (externals.length === 0 && !event.location) continue;

    if (event.status === 'cancelled') {
      cancelled.push(event);
    } else {
      active.push(event);
    }
  }

  Logger.log('Activas: ' + active.length + ' | Canceladas: ' + cancelled.length);

  // Mapa de cancelaciones: vendorId|companyKey → dateStr
  const cancelledMap = {};
  for (const event of cancelled) {
    const vendors    = getVendors(event);
    const companyKey = getCompanyKey(event);
    const startDT    = new Date(event.start.dateTime);
    const dateStr    = Utilities.formatDate(startDT, TZ, 'yyyy-MM-dd');
    for (const vid of vendors) {
      const key = vid + '|' + companyKey;
      if (!cancelledMap[key] || cancelledMap[key] < dateStr) cancelledMap[key] = dateStr;
    }
  }

  const meetings       = [];
  const companyHistory = {};

  active.sort((a, b) => a.start.dateTime.localeCompare(b.start.dateTime));

  for (const event of active) {
    const externals  = getExternals(event);
    const vendors    = getVendors(event);
    const companyKey = getCompanyKey(event);

    const startDT  = new Date(event.start.dateTime);
    const endDT    = new Date(event.end.dateTime);
    const dateStr  = Utilities.formatDate(startDT, TZ, 'yyyy-MM-dd');
    const timeStr  = Utilities.formatDate(startDT, TZ, 'HH:mm');
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
    // También desde conferenceUrl directo
    if (!meetCode && event.conferenceUrl) {
      const match = event.conferenceUrl.match(/meet\.google\.com\/([\w-]+)/);
      if (match) meetCode = match[1];
    }

    // Reagendada si hubo una cancelación previa de este cliente con este vendor
    let st = '';
    for (const vid of vendors) {
      const cancelKey = vid + '|' + companyKey;
      if (cancelledMap[cancelKey] && cancelledMap[cancelKey] < dateStr) {
        st = 'reagendada';
        break;
      }
    }

    // primera vs seguimiento
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
      dateStr, timeStr, duration,
      event.summary || 'Sin título',
      JSON.stringify(vendors),
      tipo,
      event.summary || '',
      JSON.stringify(externals.map(a => a.email)),
      meetCode || '',
      '',   // ctx — el dashboard enriquece desde static
      st,
    ]);
  }

  // Agregar canceladas
  for (const event of cancelled) {
    const externals  = getExternals(event);
    const vendors    = getVendors(event);
    const companyKey = getCompanyKey(event);

    const startDT  = new Date(event.start.dateTime);
    const endDT    = event.end && event.end.dateTime ? new Date(event.end.dateTime) : startDT;
    const dateStr  = Utilities.formatDate(startDT, TZ, 'yyyy-MM-dd');
    const timeStr  = Utilities.formatDate(startDT, TZ, 'HH:mm');
    const duration = Math.round((endDT - startDT) / 60000) || 60;

    // Si fue reagendada (hay una activa del mismo cliente posterior), marcar como tal
    let wasRescheduled = false;
    for (const vid of vendors) {
      const hasActive = meetings.some(m => {
        const mvs = JSON.parse(m[4] || '[]');
        return mvs.includes(vid) && m[0] > dateStr &&
          getCompanyKey(event) === m[10]; // mismo companyKey aproximado
      });
      if (hasActive) { wasRescheduled = true; break; }
    }

    meetings.push([
      dateStr, timeStr, duration,
      event.summary || 'Sin título',
      JSON.stringify(vendors),
      'primera',
      event.summary || '',
      JSON.stringify(externals.map(a => a.email)),
      '', '',
      wasRescheduled ? 'reagendada' : 'cancelled',
    ]);
  }

  meetings.sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]));

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

// ─── WEB APP ──────────────────────────────────────────────────────────────────

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

// ─── CONFIGURACIÓN ────────────────────────────────────────────────────────────

function setupTrigger() {
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('syncMeetings').timeBased().everyHours(1).create();
  Logger.log('✓ Trigger horario creado.');
  syncMeetings();
  Logger.log('✓ Listo.');
}
