const fs = require('fs');

const vendorsData = [
  {
    name: 'MATEO',
    displayName: 'Mateo',
    hoy1ras: [
      { hora: '11:00', empresa: 'El Club de la Milanesa', contacto: 'nstratico@elclubdelamilanesa.com', tipo: '<span class="badge b-blue">1ra reunión</span>', obj: 'Cadena gastronómica.' }
    ],
    hoySeg: [],
    acum1ras: [
      { fecha: '01/04', emp: 'Burger King', det: 'Evaluación Múltiples locales' },
      { fecha: '07/04', emp: 'Sushi Club', det: 'Franquicias' },
      { fecha: '16/04', emp: 'Magazzino', det: 'Gastronómica/retail.' },
      { fecha: '16/04', emp: 'Dagma', det: 'Cervecería Rabieta + casino.' },
      { fecha: '16/04', emp: 'VM Nova', det: 'Alianza estratégica.' },
      { fecha: '17/04', emp: 'UCA Contabilidad', det: 'Demo formal.' },
      { fecha: '21/04', emp: 'Sushi Club (Franquicias)', det: 'Presencial - 1ra reunión.' }
    ],
    acumSeg: [
      { fecha: '08/04', emp: 'Pizza a la Pala', det: 'CERRADO / WON' },
      { fecha: '14/04', emp: 'Rapsodia / Grupo Alas', det: 'Cotización.' }
    ],
    resumen: { p: 1, s: 0, t: 1 },
    mes: { p: 8, s: 3, t: 11, ten: '1 Deal Won + NDA Activo' }
  },
  {
    name: 'VANESSA',
    displayName: 'Vanessa',
    hoy1ras: [
      { hora: '11:00', empresa: 'Demo Loysa', contacto: 'rafael.loyet@loysa.com.uy', tipo: '<span class="badge b-blue">1ra reunión</span>', obj: 'Prospect Uruguay confirmado.' }
    ],
    hoySeg: [
      { hora: 'Tentativo', empresa: 'Glic — Propuesta técnica', contacto: 'marialaura@glicglobal.com', tipo: '<span class="badge b-purple">Reunión técnica</span>', obj: 'Propuesta discriminada para 5–6 conectores marketplaces LATAM.' }
    ],
    acum1ras: [
      { fecha: '09/04', emp: 'Glic', det: 'Marketplace dropshipping.' },
      { fecha: '10/04', emp: 'Doniral', det: 'Conciliación cobros.' },
      { fecha: '10/04', emp: 'Epicentro', det: 'Módulos cash.' },
      { fecha: '13/04', emp: 'Domenico Santucci', det: 'Demo.' }
    ],
    acumSeg: [
      { fecha: '16/04', emp: 'Glic — Def. técnica', det: 'Reunión técnica 2.' },
      { fecha: '22/04', emp: 'Domenico Santucci', det: '2da reunión.' }
    ],
    resumen: { p: 1, s: 1, t: 2 },
    mes: { p: 5, s: 2, t: 7, ten: 'Pipeline UY activo' }
  },
  {
    name: 'HERNÁN',
    displayName: 'Hernán',
    hoy1ras: [],
    hoySeg: [],
    acum1ras: [
      { fecha: '03/04', emp: 'Farmacia del Pueblo', det: 'Demo inicial.' },
      { fecha: '20/04', emp: 'Hasar × Supermax', det: '1ra reunión fabricante.' }
    ],
    acumSeg: [
      { fecha: '14/04', emp: 'Grido Franquicias', det: 'Cotización.' },
      { fecha: '15/04', emp: 'Farmacia del Pueblo', det: 'Seguimiento.' },
      { fecha: '15/04', emp: 'Mutual Rivadavia', det: 'CERRADO / WON $800K.' }
    ],
    resumen: { p: 0, s: 0, t: 0 },
    mes: { p: 9, s: 4, t: 13, ten: '1 Deal Won ($800K)' }
  },
  {
    name: 'OMAR',
    displayName: 'Omar',
    hoy1ras: [],
    hoySeg: [],
    acum1ras: [
      { fecha: '16/04', emp: 'Tienda Inglesa (UY)', det: 'Eval técnica.' },
      { fecha: '16/04', emp: 'Guillermo Bettoni', det: 'Contacto estratégico.' }
    ],
    acumSeg: [
      { fecha: '20/04', emp: 'Congreso Intendentes', det: 'Presencial SUCIVE.' },
      { fecha: '22/04', emp: 'Tienda Inglesa (UY)', det: 'Seguimiento.' }
    ],
    resumen: { p: 0, s: 0, t: 0 },
    mes: { p: 3, s: 2, t: 5, ten: 'Foco Alianzas' }
  },
  {
    name: 'LUCÍA',
    displayName: 'Lucía',
    hoy1ras: [],
    hoySeg: [],
    acum1ras: [
      { fecha: '02/04', emp: 'Acodike', det: 'Revisión legal.' }
    ],
    acumSeg: [
      { fecha: '20/04', emp: 'Enjoy / Baluma', det: 'Propuesta presentada.' },
      { fecha: '21/04', emp: 'Must Consulting', det: 'Capacitación.' }
    ],
    resumen: { p: 0, s: 0, t: 0 },
    mes: { p: 2, s: 2, t: 4, ten: 'Cierre Acodike inminente' }
  },
  {
    name: 'EMILIANA',
    displayName: 'Emiliana',
    hoy1ras: [],
    hoySeg: [],
    acum1ras: [
      { fecha: '21/04', emp: 'Addnice', det: '1ra reunión.' },
      { fecha: '21/04', emp: 'Class Express', det: '1ra reunión.' },
      { fecha: '21/04', emp: 'Rapanui', det: '1ra reunión.' },
      { fecha: '22/04', emp: 'Citykids', det: '1ra reunión.' },
      { fecha: '22/04', emp: 'Equus', det: '1ra reunión.' }
    ],
    acumSeg: [],
    resumen: { p: 0, s: 0, t: 0 },
    mes: { p: 5, s: 0, t: 5, ten: 'Nuevo pipeline' }
  },
  {
    name: 'LUCIANO',
    displayName: 'Luciano',
    hoy1ras: [],
    hoySeg: [],
    acum1ras: [
      { fecha: '20/04', emp: 'Grupo Fava', det: '1ra reunión.' },
      { fecha: '21/04', emp: 'Club Atlético Talleres', det: '1ra reunión.' },
      { fecha: '21/04', emp: 'Oversoft', det: '1ra reunión.' }
    ],
    acumSeg: [
      { fecha: '22/04', emp: 'Grupo Fava', det: '2da reunión.' }
    ],
    resumen: { p: 0, s: 0, t: 0 },
    mes: { p: 3, s: 1, t: 4, ten: 'Nuevo pipeline' }
  },
  {
    name: 'FEDERICO · PABLO ARCE',
    displayName: 'Federico & Pablo Arce',
    hoy1ras: [],
    hoySeg: [],
    acum1ras: [
      { fecha: '16/04', emp: 'Wellvet (Pablo)', det: 'Demo.' },
      { fecha: '21/04', emp: 'Remoda S.R.L. (Federico)', det: '1ra reunión.' }
    ],
    acumSeg: [],
    resumen: { p: 0, s: 0, t: 0 },
    mes: { p: 2, s: 0, t: 2, ten: 'Prospectando' }
  },
  {
    name: 'PABLO ILLICH',
    displayName: 'Pablo Illich',
    hoy1ras: [],
    hoySeg: [],
    acum1ras: [],
    acumSeg: [],
    resumen: { p: 0, s: 0, t: 0 },
    mes: { p: 0, s: 0, t: 0, ten: 'Onboarding / Sin calls' }
  }
];

