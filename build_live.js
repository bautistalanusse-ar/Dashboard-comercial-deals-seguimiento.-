const fs = require('fs');

let html;
try {
  html = fs.readFileSync('agenda-30-abril-2026.html', 'utf8');
} catch (e) {
  console.error("Error reading original file", e);
  process.exit(1);
}

// 1. Add Google scripts
html = html.replace('</title>', '</title>\n<script src="https://accounts.google.com/gsi/client" async defer></script>\n<script src="https://apis.google.com/js/api.js"></script>');

// 2. Add Login CSS
const loginCSS = `
/* LOGIN SCREEN */
#loginScreen{position:fixed;inset:0;background:linear-gradient(135deg,#0d1b4b 0%,#1a237e 60%,#3949ab 100%);display:flex;align-items:center;justify-content:center;z-index:9999;}
.lc{background:rgba(255,255,255,.08);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,.15);border-radius:20px;padding:48px 40px;max-width:380px;width:100%;text-align:center;}
.lc-brand{font-size:22pt;font-weight:900;color:#fff;letter-spacing:-1px;}
.lc-sub{font-size:10pt;color:rgba(255,255,255,.6);margin-bottom:28px;}
.client-input{width:100%;margin-bottom:20px;padding:9px 12px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.2);border-radius:8px;color:#fff;font-size:8.5pt;text-align:center;}
.client-input::placeholder{color:rgba(255,255,255,.4);}
.btn-demo{width:100%;margin-top:10px;padding:11px;background:transparent;border:1px solid rgba(255,255,255,.2);border-radius:10px;cursor:pointer;font-size:9pt;color:rgba(255,255,255,.55);transition:.15s;}
.btn-demo:hover{color:#fff;border-color:rgba(255,255,255,.4);}
#app.hidden{display:none!important;}
`;
html = html.replace('</style>', loginCSS + '\n</style>');

// 3. Add Login Screen HTML & App Wrapper
const loginHTML = `
<div id="loginScreen">
  <div class="lc">
    <div class="lc-brand">Nubceo Dashboard</div>
    <div class="lc-sub">Comercial & Tracking</div>
    <input type="text" id="clientIdInput" class="client-input" placeholder="Google Client ID (xxxx.apps.googleusercontent.com)" />
    <div id="g_id_onload" data-context="signin" data-ux_mode="popup" data-callback="handleCredentialResponse" data-auto_prompt="false"></div>
    <div class="g_id_signin" data-type="standard" data-shape="rectangular" data-theme="outline" data-text="signin_with" data-size="large" data-logo_alignment="left" style="margin: 0 auto; display: flex; justify-content: center; margin-top: 15px;"></div>
    <button class="btn-demo" onclick="enterDemoMode()">Continuar con datos offline (Demo)</button>
  </div>
</div>
<div id="app" class="hidden">
`;
html = html.replace('<body>', '<body>\n' + loginHTML);
html = html.replace('</body>', '</div>\n</body>'); // Close #app

// 4. Update Header Buttons
html = html.replace('<span style="font-size:7.5pt;opacity:.55;font-style:italic">💬 Pedile a Claude que actualice</span>',
'<button style="background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);border-radius:6px;color:#fff;padding:4px 10px;cursor:pointer;font-size:8pt;margin-right:10px;" onclick="syncCalendar()">🔄 Sync Google Calendar</button><span id="userName" style="font-size:8.5pt;margin-right:8px;font-weight:bold;"></span><button style="background:none;border:none;color:#aaa;cursor:pointer;font-size:7pt;" onclick="logout()">Salir</button>');

// 5. Update Javascript
html = html.replace('const MEETINGS=[', 'let MEETINGS=['); // Change const to let

