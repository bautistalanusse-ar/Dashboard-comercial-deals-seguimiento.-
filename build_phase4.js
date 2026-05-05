const fs = require('fs');
let html = fs.readFileSync('dashboard-live.html', 'utf8');

// 1. In MEETINGS, replace `v:'vendor'` with `vs:['vendor']`
html = html.replace(/v:'([^']+)'/g, "vs:['$1']");

// 2. Add Hernan's meeting on May 4th at 12:00
const hernanMeeting = \`  {d:'2026-05-04',t:'12:00',dur:60,co:'Reunión Hernán (A confirmar)',vs:['hernan'],tp:'primera',s:'Reunión Agendada',cnt:[],m:null,st:'active',ctx:'Agendada por solicitud. Pendiente contexto.',nx:'Calificar.'},\`;
html = html.replace(/\{d:'2026-05-04',t:'12:00',dur:60,co:'Club Atlético Talleres'/g, hernanMeeting + "\\n  {d:'2026-05-04',t:'12:00',dur:60,co:'Club Atlético Talleres'");

// Let's also add a test meeting with 2 vendors:
const twoVendorsMtg = \`  {d:'2026-05-04',t:'16:00',dur:60,co:'Reunión Multi-Comercial',vs:['hernan', 'mateo'],tp:'seguimiento',s:'Demo Compartida',cnt:[],m:null,st:'active',ctx:'Prueba de dos comerciales en la misma reunión.',nx:'Avanzar.'},\`;
html = html.replace(/\/\/ ── MAYO ──────────────────────────────────────────────/g, \`// ── MAYO ──────────────────────────────────────────────\\n\` + twoVendorsMtg);

// 3. Update all usages of m.v to m.vs

// Filter by vendor: `m.v === vf` -> `m.vs.includes(vf)`
html = html.replace(/m => m\.v === vf/g, "m => m.vs.includes(vf)");
html = html.replace(/m\.v === vf\.value/g, "m.vs.includes(vf.value)");

// chipHTML call: `chipHTML(m.v)` -> `m.vs.map(v => chipHTML(v)).join(' ')`
html = html.replace(/\$\{chipHTML\(m\.v\)\}/g, "\\${m.vs.map(v => chipHTML(v)).join(' ')}");
html = html.replace(/VN\(m\.v\)/g, "m.vs.map(v => VN(v)).join(' y ')");

// Tareas: `active.has(v)` -> `new Set(getMeetingsByDate(date).flatMap(m=>m.vs))`
html = html.replace(/const active=new Set\(getMeetingsByDate\(date\)\.map\(m=>m\.v\)\);/g, "const active=new Set(getMeetingsByDate(date).flatMap(m=>m.vs));");

// Period Bar: `vendors=new Set(validMs.map(m=>m.v)).size;` -> `vendors=new Set(validMs.flatMap(m=>m.vs)).size;`
html = html.replace(/new Set\(validMs\.map\(m=>m\.v\)\)/g, "new Set(validMs.flatMap(m=>m.vs))");

// Month view vendors:
html = html.replace(/const vendors=\[\.\.\.new Set\(ms\.map\(m=>m\.v\)\)\];/g, "const vendors=[...new Set(ms.flatMap(m=>m.vs))];");

// Ranking and Vendors stats loop:
html = html.replace(/meetings\.forEach\(m=>\{\n\s+if\(\!stats\[m\.v\]\) stats\[m\.v\]=\{primeras:0,seg:0,partner:0\};\n\s+if\(m\.tp==='primera'\) stats\[m\.v\]\.primeras\+\+;\n\s+else if\(m\.tp==='seguimiento'\) stats\[m\.v\]\.seg\+\+;\n\s+else if\(m\.tp==='partner'\) stats\[m\.v\]\.partner\+\+;\n\s+\}\);/g,
\`meetings.forEach(m=>{
    m.vs.forEach(v => {
      if(!stats[v]) stats[v]={primeras:0,seg:0,partner:0};
      if(m.tp==='primera') stats[v].primeras++;
      else if(m.tp==='seguimiento') stats[v].seg++;
      else if(m.tp==='partner') stats[v].partner++;
    });
  });\`);

// Ranking expand logic: `m.v===v.id` -> `m.vs.includes(v.id)`
html = html.replace(/meetings\.filter\(m=>m\.v===v\.id\)/g, "meetings.filter(m=>m.vs.includes(v.id))");

// 4. fetchCalendarData logic
html = html.replace(
\`      let vendorId = 'otro';
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
        v: vendorId,\`,
\`      let vendorIds = new Set();
      // Add organizer if nubceo
      if(ev.organizer && ev.organizer.email && ev.organizer.email.endsWith('@nubceo.com') && ev.organizer.email !== 'agenda.virtual@nubceo.com') {
         const oid = getVendorByEmail(ev.organizer.email);
         if(oid !== 'otro') vendorIds.add(oid);
      }
      // Add all attendees that are nubceo
      if(ev.attendees) {
         ev.attendees.forEach(a => {
            if(a.email && a.email.endsWith('@nubceo.com') && a.email !== 'agenda.virtual@nubceo.com') {
               const aid = getVendorByEmail(a.email);
               if(aid !== 'otro') vendorIds.add(aid);
            }
         });
      }
      
      if(vendorIds.size === 0) vendorIds.add('otro');
      
      let attendeesList = '';
      if(ev.attendees) {
          attendeesList = ev.attendees.filter(a => !a.email.endsWith('@nubceo.com')).map(a => a.email).join(', ');
      }

      return {
        d: st.toISOString().slice(0,10),
        t: st.toLocaleTimeString('es-AR', {hour:'2-digit',minute:'2-digit',hour12:false}),
        dur: Math.round((en - st) / 60000),
        vs: Array.from(vendorIds),\`
);


fs.writeFileSync('dashboard-live.html', html);
console.log("Phase 4 done");
