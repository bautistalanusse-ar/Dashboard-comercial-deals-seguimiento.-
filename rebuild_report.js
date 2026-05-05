const fs = require('fs');

const html = fs.readFileSync('reporte-nubceo-abril-2026.html', 'utf8');

// We want to replace each vendor block with the new format.
// The vendors are: Hernán, Mateo, Omar, Vanessa, Lucía, Emiliana, Luciano, Federico, Pablo Arce, Pablo Illich.

const vendors = [
  {
    name: 'Mateo',
    hoy1ra: ['11:00 - El Club de la Milanesa (Cadena gastronómica)'],
    hoySeg: [],
    acum1ra: 8,
    acumSeg: 3,
    tendencia: 'Excelente (23.7% de meta)'
  },
  {
    name: 'Vanessa',
    hoy1ra: ['11:00 - Demo Loysa (Prospect Uruguay)'],
    hoySeg: ['Tentativo - Glic (Propuesta técnica)'],
    acum1ra: 5,
    acumSeg: 2,
    tendencia: 'Pipeline activo'
  },
  {
    name: 'Hernán',
    hoy1ra: [],
    hoySeg: [],
    acum1ra: 9,
    acumSeg: 4,
    tendencia: 'Excelente (13.3% de meta)'
  },
  {
    name: 'Omar',
    hoy1ra: [],
    hoySeg: [],
    acum1ra: 3,
    acumSeg: 2, // Tienda Inglesa etc.
    tendencia: 'Alianzas activas'
  },
  {
    name: 'Lucía',
    hoy1ra: [],
    hoySeg: [],
    acum1ra: 2,
    acumSeg: 1,
    tendencia: 'Cierre próximo (Acodike)'
  },
  {
    name: 'Emiliana',
    hoy1ra: [],
    hoySeg: [],
    acum1ra: 5, // Rapanui, Addnice, Class Express, Citykids, Equus
    acumSeg: 0,
    tendencia: 'Arrancó muy bien'
  },
  {
    name: 'Luciano',
    hoy1ra: [],
    hoySeg: [],
    acum1ra: 3,
    acumSeg: 1, // Grupo Fava
    tendencia: 'Arrancó 20/04'
  },
  {
    name: 'Federico',
    hoy1ra: [],
    hoySeg: [],
    acum1ra: 1,
    acumSeg: 0,
    tendencia: 'En desarrollo'
  },
  {
    name: 'Pablo Arce',
    hoy1ra: [],
    hoySeg: [],
    acum1ra: 1,
    acumSeg: 0,
    tendencia: 'En desarrollo'
  },
  {
    name: 'Pablo Illich',
    hoy1ra: [],
    hoySeg: [],
    acum1ra: 0,
    acumSeg: 0,
    tendencia: 'Prospectando'
  }
];

function buildVendorHTML(v) {
  let h = `<div class="section">\n  <div class="section-title">👤 ${v.name}</div>\n\n`;
  
  h += `  <p style="margin-top:10px; font-weight:700; color:#1565c0;">Reuniones de hoy (primeras reuniones):</p>\n`;
  if (v.hoy1ra.length > 0) {
    h += `  <ul style="margin-left: 20px; margin-top: 4px; margin-bottom: 12px; font-size: 8.5pt; color: #444;">\n`;
    v.hoy1ra.forEach(r => { h += `    <li style="margin-bottom: 4px;">${r}</li>\n`; });
    h += `  </ul>\n`;
  } else {
    h += `  <ul style="margin-left: 20px; margin-top: 4px; margin-bottom: 12px; font-size: 8.5pt; color: #777;"><li>No hay primeras reuniones hoy</li></ul>\n`;
  }

  h += `  <p style="margin-top:10px; font-weight:700; color:#e65100;">Reuniones de seguimiento (segundas reuniones):</p>\n`;
  if (v.hoySeg.length > 0) {
    h += `  <ul style="margin-left: 20px; margin-top: 4px; margin-bottom: 12px; font-size: 8.5pt; color: #444;">\n`;
    v.hoySeg.forEach(r => { h += `    <li style="margin-bottom: 4px;">${r}</li>\n`; });
    h += `  </ul>\n`;
  } else {
    h += `  <ul style="margin-left: 20px; margin-top: 4px; margin-bottom: 12px; font-size: 8.5pt; color: #777;"><li>No hay seguimientos hoy</li></ul>\n`;
  }

  let totalHoy = v.hoy1ra.length + v.hoySeg.length;
  h += `  <p style="margin-top:10px; font-weight:700; color:#2e7d32;">Resumen del día:</p>\n`;
  h += `  <ul style="margin-left: 20px; margin-top: 4px; margin-bottom: 12px; font-size: 8.5pt; color: #444;">\n`;
  h += `    <li>Cantidad de primeras reuniones: ${v.hoy1ra.length}</li>\n`;
  h += `    <li>Cantidad de segundas reuniones: ${v.hoySeg.length}</li>\n`;
  h += `    <li><strong>Total de reuniones del día: ${totalHoy}</strong></li>\n`;
  h += `  </ul>\n`;

  let totalMes = v.acum1ra + v.acumSeg;
  h += `  <p style="margin-top:10px; font-weight:700; color:#06174a;">Acumulado del mes:</p>\n`;
  h += `  <ul style="margin-left: 20px; margin-top: 4px; margin-bottom: 12px; font-size: 8.5pt; color: #444;">\n`;
  h += `    <li>Total primeras reuniones del mes: ${v.acum1ra}</li>\n`;
  h += `    <li>Total segundas reuniones del mes: ${v.acumSeg}</li>\n`;
  h += `    <li><strong>Total reuniones del mes: ${totalMes}</strong></li>\n`;
  h += `    <li>Tendencia vs objetivo mensual: ${v.tendencia}</li>\n`;
  h += `  </ul>\n`;

  h += `</div>\n`;
  return h;
}

// In the HTML, the vendors start from <!-- HERNÁN --> and end at <!-- PIPELINE ACTIVO -->.
// Let's replace that whole chunk.
let startIdx = html.indexOf('<!-- HERNÁN -->');
let endIdx = html.indexOf('<!-- PIPELINE ACTIVO -->');

if (startIdx !== -1 && endIdx !== -1) {
  let newHtml = html.substring(0, startIdx);
  
  vendors.forEach(v => {
    newHtml += `<!-- ${v.name.toUpperCase()} -->\n` + buildVendorHTML(v) + '\n';
  });
  
  newHtml += html.substring(endIdx);
  
  fs.writeFileSync('reporte-nubceo-abril-2026.html', newHtml);
  console.log('Report generated correctly.');
} else {
  console.log('Could not find markers');
}
