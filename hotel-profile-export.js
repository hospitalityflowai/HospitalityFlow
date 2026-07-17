/**
 * Hospitality Flow — Hotel Profile PDF & Print Export
 * Uses jsPDF (loaded separately). Reads profile data object from collectProfileData().
 */
(function (global) {
  'use strict';

  var COLORS = {
    navy900: [12, 24, 41],
    navy800: [18, 34, 64],
    blue500: [74, 143, 196],
    gray500: [90, 101, 120],
    gray200: [216, 224, 234],
    gray100: [238, 242, 247],
    white: [255, 255, 255]
  };

  var POLICY_GROUP_LABELS = {
    guest: 'Guest policies',
    payment: 'Payment policies',
    operational: 'Operational policies'
  };

  function isBlank(v) {
    if (v == null) return true;
    if (typeof v === 'boolean') return false;
    if (typeof v === 'number') return false;
    if (Array.isArray(v)) return v.length === 0;
    if (typeof v === 'object') return Object.keys(v).length === 0;
    return String(v).trim() === '';
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function fmtDate(iso) {
    if (!iso) return new Date().toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    try {
      return new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return String(iso);
    }
  }

  function slug(name) {
    return String(name || 'hotel-profile').trim()
      .replace(/[^\w\-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'hotel-profile';
  }

  function hexToRgb(hex) {
    var m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '');
    return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : COLORS.blue500;
  }

  function fieldRows(pairs) {
    var rows = pairs.filter(function (p) { return !isBlank(p[1]); });
    if (!rows.length) return '';
    return rows.map(function (p) {
      return '<tr><th>' + esc(p[0]) + '</th><td>' + esc(p[1]).replace(/\n/g, '<br>') + '</td></tr>';
    }).join('');
  }

  function section(title, innerHtml) {
    if (!innerHtml || !String(innerHtml).trim()) return '';
    return '<section class="hp-doc-section"><h2>' + esc(title) + '</h2>' + innerHtml + '</section>';
  }

  function table(headers, rows) {
    if (!rows || !rows.length) return '';
    var head = headers.map(function (h) { return '<th>' + esc(h) + '</th>'; }).join('');
    var body = rows.map(function (row) {
      return '<tr>' + row.map(function (cell) { return '<td>' + esc(cell == null ? '' : cell) + '</td>'; }).join('') + '</tr>';
    }).join('');
    return '<table class="hp-doc-table"><thead><tr>' + head + '</tr></thead><tbody>' + body + '</tbody></table>';
  }

  function buildPoliciesHtml(data) {
    var structured = data.policiesStructured;
    if (!structured || typeof structured !== 'object') {
      var legacy = data.policies || {};
      var pairs = [
        ['Early check-in', legacy.earlyCheckIn], ['Late check-out', legacy.lateCheckOut],
        ['Cancellation', legacy.cancellation], ['No-show', legacy.noShow], ['Refund', legacy.refund],
        ['Deposit', legacy.deposit], ['Guest compensation', legacy.guestCompensation],
        ['Lost property', legacy.lostProperty], ['Keys / cards', legacy.keysOrCards],
        ['Guest loan items', legacy.guestLoanItems], ['Smoking', legacy.smoking],
        ['Visitors', legacy.visitors], ['Pets', legacy.pets], ['Custom notes', legacy.customNotes]
      ].filter(function (p) { return !isBlank(p[1]); });
      if (!pairs.length) return '';
      return section('Policies', '<table class="hp-doc-kv">' + fieldRows(pairs) + '</table>');
    }
    var html = '';
    Object.keys(POLICY_GROUP_LABELS).forEach(function (gid) {
      var group = structured[gid] || {};
      var cards = Object.keys(group).map(function (key) {
        var e = group[key] || {};
        if (isBlank(e.instructions) && isBlank(e.summary) && isBlank(e.title)) return '';
        var parts = [];
        if (!isBlank(e.summary)) parts.push('<p class="hp-doc-lead">' + esc(e.summary) + '</p>');
        if (!isBlank(e.instructions)) parts.push('<p>' + esc(e.instructions).replace(/\n/g, '<br>') + '</p>');
        var meta = [];
        if (!isBlank(e.approvalLevel)) meta.push('Approval: ' + esc(e.approvalLevel));
        if (!isBlank(e.charge)) meta.push('Charge: ' + esc(e.charge));
        if (!isBlank(e.escalation)) meta.push('Escalation: ' + esc(e.escalation));
        if (!isBlank(e.lastUpdated)) meta.push('Updated: ' + esc(e.lastUpdated));
        if (meta.length) parts.push('<p class="hp-doc-meta">' + meta.join(' · ') + '</p>');
        return '<div class="hp-doc-block"><h3>' + esc(e.title || key) + '</h3>' + parts.join('') + '</div>';
      }).filter(Boolean).join('');
      if (cards) html += '<h3 class="hp-doc-sub">' + esc(POLICY_GROUP_LABELS[gid]) + '</h3>' + cards;
    });
    return html ? section('Policies', html) : '';
  }

  function buildDocumentHtml(data) {
    var g = data.general || {};
    var hotelName = g.hotelName || 'Hotel Profile';
    var generated = fmtDate(data.savedAt || new Date().toISOString());

    var generalPairs = [
      ['Hotel group', g.hotelGroup], ['Property code', g.hotelCode], ['Property type', g.hotelType],
      ['Star rating', g.starRating], ['Total rooms', g.totalRooms], ['Floors', g.totalFloors],
      ['Address', [g.address, g.city, g.country].filter(function (x) { return !isBlank(x); }).join(', ')],
      ['Time zone', g.timezone], ['Currency', g.currency], ['Phone', g.phone], ['Email', g.email],
      ['Brand voice', g.brandVoice], ['Operating notes', g.operatingNotes], ['Description', g.description]
    ];
    var generalHtml = fieldRows(generalPairs);
    var ai = data.aiPrefs || {};
    var aiPairs = [
      ['Writing tone', ai.tone], ['Detail level', ai.detail], ['Language', ai.language],
      ['Date format', ai.dateFormat], ['Additional instructions', ai.instructions]
    ];
    var aiHtml = fieldRows(aiPairs);

    var roomTypeRows = (data.rooms || []).filter(function (r) {
      return r && (r.code || r.type || r.count);
    }).map(function (r) {
      return [r.code || '', r.type || '', r.count || '', r.floors || '', r.maxGuests || ''];
    });

    var invRows = (data.inventory || []).filter(function (r) {
      return r && (r.roomNo || r.category);
    }).map(function (r) {
      var flags = [];
      if (r.accessible) flags.push('Accessible');
      if (r.vip) flags.push('VIP');
      return [r.roomNo || '', r.floor || '', r.category || '', r.bathroom || '', r.maxGuests || '', r.interconnecting || '', flags.join(', '), r.notes || ''];
    });

    var rfRows = (data.roomFacilities || []).filter(function (r) {
      return r && (r.roomNo || r.roomType);
    }).map(function (r) {
      var attrs = [];
      if (r.twinCapable) attrs.push('Twin');
      if (r.extraBedCapable) attrs.push('Extra bed');
      if (r.bathtub) attrs.push('Bath');
      if (r.shower) attrs.push('Shower');
      if (r.accessible) attrs.push('Accessible');
      if (r.quietFacing) attrs.push('Quiet/rear');
      return [r.roomNo || '', r.roomType || '', r.floor || '', r.bedType || '', r.maxOccupancy || '', attrs.join(', '), r.notes || ''];
    });

    var pet = data.petRooms || {};
    var petHtml = '';
    if (!isBlank(pet.room1) || !isBlank(pet.room2)) {
      petHtml = '<p>Pet-friendly rooms: ' + esc([pet.room1, pet.room2].filter(function (x) { return !isBlank(x); }).join(', ')) + '</p>';
    }

    var deptRows = (data.departments || []).filter(function (d) { return d && d.name; }).map(function (d) {
      return [d.name, d.head || '', d.contact || '', d.email || '', d.instructions || ''];
    });

    var shiftRows = ((data.shifts && data.shifts.rows) || []).filter(function (s) { return s && (s.code || s.name); }).map(function (s) {
      return [s.code || '', s.name || '', s.start || '', s.end || '', s.dept || ''];
    });
    var shiftNote = '';
    if (data.shifts) {
      shiftNote = '<p class="hp-doc-meta">Pattern: ' + esc(data.shifts.pattern || '8hour');
      if (data.shifts.overnightSupport) shiftNote += ' · Overnight shifts cross midnight';
      shiftNote += '</p>';
    }

    var termRows = (data.terminology || []).filter(function (t) { return t && t.term; }).map(function (t) {
      return [t.term, t.definition || ''];
    });

    var fac = data.facilities || {};
    var facChecked = (fac.checked || []).map(function (id) {
      return id.replace(/^fac-/, '').replace(/-/g, ' ');
    });
    var facHtml = '';
    if (facChecked.length || !isBlank(fac.custom)) {
      if (facChecked.length) facHtml += '<p>' + esc(facChecked.join(', ')) + '</p>';
      if (!isBlank(fac.custom)) facHtml += '<p>' + esc(fac.custom).replace(/\n/g, '<br>') + '</p>';
    }

    var otaHtml = '';
    var channels = data.otaChannels || [];
    if (channels.length) {
      otaHtml = channels.map(function (ch) {
        var pairs = [
          ['Payment model', ch.paymentModel], ['Prepaid / pay at property', ch.prepaidOrPayAtProperty],
          ['Refundable', ch.refundable], ['Cancellation deadline', ch.cancellationDeadline],
          ['Virtual card activation', ch.virtualCardActivation], ['Card expiry rules', ch.cardExpiryRules],
          ['Commission notes', ch.commissionNotes], ['Invoice rules', ch.invoiceRules],
          ['Refund procedure', ch.refundProcedure], ['Special instructions', ch.specialInstructions]
        ].filter(function (p) { return !isBlank(p[1]); });
        if (!pairs.length) return '';
        return '<div class="hp-doc-block"><h3>' + esc(ch.label || ch.type) + '</h3><table class="hp-doc-kv">' + fieldRows(pairs) + '</table></div>';
      }).join('');
    }

    var gs = data.guestServices || {};
    var gsPairs = [
      ['Airport transfers', gs.airportTransfers], ['Preferred taxi', gs.preferredTaxi],
      ['Transfer prices', gs.transferPrices], ['Wake-up calls', gs.wakeUpCalls],
      ['Luggage storage', gs.luggageStorage], ['Guest item loans', gs.guestItemLoans],
      ['Restaurant bookings', gs.restaurantBookings], ['Special occasions', gs.specialOccasions],
      ['Welcome amenities', gs.welcomeAmenities], ['Local recommendations', gs.localRecommendations],
      ['Custom instructions', gs.customInstructions]
    ];
    var gsInner = '';
    var gsKv = fieldRows(gsPairs);
    if (gsKv) gsInner += '<table class="hp-doc-kv">' + gsKv + '</table>';
    if (gs.suppliers && gs.suppliers.length) {
      gsInner += table(['Supplier', 'Service', 'Contact', 'Notes'], gs.suppliers.filter(function (s) { return s && s.name; }).map(function (s) {
        return [s.name, s.service || '', s.contact || '', s.notes || ''];
      }));
    }
    if (gs.loanItems && gs.loanItems.length) {
      gsInner += table(['Loan item', 'Notes'], gs.loanItems.filter(function (l) { return l && l.item; }).map(function (l) {
        return [l.item, l.notes || ''];
      }));
    }

    var supplyRows = (data.supplies || []).filter(function (s) { return s && s.name; }).map(function (s) {
      return [s.name, s.category || '', s.quantity || '', s.minStock || '', s.unit || '', s.status || '', s.supplier || '', s.reorderNotes || ''];
    });

    var trackers = data.operationsTrackers || [];
    var trackerHtml = trackers.filter(function (t) {
      return t && (t.enabled || !isBlank(t.notes) || !isBlank(t.department));
    }).map(function (t) {
      var pairs = [
        ['Status', t.enabled ? 'Enabled' : 'Disabled'], ['Department', t.department],
        ['Required fields', t.requiredFields], ['Escalation rules', t.escalationRules],
        ['Email recipients', t.emailRecipients], ['Retention', t.retentionPeriod], ['Notes', t.notes]
      ].filter(function (p) { return !isBlank(p[1]); });
      return '<div class="hp-doc-block"><h3>' + esc(t.label || t.key) + '</h3><table class="hp-doc-kv">' + fieldRows(pairs) + '</table></div>';
    }).join('');

    var ops = data.operations || {};
    if (!trackerHtml && ops.morningEmailRecipients && ops.morningEmailRecipients.length) {
      trackerHtml += table(['Name', 'Email'], ops.morningEmailRecipients.map(function (r) { return [r.name || '', r.email || '']; }));
    }

    var ac = data.academy || {};
    var acPairs = [
      ['Academy enabled', ac.enabled ? 'Yes' : 'No'],
      ['Departments included', (ac.departmentsIncluded || []).join(', ')],
      ['New starter training', ac.newStarterTraining], ['Role-specific training', ac.roleSpecificTraining],
      ['Refresher training', ac.refresherTraining], ['Manager-assigned modules', ac.managerAssignedModules],
      ['Training tone', ac.trainingTone], ['Pass score', ac.passScore], ['Custom instructions', ac.notes],
      ['Auto-generate modules', ac.autoGenerate ? 'Yes' : 'No']
    ];
    var src = ac.contentSources || {};
    if (src.sops || src.policies || src.rooms || src.operations) {
      var srcList = [];
      if (src.sops) srcList.push('SOPs');
      if (src.policies) srcList.push('Policies');
      if (src.rooms) srcList.push('Room knowledge');
      if (src.operations) srcList.push('Operations');
      acPairs.splice(2, 0, ['Content sources', srcList.join(', ')]);
    }

    var logoHtml = g.logo ? '<img class="hp-doc-logo" src="' + g.logo + '" alt="">' : '';

    var body = [
      section('General Hotel Details', (generalHtml ? '<table class="hp-doc-kv">' + generalHtml + '</table>' : '') + (aiHtml ? '<h3 class="hp-doc-sub">AI Preferences</h3><table class="hp-doc-kv">' + aiHtml + '</table>' : '')),
      section('Room Structure', (roomTypeRows.length ? table(['Code', 'Type', 'Count', 'Floors', 'Max guests'], roomTypeRows) : '') + petHtml),
      section('Room Inventory', invRows.length ? table(['Room', 'Floor', 'Category', 'Bathroom', 'Max guests', 'Interconnecting', 'Flags', 'Notes'], invRows) : ''),
      section('Room Directory', rfRows.length ? table(['Room', 'Type', 'Floor', 'Bed', 'Max occ.', 'Features', 'Notes'], rfRows) : ''),
      section('Facilities', facHtml),
      section('Departments', deptRows.length ? table(['Department', 'Lead', 'Contact', 'Email', 'Instructions'], deptRows) : ''),
      section('Shift Structure', shiftNote + (shiftRows.length ? table(['Code', 'Name', 'Start', 'End', 'Department'], shiftRows) : '')),
      section('Hotel Terminology', termRows.length ? table(['Term', 'Definition'], termRows) : ''),
      buildPoliciesHtml(data),
      section('OTA & Payment Rules', otaHtml),
      section('Guest Services', gsInner),
      section('Inventory & Supplies', supplyRows.length ? table(['Item', 'Category', 'Qty', 'Min stock', 'Unit', 'Status', 'Supplier', 'Reorder notes'], supplyRows) : ''),
      section('Operations & Tracking', trackerHtml),
      section('Hospitality Academy', fieldRows(acPairs) ? '<table class="hp-doc-kv">' + fieldRows(acPairs) + '</table>' : '')
    ].filter(Boolean).join('');

    return '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>' + esc(hotelName) + ' — Hotel Profile</title><style>' +
      getDocumentStyles(g.brandColor) +
      '</style></head><body><div class="hp-doc">' +
      '<header class="hp-doc-header">' + logoHtml +
      '<div><p class="hp-doc-brand">Hospitality Flow</p><h1>' + esc(hotelName) + '</h1>' +
      '<p class="hp-doc-subtitle">Hotel Knowledge Layer — Profile Summary</p>' +
      '<p class="hp-doc-meta">Generated ' + esc(generated) + '</p></div></header>' +
      body +
      '<footer class="hp-doc-footer">Hospitality Flow · Confidential — for internal management review</footer>' +
      '</div></body></html>';
  }

  function getDocumentStyles(brandColor) {
    var accent = brandColor && /^#[0-9A-Fa-f]{6}$/.test(brandColor) ? brandColor : '#4a8fc4';
    return '@page{margin:16mm 14mm}body{font-family:Inter,system-ui,sans-serif;color:#122240;background:#fff;font-size:10.5pt;line-height:1.5;margin:0}' +
      '.hp-doc{max-width:780px;margin:0 auto;padding:24px 0}' +
      '.hp-doc-header{display:flex;align-items:flex-start;gap:20px;padding-bottom:18px;margin-bottom:22px;border-bottom:3px solid ' + accent + '}' +
      '.hp-doc-logo{max-width:72px;max-height:72px;object-fit:contain;border-radius:8px}' +
      '.hp-doc-brand{font-size:8pt;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:' + accent + ';margin:0 0 4px}' +
      '.hp-doc-header h1{font-size:20pt;font-weight:700;margin:0 0 4px;color:#0c1829}' +
      '.hp-doc-subtitle{font-size:10pt;color:#5a6578;margin:0 0 6px}' +
      '.hp-doc-meta{font-size:8.5pt;color:#7a8799;margin:0}' +
      '.hp-doc-section{margin-bottom:22px;page-break-inside:avoid}' +
      '.hp-doc-section h2{font-size:12pt;font-weight:700;color:#122240;margin:0 0 10px;padding-bottom:6px;border-bottom:1px solid #d8e0ea;page-break-after:avoid}' +
      '.hp-doc-sub{font-size:10pt;font-weight:700;color:#1a3055;margin:14px 0 8px}' +
      '.hp-doc-block{margin-bottom:12px;padding:10px 12px;background:#f8fafc;border:1px solid #eef2f7;border-radius:8px;page-break-inside:avoid}' +
      '.hp-doc-block h3{font-size:9.5pt;font-weight:700;margin:0 0 6px;color:#122240}' +
      '.hp-doc-lead{font-weight:600;color:#3d4654;margin:0 0 6px}' +
      '.hp-doc-kv,.hp-doc-table{width:100%;border-collapse:collapse;font-size:9pt;margin-bottom:8px}' +
      '.hp-doc-kv th,.hp-doc-table th{text-align:left;font-weight:600;color:#5a6578;padding:6px 10px 6px 0;vertical-align:top;width:32%;border-bottom:1px solid #eef2f7}' +
      '.hp-doc-kv td,.hp-doc-table td{padding:6px 0;color:#122240;border-bottom:1px solid #eef2f7;vertical-align:top}' +
      '.hp-doc-table thead th{background:#f8fafc;border-bottom:1px solid #d8e0ea;font-size:8pt;text-transform:uppercase;letter-spacing:.04em}' +
      '.hp-doc-footer{margin-top:28px;padding-top:12px;border-top:1px solid #d8e0ea;font-size:8pt;color:#7a8799;text-align:center}';
  }

  function printProfile(data) {
    var html = buildDocumentHtml(data);
    var win = global.open('', '_blank', 'noopener,noreferrer');
    if (!win) {
      alert('Please allow pop-ups to print the profile.');
      return;
    }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(function () {
      win.print();
    }, 350);
  }

  function PdfWriter(jsPDF, brandColor) {
    this.doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    this.y = 16;
    this.marginX = 14;
    this.pageW = 210;
    this.pageH = 297;
    this.bottom = 282;
    this.contentW = this.pageW - this.marginX * 2;
    this.accent = brandColor && /^#[0-9A-Fa-f]{6}$/.test(brandColor) ? brandColor : '#4a8fc4';
    this.accentRgb = hexToRgb(this.accent);
  }

  PdfWriter.prototype.ensure = function (h) {
    if (this.y + h <= this.bottom) return;
    this.doc.addPage();
    this.y = 16;
  };

  PdfWriter.prototype.sectionTitle = function (title) {
    this.ensure(14);
    this.y += 4;
    this.doc.setDrawColor.apply(this.doc, COLORS.gray200);
    this.doc.setLineWidth(0.3);
    this.doc.line(this.marginX, this.y, this.marginX + this.contentW, this.y);
    this.y += 5;
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(12);
    this.doc.setTextColor.apply(this.doc, COLORS.navy800);
    this.doc.text(title, this.marginX, this.y);
    this.y += 7;
  };

  PdfWriter.prototype.paragraph = function (text, opts) {
    if (isBlank(text)) return;
    opts = opts || {};
    this.doc.setFont('helvetica', opts.bold ? 'bold' : 'normal');
    this.doc.setFontSize(opts.size || 9);
    this.doc.setTextColor.apply(this.doc, opts.muted ? COLORS.gray500 : COLORS.navy900);
    var lines = this.doc.splitTextToSize(String(text), this.contentW);
    this.ensure(lines.length * 4.8 + 2);
    this.doc.text(lines, this.marginX, this.y);
    this.y += lines.length * 4.8 + (opts.gap == null ? 3 : opts.gap);
  };

  PdfWriter.prototype.keyValue = function (label, value) {
    if (isBlank(value)) return;
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(8.5);
    this.doc.setTextColor.apply(this.doc, COLORS.gray500);
    this.doc.text(label + ':', this.marginX, this.y);
    this.y += 4.2;
    this.paragraph(value, { size: 9, gap: 4 });
  };

  PdfWriter.prototype.drawHeader = function (data) {
    var g = data.general || {};
    var hotelName = g.hotelName || 'Hotel Profile';
    this.doc.setDrawColor.apply(this.doc, this.accentRgb);
    this.doc.setLineWidth(1);
    this.doc.line(this.marginX, 12, this.marginX + this.contentW, 12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(8);
    this.doc.setTextColor.apply(this.doc, COLORS.gray500);
    this.doc.text('HOSPITALITY FLOW', this.marginX, 10);
    this.doc.setFontSize(18);
    this.doc.setTextColor.apply(this.doc, COLORS.navy900);
    this.doc.text(hotelName, this.marginX, 22);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(10);
    this.doc.setTextColor.apply(this.doc, COLORS.gray500);
    this.doc.text('Hotel Knowledge Layer — Profile Summary', this.marginX, 28);
    this.doc.setFontSize(8.5);
    this.doc.text('Generated ' + fmtDate(data.savedAt), this.marginX, 33);
    this.y = 40;
  };

  function downloadProfilePdf(data) {
    if (!global.jspdf || !global.jspdf.jsPDF) {
      alert('PDF library not loaded. Please refresh the page and try again.');
      return;
    }
    var g = data.general || {};
    var pdf = new PdfWriter(global.jspdf.jsPDF, g.brandColor);
    pdf.drawHeader(data);

    function addSection(title, fn) {
      var startY = pdf.y;
      fn();
      if (pdf.y > startY + 1) pdf.sectionTitle(title);
    }

    // Simpler: render sections sequentially
    var gPairs = [
      ['Hotel group', g.hotelGroup], ['Property code', g.hotelCode], ['Property type', g.hotelType],
      ['Star rating', g.starRating], ['Total rooms', g.totalRooms], ['Floors', g.totalFloors],
      ['Address', [g.address, g.city, g.country].filter(function (x) { return !isBlank(x); }).join(', ')],
      ['Time zone', g.timezone], ['Currency', g.currency], ['Phone', g.phone], ['Email', g.email],
      ['Brand voice', g.brandVoice], ['Operating notes', g.operatingNotes], ['Description', g.description]
    ].filter(function (p) { return !isBlank(p[1]); });

    if (gPairs.length) {
      pdf.sectionTitle('General Hotel Details');
      gPairs.forEach(function (p) { pdf.keyValue(p[0], p[1]); });
    }

    var roomRows = (data.rooms || []).filter(function (r) { return r && (r.code || r.type); });
    if (roomRows.length) {
      pdf.sectionTitle('Room Structure');
      roomRows.forEach(function (r) {
        pdf.paragraph([r.code, r.type, 'Count: ' + (r.count || ''), 'Floors: ' + (r.floors || ''), 'Max guests: ' + (r.maxGuests || '')].filter(Boolean).join(' · '), { gap: 2 });
      });
    }

    var rf = (data.roomFacilities || []).filter(function (r) { return r && r.roomNo; });
    if (rf.length) {
      pdf.sectionTitle('Room Directory');
      rf.forEach(function (r) {
        pdf.paragraph('Room ' + r.roomNo + ' — ' + (r.roomType || '') + (r.bedType ? ' · ' + r.bedType : '') + (r.notes ? '\n' + r.notes : ''), { gap: 3 });
      });
    }

    var depts = (data.departments || []).filter(function (d) { return d && d.name; });
    if (depts.length) {
      pdf.sectionTitle('Departments');
      depts.forEach(function (d) {
        pdf.paragraph(d.name + (d.head ? ' — ' + d.head : '') + (d.email ? '\n' + d.email : '') + (d.instructions ? '\n' + d.instructions : ''), { gap: 3 });
      });
    }

    var shifts = (data.shifts && data.shifts.rows) || [];
    if (shifts.length) {
      pdf.sectionTitle('Shift Structure');
      shifts.forEach(function (s) {
        if (!s.code && !s.name) return;
        pdf.paragraph((s.code || '') + ' ' + (s.name || '') + ' · ' + (s.start || '') + '–' + (s.end || '') + (s.dept ? ' · ' + s.dept : ''), { gap: 2 });
      });
    }

    var polHtml = buildPoliciesHtml(data);
    if (polHtml) {
      pdf.sectionTitle('Policies');
      var structured = data.policiesStructured || {};
      var hasStructured = false;
      Object.keys(POLICY_GROUP_LABELS).forEach(function (gid) {
        var group = structured[gid] || {};
        Object.keys(group).forEach(function (key) {
          var e = group[key] || {};
          if (isBlank(e.instructions) && isBlank(e.summary)) return;
          hasStructured = true;
          pdf.paragraph((e.title || key) + (e.summary ? '\n' + e.summary : '') + (e.instructions ? '\n' + e.instructions : ''), { gap: 4 });
        });
      });
      if (!hasStructured && data.policies) {
        Object.keys(data.policies).forEach(function (k) {
          if (!isBlank(data.policies[k])) pdf.keyValue(k, data.policies[k]);
        });
      }
    }

    var channels = data.otaChannels || [];
    if (channels.length) {
      pdf.sectionTitle('OTA & Payment Rules');
      channels.forEach(function (ch) {
        pdf.paragraph((ch.label || ch.type) + (ch.specialInstructions ? '\n' + ch.specialInstructions : ''), { bold: true, gap: 4 });
      });
    }

    var gs = data.guestServices || {};
    var gsFilled = ['airportTransfers', 'preferredTaxi', 'transferPrices', 'wakeUpCalls', 'luggageStorage', 'guestItemLoans', 'restaurantBookings', 'specialOccasions', 'welcomeAmenities', 'localRecommendations', 'customInstructions'].filter(function (k) { return !isBlank(gs[k]); });
    if (gsFilled.length) {
      pdf.sectionTitle('Guest Services');
      gsFilled.forEach(function (k) { pdf.keyValue(k.replace(/([A-Z])/g, ' $1'), gs[k]); });
    }

    var supplies = (data.supplies || []).filter(function (s) { return s && s.name; });
    if (supplies.length) {
      pdf.sectionTitle('Inventory & Supplies');
      supplies.forEach(function (s) {
        pdf.paragraph(s.name + (s.category ? ' · ' + s.category : '') + (s.quantity ? ' · Qty ' + s.quantity : '') + (s.status ? ' · ' + s.status : ''), { gap: 2 });
      });
    }

    var trackers = (data.operationsTrackers || []).filter(function (t) { return t && t.enabled; });
    if (trackers.length) {
      pdf.sectionTitle('Operations & Tracking');
      trackers.forEach(function (t) {
        pdf.paragraph((t.label || t.key) + (t.department ? ' · ' + t.department : '') + (t.notes ? '\n' + t.notes : ''), { gap: 3 });
      });
    }

    var ac = data.academy || {};
    if (ac.enabled || !isBlank(ac.notes) || !isBlank(ac.newStarterTraining)) {
      pdf.sectionTitle('Hospitality Academy');
      if (ac.enabled) pdf.paragraph('Academy enabled for this property', { gap: 2 });
      if (!isBlank(ac.notes)) pdf.keyValue('Instructions', ac.notes);
    }

    pdf.ensure(10);
    pdf.doc.setFontSize(7.5);
    pdf.doc.setTextColor.apply(pdf.doc, COLORS.gray500);
    pdf.doc.text('Hospitality Flow · Confidential — for internal management review', pdf.marginX, pdf.pageH - 10);

    var filename = slug(g.hotelName) + '-profile.pdf';
    pdf.doc.save(filename);
  }

  global.HotelProfileExport = {
    buildDocumentHtml: buildDocumentHtml,
    printProfile: printProfile,
    downloadProfilePdf: downloadProfilePdf
  };
})(typeof window !== 'undefined' ? window : globalThis);
