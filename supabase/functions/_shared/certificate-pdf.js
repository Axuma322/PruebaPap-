(function (root) {
  "use strict";

  function text(value) {
    return String(value == null ? "" : value).normalize("NFC").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  }
  function escape(value) {
    return text(value).replace(/[&<>"']/g, function (character) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character];
    });
  }
  function emailMessage(request) {
    return '<div style="font:16px/1.6 Arial,sans-serif;color:#142b4a">'
      + '<h1 style="color:#0c4da2">Felicitaciones por completar PLANNE</h1>'
      + '<p>Hola, ' + escape(request.full_name) + ':</p>'
      + '<p>Gracias por participar en la Plataforma Digital de Neuroliderazgo Educativo. Adjuntamos su constancia de finalización en formato PDF.</p>'
      + '<p>Puede conservar el archivo <strong>Certificado_PLANNE.pdf</strong> y descargar la misma constancia desde PLANNE.</p>'
      + '<p>Código: ' + escape(request.certificate_code) + '</p>'
      + '<p>Esta constancia reconoce la finalización de un recorrido educativo participativo; no constituye una acreditación oficial.</p></div>';
  }
  function lines(value, font, size, width) {
    var result = [];
    var line = "";
    text(value).split(" ").forEach(function (word) {
      if (!word) { return; }
      if (font.widthOfTextAtSize(word, size) > width) {
        if (line) { result.push(line); line = ""; }
        Array.from(word).forEach(function (letter) {
          if (font.widthOfTextAtSize(line + letter, size) > width) { result.push(line); line = ""; }
          line += letter;
        });
        return;
      }
      var candidate = line ? line + " " + word : word;
      if (font.widthOfTextAtSize(candidate, size) > width) { result.push(line); line = word; }
      else { line = candidate; }
    });
    if (line) { result.push(line); }
    return result;
  }
  async function render(request, config, library, brainImage) {
    config = config || {};
    library = library || root.PDFLib;
    if (!library) { throw new Error("PDF library unavailable"); }
    var PDFDocument = library.PDFDocument;
    var StandardFonts = library.StandardFonts;
    var rgb = library.rgb;
    var doc = await PDFDocument.create();
    var date = new Date(request.completion_date);
    if (Number.isNaN(date.getTime())) { throw new Error("Invalid completion date"); }
    doc.setTitle("Constancia de finalización · PLANNE");
    doc.setAuthor("PLANNE");
    doc.setCreator("PLANNE · pdf-lib");
    doc.setCreationDate(date);
    doc.setModificationDate(date);
    var page = doc.addPage([841.89, 595.28]);
    if (!brainImage) { throw new Error("Certificate brain image unavailable"); }
    var brain = await doc.embedPng(brainImage);
    var brainSize = brain.scaleToFit(108, 70);
    page.drawImage(brain, { x: 60, y: 480, width: brainSize.width, height: brainSize.height });
    var regular = await doc.embedFont(StandardFonts.Helvetica);
    var bold = await doc.embedFont(StandardFonts.HelveticaBold);
    var serif = await doc.embedFont(StandardFonts.TimesRoman);
    var blue = rgb(12 / 255, 77 / 255, 162 / 255);
    var deep = rgb(8 / 255, 58 / 255, 122 / 255);
    var ink = rgb(20 / 255, 43 / 255, 74 / 255);
    var muted = rgb(77 / 255, 96 / 255, 122 / 255);
    var gold = rgb(189 / 255, 164 / 255, 106 / 255);
    var width = page.getWidth();
    page.drawRectangle({ x: 0, y: 0, width: 16, height: 595.28, color: blue });
    page.drawRectangle({ x: 29, y: 29, width: width - 58, height: 537.28, borderColor: blue, borderWidth: 2 });
    page.drawRectangle({ x: 36, y: 36, width: width - 72, height: 523.28, borderColor: gold, borderWidth: 0.6 });
    function centered(value, y, font, size, min, maxLines, color, maxHeight, maxWidth) {
      var wrapped;
      do {
        wrapped = lines(value, font, size, maxWidth || 690);
        if ((wrapped.length <= maxLines && (wrapped.length - 1) * size * 1.35 <= (maxHeight || Infinity)) || size <= min) { break; }
        size -= 1;
      } while (size >= min);
      if (wrapped.length > maxLines || (wrapped.length - 1) * size * 1.35 > (maxHeight || Infinity)) { throw new Error("Certificate text exceeds layout"); }
      wrapped.forEach(function (line, index) {
        page.drawText(line, { x: (width - font.widthOfTextAtSize(line, size)) / 2, y: y - index * size * 1.35, size: size, font: font, color: color || ink });
      });
    }
    centered(config.institution || "Plataforma Digital de Neuroliderazgo Educativo", 535, bold, 12, 10, 2, deep, undefined, 480);
    centered(config.programName || "PLANNE", 503, bold, 18, 16, 1, blue);
    page.drawLine({ start: { x: 345, y: 487 }, end: { x: 497, y: 487 }, color: gold, thickness: 1 });
    centered(config.certificateTitle || "Constancia de finalización", 451, serif, 34, 24, 1, deep);
    centered("Se hace constar que", 416, regular, 13, 13, 1, muted);
    centered(request.full_name, 381, bold, 29, 13, 3, ink, 50);
    centered("Cédula: " + text(request.national_id), 316, regular, 12, 10, 1, muted);
    centered(config.certificateText || "ha completado el recorrido educativo participativo de PLANNE, que integra diagnóstico, neuroeducación, neuroliderazgo y mejora institucional.", 276, regular, 14, 11, 4, ink);
    var dateText = date.toLocaleDateString("es-CR", { year: "numeric", month: "long", day: "numeric", timeZone: "America/Costa_Rica" });
    centered("Fecha de finalización: " + dateText, 175, regular, 12, 12, 1, deep);
    page.drawLine({ start: { x: 285, y: 122 }, end: { x: 557, y: 122 }, color: gold, thickness: 0.8 });
    centered(config.signatureLabel || "Responsable: Esteban Porras Murillo · Cédula: 503180530", 104, regular, 10, 9, 1, muted);
    centered("Código: " + text(request.certificate_code), 74, regular, 9, 8, 1, deep);
    centered(request.demo ? "MUESTRA DE DEMOSTRACIÓN · SIN VALIDEZ" : "Constancia participativa de finalización. No constituye una acreditación oficial.", 49, regular, 8, 8, 1, muted);
    return doc.saveAsBase64({ dataUri: false, useObjectStreams: false });
  }
  root.PLANNECertificatePDF = { render: render, escape: escape, emailMessage: emailMessage };
})(globalThis);