// Add auth script at the bottom of the script tag
const authScript = `
// --- GOOGLE CALENDAR LIVE LOGIC ---
let tokenClient = null;
let access_token = null;

function initGAPI() {
  const cid = localStorage.getItem('nubceo_client_id');
  if(cid) {
    document.getElementById('clientIdInput').value = cid;
    document.getElementById('g_id_onload').setAttribute('data-client_id', cid);
  }
}
document.getElementById('clientIdInput').addEventListener('change', function() {
  localStorage.setItem('nubceo_client_id', this.value);
  document.getElementById('g_id_onload').setAttribute('data-client_id', this.value);
  location.reload();
});

function handleCredentialResponse(response) {
  const jwt = response.credential;
  const payload = JSON.parse(atob(jwt.split('.')[1]));
  document.getElementById('userName').textContent = payload.name;
  document.getElementById('loginScreen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  
  const cid = localStorage.getItem('nubceo_client_id');
  if(!cid) return alert("Falta el Client ID de Google");
  
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: cid,
    scope: 'https://www.googleapis.com/auth/calendar.readonly',
    callback: (tokenResponse) => {
      access_token = tokenResponse.access_token;
      fetchCalendarData();
    },
  });
  tokenClient.requestAccessToken();
}

function enterDemoMode() {
  document.getElementById('loginScreen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  // Keeps existing MEETINGS array as demo
}

function syncCalendar() {
  if(!tokenClient) return alert('No estás logueado con Google.');
  tokenClient.requestAccessToken();
}

function classifyMeetingLive(title) {
  const t = title.toLowerCase();
  if (/partner|alianza|sap|seidor|nodum|sucive/.test(t)) return 'partner';
  if (/cotizaci|propuesta|seguimiento|técnica|técnico|seg\\.|2da|reunion tecnica/.test(t)) return 'seguimiento';
  return 'primera';
}

function getVendorByEmail(email) {
  for(let id in VENDORS) {
    if(VENDORS[id].email && VENDORS[id].email.toLowerCase() === email.toLowerCase()) return id;
  }
  return 'otro';
}

function fetchCalendarData() {
  document.getElementById('periodTitle').textContent = "Sincronizando con Google Calendar...";
  const now = new Date();
  const timeMin = new Date(now.getFullYear(), now.getMonth(), 1).toISOString(); 
  const timeMax = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59).toISOString(); // current and next month
  
  fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin='+timeMin+'&timeMax='+timeMax+'&singleEvents=true&orderBy=startTime', {
    headers: { 'Authorization': 'Bearer ' + access_token }
  })
  .then(res => res.json())
  .then(data => {
    if(data.error) throw new Error(data.error.message);
    
    MEETINGS = data.items.map(ev => {
      if(!ev.start || !ev.start.dateTime) return null;
      const st = new Date(ev.start.dateTime);
      const en = new Date(ev.end.dateTime);
      
      let vendorId = 'otro';
      if(ev.organizer && ev.organizer.email !== 'agenda.virtual@nubceo.com') {
        vendorId = getVendorByEmail(ev.organizer.email);
      } else if (ev.attendees) {
        const nubceoAtt = ev.attendees.find(a => a.email.endsWith('@nubceo.com') && a.email !== 'agenda.virtual@nubceo.com');
        if(nubceoAtt) vendorId = getVendorByEmail(nubceoAtt.email);
      }
      
      let attendeesList = '';
      if(ev.attendees) {
          attendeesList = ev.attendees.filter(a => !a.email.endsWith('@nubceo.com')).map(a => a.email).join(', ');
      }

      return {
        d: st.toISOString().slice(0,10),
        t: st.toLocaleTimeString('es-AR', {hour:'2-digit',minute:'2-digit',hour12:false}),
        dur: Math.round((en - st) / 60000),
        v: vendorId,
        tp: classifyMeetingLive(ev.summary || ''),
        n: ev.summary || 'Sin título',
        ctx: (attendeesList ? 'Contactos: ' + attendeesList + '<br>' : '') + (ev.description || ''),
        nx: 'Actualizar CRM',
        meet: ev.hangoutLink || null
      };
    }).filter(m => m !== null);
    
    // Re-render
    const d = document.getElementById('dpDia').value;
    updatePeriodBar(d);
    setView(curView);
    setTab(curTab);
  })
  .catch(err => {
    console.error(err);
    document.getElementById('periodTitle').textContent = "Error de conexión API";
    alert("Error de API: " + err.message);
  });
}

function logout() {
  localStorage.removeItem('nubceo_client_id');
  location.reload();
}

// Inicializar GAPI al cargar
initGAPI();
`;

html = html.replace('// INIT', authScript + '\n// INIT');

// Fix rendering to include Meet link and support meet property if it exists
html = html.replace(
  '<div class="ctx"><div class="cl">Contexto e invitados</div>${m.ctx}</div>',
  '<div class="ctx"><div class="cl">Contexto e invitados</div>${m.ctx}</div>${m.meet ? `<a href="${m.meet}" target="_blank" class="ml" style="margin-top:10px;">📹 Unirse al Meet</a>` : \'\'}'
);

fs.writeFileSync('dashboard-live.html', html);
console.log('Successfully injected logic into dashboard-live.html');
