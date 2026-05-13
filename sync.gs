const SHEET_ID       = 'TU_SHEET_ID_AQUI';
const AGENDA_VIRTUAL = 'agenda.virtual@nubceo.com';
const MY_CALENDAR    = 'primary';

// Directores: si ELLOS crean la reunion aparecen primero + vendor sumado
// Si otro vendor crea y los invita, son soporte y no se les atribuye
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

function syncMeetings() {
  const now       = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endDate   = new Date(now.getFullYear(), now.getMonth() + 2, 1);

  Logger.log('Sincronizando desde ' + startDate.toDateString() + ' hasta ' + endDate.toDateString());

  let pageToken = null;
  const allEvents = [];

  do {
    const opts = {
      timeMin:      startDate.toISOString(),
      timeMax:      endDate.toISOString(),
      singleEvents: true,
      orderBy:      'startTime',
      maxResults:   2500,
      showDeleted:  true,
    };
    if (pageToken) opts.pageToken = pageToken;

    const resp = Calendar.Events.list(MY_CALENDAR, opts);
    (resp.items || []).forEach(e => allEvents.push(e));
    pageToken = resp.nextPageToken || null;
  } while (pageToken);

  Logger.log('Eventos encontrados (incl. cancelados): ' + allEvents.length);

  function getAttendees(ev) { return ev.attendees || []; }

  function isCommercial(ev) {
    return getAttendees(ev).some(a => (a.email || '').toLowerCase() === AGENDA_VIRTUAL);
  }

  function getExternals(ev) {
    return getAttendees(ev).filter(a => {
      const email = (a.email || '').toLowerCase();
      return !email.endsWith('@nubceo.com') && !SKIP_EMAILS.includes(email);
    });
  }

  function getVendors(ev) {
    const attendeeEmails = getAttendees(ev).map(a => (a.email || '').toLowerCase());
    const organizerEmail = ev.organizer ? (ev.organizer.email || '').toLowerCase() : null;
    const organizerVid   = organizerEmail ? VENDOR_EMAILS[organizerEmail] : null;
    const orgIsDirector  = !!(organizerVid && DIRECTOR_IDS.includes(organizerVid));

    // Si el organizer es vendor no-director y no esta como attendee, incluirlo
    // (ej: Luciano crea reunion presencial sin invitar al cliente externo)
    const allEmails = [...attendeeEmails];
    if (organizerEmail && organizerVid && !orgIsDirector && !allEmails.includes(organizerEmail)) {
      allEmails.push(organizerEmail);
    }

    const allIds = [];
    for (const email of allEmails) {
      const vid = VENDOR_EMAILS[email];
      if (vid && !allIds.includes(vid)) allIds.push(vid);
    }

    if (orgIsDirector) {
      const nonDirectors = allIds.filter(v => !DIRECTOR_IDS.includes(v));
      if (nonDirectors.length > 0) {
        // Director creo + hay vendor real: aparece en ambos (director primero)
        return [organizerVid, ...nonDirectors];
      } else {
        // Solo directores en la reunion: solo el organizador
        return [organizerVid];
      }
    } else {
      // Vendor creo la reunion: bautista/gonzalo son soporte, no se les atribuye
      const nonDirectors = allIds.filter(v => !DIRECTOR_IDS.includes(v));
      return nonDirectors.length > 0 ? nonDirectors : allIds;
    }
  }

  function getCompanyKey(ev) {
    const ext = getExternals(ev);
    if (ext.length > 0) return ext[0].email.split('@')[1] || ev.summary || '';
    return (ev.summary || '').toLowerCase().replace(/nubceo[\s\-\/|]*/gi, '').trim() || ev.id;
  }

  const TZ        = 'America/Argentina/Buenos_Aires';
  const cancelled = [];
  const active    = [];

  for (const ev of allEvents) {
    if (!ev.start || !ev.start.dateTime) continue;
    if (!isCommercial(ev)) continue;
    if (getVendors(ev).length === 0) continue;
    const externals = getExternals(ev);
    if (externals.length === 0 && !ev.location) continue;

    if (ev.status === 'cancelled') {
      cancelled.push(ev);
    } else {
      active.push(ev);
    }
  }

  Logger.log('Activas: ' + active.length + ' | Canceladas: ' + cancelled.length);

  // Mapa de cancelaciones por vendor+empresa para detectar reagendadas
  const cancelledMap = {};
  for (const ev of cancelled) {
    const vendors    = getVendors(ev);
    const companyKey = getCompanyKey(ev);
    const startDT    = new Date(ev.start.dateTime);
    const dateStr    = Utilities.formatDate(startDT, TZ, 'yyyy-MM-dd');
    for (const vid of vendors) {
      const key = vid + '|' + companyKey;
      if (!cancelledMap[key] || cancelledMap[key] < dateStr) cancelledMap[key] = dateStr;
    }
  }

  const meetings       = [];
  const companyHistory = {};

  active.sort((a, b) => a.start.dateTime.localeCompare(b.start.dateTime));

  for (const ev of active) {
    const externals  = getExternals(ev);
    const vendors    = getVendors(ev);
    const companyKey = getCompanyKey(ev);

    const startDT  = new Date(ev.start.dateTime);
    const endDT    = new Date(ev.end.dateTime);
    const dateStr  = Utilities.formatDate(startDT, TZ, 'yyyy-MM-dd');
    const timeStr  = Utilities.formatDate(startDT, TZ, 'HH:mm');
    const duration = Math.round((endDT - startDT) / 60000);

    let meetCode = null;
    if (ev.conferenceData && ev.conferenceData.entryPoints) {
      for (const ep of ev.conferenceData.entryPoints) {
        if (ep.entryPointType === 'video' && ep.uri) {
          const match = ep.uri.match(/meet\.google\.com\/([\w-]+)/);
          if (match) { meetCode = match[1]; break; }
        }
      }
    }
    if (!meetCode && ev.conferenceUrl) {
      const match = ev.conferenceUrl.match(/meet\.google\.com\/([\w-]+)/);
      if (match) meetCode = match[1];
    }

    // Reagendada si hay cancelacion previa de este cliente con este vendor
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
      ev.summary || 'Sin titulo',
      JSON.stringify(vendors),
      tipo,
      ev.summary || '',
      JSON.stringify(externals.map(a => a.email)),
      meetCode || '', '', st,
    ]);
  }

  // Incluir canceladas en el Sheet para que el dashboard las muestre tachadas
  for (const ev of cancelled) {
    const externals  = getExternals(ev);
    const vendors    = getVendors(ev);
    const companyKey = getCompanyKey(ev);

    const startDT  = new Date(ev.start.dateTime);
    const endDT    = ev.end && ev.end.dateTime ? new Date(ev.end.dateTime) : startDT;
    const dateStr  = Utilities.formatDate(startDT, TZ, 'yyyy-MM-dd');
    const timeStr  = Utilities.formatDate(startDT, TZ, 'HH:mm');
    const duration = Math.round((endDT - startDT) / 60000) || 60;

    let wasRescheduled = false;
    for (const vid of vendors) {
      const hasActive = meetings.some(m => {
        const mvs = JSON.parse(m[4] || '[]');
        return mvs.includes(vid) && m[0] > dateStr &&
          (m[3] || '').toLowerCase().includes(companyKey.split('.')[0]);
      });
      if (hasActive) { wasRescheduled = true; break; }
    }

    meetings.push([
      dateStr, timeStr, duration,
      ev.summary || 'Sin titulo',
      JSON.stringify(vendors),
      'primera',
      ev.summary || '',
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

  Logger.log('Sync completado: ' + meetings.length + ' reuniones (' + cancelled.length + ' canceladas)');
}

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

  const TZ2 = 'America/Argentina/Buenos_Aires';
  const meetings = data.slice(1).map(row => {
    const m = {};
    headers.forEach((h, i) => { m[h] = row[i]; });

    // Sheets convierte fechas a Date y tiempos a número decimal — normalizar
    if (m.d instanceof Date) {
      m.d = Utilities.formatDate(m.d, TZ2, 'yyyy-MM-dd');
    } else {
      m.d = String(m.d || '').slice(0, 10);
    }
    if (m.t instanceof Date) {
      m.t = Utilities.formatDate(m.t, TZ2, 'HH:mm');
    } else if (typeof m.t === 'number') {
      const mins = Math.round(m.t * 24 * 60);
      m.t = String(Math.floor(mins / 60)).padStart(2, '0') + ':' + String(mins % 60).padStart(2, '0');
    } else {
      m.t = String(m.t || '00:00').slice(0, 5);
    }

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

function setupTrigger() {
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('syncMeetings').timeBased().everyMinutes(15).create();
  Logger.log('Trigger horario creado.');
  syncMeetings();
  Logger.log('Listo.');
}