function buildTable1ra(arr) {
  if (arr.length === 0) return '<p style="color:#777;font-size:10pt;margin:10px 0;">— Sin primeras reuniones agendadas hoy —</p>';
  let html = `<table style="margin-top:10px;"><thead><tr><th>Hora</th><th>Empresa</th><th>Contacto</th><th>Tipo</th><th>Objetivo</th></tr></thead><tbody>`;
  arr.forEach(a => {
    html += `<tr><td><strong>${a.hora}</strong></td><td><strong>${a.empresa}</strong></td><td>${a.contacto}</td><td>${a.tipo}</td><td>${a.obj}</td></tr>`;
  });
  html += `</tbody></table>`;
  return html;
}

function buildTableSeg(arr) {
  if (arr.length === 0) return '<p style="color:#777;font-size:10pt;margin:10px 0;">— Sin seguimientos agendados hoy —</p>';
  let html = `<table style="margin-top:10px;"><thead><tr><th>Hora</th><th>Empresa</th><th>Contacto</th><th>Tipo</th><th>Objetivo</th></tr></thead><tbody>`;
  arr.forEach(a => {
    html += `<tr><td><strong>${a.hora}</strong></td><td><strong>${a.empresa}</strong></td><td>${a.contacto}</td><td>${a.tipo}</td><td>${a.obj}</td></tr>`;
  });
  html += `</tbody></table>`;
  return html;
}

