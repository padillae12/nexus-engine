// generate_pdf.js — Convierte nexus_flow_documentacion_COPIA.md a HTML listo para imprimir como PDF
const fs = require('fs');
const path = require('path');

const md = fs.readFileSync('nexus_flow_documentacion_COPIA.md', 'utf8');

// Conversión manual simple de Markdown a HTML
function mdToHtml(text) {
  return text
    // Encabezados
    .replace(/^#### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Negritas e itálicas
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    // Código inline
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Bloques de código
    .replace(/```[\w]*\n([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    // Blockquotes
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    // Listas sin orden
    .replace(/^\- \[ \] (.+)$/gm, '<li class="checkbox">☐ $1</li>')
    .replace(/^\- \[x\] (.+)$/gm, '<li class="checkbox checked">☑ $1</li>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/^  - (.+)$/gm, '<li class="sub">$1</li>')
    // Tablas
    .replace(/\|(.+)\|\n\|[-| ]+\|\n((?:\|.+\|\n?)+)/g, (match, header, rows) => {
      const ths = header.split('|').filter(c => c.trim()).map(c => `<th>${c.trim()}</th>`).join('');
      const trs = rows.trim().split('\n').map(row => {
        const tds = row.split('|').filter(c => c.trim()).map(c => `<td>${c.trim()}</td>`).join('');
        return `<tr>${tds}</tr>`;
      }).join('');
      return `<table><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>`;
    })
    // Separadores
    .replace(/^---$/gm, '<hr>')
    // Párrafos
    .replace(/\n\n/g, '</p><p>')
    // Limpiar listas sueltas
    .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');
}

const body = mdToHtml(md);

const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nexus-Flow — Documentación Maestra</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&family=JetBrains+Mono:wght@400;600&display=swap');

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Inter', sans-serif;
      font-size: 13px;
      line-height: 1.7;
      color: #1a1a2e;
      background: #fff;
      padding: 40px;
      max-width: 900px;
      margin: 0 auto;
    }

    h1 { font-size: 2em; color: #4f46e5; border-bottom: 3px solid #4f46e5; padding-bottom: 10px; margin: 30px 0 15px; }
    h2 { font-size: 1.4em; color: #3730a3; border-left: 4px solid #6366f1; padding-left: 12px; margin: 28px 0 12px; }
    h3 { font-size: 1.1em; color: #4338ca; margin: 20px 0 8px; }
    h4 { font-size: 1em; color: #4f46e5; margin: 16px 0 6px; font-weight: 600; }

    p { margin: 8px 0; }

    strong { color: #1e1b4b; }
    em { color: #6366f1; font-style: italic; }

    code {
      font-family: 'JetBrains Mono', monospace;
      background: #f1f5f9;
      color: #7c3aed;
      padding: 1px 5px;
      border-radius: 4px;
      font-size: 0.88em;
    }

    pre {
      background: #1e1b4b;
      color: #e2e8f0;
      padding: 16px;
      border-radius: 8px;
      overflow-x: auto;
      margin: 14px 0;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.82em;
      line-height: 1.6;
    }
    pre code { background: none; color: inherit; padding: 0; }

    blockquote {
      border-left: 4px solid #818cf8;
      background: #eef2ff;
      padding: 10px 16px;
      margin: 14px 0;
      border-radius: 0 6px 6px 0;
      color: #3730a3;
      font-style: italic;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 14px 0;
      font-size: 0.9em;
    }
    th {
      background: #4f46e5;
      color: white;
      padding: 8px 12px;
      text-align: left;
      font-weight: 600;
    }
    td {
      padding: 7px 12px;
      border-bottom: 1px solid #e2e8f0;
    }
    tr:nth-child(even) td { background: #f8fafc; }
    tr:hover td { background: #eef2ff; }

    ul { padding-left: 20px; margin: 8px 0; }
    li { margin: 4px 0; }
    li.sub { margin-left: 16px; list-style: circle; }
    li.checkbox { list-style: none; margin-left: -4px; }
    li.checked { color: #059669; }

    hr { border: none; border-top: 2px solid #e2e8f0; margin: 28px 0; }

    @media print {
      body { padding: 20px; font-size: 11px; }
      h1 { page-break-before: auto; }
      h2 { page-break-after: avoid; }
      pre, table { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <p>${body}</p>
</body>
</html>`;

fs.writeFileSync('nexus_flow_documentacion_COPIA.html', html);
console.log('✅ Archivo generado: nexus_flow_documentacion_COPIA.html');
console.log('📄 Para obtener el PDF: ábrelo en Chrome/Edge y presiona Ctrl+P → Guardar como PDF');
