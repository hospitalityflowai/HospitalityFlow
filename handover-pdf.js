/**
 * Hospitality Flow — Shift Handover PDF Exporter
 * Uses jsPDF (loaded separately). Exposes window.HandoverPdfExporter.export(payload).
 */
(function (global) {
  "use strict";

  var LAYOUT = {
    pageWidth: 210,
    pageHeight: 297,
    marginX: 18,
    marginTop: 18,
    marginBottom: 16,
    lineHeight: 5.8,
    sectionGap: 14,
    metaPaddingX: 8,
    metaRowHeight: 12,
    summaryFontSize: 10.5,
    summaryLineHeight: 6.5,
    summaryPadding: 9
  };

  var COLORS = {
    navy900: [12, 24, 41],
    navy700: [26, 48, 85],
    blue500: [74, 143, 196],
    blue50: [238, 246, 252],
    gray600: [61, 70, 84],
    gray500: [90, 101, 120],
    gray200: [216, 224, 234],
    gray100: [238, 242, 247],
    white: [255, 255, 255],
    red500: [232, 93, 93],
    amber500: [232, 184, 77],
    green500: [93, 206, 138]
  };

  var METRIC_LABELS = [
    { key: "urgent", label: "Urgent Issues", accent: COLORS.red500 },
    { key: "vip", label: "VIP Arrivals", accent: COLORS.blue500 },
    { key: "maintenance", label: "Maintenance", accent: COLORS.amber500 },
    { key: "payments", label: "Payment Issues", accent: COLORS.navy700 },
    { key: "tasks", label: "Outstanding Tasks", accent: COLORS.green500 }
  ];

  var PRIORITY_COLORS = {
    critical: COLORS.red500,
    high: COLORS.amber500,
    medium: COLORS.blue500,
    low: COLORS.green500
  };

  function contentWidth() {
    return LAYOUT.pageWidth - LAYOUT.marginX * 2;
  }

  function bottomLimit() {
    return LAYOUT.pageHeight - LAYOUT.marginBottom - 10;
  }

  function setFill(doc, rgb) {
    doc.setFillColor(rgb[0], rgb[1], rgb[2]);
  }

  function setText(doc, rgb) {
    doc.setTextColor(rgb[0], rgb[1], rgb[2]);
  }

  function setDraw(doc, rgb) {
    doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
  }

  function sanitizeFilename(value) {
    return String(value || "handover")
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "handover";
  }

  function buildFilename(meta) {
    var hotel = sanitizeFilename(meta.hotel);
    var date = sanitizeFilename(meta.date);
    return "Shift-Handover-" + hotel + "-" + date + ".pdf";
  }

  function wrapText(doc, text, maxWidth) {
    return doc.splitTextToSize(String(text || ""), maxWidth);
  }

  function PdfDocument(jsPDF) {
    this.doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
    this.y = LAYOUT.marginTop;
    this.pageNumber = 1;
  }

  PdfDocument.prototype.getContentWidth = function () {
    return contentWidth();
  };

  PdfDocument.prototype.ensureSpace = function (height) {
    if (this.y + height <= bottomLimit()) return;
    this.addPage();
  };

  PdfDocument.prototype.addPage = function () {
    this.drawFooter();
    this.doc.addPage();
    this.pageNumber += 1;
    this.y = LAYOUT.marginTop;
  };

  PdfDocument.prototype.drawFooter = function () {
    var doc = this.doc;
    var footerY = LAYOUT.pageHeight - LAYOUT.marginBottom;
    setDraw(doc, COLORS.gray200);
    doc.setLineWidth(0.2);
    doc.line(LAYOUT.marginX, footerY - 4, LAYOUT.pageWidth - LAYOUT.marginX, footerY - 4);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    setText(doc, COLORS.gray500);
    doc.text("Hospitality Flow — AI Shift Handover Assistant", LAYOUT.marginX, footerY);
    doc.text("Page " + this.pageNumber, LAYOUT.pageWidth - LAYOUT.marginX, footerY, { align: "right" });
  };

  PdfDocument.prototype.drawHeader = function (meta, generatedAt) {
    var doc = this.doc;
    var width = contentWidth();

    setFill(doc, COLORS.navy900);
    doc.roundedRect(LAYOUT.marginX, this.y, width, 22, 2, 2, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    setText(doc, COLORS.white);
    doc.text("Shift Handover Report", LAYOUT.marginX + 6, this.y + 9);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    setText(doc, [200, 215, 230]);
    doc.text("Hospitality Flow", LAYOUT.marginX + 6, this.y + 16);

    this.y += 28;

    this.drawMetaBlock(meta, generatedAt);
  };

  PdfDocument.prototype.drawMetaBlock = function (meta, generatedAt) {
    var doc = this.doc;
    var width = contentWidth();
    var blockHeight = 44;
    var metaTopPad = 10;

    this.ensureSpace(blockHeight + 6);

    setFill(doc, COLORS.gray100);
    setDraw(doc, COLORS.gray200);
    doc.setLineWidth(0.3);
    doc.roundedRect(LAYOUT.marginX, this.y, width, blockHeight, 2, 2, "FD");

    var leftX = LAYOUT.marginX + LAYOUT.metaPaddingX;
    var rightX = LAYOUT.marginX + width / 2 + 4;
    var row1Y = this.y + metaTopPad;
    var row2Y = row1Y + LAYOUT.metaRowHeight;
    var row3Y = row2Y + LAYOUT.metaRowHeight;

    this.drawMetaRow(leftX, row1Y, "Hotel", meta.hotel || "Not specified");
    this.drawMetaRow(rightX, row1Y, "Department", meta.department || "Not specified");
    this.drawMetaRow(leftX, row2Y, "Prepared by", meta.preparedBy || "Not specified");
    this.drawMetaRow(rightX, row2Y, "Shift", meta.shift || "Not specified");
    this.drawMetaRow(leftX, row3Y, "Date", meta.date || "Not specified");
    this.drawMetaRow(rightX, row3Y, "Generated", generatedAt);

    this.y += blockHeight + LAYOUT.sectionGap;
  };

  PdfDocument.prototype.drawMetaRow = function (x, y, label, value) {
    var doc = this.doc;
    var labelWidth = 28;
    var valueWidth = contentWidth() / 2 - labelWidth - LAYOUT.metaPaddingX - 2;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    setText(doc, COLORS.gray500);
    doc.text(label.toUpperCase(), x, y);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    setText(doc, COLORS.navy900);
    var lines = wrapText(doc, value, valueWidth);
    doc.text(lines, x + labelWidth, y);
  };

  PdfDocument.prototype.drawSectionTitle = function (title) {
    var doc = this.doc;
    this.ensureSpace(12);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    setText(doc, COLORS.navy700);
    doc.text(title, LAYOUT.marginX, this.y);

    this.y += 3;
    setDraw(doc, COLORS.blue500);
    doc.setLineWidth(0.6);
    doc.line(LAYOUT.marginX, this.y, LAYOUT.marginX + 42, this.y);

    this.y += LAYOUT.sectionGap;
  };

  PdfDocument.prototype.drawMetrics = function (metrics) {
    this.drawSectionTitle("Dashboard Metrics");

    var doc = this.doc;
    var width = contentWidth();
    var gap = 4;
    var cols = 5;
    var cardWidth = (width - gap * (cols - 1)) / cols;
    var cardHeight = 25;

    this.ensureSpace(cardHeight + 6);

    METRIC_LABELS.forEach(function (metric, index) {
      var x = LAYOUT.marginX + index * (cardWidth + gap);
      var count = metrics[metric.key] || 0;

      setFill(doc, COLORS.white);
      setDraw(doc, COLORS.gray200);
      doc.setLineWidth(0.3);
      doc.roundedRect(x, this.y, cardWidth, cardHeight, 1.5, 1.5, "FD");

      setFill(doc, metric.accent);
      doc.roundedRect(x, this.y, cardWidth, 2.5, 1.5, 1.5, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      setText(doc, COLORS.navy900);
      doc.text(String(count), x + cardWidth / 2, this.y + 13, { align: "center" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      setText(doc, COLORS.gray500);
      var labelLines = wrapText(doc, metric.label, cardWidth - 4);
      doc.text(labelLines, x + cardWidth / 2, this.y + 19, { align: "center" });
    }, this);

    this.y += cardHeight + LAYOUT.sectionGap + 2;
  };

  PdfDocument.prototype.drawSummary = function (summary) {
    if (!summary) return;

    this.drawSectionTitle("AI Summary");

    var doc = this.doc;
    var width = contentWidth();
    var padding = LAYOUT.summaryPadding;
    var textWidth = width - padding * 2;
    var lineHeight = LAYOUT.summaryLineHeight;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(LAYOUT.summaryFontSize);
    var lines = wrapText(doc, summary, textWidth);
    var boxHeight = lines.length * lineHeight + padding * 2 + 4;

    this.ensureSpace(boxHeight + 4);

    setFill(doc, COLORS.blue50);
    setDraw(doc, COLORS.blue500);
    doc.setLineWidth(0.3);
    doc.roundedRect(LAYOUT.marginX, this.y, width, boxHeight, 2, 2, "FD");

    setText(doc, COLORS.gray600);
    lines.forEach(function (line, index) {
      doc.text(line, LAYOUT.marginX + padding, this.y + padding + 5 + index * lineHeight);
    }, this);

    this.y += boxHeight + LAYOUT.sectionGap + 2;
  };

  PdfDocument.prototype.drawRecommendations = function (recommendations) {
    if (!recommendations || !recommendations.length) return;

    this.drawSectionTitle("AI Recommendations");

    var doc = this.doc;
    var width = contentWidth();

    recommendations.forEach(function (item, index) {
      var rec = typeof item === "string" ? { text: item, badge: "Low" } : item;
      var badge = String(rec.badge || "Low");
      var badgeKey = badge.toLowerCase();
      var badgeColor = PRIORITY_COLORS[badgeKey] || COLORS.gray500;

      var numberPrefix = (index + 1) + ". ";
      var badgeLabel = "[" + badge + "] ";
      var textStartX = LAYOUT.marginX + 6;
      var textWidth = width - 12;
      var lines = wrapText(doc, numberPrefix + badgeLabel + rec.text, textWidth);
      var blockHeight = lines.length * LAYOUT.lineHeight + 8;

      this.ensureSpace(blockHeight + 5);

      setFill(doc, COLORS.white);
      setDraw(doc, COLORS.gray200);
      doc.setLineWidth(0.2);
      doc.roundedRect(LAYOUT.marginX, this.y, width, blockHeight, 1.5, 1.5, "FD");

      setFill(doc, badgeColor);
      doc.roundedRect(LAYOUT.marginX, this.y, 3, blockHeight, 1.5, 1.5, "F");

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      setText(doc, COLORS.gray600);
      doc.text(lines, textStartX, this.y + 6);

      this.y += blockHeight + 5;
    }, this);

    this.y += LAYOUT.sectionGap;
  };

  PdfDocument.prototype.drawHandoverSections = function (sections) {
    if (!sections || !sections.length) return;

    this.drawSectionTitle("Organised Handover");

    var doc = this.doc;
    var width = contentWidth();
    var bulletIndent = 5;
    var textWidth = width - bulletIndent - 8;

    sections.forEach(function (section) {
      var title = section.title || "Section";
      var items = section.items || [];
      if (!items.length) return;

      this.ensureSpace(12);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      setText(doc, COLORS.navy900);
      doc.text(title.toUpperCase(), LAYOUT.marginX, this.y);
      this.y += 7;

      items.forEach(function (item) {
        var lines = wrapText(doc, item, textWidth);
        var blockHeight = lines.length * LAYOUT.lineHeight + 3;
        this.ensureSpace(blockHeight + 2);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        setText(doc, COLORS.gray600);
        doc.text("•", LAYOUT.marginX + 1, this.y);
        doc.text(lines, LAYOUT.marginX + bulletIndent, this.y);
        this.y += blockHeight + 1;
      }, this);

      this.y += 6;
    }, this);
  };

  PdfDocument.prototype.save = function (filename) {
    this.drawFooter();
    this.doc.save(filename);
  };

  function exportHandoverPdf(payload) {
    if (!global.jspdf || !global.jspdf.jsPDF) {
      throw new Error("jsPDF is not loaded");
    }
    if (!payload || !payload.meta) {
      throw new Error("Invalid handover payload");
    }

    var pdf = new PdfDocument(global.jspdf.jsPDF);
    var generatedAt = payload.generatedAt || new Date().toLocaleString("en-GB");

    pdf.drawHeader(payload.meta, generatedAt);
    pdf.drawMetrics(payload.metrics || {});
    pdf.drawSummary(payload.summary);
    pdf.drawRecommendations(payload.recommendations);
    pdf.drawHandoverSections(payload.sections);
    pdf.save(buildFilename(payload.meta));
  }

  global.HandoverPdfExporter = {
    export: exportHandoverPdf
  };
})(typeof window !== "undefined" ? window : this);