function buildTableAcum(arr, color) {
  if (arr.length === 0) return '';
  let html = `<table style="margin-top:10px;"><thead><tr><th>Fecha</th><th>Empresa</th><th>Detalle</th></tr></thead><tbody>`;
  arr.forEach(a => {
    html += `<tr><td>${a.fecha}</td><td><strong>${a.emp}</strong></td><td>${a.det}</td></tr>`;
  });
  html += `</tbody></table>`;
  return html;
}

function buildVendor(v) {
  let html = `<div class="section">\n<div class="section-title">👤 ${v.displayName}</div>\n\n`;
  
  html += `<div class="subsec-label subsec-hoy" style="background:#eef2ff; color:#1565c0; padding:8px; font-weight:700; border-left:4px solid #1565c0; margin-top:15px;">📅 Reuniones de HOY (Primeras reuniones)</div>`;
  html += buildTable1ra(v.hoy1ras);

  html += `<div class="subsec-label subsec-seg" style="background:#fff4ed; color:#c4320a; padding:8px; font-weight:700; border-left:4px solid #c4320a; margin-top:15px;">↩ Seguimientos de HOY (Segundas reuniones)</div>`;
  html += buildTableSeg(v.hoySeg);

  html += `<div class="subsec-label" style="background:#f8f9fb; color:#3d4451; padding:8px; font-weight:700; border-left:4px solid #6c7585; margin-top:15px;">📊 Resumen del Día</div>`;
  html += `<ul style="margin: 10px 20px; font-size:11pt;">
    <li>Primeras reuniones hoy: <strong>${v.resumen.p}</strong></li>
    <li>Segundas reuniones hoy: <strong>${v.resumen.s}</strong></li>
    <li>Total reuniones hoy: <strong style="color:#1565c0;">${v.resumen.t}</strong></li>
  </ul>`;

  html += `<div class="subsec-label" style="background:#f4f3ff; color:#5925dc; padding:8px; font-weight:700; border-left:4px solid #5925dc; margin-top:15px;">📈 Acumulado del Mes (Detalle)</div>`;
  html += `<ul style="margin: 10px 20px; font-size:11pt;">
    <li>Total 1ras reuniones del mes: <strong>${v.mes.p}</strong></li>
    <li>Total seguimientos del mes: <strong>${v.mes.s}</strong></li>
    <li>Total reuniones: <strong>${v.mes.t}</strong></li>
    <li>Tendencia: <strong>${v.mes.ten}</strong></li>
  </ul>`;
  
  if (v.acum1ras.length > 0) {
    html += `<p style="margin-top:10px; font-weight:bold; font-size:10pt;">Detalle Historial Primeras Reuniones:</p>`;
    html += buildTableAcum(v.acum1ras);
  }
  if (v.acumSeg.length > 0) {
    html += `<p style="margin-top:10px; font-weight:bold; font-size:10pt;">Detalle Historial Seguimientos:</p>`;
    html += buildTableAcum(v.acumSeg);
  }

  html += `</div>\n\n`;
  return html;
}

let fileContent = fs.readFileSync('reporte-nubceo-abril-2026.html', 'utf8');

// Get the markers
let startIdx = fileContent.indexOf('<!-- HERNÁN -->');
let endIdx = fileContent.indexOf('<!-- PIPELINE ACTIVO -->');

if (startIdx !== -1 && endIdx !== -1) {
  let newHtml = fileContent.substring(0, startIdx);
  
  vendorsData.forEach(v => {
    newHtml += `<!-- ${v.name} -->\n` + buildVendor(v);
  });
  
  newHtml += fileContent.substring(endIdx);
  
  fs.writeFileSync('reporte-nubceo-abril-2026.html', newHtml);
  console.log('Successfully rebuilt with tables and proper organization!');
} else {
  console.log('Markers not found!');
}
