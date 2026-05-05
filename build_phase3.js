const fs = require('fs');
let html = fs.readFileSync('dashboard-live.html', 'utf8');

// 1. Add 'st' to MEETINGS
html = html.replace(/m:null,ctx:/g, "st:'active',m:null,ctx:");
html = html.replace(/m:'https:\/\/meet\.google\.com\/([^']+)',ctx:/g, "st:'active',m:'https://meet.google.com/$1',ctx:");

// Fix specifically SIXT
html = html.replace(/co:'SIXT Uruguay',v:'pablo_illich',tp:'seguimiento',s:'Avance propuesta SIXT',cnt:\['facundo\.lopez@sixt\.com\.uy','vmoran@carone\.com\.uy'\],st:'active'/g,
"co:'SIXT Uruguay',v:'pablo_illich',tp:'seguimiento',s:'Avance propuesta SIXT',cnt:['facundo.lopez@sixt.com.uy','vmoran@carone.com.uy'],st:'cancelled'");

// Also Fravega as rescheduled (optional, let's keep it active but add logic)
html = html.replace(/co:'Fravega',v:'mateo',tp:'primera',s:'Contacto Nubceo \/ Fravega',cnt:\['lujan\.furrere@fravega\.com\.ar','paola\.fotia@fravega\.com\.ar'\],st:'active'/g,
"co:'Fravega',v:'mateo',tp:'primera',s:'Contacto Nubceo / Fravega',cnt:['lujan.furrere@fravega.com.ar','paola.fotia@fravega.com.ar'],st:'rescheduled'");


