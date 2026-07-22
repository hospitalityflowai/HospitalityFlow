/**
 * Hospitality Flow — Shift Handover PDF Exporter
 * Uses jsPDF (loaded separately). Exposes window.HandoverPdfExporter.export(payload).
 */
(function (global) {
  "use strict";

  var LAYOUT = {
    pageWidth: 210,
    pageHeight: 297,
    marginX: 14,
    marginTop: 12,
    marginBottom: 12,
    lineHeight: 5.3,
    sectionGap: 6,
    sectionTitleGap: 4,
    metaPaddingX: 6,
    metaRowHeight: 9,
    metaBlockHeight: 36,
    headerHeight: 18,
    summaryOverviewSize: 9.8,
    summarySubHeadingSize: 7.6,
    summarySubTextSize: 9,
    summaryLineHeight: 5,
    summaryPadding: 6.5,
    summarySubGap: 3,
    cardRadius: 2,
    bodyFontSize: 9.2,
    sectionHeadingFontSize: 9.5,
    sectionBodyFontSize: 9.2,
    itemGap: 2,
    itemPaddingY: 2.5,
    itemPaddingX: 4.5,
    accentWidth: 1.2,
    noteSpacing: 2.2,
    snapshotCols: 3,
    snapshotGap: 4,
    snapshotCellMinHeight: 17,
    snapshotLabelSize: 6.4,
    snapshotValueSize: 10
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

  var SECTION_ACCENTS = {
    "Urgent Issues": COLORS.red500,
    "VIP / Guest Information": COLORS.blue500,
    "Outstanding Tasks": COLORS.green500,
    "Maintenance": COLORS.amber500,
    "Payment Issues": COLORS.navy700,
    "Events": COLORS.purple500,
    "General Updates": COLORS.gray500,
    "Completed Actions": COLORS.green500
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

  function normalizeSnapshotValue(value) {
    if (value === null || value === undefined || value === "" || value === "undefined" || value === "null" ||
        (typeof value === "number" && isNaN(value))) {
      return "—";
    }
    return String(value);
  }

  function measureWrappedLines(doc, text, maxWidth, fontSize, fontStyle) {
    doc.setFont("helvetica", fontStyle || "normal");
    doc.setFontSize(fontSize);
    return wrapText(doc, text, maxWidth);
  }

  function blockHeight(lineCount, lineHeight, gap) {
    if (!lineCount) return 0;
    return lineCount * lineHeight + (gap || 0);
  }

  function stripTagPrefix(text) {
    return String(text || "").replace(/^\[[^\]]+\]\s*/, "").trim();
  }

  function parseNoteForPdfDisplay(text) {
    if (global.HandoverReport && global.HandoverReport.parseNoteBlock) {
      return global.HandoverReport.parseNoteBlock(text);
    }
    var raw = stripTagPrefix(text);
    if (!raw) return { heading: "", body: "" };
    var roomMatch = raw.match(/^(Room\s+\d+[a-z]?(?:\s*\/\s*Suite\s+\d+[a-z]?)?)\s*[:\-–—]\s*(.+)$/i);
    if (roomMatch) return { heading: roomMatch[1], body: roomMatch[2].trim() };
    var dashMatch = raw.match(/^([^—–-]{8,96})\s*[—–-]\s*(.+)$/);
    if (dashMatch) return { heading: dashMatch[1].trim(), body: dashMatch[2].trim() };
    return { heading: "", body: raw };
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
    return 4 + LAYOUT.sectionTitleGap;
  };

  PdfDocument.prototype.drawSectionTitle = function (title, keepWithHeight) {
    var doc = this.doc;
    var reserve = keepWithHeight || 0;

    this.ensureSpace(this.sectionTitleHeight() + reserve);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    setText(doc, COLORS.navy700);
    doc.text(title, LAYOUT.marginX, this.y);

    this.y += 3;
    setDraw(doc, COLORS.blue500);
    doc.setLineWidth(0.55);
    doc.line(LAYOUT.marginX, this.y, LAYOUT.marginX + 44, this.y);

    this.y += LAYOUT.sectionTitleGap;
  };

  PdfDocument.prototype.drawHeader = function (meta, generatedAt) {
    var doc = this.doc;
    var width = contentWidth();

    setFill(doc, COLORS.navy900);
    doc.roundedRect(LAYOUT.marginX, this.y, width, LAYOUT.headerHeight, LAYOUT.cardRadius, LAYOUT.cardRadius, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    setText(doc, COLORS.white);
    doc.text("Shift Handover Report", LAYOUT.marginX + 5.5, this.y + 8);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    setText(doc, [200, 215, 230]);
    doc.text("Hospitality Flow", LAYOUT.marginX + 5.5, this.y + 13.5);

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
    doc.roundedRect(LAYOUT.marginX, this.y, width, blockHeight, LAYOUT.cardRadius, LAYOUT.cardRadius, "FD");

    var leftX = LAYOUT.marginX + LAYOUT.metaPaddingX;
    var rightX = LAYOUT.marginX + width / 2 + 3.5;
    var row1Y = this.y + metaTopPad;
    var row2Y = row1Y + LAYOUT.metaRowHeight;
    var row3Y = row2Y + LAYOUT.metaRowHeight;

    this.drawMetaRow(leftX, row1Y, "Hotel", meta.hotel || "Not specified");
    this.drawMetaRow(rightX, row1Y, "Shift", meta.shift || "Not specified");
    this.drawMetaRow(leftX, row2Y, "Prepared By", meta.preparedBy || "Not specified");
    this.drawMetaRow(rightX, row2Y, "Date", meta.date || "Not specified");
    this.drawMetaRow(leftX, row3Y, "Generated", generatedAt);

    this.y += blockHeight + LAYOUT.sectionGap;
  };

  PdfDocument.prototype.drawMetaRow = function (x, y, label, value) {
    var doc = this.doc;
    var labelWidth = 26;
    var valueWidth = contentWidth() / 2 - labelWidth - LAYOUT.metaPaddingX - 2.5;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.4);
    setText(doc, COLORS.gray500);
    doc.text(label.toUpperCase(), x, y);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    setText(doc, COLORS.navy900);
    doc.text(wrapText(doc, value, valueWidth), x + labelWidth, y);
  };

  PdfDocument.prototype.measureSnapshotCell = function (cell, cellWidth) {
    var doc = this.doc;
    var label = String(cell.label || "").toUpperCase();
    var value = normalizeSnapshotValue(cell.value);
    var labelLines = measureWrappedLines(doc, label, cellWidth - 3, LAYOUT.snapshotLabelSize, "bold");
    var valueLines = measureWrappedLines(doc, value, cellWidth - 4, LAYOUT.snapshotValueSize, "bold");
    return Math.max(
      LAYOUT.snapshotCellMinHeight,
      8 + labelLines.length * 3.2 + valueLines.length * 4.8
    );
  };

  PdfDocument.prototype.drawHotelSnapshot = function (rows) {
    if (!rows || !rows.length) return;

    var doc = this.doc;
    var width = contentWidth();
    var cols = LAYOUT.snapshotCols;
    var gap = LAYOUT.snapshotGap;
    var cellWidth = (width - gap * (cols - 1)) / cols;
    var gridRows = [];

    for (var i = 0; i < rows.length; i += cols) {
      gridRows.push(rows.slice(i, i + cols));
    }

    var firstRowHeight = 0;
    if (gridRows[0]) {
      gridRows[0].forEach(function (cell) {
        firstRowHeight = Math.max(firstRowHeight, this.measureSnapshotCell(cell, cellWidth));
      }, this);
    }

    this.drawSectionTitle("Hotel Snapshot", firstRowHeight + 4);

    gridRows.forEach(function (rowCells, rowIndex) {
      var rowHeight = 0;
      rowCells.forEach(function (cell) {
        rowHeight = Math.max(rowHeight, this.measureSnapshotCell(cell, cellWidth));
      }, this);

      if (rowIndex > 0) this.ensureSpace(rowHeight + 2);

      var rowY = this.y;
      rowCells.forEach(function (cell, colIndex) {
        var x = LAYOUT.marginX + colIndex * (cellWidth + gap);
        var value = normalizeSnapshotValue(cell.value);
        var label = String(cell.label || "").toUpperCase();

        setFill(doc, COLORS.white);
        setDraw(doc, COLORS.gray200);
        doc.setLineWidth(0.2);
        doc.roundedRect(x, rowY, cellWidth, rowHeight, LAYOUT.cardRadius, LAYOUT.cardRadius, "FD");

        setFill(doc, COLORS.blue500);
        doc.rect(x, rowY, cellWidth, 1.2, "F");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(LAYOUT.snapshotLabelSize);
        setText(doc, COLORS.gray500);
        doc.text(wrapText(doc, label, cellWidth - 3), x + cellWidth / 2, rowY + 5, { align: "center" });

        doc.setFont("helvetica", "bold");
        doc.setFontSize(LAYOUT.snapshotValueSize);
        setText(doc, COLORS.navy900);
        var valueLines = wrapText(doc, value, cellWidth - 4);
        doc.text(valueLines, x + cellWidth / 2, rowY + 10.5, { align: "center" });
      });

      this.y = rowY + rowHeight + (rowIndex < gridRows.length - 1 ? 3 : 0);
    }, this);

    this.y += LAYOUT.sectionGap;
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

    return {
      overviewLines: overview
        ? measureWrappedLines(doc, overview, textWidth, LAYOUT.summaryOverviewSize)
        : [],
      rowBlocks: rows.filter(function (row) { return row && row.text; }).map(function (row) {
        return {
          heading: row.heading || "Summary",
          textLines: measureWrappedLines(doc, row.text, textWidth, LAYOUT.summarySubTextSize)
        };
      })
    };
  };

  PdfDocument.prototype.measureSummaryHeight = function (layout) {
    var height = LAYOUT.summaryPadding * 2;
    if (layout.overviewLines.length) {
      height += blockHeight(layout.overviewLines.length, LAYOUT.summaryLineHeight, 2);
    }
    if (layout.overviewLines.length && layout.rowBlocks.length) {
      height += 4;
    }
    layout.rowBlocks.forEach(function (block, index) {
      height += 3.2 + blockHeight(block.textLines.length, LAYOUT.summaryLineHeight, 0);
      if (index < layout.rowBlocks.length - 1) height += LAYOUT.summarySubGap;
    });
    return height;
  };

  PdfDocument.prototype.drawSummary = function (summary) {
    if (!summary) return;

    var doc = this.doc;
    var width = contentWidth();
    var padding = LAYOUT.summaryPadding;
    var textX = LAYOUT.marginX + padding;
    var textWidth = width - padding * 2;
    var layout = this.buildSummaryLayout(summary);

    if (!layout.overviewLines.length && !layout.rowBlocks.length) return;

    var firstChunk = layout.overviewLines.length
      ? blockHeight(Math.min(layout.overviewLines.length, 2), LAYOUT.summaryLineHeight, 2) + padding
      : 3.2 + blockHeight(layout.rowBlocks[0].textLines.length, LAYOUT.summaryLineHeight, 0) + padding;
    var boxHeight = this.measureSummaryHeight(layout);

    this.drawSectionTitle("AI Summary", firstChunk);
    this.ensureSpace(boxHeight + 2);

    setFill(doc, COLORS.blue50);
    setDraw(doc, COLORS.blue500);
    doc.setLineWidth(0.22);
    var boxTop = this.y;
    doc.roundedRect(LAYOUT.marginX, boxTop, width, boxHeight, LAYOUT.cardRadius, LAYOUT.cardRadius, "FD");

    this.y = boxTop + padding;

    if (layout.overviewLines.length) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(LAYOUT.summaryOverviewSize);
      setText(doc, COLORS.gray600);
      layout.overviewLines.forEach(function (line) {
        doc.text(line, textX, this.y);
        this.y += LAYOUT.summaryLineHeight;
      }, this);
      this.y += 2;
    }

    layout.rowBlocks.forEach(function (block, index) {
      if (index > 0 || layout.overviewLines.length) this.y += 1.5;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(LAYOUT.summarySubHeadingSize);
      setText(doc, COLORS.navy700);
      doc.text(block.heading.toUpperCase(), textX, this.y);
      this.y += 3.4;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(LAYOUT.summarySubTextSize);
      setText(doc, COLORS.gray600);
      block.textLines.forEach(function (line) {
        doc.text(line, textX, this.y);
        this.y += LAYOUT.summaryLineHeight;
      }, this);

      if (index < layout.rowBlocks.length - 1) this.y += LAYOUT.summarySubGap;
    }, this);

    this.y = boxTop + boxHeight + LAYOUT.sectionGap;
  };

  PdfDocument.prototype.measureNoteBlock = function (item, textWidth) {
    var doc = this.doc;
    var parsed = parseNoteForPdfDisplay(item);
    var headingLines = parsed.heading
      ? measureWrappedLines(doc, parsed.heading, textWidth, LAYOUT.sectionHeadingFontSize, "bold")
      : [];
    var bodyText = parsed.body || stripTagPrefix(item);
    var bodyLines = measureWrappedLines(doc, bodyText, textWidth, LAYOUT.sectionBodyFontSize);
    var height = LAYOUT.itemPaddingY * 2;
    height += blockHeight(headingLines.length, LAYOUT.lineHeight, 1);
    height += blockHeight(bodyLines.length, LAYOUT.lineHeight, LAYOUT.itemGap);
    return {
      parsed: parsed,
      headingLines: headingLines,
      bodyLines: bodyLines,
      height: height
    };
  };

  PdfDocument.prototype.drawNoteBlock = function (item, textWidth, accent) {
    var doc = this.doc;
    var block = this.measureNoteBlock(item, textWidth);
    var textX = LAYOUT.marginX + LAYOUT.itemPaddingX + LAYOUT.accentWidth + 2.5;
    var shortBlock = block.height <= 36;

    this.ensureSpace(Math.min(block.height, shortBlock ? block.height : 16) + 1);

    var accentTop = this.y + 1;
    setFill(doc, accent);
    doc.rect(
      LAYOUT.marginX + LAYOUT.itemPaddingX,
      accentTop,
      LAYOUT.accentWidth,
      Math.max(5, Math.min(block.height - 2, 18)),
      "F"
    );

    this.y += LAYOUT.itemPaddingY + 1;

    if (block.headingLines.length) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(LAYOUT.sectionHeadingFontSize);
      setText(doc, COLORS.navy700);
      block.headingLines.forEach(function (line) {
        this.ensureSpace(LAYOUT.lineHeight + 0.5);
        doc.text(line, textX, this.y);
        this.y += LAYOUT.lineHeight;
      }, this);
      this.y += 0.8;
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(LAYOUT.sectionBodyFontSize);
    setText(doc, COLORS.gray600);
    block.bodyLines.forEach(function (line) {
      this.ensureSpace(LAYOUT.lineHeight + 0.5);
      doc.text(line, textX, this.y);
      this.y += LAYOUT.lineHeight;
    }, this);

    this.y += LAYOUT.itemPaddingY + LAYOUT.noteSpacing;
  };

  PdfDocument.prototype.drawBulletList = function (title, intro, items) {
    if (!items || !items.length) return;

    var doc = this.doc;
    var width = contentWidth();
    var bulletX = LAYOUT.marginX + 2;
    var textX = LAYOUT.marginX + 8;
    var textWidth = width - 12;
    var firstLines = measureWrappedLines(doc, items[0], textWidth, LAYOUT.bodyFontSize);
    var firstHeight = blockHeight(firstLines.length, LAYOUT.lineHeight, LAYOUT.itemGap) + 2;

    this.drawSectionTitle(title, firstHeight + (intro ? 5 : 0));

    if (intro) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.2);
      setText(doc, COLORS.gray500);
      doc.text(intro, LAYOUT.marginX, this.y);
      this.y += 5;
    }

    items.forEach(function (item, index) {
      var lines = measureWrappedLines(doc, item, textWidth, LAYOUT.bodyFontSize);
      var itemHeight = blockHeight(lines.length, LAYOUT.lineHeight, LAYOUT.itemGap) + 1.5;
      if (index > 0) this.ensureSpace(itemHeight + 0.5);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(LAYOUT.bodyFontSize);
      setText(doc, COLORS.gray600);
      doc.text("•", bulletX, this.y);
      doc.text(lines, textX, this.y);
      this.y += itemHeight;
    }, this);

    this.y += LAYOUT.sectionGap;
  };

  PdfDocument.prototype.drawRecommendations = function (recommendations) {
    if (!recommendations || !recommendations.length) return;
    this.drawBulletList("Shift Intelligence", "Recommendations for the incoming shift", recommendations);
  };

  PdfDocument.prototype.drawIntelligenceChecklist = function (checklistItems) {
    if (!checklistItems || !checklistItems.length) return;
    this.drawBulletList("Shift Intelligence Checklist", "What might the team have forgotten?", checklistItems);
  };

  PdfDocument.prototype.drawHandoverSections = function (sections) {
    if (!sections || !sections.length) return;

    var width = contentWidth();
    var textWidth = width - LAYOUT.itemPaddingX * 2 - LAYOUT.accentWidth - 3;
    var visibleSections = sections.filter(function (section) {
      return section && section.items && section.items.length;
    });

    if (!visibleSections.length) return;

    visibleSections.forEach(function (section) {
      var title = section.title || "Section";
      var items = section.items || [];
      var accent = SECTION_ACCENTS[title] || COLORS.blue500;
      var firstBlock = this.measureNoteBlock(items[0], textWidth);

      this.drawSectionTitle(title, Math.min(firstBlock.height, 20));

      items.forEach(function (item, index) {
        if (index > 0) this.y += 0.5;
        this.drawNoteBlock(item, textWidth, accent);
      }, this);

      this.y += LAYOUT.sectionGap - LAYOUT.noteSpacing;
    }, this);
  };

  PdfDocument.prototype.save = function (filename) {
    this.drawFooter();
    this.doc.save(filename);
  };

  PdfDocument.prototype.getDocument = function () {
    this.drawFooter();
    return this.doc;
  };

  function buildHandoverPdfDocument(jsPDF, payload) {
    if (!jsPDF) {
      throw new Error("jsPDF is not loaded");
    }
    if (!payload || !payload.meta) {
      throw new Error("Invalid handover payload");
    }

    var pdf = new PdfDocument(jsPDF);
    var generatedAt = payload.generatedAt || new Date().toLocaleString("en-GB");

    pdf.drawHeader(payload.meta, generatedAt);
    pdf.drawHotelSnapshot(payload.hotelSnapshot);
    pdf.drawSummary(payload.summary);
    pdf.drawHandoverSections(payload.sections);
    pdf.drawRecommendations(payload.recommendations);
    pdf.drawIntelligenceChecklist(payload.intelligenceChecklist);

    return pdf.getDocument();
  }

  function exportHandoverPdf(payload) {
    if (!global.jspdf || !global.jspdf.jsPDF) {
      throw new Error("jsPDF is not loaded");
    }
    var doc = buildHandoverPdfDocument(global.jspdf.jsPDF, payload);
    doc.save(buildFilename(payload.meta));
  }

  function countHandoverPdfPages(payload) {
    if (!global.jspdf || !global.jspdf.jsPDF) {
      throw new Error("jsPDF is not loaded");
    }
    var doc = buildHandoverPdfDocument(global.jspdf.jsPDF, payload);
    return doc.internal.getNumberOfPages();
  }

  global.HandoverPdfExporter = {
    export: exportHandoverPdf,
    countPages: countHandoverPdfPages
  };
})(typeof window !== "undefined" ? window : this);
