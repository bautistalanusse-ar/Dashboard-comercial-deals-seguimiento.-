const fs = require('fs');
let content = fs.readFileSync('reporte-nubceo-abril-2026.html', 'utf8');

// 1. Remove Ranking
content = content.replace(/<!-- RANKING -->[\s\S]*?(?=<!-- HERNÁN -->)/, '');

// 2. Remove Acciones Críticas
content = content.replace(/<!-- ACCIONES CRÍTICAS -->[\s\S]*?(?=<div class="footer">)/, '');

// 3. Remove Scoreboard
content = content.replace(/<!-- SCOREBOARD -->[\s\S]*?(?=<div class="footer">)/, '');

// 4. Update 'lo del dia'
content = content.replace(/Miércoles 22 de Abril 2026/g, 'Jueves 23 de Abril 2026');
content = content.replace(/mié 22\/04\/2026/g, 'jue 23/04/2026');

// En la seccion "Agenda del Día", el "Miércoles 22" ahora es "Ayer" o "Realizado"
content = content.replace(/<div class="day-header today"><span>Miércoles 22 de Abril — HOY<\/span><span class="day-count">8 reuniones con agenda\.virtual<\/span><\/div>/g, '<div class="day-header past"><span>Miércoles 22 de Abril — Realizado</span><span class="day-count">8 reuniones con agenda.virtual</span></div>');
content = content.replace(/<div class="day-block">\s*<div class="day-header"><span>Jueves 23 de Abril<\/span>/g, '<div class="day-block">\n    <div class="day-header today"><span>Jueves 23 de Abril — HOY</span>');

// 5. Rearrange vendor sections
const vendorMarkers = ['<!-- HERNÁN -->', '<!-- MATEO -->', '<!-- OMAR -->', '<!-- VANESSA -->', '<!-- LUCÍA -->', '<!-- EMILIANA -->', '<!-- LUCIANO -->', '<!-- FEDERICO · PABLO ARCE -->', '<!-- PABLO ILLICH -->', '<!-- PIPELINE ACTIVO -->'];

for (let i = 0; i < vendorMarkers.length - 1; i++) {
    let startMarker = vendorMarkers[i];
    let endMarker = vendorMarkers[i+1];
    
    let regex = new RegExp(startMarker + '([\\s\\S]*?)' + endMarker);
    let match = content.match(regex);
    if (match) {
        let vendorBlock = match[1];
        
        let titleMatch = vendorBlock.match(/(<div class="section">\s*<div class="section-title">.*?<\/div>)/);
        
        // Match sections carefully up to the next subsec-label or the end of the div
        let regexParts = /(<div class="subsec-label.*?>[\s\S]*?)(?=<div class="subsec-label|<\/div>\s*$)/g;
        let parts = [];
        let p;
        while ((p = regexParts.exec(vendorBlock)) !== null) {
            parts.push(p[1]);
        }
        
        let hoyBlock = parts.find(p => p.includes('subsec-hoy')) || '';
        let segBlock = parts.find(p => p.includes('subsec-seg') && !p.includes('Alianzas')) || '';
        let alianzasBlock = parts.find(p => p.includes('Alianzas')) || '';
        let leadsBlock = parts.find(p => p.includes('subsec-leads')) || '';
        
        let newVendorBlock = (titleMatch ? titleMatch[1] + '\n\n' : '');
        
        if (hoyBlock) {
            hoyBlock = hoyBlock.replace('Hoy — Miércoles 22 de Abril', 'Reuniones de la Semana');
            newVendorBlock += hoyBlock + '\n';
        }
        
        if (segBlock) {
            newVendorBlock += segBlock + '\n';
        }
        
        if (alianzasBlock) {
            newVendorBlock += alianzasBlock + '\n';
        }
        
        if (leadsBlock) {
            newVendorBlock += leadsBlock + '\n';
        }
        
        newVendorBlock += '</div>\n\n';
        
        // Only replace if we successfully parsed things
        if (titleMatch) {
            content = content.replace(match[0], startMarker + '\n' + newVendorBlock + endMarker);
        }
    }
}

fs.writeFileSync('reporte-nubceo-abril-2026.html', content);
console.log('Done');