// 2. badgeHTML updates
html = html.replace(
\`function badgeHTML(tp){
  if(tp==='primera')    return '<span class=\"bdg primera\">✦ 1ra reunión</span>';
  if(tp==='seguimiento')return '<span class=\"bdg seguimiento\">↩ Seguimiento</span>';
  if(tp==='partner')    return '<span class=\"bdg partner\">🤝 Partnership</span>';
  return '';
}\`,
\`function badgeHTML(tp, st){
  let b = '';
  if(tp==='primera')    b = '<span class=\"bdg primera\">✦ 1ra reunión</span>';
  else if(tp==='seguimiento') b = '<span class=\"bdg seguimiento\">↩ Seguimiento</span>';
  else if(tp==='partner')    b = '<span class=\"bdg partner\">🤝 Partnership</span>';
  
  if(st==='cancelled') return b + ' <span class=\"bdg cancel\">❌ CANCELADA</span>';
  if(st==='rescheduled') return b + ' <span class=\"bdg resched\">🔄 REPROGRAMADA</span>';
  return b;
}\`);

// 3. Update meetingHTML to pass st and grey out cancelled
html = html.replace(/<div class="mr \$\{m\.tp\}\$\{active\?' now':''\}" id="mr\$\{idx\}" onclick="tog\(\$\{idx\}\)">/g,
\`<div class="mr \${m.tp}\${active?' now':''}\${m.st==='cancelled'?' cancelled':''}" id="mr\${idx}" onclick="tog(\${idx})" style="\${m.st==='cancelled'?'opacity:0.6;border-left-color:#ccc;':''}">\`);

html = html.replace(/<div class="mr-right">\$\{badgeHTML\(m\.tp\)\}<\/div>/g,
\`<div class="mr-right">\${badgeHTML(m.tp, m.st||'active')}</div>\`);

// 4. Update renderDia to filter by vendor
html = html.replace(
\`function renderDia(date){\`,
\`function renderDia(date){
  const vf = document.getElementById('vendorFilterDia').value;
  let meetings=getMeetingsByDate(date);
  if(vf !== 'todos') meetings = meetings.filter(m => m.v === vf);
\`);
html = html.replace(/const meetings=getMeetingsByDate\(date\);/g, '');

// 5. Update renderSemana to filter by vendor
html = html.replace(
\`function renderSemana(anyDate){\`,
\`function renderSemana(anyDate){
  const vf = document.getElementById('vendorFilterSem').value;
\`);
html = html.replace(/const meetings=getMeetingsByDate\(date\);/g, 
\`let meetings=getMeetingsByDate(date);
    if(vf !== 'todos') meetings = meetings.filter(m => m.v === vf);
\`);

// 6. Add population of select boxes inside updatePeriodBar so they update
html = html.replace(
\`function updatePeriodBar(date){\`,
\`function updatePeriodBar(date){
  // populate selects if empty
  const vdia = document.getElementById('vendorFilterDia');
  const vsem = document.getElementById('vendorFilterSem');
  if(vdia.options.length <= 1) {
    const opts = Object.keys(VENDORS).map(v => \\\`<option value="\\\${v}">\\\${VENDORS[v].name}</option>\\\`).join('');
    vdia.innerHTML += opts;
    vsem.innerHTML += opts;
  }
\`);

// exclude cancelled from KPIs in period bar
html = html.replace(
\`  const p=ms.filter(m=>m.tp==='primera').length;
  const s=ms.filter(m=>m.tp==='seguimiento').length;
  const x=ms.filter(m=>m.tp==='partner').length;\`,
\`  const validMs = ms.filter(m=>m.st!=='cancelled');
  const p=validMs.filter(m=>m.tp==='primera').length;
  const s=validMs.filter(m=>m.tp==='seguimiento').length;
  const x=validMs.filter(m=>m.tp==='partner').length;\`);
html = html.replace(/\$\{ms\.length\}/g, \`\${validMs.length}\`);
html = html.replace(/const vendors=new Set\(ms\.map\(m=>m\.v\)\)\.size;/g, \`const vendors=new Set(validMs.map(m=>m.v)).size;\`);


// exclude cancelled from ranking
html = html.replace(
\`function renderRanking(ym){
  const meetings=getMeetingsByMonth(ym);\`,
\`function renderRanking(ym){
  const meetings=getMeetingsByMonth(ym).filter(m=>m.st!=='cancelled');\`);

// make Ranking use rankingMesSel
html = html.replace(
\`if(t==='ranking') renderRanking(ym);\`,
\`if(t==='ranking') renderRanking(document.getElementById('rankingMesSel').value);\`
);

// Event listeners for vendor filters
html = html.replace(
\`// DATE LISTENERS\`,
\`// DATE LISTENERS
document.getElementById('vendorFilterDia').addEventListener('change', function(){ renderDia(document.getElementById('dpDia').value); });
document.getElementById('vendorFilterSem').addEventListener('change', function(){ renderSemana(document.getElementById('dpSem').value); });
document.getElementById('rankingMesSel').addEventListener('change', function(){ renderRanking(this.value); });

document.getElementById('btnCopyAgenda').addEventListener('click', function(){
  const date = document.getElementById('dpDia').value;
  const vf = document.getElementById('vendorFilterDia').value;
  let meetings = getMeetingsByDate(date);
  if(vf !== 'todos') meetings = meetings.filter(m => m.v === vf);
  
  let text = "📅 *Agenda Comercial Nubceo - " + fmtDate(date) + "*\\n\\n";
  if(meetings.length===0) text += "No hay reuniones programadas.";
  else {
    meetings.forEach(m => {
       const status = m.st==='cancelled'?'❌ [CANCELADA] ':m.st==='rescheduled'?'🔄 [REPROGRAMADA] ':'';
       text += "⏰ *" + m.t + " hs* - " + m.co + " (" + (m.tp==='primera'?'1ra reunión':m.tp) + ")\\n";
       text += status + "👤 Vendedor: " + VN(m.v) + "\\n";
       if(m.m) text += "🔗 Meet: " + m.m + "\\n";
       text += "\\n";
    });
  }
  navigator.clipboard.writeText(text).then(()=>alert("Agenda copiada al portapapeles! Listo para mandar por WhatsApp o Slack."));
});
\`);

// classifyMeetingLive add status logic
html = html.replace(
\`        tp: classifyMeetingLive(ev.summary || ''),
        n: ev.summary || 'Sin título',
        ctx: (attendeesList ? 'Contactos: ' + attendeesList + '<br>' : '') + (ev.description || ''),\`,
\`        tp: classifyMeetingLive(ev.summary || ''),
        st: (ev.status==='cancelled' || /cancelad/i.test(ev.summary)) ? 'cancelled' : (/reprogramad/i.test(ev.summary)) ? 'rescheduled' : 'active',
        n: ev.summary || 'Sin título',
        ctx: (attendeesList ? 'Contactos: ' + attendeesList + '<br>' : '') + (ev.description || ''),\`
);

fs.writeFileSync('dashboard-live.html', html);
console.log('Fase 3 completed');
"
