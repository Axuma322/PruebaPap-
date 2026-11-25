(function (root) {
  "use strict";

  function escape(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (character) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character];
    });
  }

  function render(request, config) {
    config = config || {};
    var date = new Date(request.completion_date);
    var formattedDate = Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("es-CR", {
      year: "numeric", month: "long", day: "numeric", timeZone: "America/Costa_Rica"
    });
    var title = config.certificateTitle || "Certificado de finalización";
    return '<!doctype html><html lang="es"><head><meta charset="utf-8">'
      + '<meta name="viewport" content="width=device-width, initial-scale=1">'
      + '<title>' + escape(title) + '</title><style>'
      + 'body{margin:0;padding:32px;background:#dceafb;color:#142b4a;font:18px/1.7 Arial,Helvetica,sans-serif}'
      + 'main{box-sizing:border-box;max-width:1040px;margin:0 auto;background:white;border:10px solid #0c4da2;padding:clamp(24px,6vw,72px);text-align:center;outline:1px solid #bda46a;outline-offset:-20px}'
      + '.institution{color:#083a7a;font-weight:bold;letter-spacing:.1em}.eyebrow{color:#735a25;text-transform:uppercase;font-size:14px;letter-spacing:.16em}'
      + 'h1{font:clamp(28px,5vw,48px)/1.15 Georgia,serif;color:#083a7a}h2{font-size:clamp(26px,4vw,40px);overflow-wrap:anywhere;margin-bottom:0}'
      + '.identity,.code{font-size:14px;overflow-wrap:anywhere}.signature{margin:48px auto 0;border-top:1px solid #bda46a;padding-top:12px;max-width:360px}'
      + '.toolbar{max-width:1040px;margin:0 auto 20px;text-align:center}.toolbar button{border:0;border-radius:6px;padding:12px 20px;background:#0c4da2;color:white;font:inherit;cursor:pointer}'
      + '@page{size:A4 landscape;margin:12mm}@media print{body{background:white;padding:0;font-size:15px}main{max-width:none;padding:36px;break-inside:avoid}.toolbar{display:none}h1{font-size:36px}h2{font-size:32px}}'
      + '</style></head><body><div class="toolbar"><button onclick="window.print()">Imprimir / guardar como PDF</button></div><main>'
      + '<p class="institution">' + escape(config.institution || "PLANNE · Neuroliderazgo educativo") + '</p>'
      + '<p class="eyebrow">' + (request.demo ? "Muestra de demostración · sin validez" : "Constancia de recorrido formativo") + '</p>'
      + '<h1>' + escape(title) + '</h1><p>Se hace constar que</p><h2>' + escape(request.full_name) + '</h2>'
      + '<p class="identity">Cédula: ' + escape(request.national_id) + '</p><p>'
      + escape(config.certificateText || "ha completado el recorrido formativo de la Plataforma Digital de Neuroliderazgo Educativo.") + '</p>'
      + '<p><strong>' + escape(config.programName || "PLANNE") + '</strong></p><p>Fecha de finalización: ' + escape(formattedDate) + '</p>'
      + '<p class="signature">' + escape(config.signatureLabel || "Coordinación del programa PLANNE") + '</p>'
      + '<p class="code">Código: ' + escape(request.certificate_code) + '</p></main></body></html>';
  }

  root.PLANNECertificateTemplate = { render: render, escape: escape };
})(globalThis);
