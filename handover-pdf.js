/**
 * Hospitality Flow — Shift Handover PDF Exporter
 * Uses jsPDF (loaded separately). Exposes window.HandoverPdfExporter.export(payload).
 */
(function (global) {
  "use strict";

  var LAYOUT = {
    pageWidth: 210,
    pageHeight: 297,
    marginX: 16,
    marginTop: 14,
    marginBottom: 14,
    lineHeight: 5.4,
    sectionGap: 6,
    sectionTitleGap: 5,
    metaPaddingX: 6,
    metaRowHeight: 10,
    metaBlockHeight: 36,
    headerHeight: 18,
    summaryFontSize: 9.5,
    summaryOverviewSize: 9.5,
    summaryRowHeadingSize: 7.5,
    summaryRowTextSize: 9,
    summaryLineHeight: 5.2,
    summaryPadding: 6,
    summaryRowGap: 4,
    snapshotCellHeight: 15,
    snapshotCellGap: 3,
    metricCardHeight: 17,
    metricCardGap: 3
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
    green500: [93, 206, 138],
    purple500: [124, 92, 191]
  };

  var METRIC_LABELS = [
    { key: "urgent", label: "Urgent Issues", accent: COLORS.red500 },
    { key: "vip", label: "VIP Arrivals", accent: COLORS.blue500 },
    { key: "maintenance", label: "Maintenance Tasks", accent: COLORS.amber500 },
    { key: "payments", label: "Payment Issues", accent: COLORS.navy700 },
    { key: "events", label: "Events", accent: COLORS.purple500 },
    { key: "tasks", label: "Outstanding Tasks", accent: COLORS.green500 }
  ];

  function contentWidth() {
    return LAYOUT.pageWidth - LAYOUT.marginX * 2;
  }

  function bottomLimit() {
    return LAYOUT.pageHeight - LAYOUT.marginBottom - 8;
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

  function normalizeSnapshotValue(value) {
    if (value === null || value === undefined || value === "" || value === "undefined" || value === "null" ||
        (typeof value === "number" && isNaN(value))) {
      return "—";
    }
    return String(value);
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
    doc.line(LAYOUT.marginX, footerY - 3, LAYOUT.pageWidth - LAYOUT.marginX, footerY - 3);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    setText(doc, COLORS.gray500);
    doc.text("Hospitality Flow — AI Shift Handover Assistant", LAYOUT.marginX, footerY);
    doc.text("Page " + this.pageNumber, LAYOUT.pageWidth - LAYOUT.marginX, footerY, { align: "right" });
  };

  PdfDocument.prototype.sectionTitleHeight = function () {
    return 3 + LAYOUT.sectionTitleGap;
  };

  PdfDocument.prototype.drawHeader = function (meta, generatedAt) {
    var doc = this.doc;
    var width = contentWidth();

    setFill(doc, COLORS.navy900);
    doc.roundedRect(LAYOUT.marginX, this.y, width, LAYOUT.headerHeight, 2, 2, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    setText(doc, COLORS.white);
    doc.text("Shift Handover Report", LAYOUT.marginX + 5, this.y + 7.5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    setText(doc, [200, 215, 230]);
    doc.text("Hospitality Flow", LAYOUT.marginX + 5, this.y + 13.5);

    this.y += LAYOUT.headerHeight + 6;
    this.drawMetaBlock(meta, generatedAt);
  };

  PdfDocument.prototype.drawMetaBlock = function (meta, generatedAt) {
    var doc = this.doc;
    var width = contentWidth();
    var blockHeight = LAYOUT.metaBlockHeight;
    var metaTopPad = 7;

    this.ensureSpace(blockHeight + 4);

    setFill(doc, COLORS.gray100);
    setDraw(doc, COLORS.gray200);
    doc.setLineWidth(0.25);
    doc.roundedRect(LAYOUT.marginX, this.y, width, blockHeight, 2, 2, "FD");

    var leftX = LAYOUT.marginX + LAYOUT.metaPaddingX;
    var rightX = LAYOUT.marginX + width / 2 + 3;
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
    var labelWidth = 26;
    var valueWidth = contentWidth() / 2 - labelWidth - LAYOUT.metaPaddingX - 2;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    setText(doc, COLORS.gray500);
    doc.text(label.toUpperCase(), x, y);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    setText(doc, COLORS.navy900);
    doc.text(wrapText(doc, value, valueWidth), x + labelWidth, y);
  };

  PdfDocument.prototype.drawSectionTitle = function (title, followingHeight) {
    var doc = this.doc;
    var reserve = followingHeight || 0;

    this.ensureSpace(this.sectionTitleHeight() + reserve);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    setText(doc, COLORS.navy700);
    doc.text(title, LAYOUT.marginX, this.y);

    this.y += 2.5;
    setDraw(doc, COLORS.blue500);
    doc.setLineWidth(0.5);
    doc.line(LAYOUT.marginX, this.y, LAYOUT.marginX + 38, this.y);

    this.y += LAYOUT.sectionTitleGap;
  };

  PdfDocument.prototype.drawHotelSnapshot = function (rows) {
    if (!rows || !rows.length) return;

    var doc = this.doc;
    var width = contentWidth();
    var cols = 3;
    var gap = LAYOUT.snapshotCellGap;
    var cellWidth = (width - gap * (cols - 1)) / cols;
    var cellHeight = LAYOUT.snapshotCellHeight;
    var gridHeight = cellHeight * 2 + gap;
    var gridRows = [rows.slice(0, 3), rows.slice(3, 6)];

    this.drawSectionTitle("Hotel Snapshot", gridHeight + 2);

    gridRows.forEach(function (rowCells, rowIndex) {
      var rowY = this.y + rowIndex * (cellHeight + gap);

      rowCells.forEach(function (cell, colIndex) {
        var x = LAYOUT.marginX + colIndex * (cellWidth + gap);
        var value = normalizeSnapshotValue(cell.value);

        setFill(doc, COLORS.white);
        setDraw(doc, COLORS.gray200);
        doc.setLineWidth(0.25);
        doc.roundedRect(x, rowY, cellWidth, cellHeight, 1.5, 1.5, "FD");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(5.8);
        setText(doc, COLORS.gray500);
        doc.text(String(cell.label || "").toUpperCase(), x + cellWidth / 2, rowY + 4.8, { align: "center" });

        doc.setFont("helvetica", "bold");
        doc.setFontSize(10.5);
        setText(doc, COLORS.navy900);
        doc.text(value, x + cellWidth / 2, rowY + 11.5, { align: "center" });
      }, this);
    }, this);

    this.y += gridHeight + LAYOUT.sectionGap;
  };

  PdfDocument.prototype.drawMetrics = function (metrics) {
    var doc = this.doc;
    var width = contentWidth();
    var gap = LAYOUT.metricCardGap;
    var cols = 6;
    var cardWidth = (width - gap * (cols - 1)) / cols;
    var cardHeight = LAYOUT.metricCardHeight;

    this.drawSectionTitle("Dashboard Metrics", cardHeight + 2);

    METRIC_LABELS.forEach(function (metric, index) {
      var x = LAYOUT.marginX + index * (cardWidth + gap);
      var count = metrics[metric.key] || 0;

      setFill(doc, COLORS.white);
      setDraw(doc, COLORS.gray200);
      doc.setLineWidth(0.25);
      doc.roundedRect(x, this.y, cardWidth, cardHeight, 1.2, 1.2, "FD");

      setFill(doc, metric.accent);
      doc.roundedRect(x, this.y, cardWidth, 2, 1.2, 1.2, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      setText(doc, COLORS.navy900);
      doc.text(String(count), x + cardWidth / 2, this.y + 8.5, { align: "center" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(5.5);
      setText(doc, COLORS.gray500);
      doc.text(wrapText(doc, metric.label, cardWidth - 3), x + cardWidth / 2, this.y + 13.5, { align: "center" });
    }, this);

    this.y += cardHeight + LAYOUT.sectionGap;
  };

  PdfDocument.prototype.buildSummaryLayout = function (summary) {
    var doc = this.doc;
    var width = contentWidth();
    var padding = LAYOUT.summaryPadding;
    var textWidth = width - padding * 2;
    var overview = "";
    var rows = [];

    if (typeof summary === "string") {
      overview = summary;
    } else if (summary && typeof summary === "object") {
      overview = summary.overview || "";
      rows = summary.rows || [];
    }

    var layout = {
      overviewLines: [],
      rowBlocks: [],
      boxHeight: 0
    };

    if (overview) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(LAYOUT.summaryOverviewSize);
      layout.overviewLines = wrapText(doc, overview, textWidth);
    }

    rows.forEach(function (row) {
      if (!row || !row.text) return;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(LAYOUT.summaryRowTextSize);
      var textLines = wrapText(doc, row.text, textWidth - 2);

      layout.rowBlocks.push({
        heading: row.heading || "Summary",
        textLines: textLines
      });
    });

    var contentHeight = 0;
    if (layout.overviewLines.length) {
      contentHeight += layout.overviewLines.length * LAYOUT.summaryLineHeight + 2;
    }
    if (layout.overviewLines.length && layout.rowBlocks.length) {
      contentHeight += 2;
    }

    layout.rowBlocks.forEach(function (block, index) {
      contentHeight += 3.2 + block.textLines.length * LAYOUT.summaryLineHeight;
      if (index < layout.rowBlocks.length - 1) {
        contentHeight += LAYOUT.summaryRowGap;
      }
    });

    layout.boxHeight = contentHeight + padding * 2 + 2;
    return layout;
  };

  PdfDocument.prototype.drawSummary = function (summary) {
    if (!summary) return;

    var doc = this.doc;
    var width = contentWidth();
    var padding = LAYOUT.summaryPadding;
    var layout = this.buildSummaryLayout(summary);

    if (!layout.overviewLines.length && !layout.rowBlocks.length) return;

    this.drawSectionTitle("AI Summary", layout.boxHeight + 2);

    var boxTop = this.y;
    setFill(doc, COLORS.blue50);
    setDraw(doc, COLORS.blue500);
    doc.setLineWidth(0.25);
    doc.roundedRect(LAYOUT.marginX, boxTop, width, layout.boxHeight, 2, 2, "FD");

    var cursorY = boxTop + padding + 3.5;

    if (layout.overviewLines.length) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(LAYOUT.summaryOverviewSize);
      setText(doc, COLORS.gray600);
      layout.overviewLines.forEach(function (line) {
        doc.text(line, LAYOUT.marginX + padding, cursorY);
        cursorY += LAYOUT.summaryLineHeight;
      });
      cursorY += 1;
    }

    layout.rowBlocks.forEach(function (block, index) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(LAYOUT.summaryRowHeadingSize);
      setText(doc, COLORS.navy700);
      doc.text(block.heading.toUpperCase(), LAYOUT.marginX + padding, cursorY);
      cursorY += 3.2;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(LAYOUT.summaryRowTextSize);
      setText(doc, COLORS.gray600);
      block.textLines.forEach(function (line) {
        doc.text(line, LAYOUT.marginX + padding + 1, cursorY);
        cursorY += LAYOUT.summaryLineHeight;
      });

      if (index < layout.rowBlocks.length - 1) {
        cursorY += LAYOUT.summaryRowGap;
      }
    });

    this.y = boxTop + layout.boxHeight + LAYOUT.sectionGap;
  };

  PdfDocument.prototype.drawRecommendations = function (recommendations) {
    if (!recommendations || !recommendations.length) return;

    var doc = this.doc;
    var width = contentWidth();
    var bulletIndent = 5;
    var textWidth = width - bulletIndent - 8;

    this.drawSectionTitle("AI Recommendations", 8 + recommendations.length * LAYOUT.lineHeight);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    setText(doc, COLORS.gray500);
    doc.text("What should the next shift do?", LAYOUT.marginX, this.y);
    this.y += 5;

    recommendations.forEach(function (item) {
      var lines = wrapText(doc, item, textWidth);
      var blockHeight = lines.length * LAYOUT.lineHeight + 2;
      this.ensureSpace(blockHeight + 1);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      setText(doc, COLORS.gray600);
      doc.text("•", LAYOUT.marginX + 1, this.y);
      doc.text(lines, LAYOUT.marginX + bulletIndent, this.y);
      this.y += blockHeight + 0.5;
    }, this);

    this.y += 4;
  };

  PdfDocument.prototype.drawIntelligenceChecklist = function (checklistItems) {
    if (!checklistItems || !checklistItems.length) return;

    var doc = this.doc;
    var width = contentWidth();
    var bulletIndent = 5;
    var textWidth = width - bulletIndent - 8;

    this.drawSectionTitle("Shift Intelligence Checklist", 8 + checklistItems.length * LAYOUT.lineHeight);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    setText(doc, COLORS.gray500);
    doc.text("What might the team have forgotten?", LAYOUT.marginX, this.y);
    this.y += 5;

    checklistItems.forEach(function (item) {
      var lines = wrapText(doc, item, textWidth);
      var blockHeight = lines.length * LAYOUT.lineHeight + 2;
      this.ensureSpace(blockHeight + 1);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      setText(doc, COLORS.gray600);
      doc.text("□", LAYOUT.marginX + 1, this.y);
      doc.text(lines, LAYOUT.marginX + bulletIndent, this.y);
      this.y += blockHeight + 0.5;
    }, this);

    this.y += 4;
  };

  PdfDocument.prototype.drawHandoverSections = function (sections) {
    if (!sections || !sections.length) return;

    var doc = this.doc;
    var width = contentWidth();
    var bulletIndent = 5;
    var textWidth = width - bulletIndent - 8;
    var visibleSections = sections.filter(function (section) {
      return section && section.items && section.items.length;
    });

    if (!visibleSections.length) return;

    var firstSection = visibleSections[0];
    var firstItemLines = wrapText(doc, firstSection.items[0], textWidth);
    var firstBlockHeight = 7 + firstItemLines.length * LAYOUT.lineHeight + 3;
    this.drawSectionTitle("Organised Handover", firstBlockHeight + 4);

    visibleSections.forEach(function (section) {
      var title = section.title || "Section";
      var items = section.items || [];

      this.ensureSpace(7 + LAYOUT.lineHeight + 2);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      setText(doc, COLORS.navy900);
      doc.text(title.toUpperCase(), LAYOUT.marginX, this.y);
      this.y += 6;

      items.forEach(function (item) {
        var lines = wrapText(doc, item, textWidth);
        var blockHeight = lines.length * LAYOUT.lineHeight + 2;
        this.ensureSpace(blockHeight + 1);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        setText(doc, COLORS.gray600);
        doc.text("•", LAYOUT.marginX + 1, this.y);
        doc.text(lines, LAYOUT.marginX + bulletIndent, this.y);
        this.y += blockHeight + 0.5;
      }, this);

      this.y += 4;
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
    pdf.drawHotelSnapshot(payload.hotelSnapshot);
    pdf.drawMetrics(payload.metrics || {});
    pdf.drawSummary(payload.summary);
    pdf.drawHandoverSections(payload.sections);
    pdf.drawRecommendations(payload.recommendations);
    pdf.drawIntelligenceChecklist(payload.intelligenceChecklist);
    pdf.save(buildFilename(payload.meta));
  }

  global.HandoverPdfExporter = {
    export: exportHandoverPdf
  };
})(typeof window !== "undefined" ? window : this);
