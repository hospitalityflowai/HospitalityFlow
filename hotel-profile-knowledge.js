/**
 * Hospitality Flow — Hotel Profile Knowledge Layer extensions
 * Loaded by hotel-profile.html. Preserves legacy schema fields for Handover/SOP.
 */
(function (global) {
  'use strict';

  var SCHEMA_V3 = 3;

  var PROFILE_SECTIONS = [
    { id: 'general', label: 'General Hotel Details', shortLabel: 'General', icon: 'home', layer: 'essential' },
    { id: 'rooms-facilities', label: 'Rooms & Facilities', shortLabel: 'Rooms & Facilities', icon: 'grid', layer: 'essential' },
    { id: 'departments-shifts', label: 'Departments', shortLabel: 'Departments', icon: 'users', layer: 'essential' },
    { id: 'policies', label: 'Policies', shortLabel: 'Policies', icon: 'document', layer: 'essential' },
    { id: 'hotel-knowledge', label: 'Hotel Knowledge', shortLabel: 'Hotel Knowledge', icon: 'knowledge', layer: 'optional' },
    { id: 'reservations-payments', label: 'Booking Channels', shortLabel: 'Booking Channels', icon: 'card', layer: 'optional' },
    { id: 'guest-services', label: 'Guest Services', shortLabel: 'Guest Services', icon: 'concierge', layer: 'optional' },
    { id: 'inventory', label: 'Inventory', shortLabel: 'Inventory', icon: 'box', layer: 'optional' },
    { id: 'advanced-settings', label: 'Settings', shortLabel: 'Settings', icon: 'settings', layer: 'settings' }
  ];

  var DEFAULT_DEPARTMENTS = [
    { name: 'Reception', head: '', contact: '', email: '', instructions: '' },
    { name: 'Housekeeping', head: '', contact: '', email: '', instructions: '' },
    { name: 'Maintenance', head: '', contact: '', email: '', instructions: '' },
    { name: 'Food & Beverage', head: '', contact: '', email: '', instructions: '' },
    { name: 'Night Team', head: '', contact: '', email: '', instructions: '' },
    { name: 'Management', head: '', contact: '', email: '', instructions: '' }
  ];

  var POLICY_NOTES_GROUPS = [
    {
      id: 'guest',
      label: 'Guest Policies',
      items: [
        { key: 'checkInOut', label: 'Check-in and Check-out', placeholder: 'e.g. Late check-out depends on occupancy.\nEarly check-in is offered when rooms are ready.' },
        { key: 'cancellationsNoShows', label: 'Cancellations and No-shows', placeholder: 'e.g. Cancellations within 24 hours are charged one night.\nNo-shows follow the same charge unless Management approves a waiver.' },
        { key: 'visitorsSecurity', label: 'Visitors and Security', placeholder: 'e.g. Visitors must sign in at Reception after 22:00.\nRoom keys are never issued to unregistered visitors.' },
        { key: 'petsSmoking', label: 'Pets and Smoking', placeholder: 'e.g. Pets allowed in Deluxe rooms only with prior approval.\nSmoking is prohibited throughout the hotel.' },
        { key: 'lostPropertyLoans', label: 'Lost Property and Loan Items', placeholder: 'e.g. Lost property is held for 90 days.\nAdapters are loaned with a £20 deposit.' },
        { key: 'otherGuestPolicies', label: 'Other Guest Policies', placeholder: 'Anything else guests should know — house rules, luggage, children, compensation.' }
      ]
    },
    {
      id: 'payment',
      label: 'Payments and Front Office Policies',
      items: [
        { key: 'deposits', label: 'Deposits', placeholder: 'e.g. A deposit equal to the first night is taken at booking for direct reservations.' },
        { key: 'refunds', label: 'Refunds', placeholder: 'e.g. Refunds are processed within 5–7 working days after Duty Manager approval.' },
        { key: 'preAuthorisations', label: 'Pre-authorisations', placeholder: 'e.g. Pre-authorise one night plus £50 incidentals for walk-in guests.' },
        { key: 'cashHandling', label: 'Cash Handling', placeholder: 'e.g. Cash float is £200 and must be counted each shift.' },
        { key: 'invoicing', label: 'Invoicing', placeholder: 'e.g. Corporate invoices are emailed within 24 hours of departure.' },
        { key: 'otherPaymentNotes', label: 'Other Payment Notes', placeholder: 'Anything else about payments, city tax, compensation limits or front-office money handling.' }
      ]
    }
  ];

  var POLICY_NOTES_SECTIONS = POLICY_NOTES_GROUPS.reduce(function (list, group) {
    return list.concat(group.items);
  }, []);

  var LEGACY_POLICY_NOTE_KEYS = ['paymentsOta', 'guestPolicies', 'otherNotes'];

  var NAV_LAYERS = [
    { id: 'essential', label: 'Core Setup', defaultExpanded: true },
    { id: 'optional', label: 'Knowledge', defaultExpanded: false },
    { id: 'settings', label: 'Settings', defaultExpanded: false }
  ];

  var ESSENTIAL_PROGRESS_SECTIONS = [
    'general', 'rooms-facilities', 'departments-shifts', 'policies'
  ];

  var PROGRESS_SECTIONS = [
    'general', 'rooms-facilities', 'departments-shifts', 'policies',
    'reservations-payments', 'guest-services', 'inventory'
  ];

  var SECTION_ICONS = {
    home: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
    grid: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>',
    users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    document: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
    card: '<rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>',
    concierge: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    box: '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>',
    activity: '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',
    academy: '<path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>',
    knowledge: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>'
  };

  var PRIMARY_POLICIES = [
    { group: 'guest', key: 'earlyCheckIn', label: 'Early check-in' },
    { group: 'guest', key: 'lateCheckOut', label: 'Late check-out' },
    { group: 'guest', key: 'cancellation', label: 'Cancellation' },
    { group: 'guest', key: 'noShow', label: 'No-show' },
    { group: 'operational', key: 'lostProperty', label: 'Lost property' },
    { group: 'operational', key: 'physicalKeys', label: 'Physical keys or key cards' },
    { group: 'guest', key: 'smoking', label: 'Smoking' },
    { group: 'guest', key: 'pets', label: 'Pets' },
    { group: 'operational', key: 'complaints', label: 'Guest complaints and compensation' }
  ];

  var PAYMENT_POLICIES = [
    { group: 'payment', key: 'deposit', label: 'Deposits' },
    { group: 'payment', key: 'refund', label: 'Refunds' },
    { group: 'payment', key: 'preAuthorisation', label: 'Pre-authorisations' },
    { group: 'payment', key: 'cashHandling', label: 'Cash handling' },
    { group: 'payment', key: 'corporateBilling', label: 'Corporate billing' },
    { group: 'payment', key: 'guestCompensation', label: 'Compensation limits' }
  ];

  var RESERVATION_CHANNELS = [
    { type: 'bookingCom', label: 'Booking.com', placeholder: 'e.g. Virtual cards activate after 05:00 on arrival day.\nPay at Hotel reservations are charged at check-in.\nAlways check whether breakfast remains after a booking modification.' },
    { type: 'expedia', label: 'Expedia', placeholder: 'e.g. Expedia virtual cards activate after 05:00.\nVerify commission and cancellation rules before amending stays.' },
    { type: 'direct', label: 'Direct Bookings', placeholder: 'e.g. Direct bookings are prepaid or guaranteed by card.\nOffer members the preferred rate when available.' },
    { type: 'corporate', label: 'Corporate Bookings', placeholder: 'e.g. Corporate accounts are invoiced weekly.\nConfirm purchase order numbers at check-in.' },
    { type: 'other', label: 'Other Channels', placeholder: 'e.g. Agency or wholesale bookings — note payment timing and special instructions.' }
  ];

  var POLICY_GROUPS = [
    { id: 'guest', label: 'Guest policies', items: [
      { key: 'earlyCheckIn', label: 'Early check-in' },
      { key: 'lateCheckOut', label: 'Late check-out' },
      { key: 'cancellation', label: 'Cancellation' },
      { key: 'noShow', label: 'No-show' },
      { key: 'smoking', label: 'Smoking' },
      { key: 'visitors', label: 'Visitors' },
      { key: 'pets', label: 'Pets' },
      { key: 'children', label: 'Children' },
      { key: 'luggageStorage', label: 'Luggage storage' }
    ]},
    { id: 'payment', label: 'Payment policies', items: [
      { key: 'deposit', label: 'Deposits' },
      { key: 'refund', label: 'Refunds' },
      { key: 'preAuthorisation', label: 'Pre-authorisations' },
      { key: 'cashHandling', label: 'Cash handling' },
      { key: 'corporateBilling', label: 'Corporate billing' },
      { key: 'guestCompensation', label: 'Compensation limits' }
    ]},
    { id: 'operational', label: 'Operational policies', items: [
      { key: 'lostProperty', label: 'Lost property' },
      { key: 'physicalKeys', label: 'Physical keys' },
      { key: 'keyCards', label: 'Key cards' },
      { key: 'guestLoanItems', label: 'Guest loan items' },
      { key: 'complaints', label: 'Complaints' },
      { key: 'roomMoves', label: 'Room moves' },
      { key: 'outOfOrder', label: 'Out-of-order rooms' },
      { key: 'escalation', label: 'Escalation rules' }
    ]}
  ];

  var LEGACY_POLICY_MAP = {
    earlyCheckIn: 'earlyCheckIn', lateCheckOut: 'lateCheckOut', cancellation: 'cancellation',
    noShow: 'noShow', refund: 'refund', deposit: 'deposit', guestCompensation: 'guestCompensation',
    lostProperty: 'lostProperty', physicalKeys: 'keysOrCards', guestLoanItems: 'guestLoanItems',
    smoking: 'smoking', visitors: 'visitors', pets: 'pets', customNotes: 'customNotes'
  };

  var OTA_CHANNEL_TYPES = [
    { type: 'bookingCom', label: 'Booking.com' },
    { type: 'expedia', label: 'Expedia' },
    { type: 'direct', label: 'Direct bookings' },
    { type: 'corporate', label: 'Corporate bookings' },
    { type: 'other', label: 'Other channels' }
  ];

  var TRACKER_GROUPS = [
    { id: 'guest', label: 'Guest & keys', keys: ['lostProperty', 'physicalKeys', 'keyCards', 'noShows', 'guestProfile'] },
    { id: 'finance', label: 'Finance & balances', keys: ['complimentary', 'refunds', 'openBalances'] },
    { id: 'reporting', label: 'Reports & handovers', keys: ['dailyLineup', 'glitchReport', 'managerFlash', 'outOfOrder', 'airportTransfers', 'morningEmail'] }
  ];

  var TRACKER_DEFS = [
    { key: 'lostProperty', label: 'Lost property' },
    { key: 'physicalKeys', label: 'Physical keys' },
    { key: 'keyCards', label: 'Key cards' },
    { key: 'noShows', label: 'No-shows' },
    { key: 'complimentary', label: 'Complimentary items' },
    { key: 'refunds', label: 'Refunds' },
    { key: 'openBalances', label: 'Open balances' },
    { key: 'guestProfile', label: 'Guest profile completion' },
    { key: 'dailyLineup', label: 'Daily lineup' },
    { key: 'glitchReport', label: 'Glitch report' },
    { key: 'managerFlash', label: 'Manager flash report' },
    { key: 'outOfOrder', label: 'Out-of-order rooms' },
    { key: 'airportTransfers', label: 'Airport transfers' },
    { key: 'morningEmail', label: 'Morning email reports' }
  ];

  var SUPPLY_CATEGORY_HINTS = [
    'Guest loan items', 'Welcome materials', 'Printing supplies', 'Stationery', 'Keys and access', 'Amenities'
  ];

  function emptyPolicyEntry(title) {
    return { title: title || '', summary: '', instructions: '', approvalLevel: '', charge: '', escalation: '', lastUpdated: '' };
  }

  function emptyPoliciesNotes() {
    var out = {};
    POLICY_NOTES_SECTIONS.forEach(function (sec) { out[sec.key] = ''; });
    LEGACY_POLICY_NOTE_KEYS.forEach(function (key) { out[key] = ''; });
    return out;
  }

  function fillIfEmpty(target, key, value) {
    if (!target || !key) return;
    if (String(target[key] || '').trim()) return;
    if (!String(value || '').trim()) return;
    target[key] = String(value).trim();
  }

  function expandPoliciesNotes(notes, structured, legacy) {
    notes = notes || emptyPoliciesNotes();
    var base = emptyPoliciesNotes();
    Object.keys(base).forEach(function (key) {
      if (notes[key] == null) notes[key] = '';
    });

    var fromStructured = buildPoliciesNotesFromStructured(structured, legacy);
    Object.keys(base).forEach(function (key) {
      fillIfEmpty(notes, key, fromStructured[key]);
    });

    /* Previous 4-box model → finer boxes (never overwrite existing text) */
    var guestFineEmpty = !(
      notes.cancellationsNoShows || notes.visitorsSecurity || notes.petsSmoking ||
      notes.lostPropertyLoans || notes.otherGuestPolicies
    );
    if (guestFineEmpty) fillIfEmpty(notes, 'otherGuestPolicies', notes.guestPolicies);
    fillIfEmpty(notes, 'otherGuestPolicies', notes.otherNotes);

    var paymentFineEmpty = !(
      notes.deposits || notes.refunds || notes.preAuthorisations ||
      notes.cashHandling || notes.invoicing || notes.otherPaymentNotes
    );
    if (paymentFineEmpty) fillIfEmpty(notes, 'otherPaymentNotes', notes.paymentsOta);

    return notes;
  }

  function policyEntryText(entry) {
    if (!entry || typeof entry !== 'object') return '';
    return String(entry.instructions || entry.summary || '').trim();
  }

  function joinPolicyTexts(parts) {
    return (parts || []).map(function (p) { return String(p || '').trim(); }).filter(Boolean).join('\n\n');
  }

  function buildPoliciesNotesFromStructured(structured, legacy) {
    var notes = emptyPoliciesNotes();
    structured = structured || {};
    legacy = legacy || {};
    var guest = structured.guest || {};
    var payment = structured.payment || {};
    var operational = structured.operational || {};
    var custom = structured.custom || {};

    notes.checkInOut = joinPolicyTexts([
      policyEntryText(guest.earlyCheckIn) ? 'Early check-in: ' + policyEntryText(guest.earlyCheckIn) : '',
      policyEntryText(guest.lateCheckOut) ? 'Late check-out: ' + policyEntryText(guest.lateCheckOut) : '',
      legacy.earlyCheckIn ? 'Early check-in: ' + legacy.earlyCheckIn : '',
      legacy.lateCheckOut ? 'Late check-out: ' + legacy.lateCheckOut : ''
    ]);

    notes.cancellationsNoShows = joinPolicyTexts([
      policyEntryText(guest.cancellation) ? 'Cancellation: ' + policyEntryText(guest.cancellation) : '',
      policyEntryText(guest.noShow) ? 'No-show: ' + policyEntryText(guest.noShow) : '',
      legacy.cancellation ? 'Cancellation: ' + legacy.cancellation : '',
      legacy.noShow ? 'No-show: ' + legacy.noShow : ''
    ]);

    notes.visitorsSecurity = joinPolicyTexts([
      policyEntryText(guest.visitors) ? 'Visitors: ' + policyEntryText(guest.visitors) : '',
      policyEntryText(operational.physicalKeys) ? 'Keys / key cards: ' + policyEntryText(operational.physicalKeys) : '',
      legacy.visitors ? 'Visitors: ' + legacy.visitors : '',
      legacy.keysOrCards ? 'Keys / key cards: ' + legacy.keysOrCards : ''
    ]);

    notes.petsSmoking = joinPolicyTexts([
      policyEntryText(guest.pets) ? 'Pets: ' + policyEntryText(guest.pets) : '',
      policyEntryText(guest.smoking) ? 'Smoking: ' + policyEntryText(guest.smoking) : '',
      legacy.pets ? 'Pets: ' + legacy.pets : '',
      legacy.smoking ? 'Smoking: ' + legacy.smoking : ''
    ]);

    notes.lostPropertyLoans = joinPolicyTexts([
      policyEntryText(operational.lostProperty) ? 'Lost property: ' + policyEntryText(operational.lostProperty) : '',
      policyEntryText(guest.luggageStorage) ? 'Luggage storage: ' + policyEntryText(guest.luggageStorage) : '',
      legacy.lostProperty ? 'Lost property: ' + legacy.lostProperty : '',
      legacy.guestLoanItems ? 'Loan items: ' + legacy.guestLoanItems : ''
    ]);

    notes.deposits = joinPolicyTexts([
      policyEntryText(payment.deposit) ? policyEntryText(payment.deposit) : '',
      legacy.deposit || ''
    ]);
    notes.refunds = joinPolicyTexts([
      policyEntryText(payment.refund) ? policyEntryText(payment.refund) : '',
      legacy.refund || ''
    ]);
    notes.preAuthorisations = policyEntryText(payment.preAuthorisation);
    notes.cashHandling = policyEntryText(payment.cashHandling);
    notes.invoicing = policyEntryText(payment.corporateBilling);

    var otherPayment = [
      policyEntryText(payment.guestCompensation) ? 'Compensation limits: ' + policyEntryText(payment.guestCompensation) : '',
      legacy.guestCompensation ? 'Compensation: ' + legacy.guestCompensation : ''
    ];
    notes.otherPaymentNotes = joinPolicyTexts(otherPayment);

    var otherGuest = [
      policyEntryText(guest.children) ? 'Children: ' + policyEntryText(guest.children) : '',
      policyEntryText(operational.complaints) ? 'Complaints: ' + policyEntryText(operational.complaints) : '',
      legacy.customNotes || ''
    ];
    Object.keys(custom).forEach(function (key) {
      var entry = custom[key];
      var text = policyEntryText(entry);
      if (!text) return;
      /* Skip keys that already map to new notes fields */
      if (POLICY_NOTES_SECTIONS.some(function (sec) { return sec.key === key; })) return;
      if (LEGACY_POLICY_NOTE_KEYS.indexOf(key) !== -1) return;
      var title = (entry && entry.title) ? entry.title : 'Custom policy';
      otherGuest.push(title + ': ' + text);
    });
    notes.otherGuestPolicies = joinPolicyTexts(otherGuest);

    /* Keep legacy aggregate keys populated for older consumers */
    notes.guestPolicies = joinPolicyTexts([
      notes.checkInOut, notes.cancellationsNoShows, notes.visitorsSecurity,
      notes.petsSmoking, notes.lostPropertyLoans, notes.otherGuestPolicies
    ]);
    notes.paymentsOta = joinPolicyTexts([
      notes.deposits, notes.refunds, notes.preAuthorisations,
      notes.cashHandling, notes.invoicing, notes.otherPaymentNotes
    ]);
    notes.otherNotes = notes.otherGuestPolicies;
    return notes;
  }

  function syncStructuredFromPoliciesNotes(notes) {
    notes = notes || emptyPoliciesNotes();
    var custom = {};
    POLICY_NOTES_SECTIONS.forEach(function (sec) {
      var text = notes[sec.key] || '';
      custom[sec.key] = Object.assign(emptyPolicyEntry(sec.label), {
        title: sec.label,
        instructions: text,
        summary: String(text).substring(0, 120)
      });
    });
    return {
      guest: {
        earlyCheckIn: Object.assign(emptyPolicyEntry('Check-in and Check-out'), { instructions: notes.checkInOut || '', summary: String(notes.checkInOut || '').substring(0, 120) }),
        lateCheckOut: Object.assign(emptyPolicyEntry('Check-in and Check-out'), { instructions: notes.checkInOut || '', summary: String(notes.checkInOut || '').substring(0, 120) }),
        cancellation: Object.assign(emptyPolicyEntry('Cancellations and No-shows'), { instructions: notes.cancellationsNoShows || '', summary: String(notes.cancellationsNoShows || '').substring(0, 120) }),
        noShow: Object.assign(emptyPolicyEntry('Cancellations and No-shows'), { instructions: notes.cancellationsNoShows || '', summary: String(notes.cancellationsNoShows || '').substring(0, 120) }),
        smoking: Object.assign(emptyPolicyEntry('Pets and Smoking'), { instructions: notes.petsSmoking || '', summary: String(notes.petsSmoking || '').substring(0, 120) }),
        pets: Object.assign(emptyPolicyEntry('Pets and Smoking'), { instructions: notes.petsSmoking || '', summary: String(notes.petsSmoking || '').substring(0, 120) })
      },
      payment: {
        deposit: Object.assign(emptyPolicyEntry('Deposits'), { instructions: notes.deposits || '', summary: String(notes.deposits || '').substring(0, 120) }),
        refund: Object.assign(emptyPolicyEntry('Refunds'), { instructions: notes.refunds || '', summary: String(notes.refunds || '').substring(0, 120) }),
        preAuthorisation: Object.assign(emptyPolicyEntry('Pre-authorisations'), { instructions: notes.preAuthorisations || '', summary: String(notes.preAuthorisations || '').substring(0, 120) }),
        cashHandling: Object.assign(emptyPolicyEntry('Cash Handling'), { instructions: notes.cashHandling || '', summary: String(notes.cashHandling || '').substring(0, 120) }),
        corporateBilling: Object.assign(emptyPolicyEntry('Invoicing'), { instructions: notes.invoicing || '', summary: String(notes.invoicing || '').substring(0, 120) })
      },
      operational: {
        lostProperty: Object.assign(emptyPolicyEntry('Lost Property and Loan Items'), { instructions: notes.lostPropertyLoans || '', summary: String(notes.lostPropertyLoans || '').substring(0, 120) })
      },
      custom: custom
    };
  }

  function collectPoliciesNotes(root) {
    var out = emptyPoliciesNotes();
    var scope = root || document.getElementById('policyNotesRoot') || document;
    POLICY_NOTES_SECTIONS.forEach(function (sec) {
      var el = scope.querySelector('[data-policy-note="' + sec.key + '"]') || document.getElementById('policyNote_' + sec.key);
      out[sec.key] = el ? el.value : '';
    });
    /* Maintain legacy aggregate keys for older AI / export consumers */
    out.guestPolicies = joinPolicyTexts([
      out.checkInOut, out.cancellationsNoShows, out.visitorsSecurity,
      out.petsSmoking, out.lostPropertyLoans, out.otherGuestPolicies
    ]);
    out.paymentsOta = joinPolicyTexts([
      out.deposits, out.refunds, out.preAuthorisations,
      out.cashHandling, out.invoicing, out.otherPaymentNotes
    ]);
    out.otherNotes = out.otherGuestPolicies;
    return out;
  }

  function renderPolicyNotesUI(root, data) {
    if (!root) return;
    var notes = expandPoliciesNotes(
      (data && data.policiesNotes) || emptyPoliciesNotes(),
      (data && data.policiesStructured) || {},
      (data && data.policies) || {}
    );
    root.innerHTML = '';
    var stack = document.createElement('div');
    stack.className = 'policy-notes-stack';
    POLICY_NOTES_GROUPS.forEach(function (group) {
      var groupWrap = document.createElement('div');
      groupWrap.className = 'policy-notes-group';
      groupWrap.innerHTML = '<h3 class="subsection-heading">' + esc(group.label) + '</h3>';
      var groupStack = document.createElement('div');
      groupStack.className = 'disclosure-stack';
      group.items.forEach(function (sec) {
        var value = notes[sec.key] || '';
        var hasContent = !!String(value).trim();
        var card = document.createElement('div');
        card.className = 'disclosure-card disclosure-card--collapsed policy-notes-card' + (hasContent ? ' disclosure-card--filled' : '');
        card.setAttribute('data-policy-note-card', sec.key);
        card.innerHTML =
          '<button type="button" class="disclosure-card-toggle" aria-expanded="false">' +
          '<span class="tracker-group-label">' + esc(sec.label) + '</span>' +
          '<span class="disclosure-card-meta">' + (hasContent ? 'Notes added' : 'Write naturally — AI will organise this') + '</span>' +
          disclosureChevron() +
          '</button>' +
          '<div class="disclosure-card-body" hidden>' +
          '<div class="knowledge-field">' +
          '<label class="form-label visually-hidden" for="policyNote_' + sec.key + '">' + esc(sec.label) + '</label>' +
          '<div class="textarea-wrap">' +
          '<textarea class="notes-textarea notes-textarea--large" id="policyNote_' + sec.key + '" data-policy-note="' + sec.key + '" placeholder="' + esc(sec.placeholder) + '">' + esc(value) + '</textarea>' +
          '<button type="button" class="improve-writing-btn" data-improve-writing="policyNote_' + sec.key + '">Improve Writing</button>' +
          '</div></div></div>';
        groupStack.appendChild(card);
      });
      groupWrap.appendChild(groupStack);
      stack.appendChild(groupWrap);
      bindDisclosureCards(groupStack, '.policy-notes-card', function (card) {
        return card.classList.contains('disclosure-card--filled');
      });
    });
    root.appendChild(stack);
    root.addEventListener('input', function (e) {
      var ta = e.target.closest('[data-policy-note]');
      if (!ta) return;
      var card = ta.closest('.policy-notes-card');
      if (!card) return;
      var filled = !!String(ta.value || '').trim();
      card.classList.toggle('disclosure-card--filled', filled);
      var meta = card.querySelector('.disclosure-card-meta');
      if (meta) meta.textContent = filled ? 'Notes added' : 'Write naturally — AI will organise this';
      root.dispatchEvent(new CustomEvent('profile-change', { bubbles: true }));
    });
  }

  function emptyOtaChannel(type, label) {
    return {
      type: type, label: label, notes: '',
      paymentModel: '', prepaidOrPayAtProperty: '', refundable: '',
      cancellationDeadline: '', virtualCardActivation: '', cardExpiryRules: '', commissionNotes: '',
      invoiceRules: '', refundProcedure: '', specialInstructions: ''
    };
  }

  function buildOtaChannelNotes(channel) {
    if (!channel) return '';
    if (String(channel.notes || '').trim()) return String(channel.notes).trim();
    var parts = [
      channel.paymentModel ? 'Payment type: ' + channel.paymentModel : '',
      channel.prepaidOrPayAtProperty ? 'Prepaid or pay at property: ' + channel.prepaidOrPayAtProperty : '',
      channel.refundable ? 'Refundable or non-refundable: ' + channel.refundable : '',
      channel.cancellationDeadline ? 'Cancellation rule: ' + channel.cancellationDeadline : '',
      channel.virtualCardActivation ? 'Virtual-card activation: ' + channel.virtualCardActivation : '',
      channel.cardExpiryRules ? 'Virtual-card expiry: ' + channel.cardExpiryRules : '',
      channel.invoiceRules ? 'Payment timing / invoice rules: ' + channel.invoiceRules : '',
      channel.commissionNotes ? 'Commission / invoice notes: ' + channel.commissionNotes : '',
      channel.refundProcedure ? 'Refund procedure: ' + channel.refundProcedure : '',
      channel.specialInstructions ? channel.specialInstructions : ''
    ];
    return joinPolicyTexts(parts);
  }

  function migrateOtaChannelsToNotes(channels) {
    if (!Array.isArray(channels)) return [];
    return channels.map(function (ch) {
      if (!ch || typeof ch !== 'object') return ch;
      var copy = Object.assign({}, ch);
      if (!String(copy.notes || '').trim()) {
        copy.notes = buildOtaChannelNotes(copy);
      }
      return copy;
    });
  }

  function emptyTracker(key, label) {
    return {
      key: key, label: label, enabled: false, department: '', requiredFields: '',
      escalationRules: '', emailRecipients: '', retentionPeriod: '', notes: ''
    };
  }

  function migrateToV3(data) {
    if (!data || typeof data !== 'object') return data;
    var d = data;

    if (!d.general) d.general = {};
    if (d.general.timezone == null) d.general.timezone = '';
    if (d.general.currency == null) d.general.currency = '';
    if (d.general.brandVoice == null) d.general.brandVoice = '';
    if (d.general.operatingNotes == null) d.general.operatingNotes = '';

    if (!d.policiesStructured) {
      d.policiesStructured = { guest: {}, payment: {}, operational: {}, custom: {} };
      POLICY_GROUPS.forEach(function (g) {
        g.items.forEach(function (item) {
          var legacyKey = LEGACY_POLICY_MAP[item.key];
          var legacyVal = legacyKey && d.policies ? d.policies[legacyKey] : '';
          if (legacyKey === 'keysOrCards' && d.policies && d.policies.keysOrCards) legacyVal = d.policies.keysOrCards;
          d.policiesStructured[g.id][item.key] = emptyPolicyEntry(item.label);
          if (legacyVal) {
            d.policiesStructured[g.id][item.key].instructions = legacyVal;
            d.policiesStructured[g.id][item.key].summary = legacyVal.substring(0, 120);
          }
        });
      });
    } else {
      if (!d.policiesStructured.custom) d.policiesStructured.custom = {};
      POLICY_GROUPS.forEach(function (g) {
        if (!d.policiesStructured[g.id]) d.policiesStructured[g.id] = {};
        g.items.forEach(function (item) {
          if (!d.policiesStructured[g.id][item.key]) {
            d.policiesStructured[g.id][item.key] = emptyPolicyEntry(item.label);
          }
        });
      });
    }

    if (!Array.isArray(d.otaChannels)) {
      d.otaChannels = [];
      var ota = d.otaPayment || {};
      OTA_CHANNEL_TYPES.forEach(function (ch) {
        var channel = emptyOtaChannel(ch.type, ch.label);
        if (ch.type === 'bookingCom') {
          channel.specialInstructions = [ota.bookingPrepaid, ota.bookingPayAtProperty].filter(Boolean).join('\n\n');
        } else if (ch.type === 'expedia') {
          channel.specialInstructions = [ota.expediaHotelCollect, ota.expediaVirtualCard].filter(Boolean).join('\n\n');
          channel.virtualCardActivation = ota.virtualCardActivation || '';
        } else if (ch.type === 'direct') {
          channel.specialInstructions = ota.directBooking || '';
        } else if (ch.type === 'corporate') {
          channel.specialInstructions = ota.corporateBilling || '';
        }
        channel.refundable = ota.refundableRules || '';
        if (channel.specialInstructions || channel.virtualCardActivation) d.otaChannels.push(channel);
      });
    }

    if (!Array.isArray(d.operationsTrackers)) {
      d.operationsTrackers = TRACKER_DEFS.map(function (t) {
        var tr = emptyTracker(t.key, t.label);
        var ops = d.operations || {};
        var legacyMap = {
          lostProperty: ops.lostProperty, physicalKeys: ops.physicalKeys, noShows: ops.noShows,
          complimentary: ops.complimentaryTracker, openBalances: ops.openBalances,
          guestProfile: ops.guestProfileCompletion, dailyLineup: ops.dailyLineup,
          glitchReport: ops.glitchReport, managerFlash: ops.managerFlashReport,
          outOfOrder: ops.outOfOrderReport
        };
        if (legacyMap[t.key]) tr.notes = legacyMap[t.key];
        if (t.key === 'morningEmail' && ops.morningEmailRecipients && ops.morningEmailRecipients.length) {
          tr.emailRecipients = ops.morningEmailRecipients.map(function (r) { return r.name + ' <' + r.email + '>'; }).join(', ');
        }
        return tr;
      });
    }

    if (!d.academy || typeof d.academy !== 'object') d.academy = {};
    var ac = d.academy;
    if (ac.enabled == null) ac.enabled = false;
    if (!Array.isArray(ac.departmentsIncluded)) ac.departmentsIncluded = [];
    if (!ac.contentSources) ac.contentSources = { sops: true, policies: true, rooms: true, operations: true };
    if (ac.newStarterTraining == null) ac.newStarterTraining = '';
    if (ac.roleSpecificTraining == null) ac.roleSpecificTraining = '';
    if (ac.refresherTraining == null) ac.refresherTraining = '';
    if (ac.managerAssignedModules == null) ac.managerAssignedModules = '';
    if (ac.trainingTone == null) ac.trainingTone = '';
    if (ac.passScore == null) ac.passScore = '';
    if (ac.autoGenerate == null) ac.autoGenerate = false;

    if (!d.hotelKnowledge || typeof d.hotelKnowledge !== 'object') {
      d.hotelKnowledge = {
        generalNotes: '', guestKnowledge: '', hotelStandards: '', vipRules: '', commonTerms: '',
        operationalNotes: '', localRecommendations: '', aiInstructions: ''
      };
    } else {
      var hk = d.hotelKnowledge;
      if (hk.generalNotes == null) hk.generalNotes = '';
      if (hk.hotelStandards == null) hk.hotelStandards = '';
      if (hk.vipRules == null) hk.vipRules = '';
      if (hk.commonTerms == null) hk.commonTerms = '';
      if (hk.operationalNotes == null) hk.operationalNotes = '';
      if (hk.localRecommendations == null) hk.localRecommendations = '';
      if (hk.aiInstructions == null) hk.aiInstructions = '';
      if (hk.guestKnowledge == null) hk.guestKnowledge = '';
      /* Migrate VIP rules into Guest Intelligence when the new field is empty */
      if (!String(hk.guestKnowledge || '').trim() && String(hk.vipRules || '').trim()) {
        hk.guestKnowledge = hk.vipRules;
      }
      /* Fold Hotel Standards into Operational Notes / AI Instructions when those are empty */
      if (String(hk.hotelStandards || '').trim()) {
        if (!String(hk.operationalNotes || '').trim()) {
          hk.operationalNotes = hk.hotelStandards;
        } else if (!String(hk.aiInstructions || '').trim()) {
          hk.aiInstructions = hk.hotelStandards;
        }
      }
      /* Settings additional AI instructions → Hotel Knowledge AI Instructions (source of truth) */
      if (
        !String(hk.aiInstructions || '').trim() &&
        d.aiPrefs &&
        String(d.aiPrefs.instructions || '').trim()
      ) {
        hk.aiInstructions = d.aiPrefs.instructions;
      }
    }

    d.policiesNotes = expandPoliciesNotes(d.policiesNotes, d.policiesStructured, d.policies);

    if (Array.isArray(d.otaChannels)) {
      d.otaChannels = migrateOtaChannelsToNotes(d.otaChannels);
    }

    if (!d.facilities || typeof d.facilities !== 'object') d.facilities = { checked: [], custom: '', customItems: [] };
    if (!Array.isArray(d.facilities.checked)) d.facilities.checked = [];
    if (d.facilities.custom == null) d.facilities.custom = '';
    if (!Array.isArray(d.facilities.customItems)) d.facilities.customItems = [];
    if (d.facilities.custom && !d.facilities.customItems.length) {
      d.facilities.custom.split(/\n|,/).forEach(function (line) {
        line = String(line || '').trim().replace(/^[-•]\s*/, '');
        if (!line) return;
        var slug = line.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'item';
        d.facilities.customItems.push({
          id: 'fac-custom-' + slug,
          label: line,
          checked: d.facilities.checked.indexOf('fac-custom-' + slug) !== -1 || true
        });
      });
    }

    if (Array.isArray(d.departments)) {
      d.departments.forEach(function (dept) {
        if (dept.contact == null) dept.contact = '';
        if (dept.email == null) dept.email = '';
        if (dept.instructions == null) dept.instructions = '';
      });
    }

    if (d.shifts && d.shifts.overnightSupport == null) d.shifts.overnightSupport = false;

    if (Array.isArray(d.roomFacilities)) {
      d.roomFacilities.forEach(function (r) {
        if (r.connectingRoom == null) r.connectingRoom = r.connectingRoom || '';
        if (r.maxOccupancy == null) r.maxOccupancy = r.maxOccupancy || '';
      });
    }

    if (Array.isArray(d.supplies)) {
      d.supplies.forEach(function (s) {
        if (s.unit == null) s.unit = '';
        if (s.cost == null) s.cost = '';
        if (s.loanItem == null) s.loanItem = '';
        if (s.status == null) s.status = '';
        if (s.lastUpdated == null) s.lastUpdated = '';
      });
    }

    if (!d.guestServices || typeof d.guestServices !== 'object') d.guestServices = {};
    var gs = d.guestServices;
    if (gs.restaurantBookings == null) gs.restaurantBookings = '';
    if (gs.specialOccasions == null) gs.specialOccasions = '';
    if (gs.welcomeAmenities == null) gs.welcomeAmenities = '';
    if (gs.localRecommendations == null) gs.localRecommendations = '';
    if (!Array.isArray(gs.suppliers)) gs.suppliers = [];

    d.schemaVersion = SCHEMA_V3;
    return d;
  }

  function syncLegacyPoliciesFromStructured(structured, legacy) {
    legacy = legacy || {};
    POLICY_GROUPS.forEach(function (g) {
      var group = structured[g.id] || {};
      g.items.forEach(function (item) {
        var entry = group[item.key] || emptyPolicyEntry(item.label);
        var text = entry.instructions || entry.summary || '';
        var lk = LEGACY_POLICY_MAP[item.key];
        if (lk === 'keysOrCards') legacy.keysOrCards = text;
        else if (lk) legacy[lk] = text;
      });
    });
    var complaints = structured.operational && structured.operational.complaints;
    if (complaints && (complaints.instructions || complaints.summary)) {
      legacy.guestCompensation = complaints.instructions || complaints.summary;
    }
    return legacy;
  }

  function collectPoliciesStructured(root) {
    var out = { guest: {}, payment: {}, operational: {}, custom: {} };
    var cards = root
      ? root.querySelectorAll('[data-policy-group-id]')
      : document.querySelectorAll('#policyStructuredRoot [data-policy-group-id], #paymentPoliciesRoot [data-policy-group-id]');
    cards.forEach(function (card) {
      var gid = card.getAttribute('data-policy-group-id');
      var key = card.getAttribute('data-policy-key');
      if (!gid || !key) return;
      if (!out[gid]) out[gid] = {};
      var titleEdit = card.querySelector('[data-f="title-edit"]');
      out[gid][key] = {
        title: titleEdit ? titleEdit.value : ((card.querySelector('[data-f="title"]') || {}).value || ''),
        summary: (card.querySelector('[data-f="summary"]') || {}).value || '',
        instructions: (card.querySelector('[data-f="instructions"]') || {}).value || '',
        approvalLevel: (card.querySelector('[data-f="approvalLevel"]') || {}).value || '',
        charge: (card.querySelector('[data-f="charge"]') || {}).value || '',
        escalation: (card.querySelector('[data-f="escalation"]') || {}).value || '',
        lastUpdated: (card.querySelector('[data-f="lastUpdated"]') || {}).value || ''
      };
    });
    return out;
  }

  function renderPolicyList(root, policyDefs, structured, allowCustom) {
    if (!root) return;
    root.innerHTML = '';
    var list = document.createElement('div');
    list.className = 'policy-list';
    policyDefs.forEach(function (item) {
      var entry = (structured[item.group] && structured[item.group][item.key]) || emptyPolicyEntry(item.label);
      list.appendChild(buildSimplePolicyCard(item.group, item.key, item.label, entry, false));
    });
    root.appendChild(list);
    bindDisclosureCards(list, '.policy-card', function (card) {
      return card.classList.contains('disclosure-card--filled');
    });
    if (allowCustom) {
      var customWrap = document.createElement('div');
      customWrap.className = 'policy-custom-list';
      Object.keys(structured.custom || {}).forEach(function (key) {
        var entry = structured.custom[key] || emptyPolicyEntry('');
        customWrap.appendChild(buildSimplePolicyCard('custom', key, entry.title || 'Custom policy', entry, true));
      });
      root.appendChild(customWrap);
      var addBtn = document.createElement('button');
      addBtn.type = 'button';
      addBtn.className = 'add-row-btn';
      addBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add another policy';
      addBtn.addEventListener('click', function () {
        var newCard = buildSimplePolicyCard('custom', 'custom_' + Date.now(), 'Custom policy', emptyPolicyEntry('Custom policy'), true);
        customWrap.appendChild(newCard);
        setDisclosureExpanded(newCard, true);
        root.dispatchEvent(new CustomEvent('profile-change', { bubbles: true }));
      });
      root.appendChild(addBtn);
      root.addEventListener('click', function (e) {
        var btn = e.target.closest('.remove-custom-policy');
        if (!btn) return;
        if (!confirmDelete('Remove this custom policy?')) return;
        btn.closest('[data-policy-key]').remove();
        root.dispatchEvent(new CustomEvent('profile-change', { bubbles: true }));
      });
    }
  }

  function renderPolicyUI(root, data) {
    renderPolicyNotesUI(root, data);
  }

  function renderPaymentPoliciesUI(root, data) {
    var structured = (data && data.policiesStructured) || { guest: {}, payment: {}, operational: {}, custom: {} };
    renderPolicyList(root, PAYMENT_POLICIES, structured, false);
  }

  function buildSimplePolicyCard(groupId, key, label, entry, isCustom) {
    var hasContent = policyEntryHasContent(entry);
    var card = document.createElement('div');
    card.className = 'policy-card disclosure-card disclosure-card--collapsed' + (hasContent ? ' disclosure-card--filled' : '');
    card.setAttribute('data-policy-key', key);
    card.setAttribute('data-policy-group-id', groupId);
    var summary = trimDisclosureText(entry.summary);
    var metaText = summary ? (summary.length > 48 ? summary.substring(0, 48) + '…' : summary) : '';
    card.innerHTML =
      '<div class="policy-card-header">' +
      '<button type="button" class="disclosure-card-toggle policy-card-toggle" aria-expanded="' + (hasContent ? 'true' : 'false') + '">' +
      '<span class="policy-card-title-wrap">' +
      '<span class="policy-card-title">' + esc(label) + '</span>' +
      (metaText ? '<span class="disclosure-card-meta">' + esc(metaText) + '</span>' : '<span class="disclosure-card-meta" hidden></span>') +
      '</span>' +
      disclosureChevron() +
      '</button>' +
      (isCustom ? '<button type="button" class="icon-btn remove-custom-policy" aria-label="Remove policy"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>' : '') +
      '</div>' +
      '<div class="disclosure-card-body"' + (hasContent ? '' : ' hidden') + '>' +
      '<input type="hidden" data-f="title" value="' + esc(entry.title || label) + '">' +
      '<div class="form-group"><label class="form-label">Short summary</label><input class="form-input" data-f="summary" value="' + esc(entry.summary) + '" placeholder="One-line summary for staff"></div>' +
      '<div class="form-group"><div class="field-label-row"><label class="form-label">Detailed instructions</label><button type="button" class="improve-writing-btn" data-ai-polish="instructions"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 3l1.4 4.6L18 9l-4.6 1.4L12 15l-1.4-4.6L6 9l4.6-1.4L12 3z"/><path d="M19 14l.7 2.1L22 17l-2.3.7L19 20l-.7-2.3L16 17l2.3-.9L19 14z"/></svg><span class="improve-writing-label">Improve Writing</span></button></div><textarea class="notes-textarea" data-f="instructions" style="min-height:72px" placeholder="What should staff do?">' + esc(entry.instructions) + '</textarea></div>' +
      '<div class="form-group"><label class="form-label">Fee or charge (if applicable)</label><input class="form-input" data-f="charge" value="' + esc(entry.charge) + '" placeholder="e.g. £25 before 2pm"></div>' +
      (isCustom ? '<div class="form-group"><label class="form-label">Policy name</label><input class="form-input" data-f="title-edit" value="' + esc(entry.title || label) + '" placeholder="e.g. Day-use rooms"></div>' : '') +
      '<input type="hidden" data-f="approvalLevel" value="' + esc(entry.approvalLevel) + '">' +
      '<input type="hidden" data-f="escalation" value="' + esc(entry.escalation) + '">' +
      '<input type="hidden" data-f="lastUpdated" value="' + esc(entry.lastUpdated) + '">' +
      '</div>';
    if (isCustom) {
      var titleEdit = card.querySelector('[data-f="title-edit"]');
      var titleHidden = card.querySelector('[data-f="title"]');
      if (titleEdit && titleHidden) {
        titleEdit.addEventListener('input', function () {
          titleHidden.value = titleEdit.value;
          var titleEl = card.querySelector('.policy-card-title');
          if (titleEl) titleEl.textContent = titleEdit.value || 'Custom policy';
        });
      }
    }
    bindDisclosureCard(card, hasContent);
    bindPolicyCardInputs(card);
    return card;
  }

  function channelByType(channels, type) {
    if (!Array.isArray(channels)) return null;
    return channels.find(function (c) { return c.type === type; }) || null;
  }

  function renderReservationsUI(root, data) {
    if (!root) return;
    var channels = migrateOtaChannelsToNotes((data && data.otaChannels) || []);
    root.innerHTML = '';
    var intro = document.createElement('p');
    intro.className = 'form-helper';
    intro.style.marginTop = '0';
    intro.style.marginBottom = '14px';
    intro.textContent = 'One notes field per channel. Write naturally — payment timing, virtual cards, modifications and anything Reception should know.';
    root.appendChild(intro);
    var stack = document.createElement('div');
    stack.className = 'disclosure-stack';
    RESERVATION_CHANNELS.forEach(function (def, idx) {
      var ch = channelByType(channels, def.type) || emptyOtaChannel(def.type, def.label);
      ch.label = ch.label || def.label;
      ch.notes = buildOtaChannelNotes(ch);
      stack.appendChild(buildReservationCard(ch, idx, def.placeholder || ''));
    });
    root.appendChild(stack);
    bindDisclosureCards(stack, '.reservation-card', function (card) {
      return card.classList.contains('disclosure-card--filled');
    });
    stack.addEventListener('input', function (e) {
      var ta = e.target.closest('[data-f="notes"]');
      if (!ta) return;
      var card = ta.closest('.reservation-card');
      if (!card) return;
      var filled = !!String(ta.value || '').trim();
      card.classList.toggle('disclosure-card--filled', filled);
      var meta = card.querySelector('.disclosure-card-meta');
      if (meta) meta.textContent = filled ? 'Notes added' : 'Write naturally — AI will organise this';
      root.dispatchEvent(new CustomEvent('profile-change', { bubbles: true }));
    });
  }

  function buildReservationCard(ch, idx, placeholder) {
    var notes = buildOtaChannelNotes(ch);
    var hasContent = !!String(notes || '').trim();
    var card = document.createElement('div');
    card.className = 'reservation-card disclosure-card disclosure-card--collapsed' + (hasContent ? ' disclosure-card--filled' : '');
    card.setAttribute('data-ota-channel', idx);
    card.innerHTML =
      '<button type="button" class="reservation-card-header disclosure-card-toggle" data-collapse-toggle aria-expanded="false">' +
      '<span class="policy-card-title-wrap">' +
      '<span class="reservation-card-title">' + esc(ch.label) + ' Notes</span>' +
      '<span class="disclosure-card-meta">' + (hasContent ? 'Notes added' : 'Write naturally — AI will organise this') + '</span>' +
      '</span>' +
      '<span class="reservation-card-status">' + disclosureChevron() + '</span>' +
      '</button>' +
      '<div class="reservation-card-body disclosure-card-body" hidden>' +
      '<input type="hidden" data-f="type" value="' + esc(ch.type) + '">' +
      '<input type="hidden" data-f="label" value="' + esc(ch.label) + '">' +
      /* Preserve legacy structured fields silently */
      '<input type="hidden" data-f="paymentModel" value="' + esc(ch.paymentModel) + '">' +
      '<input type="hidden" data-f="prepaidOrPayAtProperty" value="' + esc(ch.prepaidOrPayAtProperty) + '">' +
      '<input type="hidden" data-f="refundable" value="' + esc(ch.refundable) + '">' +
      '<input type="hidden" data-f="cancellationDeadline" value="' + esc(ch.cancellationDeadline) + '">' +
      '<input type="hidden" data-f="virtualCardActivation" value="' + esc(ch.virtualCardActivation) + '">' +
      '<input type="hidden" data-f="cardExpiryRules" value="' + esc(ch.cardExpiryRules) + '">' +
      '<input type="hidden" data-f="commissionNotes" value="' + esc(ch.commissionNotes) + '">' +
      '<input type="hidden" data-f="invoiceRules" value="' + esc(ch.invoiceRules) + '">' +
      '<input type="hidden" data-f="refundProcedure" value="' + esc(ch.refundProcedure) + '">' +
      '<input type="hidden" data-f="specialInstructions" value="' + esc(ch.specialInstructions) + '">' +
      '<div class="knowledge-field">' +
      '<label class="form-label visually-hidden" for="otaNotes_' + esc(ch.type) + '">' + esc(ch.label) + ' Notes</label>' +
      '<div class="textarea-wrap">' +
      '<textarea class="notes-textarea notes-textarea--large" id="otaNotes_' + esc(ch.type) + '" data-f="notes" placeholder="' + esc(placeholder) + '">' + esc(notes) + '</textarea>' +
      '<button type="button" class="improve-writing-btn" data-improve-writing="otaNotes_' + esc(ch.type) + '">Improve Writing</button>' +
      '</div></div></div>';
    return card;
  }

  function renderOtaChannels(root, channels) {
    renderReservationsUI(root, { otaChannels: channels });
  }

  function collectOtaChannels(root) {
    if (!root) return [];
    return Array.from(root.querySelectorAll('[data-ota-channel]')).map(function (card) {
      var o = {};
      card.querySelectorAll('[data-f]').forEach(function (el) {
        o[el.getAttribute('data-f')] = el.value;
      });
      return o;
    });
  }

  function trackerByKey(trackers, key) {
    var list = trackers || [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].key === key) return list[i];
    }
    for (var j = 0; j < TRACKER_DEFS.length; j++) {
      if (TRACKER_DEFS[j].key === key) return emptyTracker(TRACKER_DEFS[j].key, TRACKER_DEFS[j].label);
    }
    return emptyTracker(key, key);
  }

  function renderTrackers(root, trackers) {
    if (!root) return;
    root.innerHTML = '';
    TRACKER_GROUPS.forEach(function (group) {
      var enabledCount = 0;
      var configuredCount = 0;
      group.keys.forEach(function (key) {
        var tr = trackerByKey(trackers, key);
        if (tr.enabled) enabledCount += 1;
        if (trackerHasContent(tr)) configuredCount += 1;
      });

      var groupEl = document.createElement('div');
      groupEl.className = 'tracker-group disclosure-card disclosure-card--collapsed';
      groupEl.setAttribute('data-tracker-group', group.id);
      groupEl.innerHTML =
        '<button type="button" class="disclosure-card-toggle tracker-group-toggle" aria-expanded="false">' +
        '<span class="tracker-group-label">' + esc(group.label) + '</span>' +
        '<span class="disclosure-card-meta">' + enabledCount + ' enabled · ' + group.keys.length + ' trackers</span>' +
        disclosureChevron() +
        '</button>' +
        '<div class="disclosure-card-body tracker-group-body" hidden></div>';

      var body = groupEl.querySelector('.tracker-group-body');
      group.keys.forEach(function (key) {
        body.appendChild(buildTrackerCard(trackerByKey(trackers, key), key));
      });
      root.appendChild(groupEl);
      bindDisclosureCard(groupEl, false);
    });
  }

  function buildTrackerCard(tr, idx) {
    var hasContent = trackerHasContent(tr);
    var card = document.createElement('div');
    card.className = 'tracker-card disclosure-card disclosure-card--collapsed' + (hasContent ? ' disclosure-card--filled' : '');
    card.setAttribute('data-tracker', tr.key);
    card.innerHTML =
      '<div class="tracker-card-header">' +
      '<label class="tracker-enabled"><input type="checkbox" data-f="enabled"' + (tr.enabled ? ' checked' : '') + '> ' + esc(tr.label) + '</label>' +
      '<button type="button" class="btn-text disclosure-card-toggle tracker-config-toggle" aria-expanded="false" aria-label="Configure ' + esc(tr.label) + '">Configure</button>' +
      '</div>' +
      '<input type="hidden" data-f="key" value="' + esc(tr.key) + '">' +
      '<input type="hidden" data-f="label" value="' + esc(tr.label) + '">' +
      '<div class="disclosure-card-body entry-card-grid" hidden>' +
      field('Responsible department', 'department', tr.department) +
      fieldArea('Required fields', 'requiredFields', tr.requiredFields) +
      fieldArea('Escalation rules', 'escalationRules', tr.escalationRules) +
      field('Email recipients', 'emailRecipients', tr.emailRecipients) +
      field('Retention period', 'retentionPeriod', tr.retentionPeriod) +
      fieldArea('Custom notes', 'notes', tr.notes) +
      '</div>';
    var configToggle = card.querySelector('.tracker-config-toggle');
    var body = card.querySelector('.disclosure-card-body');
    if (configToggle && body) {
      configToggle.addEventListener('click', function (e) {
        e.stopPropagation();
        setDisclosureExpanded(card, configToggle.getAttribute('aria-expanded') !== 'true');
      });
    }
    return card;
  }

  function collectTrackers(root) {
    if (!root) return [];
    return Array.from(root.querySelectorAll('[data-tracker]')).map(function (card) {
      var o = { enabled: false };
      card.querySelectorAll('[data-f]').forEach(function (el) {
        if (el.type === 'checkbox') o[el.getAttribute('data-f')] = el.checked;
        else o[el.getAttribute('data-f')] = el.value;
      });
      return o;
    });
  }

  function field(label, name, val) {
    return '<div class="form-group"><label class="form-label">' + label + '</label><input class="form-input" data-f="' + name + '" value="' + esc(val) + '"></div>';
  }

  function fieldArea(label, name, val) {
    return '<div class="form-group full"><div class="field-label-row"><label class="form-label">' + label + '</label>' +
      '<button type="button" class="improve-writing-btn" data-ai-polish="' + name + '">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 3l1.4 4.6L18 9l-4.6 1.4L12 15l-1.4-4.6L6 9l4.6-1.4L12 3z"/><path d="M19 14l.7 2.1L22 17l-2.3.7L19 20l-.7-2.3L16 17l2.3-.9L19 14z"/></svg>' +
      '<span class="improve-writing-label">Improve Writing</span></button></div>' +
      '<textarea class="notes-textarea" data-f="' + name + '" style="min-height:64px">' + esc(val) + '</textarea></div>';
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  }

  function trimDisclosureText(v) {
    return String(v == null ? '' : v).trim();
  }

  function policyEntryHasContent(entry) {
    if (!entry) return false;
    return !!(trimDisclosureText(entry.summary) || trimDisclosureText(entry.instructions) || trimDisclosureText(entry.charge));
  }

  function otaChannelHasContent(ch) {
    if (!ch) return false;
    if (trimDisclosureText(ch.notes)) return true;
    return ['paymentModel', 'prepaidOrPayAtProperty', 'refundable', 'cancellationDeadline', 'virtualCardActivation',
      'cardExpiryRules', 'commissionNotes', 'invoiceRules', 'refundProcedure', 'specialInstructions'].some(function (key) {
      return !!trimDisclosureText(ch[key]);
    });
  }

  function trackerHasContent(tr) {
    if (!tr) return false;
    return !!(tr.enabled || trimDisclosureText(tr.notes) || trimDisclosureText(tr.department) ||
      trimDisclosureText(tr.requiredFields) || trimDisclosureText(tr.escalationRules) ||
      trimDisclosureText(tr.emailRecipients) || trimDisclosureText(tr.retentionPeriod));
  }

  function disclosureChevron() {
    return '<span class="disclosure-card-chevron" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg></span>';
  }

  function setDisclosureExpanded(card, expanded) {
    if (!card) return;
    var toggle = card.querySelector('.disclosure-card-toggle');
    var body = card.querySelector('.disclosure-card-body');
    card.classList.toggle('disclosure-card--collapsed', !expanded);
    card.classList.remove('profile-card--collapsed');
    if (toggle) toggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    if (body) body.hidden = !expanded;
  }

  function bindDisclosureCard(card, startExpanded) {
    if (!card || card.getAttribute('data-disclosure-bound')) return;
    var toggle = card.querySelector('.disclosure-card-toggle');
    if (!toggle) return;
    card.setAttribute('data-disclosure-bound', '1');
    setDisclosureExpanded(card, !!startExpanded);
    toggle.addEventListener('click', function (e) {
      if (e.target.closest('.icon-btn, .remove-custom-policy, .tracker-enabled, input, textarea, select, button:not(.disclosure-card-toggle)')) return;
      setDisclosureExpanded(card, toggle.getAttribute('aria-expanded') !== 'true');
    });
    toggle.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setDisclosureExpanded(card, toggle.getAttribute('aria-expanded') !== 'true');
      }
    });
  }

  function bindDisclosureCards(root, selector, expandIf) {
    if (!root) return;
    var cards = root.querySelectorAll(selector || '.disclosure-card');
    cards.forEach(function (card) {
      var expanded = expandIf ? expandIf(card) : false;
      bindDisclosureCard(card, expanded);
    });
  }

  function updatePolicyCardMeta(card) {
    if (!card) return;
    var meta = card.querySelector('.disclosure-card-meta');
    if (!meta) return;
    var summary = (card.querySelector('[data-f="summary"]') || {}).value || '';
    var instructions = (card.querySelector('[data-f="instructions"]') || {}).value || '';
    if (trimDisclosureText(summary)) {
      meta.hidden = false;
      meta.textContent = summary.length > 48 ? summary.substring(0, 48) + '…' : summary;
    } else {
      meta.textContent = '';
      meta.hidden = true;
    }
    card.classList.toggle('disclosure-card--filled', policyEntryHasContent({
      summary: summary,
      instructions: instructions,
      charge: (card.querySelector('[data-f="charge"]') || {}).value || ''
    }));
  }

  function bindPolicyCardInputs(card) {
    if (!card || card.getAttribute('data-policy-input-bound')) return;
    card.setAttribute('data-policy-input-bound', '1');
    card.querySelectorAll('[data-f="summary"], [data-f="instructions"], [data-f="charge"]').forEach(function (el) {
      el.addEventListener('input', function () { updatePolicyCardMeta(card); });
    });
    /* Improve Writing buttons are bound by hotel-profile.html preview flow */
  }

  function polishPolicyField(card, fieldName) {
    if (!card || !fieldName) return;
    var field = card.querySelector('[data-f="' + fieldName + '"]');
    if (!field) return;
    var raw = String(field.value || '').trim();
    if (!raw) return;
    if (!global.AiWritingEngine) return;
    var polished = global.AiWritingEngine.improveHotelBrainWriting
      ? global.AiWritingEngine.improveHotelBrainWriting(raw, {
          module: global.AiWritingEngine.MODULES.hotelBrain,
          prefs: { language: 'British English', tone: 'concise' }
        })
      : global.AiWritingEngine.rewritePolicy(raw, {
          module: global.AiWritingEngine.MODULES.policy,
          prefs: { language: 'British English', tone: 'professional' }
        });
    if (polished && typeof polished === 'object' && polished.text != null) polished = polished.text;
    if (polished && polished !== raw) {
      field.value = polished;
      updatePolicyCardMeta(card);
      field.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  function polishKnowledgeText(raw, options) {
    if (!global.AiWritingEngine) return String(raw || '');
    var result;
    if (global.AiWritingEngine.improveHotelBrainWriting) {
      result = global.AiWritingEngine.improveHotelBrainWriting(raw, options || {
        module: global.AiWritingEngine.MODULES.hotelBrain,
        prefs: { language: 'British English', tone: 'concise' }
      });
    } else {
      result = global.AiWritingEngine.rewriteKnowledge(raw, options || {
        module: global.AiWritingEngine.MODULES.knowledge,
        prefs: { language: 'British English', tone: 'professional' }
      });
    }
    if (result && typeof result === 'object' && result.text != null) return String(result.text);
    return String(result == null ? raw || '' : result);
  }

  function updateEmptyState(listEl, emptyId, show) {
    var el = document.getElementById(emptyId);
    if (el) el.classList.toggle('is-hidden', !show);
    if (listEl && listEl.previousElementSibling && listEl.previousElementSibling.classList.contains('editable-table-wrap')) {
      /* table wrap */
    }
  }

  function buildSectionNavLink(sec, isFirst) {
    var link = document.createElement('a');
    link.className = 'section-nav-link' + (isFirst ? ' active' : '');
    link.href = '#' + sec.id;
    link.setAttribute('data-section', sec.id);
    link.innerHTML =
      '<span class="nav-icon">' + sectionIconSvg(sec.icon) + '</span>' +
      '<span class="nav-label">' + esc(sec.shortLabel || sec.label) + '</span>' +
      '<span class="nav-trailing" aria-hidden="true"></span>';
    return link;
  }

  function buildMobileNavLink(sec, isFirst) {
    var mLink = document.createElement('a');
    mLink.className = 'mobile-nav-link' + (isFirst ? ' active' : '');
    mLink.href = '#' + sec.id;
    mLink.setAttribute('data-section', sec.id);
    mLink.textContent = sec.shortLabel || sec.label;
    return mLink;
  }

  function buildMobileLayerChip(label) {
    var chip = document.createElement('span');
    chip.className = 'mobile-nav-layer-chip';
    chip.setAttribute('aria-hidden', 'true');
    chip.textContent = label;
    return chip;
  }

  function toggleNavGroup(toggle, panel) {
    var expanded = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    panel.hidden = !expanded;
    toggle.classList.toggle('is-expanded', expanded);
  }

  function initSidebarNav(ctx) {
    var sectionNav = document.getElementById('sectionNav');
    var mobileNav = document.getElementById('mobileNav');
    if (!sectionNav) return;

    sectionNav.innerHTML = '';
    if (mobileNav) {
      mobileNav.innerHTML = '';
      mobileNav.hidden = false;
    }

    var firstSectionId = PROFILE_SECTIONS.length ? PROFILE_SECTIONS[0].id : 'general';

    NAV_LAYERS.forEach(function (layer) {
      var layerSections = PROFILE_SECTIONS.filter(function (sec) { return sec.layer === layer.id; });
      if (!layerSections.length) return;

      var group = document.createElement('div');
      group.className = 'section-nav-group';
      group.setAttribute('data-nav-layer', layer.id);

      var toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'section-nav-group-toggle' + (layer.defaultExpanded ? ' is-expanded' : '');
      toggle.setAttribute('aria-expanded', layer.defaultExpanded ? 'true' : 'false');
      toggle.setAttribute('aria-controls', 'section-nav-group-' + layer.id);
      toggle.innerHTML =
        '<span class="section-nav-group-label">' + esc(layer.label) + '</span>' +
        '<span class="section-nav-group-chevron" aria-hidden="true">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>' +
        '</span>';

      var panel = document.createElement('div');
      panel.id = 'section-nav-group-' + layer.id;
      panel.className = 'section-nav-group-panel';
      panel.hidden = !layer.defaultExpanded;

      layerSections.forEach(function (sec) {
        panel.appendChild(buildSectionNavLink(sec, sec.id === firstSectionId));
      });

      toggle.addEventListener('click', function () {
        toggleNavGroup(toggle, panel);
      });
      toggle.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggleNavGroup(toggle, panel);
        }
      });

      group.appendChild(toggle);
      group.appendChild(panel);
      sectionNav.appendChild(group);

      if (mobileNav) {
        mobileNav.appendChild(buildMobileLayerChip(layer.label));
        layerSections.forEach(function (sec) {
          mobileNav.appendChild(buildMobileNavLink(sec, sec.id === firstSectionId));
        });
      }
    });

    function setActive(id) {
      document.querySelectorAll('.section-nav-link, .mobile-nav-link').forEach(function (link) {
        link.classList.toggle('active', link.getAttribute('href') === '#' + id);
      });
    }

    document.querySelectorAll('.section-nav-link, .mobile-nav-link').forEach(function (link) {
      link.addEventListener('click', function (e) {
        var id = link.getAttribute('href').slice(1);
        var target = document.getElementById(id);
        if (target) {
          e.preventDefault();
          if (typeof global.__hfNavigateProfileSection === 'function') {
            global.__hfNavigateProfileSection(id);
          } else {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
        setActive(id === 'operations' ? 'advanced-settings' : id);
      });
    });

    if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) setActive(entry.target.id);
        });
      }, { rootMargin: '-20% 0px -60% 0px', threshold: 0 });
      PROFILE_SECTIONS.forEach(function (sec) {
        var el = document.getElementById(sec.id);
        if (el) observer.observe(el);
      });
    }

    if (ctx && ctx.onReady) ctx.onReady();
    updateCompletionUI();
  }

  function initAreaNav(ctx) {
    initSidebarNav(ctx);
  }

  function sectionIconSvg(name) {
    var paths = SECTION_ICONS[name] || SECTION_ICONS.home;
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">' + paths + '</svg>';
  }

  function fieldHasText(id) {
    var el = document.getElementById(id);
    return !!(el && String(el.value || '').trim());
  }

  function anyFieldHasText(ids) {
    return ids.some(fieldHasText);
  }

  function anyPolicyFilled(rootId) {
    var root = document.getElementById(rootId);
    if (!root) return false;
    return Array.from(root.querySelectorAll('[data-f="summary"], [data-f="instructions"]')).some(function (el) {
      return String(el.value || '').trim().length > 0;
    });
  }

  function anyRootInputFilled(rootId) {
    var root = document.getElementById(rootId);
    if (!root) return false;
    return Array.from(root.querySelectorAll('input:not([type="hidden"]), textarea, select')).some(function (el) {
      if (el.type === 'checkbox') return el.checked;
      return String(el.value || '').trim().length > 0;
    });
  }

  function countFilledFields(ids) {
    var filled = 0;
    (ids || []).forEach(function (id) {
      if (fieldHasText(id)) filled += 1;
    });
    return filled;
  }

  function policyCardFilled(card) {
    if (!card) return false;
    var summary = card.querySelector('[data-f="summary"]');
    var instructions = card.querySelector('[data-f="instructions"]');
    return !!(String((summary && summary.value) || '').trim() || String((instructions && instructions.value) || '').trim());
  }

  function countPolicyProgress(rootId) {
    var root = document.getElementById(rootId);
    if (!root) return { filled: 0, total: 0 };
    var cards = Array.from(root.querySelectorAll('.policy-card'));
    var filled = cards.filter(policyCardFilled).length;
    return { filled: filled, total: cards.length };
  }

  function countChannelProgress() {
    var root = document.getElementById('reservationsRoot');
    if (!root) return { filled: 0, total: RESERVATION_CHANNELS.length };
    var cards = Array.from(root.querySelectorAll('.reservation-card'));
    var total = Math.max(cards.length, RESERVATION_CHANNELS.length);
    var filled = cards.filter(function (card) {
      return card.classList.contains('disclosure-card--filled') ||
        Array.from(card.querySelectorAll('input:not([type="hidden"]), textarea, select')).some(function (el) {
          if (el.type === 'checkbox') return el.checked;
          return String(el.value || '').trim().length > 0;
        });
    }).length;
    return { filled: filled, total: total };
  }

  function countListItemProgress(listSelector, itemSelector, isFilled) {
    var list = document.querySelector(listSelector);
    if (!list) return { filled: 0, total: 0 };
    var items = Array.from(list.querySelectorAll(itemSelector));
    var filled = items.filter(isFilled).length;
    return { filled: filled, total: items.length };
  }

  /**
   * Meaningful section progress from existing UI state.
   * Prefer percentage when the denominator is a known checklist.
   * Prefer filled/total for open-ended entry lists.
   */
  function getSectionProgress(sectionId) {
    var filled = 0;
    var total = 0;
    var mode = 'none';

    switch (sectionId) {
      case 'general': {
        var generalIds = [
          'hotelName', 'hotelType', 'address', 'city', 'country',
          'phone', 'email', 'timezone', 'currency', 'operatingNotes'
        ];
        filled = countFilledFields(generalIds);
        total = generalIds.length;
        mode = 'pct';
        break;
      }
      case 'rooms-facilities': {
        var roomRows = document.querySelectorAll('#roomsTableBody [data-room-row]').length;
        var facilityBoxes = Array.from(document.querySelectorAll(
          '#facilityGrid input[type="checkbox"], #facilityCustomList input[type="checkbox"]'
        ));
        var facilityChecked = facilityBoxes.filter(function (el) { return el.checked; }).length;
        var facilityTotal = facilityBoxes.length;
        /* Rooms are open-ended; facilities have a fixed checkbox set when present */
        if (facilityTotal > 0) {
          filled = (roomRows > 0 ? 1 : 0) + facilityChecked;
          total = 1 + facilityTotal;
          mode = 'pct';
        } else {
          filled = roomRows;
          total = roomRows;
          mode = roomRows > 0 ? 'count' : 'empty';
        }
        break;
      }
      case 'departments-shifts': {
        var depts = countListItemProgress('#deptGrid', '[data-dept]', function (item) {
          var name = item.querySelector('.dept-name, input[data-f="name"], input.dept-name');
          var notes = item.querySelector('.dept-instructions');
          return !!(
            (name && String(name.value || '').trim()) ||
            (notes && String(notes.value || '').trim())
          );
        });
        filled = depts.filled;
        total = depts.total;
        mode = total > 0 ? 'count' : 'empty';
        break;
      }
      case 'policies': {
        var policyIds = POLICY_NOTES_SECTIONS.map(function (sec) { return 'policyNote_' + sec.key; });
        filled = countFilledFields(policyIds);
        total = policyIds.length || POLICY_NOTES_SECTIONS.length;
        mode = 'pct';
        break;
      }
      case 'hotel-knowledge': {
        var hkIds = [
          'hkGeneralNotes', 'hkGuestKnowledge', 'hkCommonTerms',
          'hkOperationalNotes', 'hkLocalRecommendations', 'hkAiInstructions'
        ];
        filled = countFilledFields(hkIds);
        total = hkIds.length;
        mode = 'pct';
        break;
      }
      case 'reservations-payments': {
        var channels = countChannelProgress();
        var pay = countPolicyProgress('paymentPoliciesRoot');
        var payTotal = pay.total || PAYMENT_POLICIES.length;
        filled = channels.filled + pay.filled;
        total = channels.total + payTotal;
        mode = 'pct';
        break;
      }
      case 'guest-services': {
        var gsIds = [
          'gsAirportTransfers', 'gsPreferredTaxi', 'gsWakeUpCalls', 'gsLuggageStorage',
          'gsGuestItemLoans', 'gsSpecialOccasions', 'gsWelcomeAmenities',
          'gsLocalRecommendations', 'gsCustomInstructions'
        ];
        filled = countFilledFields(gsIds);
        total = gsIds.length;
        mode = 'pct';
        break;
      }
      case 'inventory': {
        var supplies = countListItemProgress('#suppliesList', '[data-supply]', function (item) {
          var nameEl = item.querySelector('[data-field="name"]');
          return !!(nameEl && String(nameEl.value || '').trim());
        });
        filled = supplies.filled;
        total = supplies.total;
        mode = total > 0 ? 'count' : 'empty';
        break;
      }
      case 'operations': {
        var trackerRoot = document.getElementById('trackersList');
        var trackerCards = trackerRoot ? Array.from(trackerRoot.querySelectorAll('[data-tracker]')) : [];
        var trackerTotal = Math.max(trackerCards.length, TRACKER_DEFS.length);
        var trackerFilled = trackerCards.filter(function (card) {
          var cb = card.querySelector('[data-f="enabled"]');
          return cb && cb.checked;
        }).length;
        var emails = document.querySelectorAll('#emailRecipientList [data-email-recipient]').length;
        filled = trackerFilled + emails;
        total = trackerTotal + emails;
        mode = total > 0 ? 'count' : 'empty';
        break;
      }
      case 'advanced-settings':
      case 'academy':
        return { filled: 0, total: 0, pct: null, display: '', mode: 'none', complete: false };
      default:
        return { filled: 0, total: 0, pct: null, display: '', mode: 'none', complete: false };
    }

    if (mode === 'empty' || total <= 0) {
      return { filled: 0, total: 0, pct: null, display: '0', mode: 'empty', complete: false };
    }

    var pct = Math.round((filled / total) * 100);
    var complete = filled >= total && total > 0;
    var display = mode === 'pct' ? (pct + '%') : (filled + ' / ' + total);
    return {
      filled: filled,
      total: total,
      pct: pct,
      display: display,
      mode: mode,
      complete: complete
    };
  }

  function isSectionComplete(sectionId) {
    switch (sectionId) {
      case 'general':
        return fieldHasText('hotelName');
      case 'rooms-facilities':
        return (document.querySelectorAll('#roomsTableBody [data-room-row]').length > 0) ||
          Array.from(document.querySelectorAll('#facilityGrid input[type="checkbox"]:checked')).length > 0 ||
          Array.from(document.querySelectorAll('#facilityCustomList input[type="checkbox"]:checked')).length > 0;
      case 'departments-shifts':
        return document.querySelectorAll('#deptGrid [data-dept]').length > 0;
      case 'policies':
        return anyFieldHasText(POLICY_NOTES_SECTIONS.map(function (sec) { return 'policyNote_' + sec.key; })) ||
          anyPolicyFilled('policyStructuredRoot');
      case 'reservations-payments':
        return anyRootInputFilled('reservationsRoot') || anyPolicyFilled('paymentPoliciesRoot');
      case 'guest-services':
        return anyFieldHasText([
          'gsAirportTransfers', 'gsPreferredTaxi', 'gsWakeUpCalls', 'gsLuggageStorage',
          'gsGuestItemLoans', 'gsSpecialOccasions', 'gsWelcomeAmenities',
          'gsLocalRecommendations', 'gsCustomInstructions'
        ]);
      case 'inventory':
        return Array.from(document.querySelectorAll('#suppliesList [data-supply]')).some(function (item) {
          var nameEl = item.querySelector('[data-field="name"]');
          return nameEl && String(nameEl.value || '').trim();
        });
      case 'operations':
        /* Daily Trackers removed from Hotel Brain progress; reserved for future module */
        return false;
      case 'operational-knowledge':
        return fieldHasText('okStaffingContext') ||
          document.querySelectorAll('#okKnowledgeList [data-ok-entry]').length > 0 ||
          document.querySelectorAll('#okSourcesList [data-ok-source]').length > 0 ||
          document.querySelectorAll('[data-ok-step]').length > 0;
      case 'hotel-knowledge':
        return anyFieldHasText([
          'hkGeneralNotes', 'hkGuestKnowledge', 'hkCommonTerms',
          'hkOperationalNotes', 'hkLocalRecommendations', 'hkAiInstructions'
        ]);
      case 'academy':
      case 'advanced-settings':
        return false;
      default:
        return false;
    }
  }

  function computeProfileProgress() {
    var sections = {};
    var done = 0;
    PROGRESS_SECTIONS.forEach(function (id) {
      var complete = isSectionComplete(id);
      sections[id] = complete;
      if (complete) done += 1;
    });
    var overall = PROGRESS_SECTIONS.length ? Math.round((done / PROGRESS_SECTIONS.length) * 100) : 0;
    return { overall: overall, sections: sections, completed: done, total: PROGRESS_SECTIONS.length };
  }

  function computeEssentialProgress() {
    var sections = {};
    var done = 0;
    ESSENTIAL_PROGRESS_SECTIONS.forEach(function (id) {
      var complete = isSectionComplete(id);
      sections[id] = complete;
      if (complete) done += 1;
    });
    var total = ESSENTIAL_PROGRESS_SECTIONS.length;
    var overall = total ? Math.round((done / total) * 100) : 0;
    return { overall: overall, sections: sections, completed: done, total: total, isComplete: done === total && total > 0 };
  }

  function hasActiveSaveError() {
    var saveLine = document.getElementById('lastSavedLine');
    return !!(saveLine && saveLine.classList.contains('is-error'));
  }

  function updateEssentialProgressUI() {
    var progress = computeEssentialProgress();
    var panel = document.getElementById('essentialProgressPanel');
    var titleEl = document.getElementById('essentialProgressTitle');
    var pctEl = document.getElementById('essentialProgressPct');
    var fillEl = document.getElementById('essentialProgressFill');
    var countEl = document.getElementById('essentialProgressCount');
    var messageEl = document.getElementById('essentialProgressMessage');
    var barEl = document.getElementById('essentialProgressBar');
    var saveFailed = hasActiveSaveError();

    if (panel) {
      panel.classList.toggle('is-complete', progress.isComplete);
    }
    if (titleEl) {
      titleEl.textContent = 'Core Setup';
    }
    if (pctEl) pctEl.textContent = progress.overall + '%';
    if (fillEl) fillEl.style.width = progress.overall + '%';
    if (countEl) {
      countEl.textContent = progress.isComplete
        ? 'Ready for AI Shift Handover'
        : 'Essentials optional — add what you know';
    }
    if (messageEl) {
      messageEl.textContent = progress.isComplete
        ? ''
        : 'Add a few essentials when ready. Hotel Brain grows over time — you do not need to finish everything first.';
    }
    var brainStatusEl = document.getElementById('hotelBrainStatus');
    if (brainStatusEl) {
      if (saveFailed) {
        brainStatusEl.textContent = 'Save needed';
        brainStatusEl.classList.remove('progress-stat-value--ready', 'progress-stat-value--building');
        brainStatusEl.classList.add('is-error');
      } else {
        brainStatusEl.textContent = progress.isComplete ? 'Ready' : 'Building';
        brainStatusEl.classList.toggle('progress-stat-value--ready', progress.isComplete);
        brainStatusEl.classList.toggle('progress-stat-value--building', !progress.isComplete);
        brainStatusEl.classList.remove('is-error', 'progress-stat-value--muted');
      }
    }
    if (barEl) {
      barEl.setAttribute('aria-valuenow', String(progress.overall));
      barEl.setAttribute('aria-valuemax', '100');
      barEl.setAttribute('aria-label', progress.isComplete
        ? 'Core Setup ready for AI Shift Handover'
        : 'Core Setup not ready — essential details needed');
    }
  }

  function updateSectionStatuses() {
    document.querySelectorAll('.section-nav-link').forEach(function (link) {
      var id = link.getAttribute('data-section');
      if (!id) return;
      link.classList.toggle('is-complete', isSectionComplete(id));
      link.classList.remove('has-progress', 'is-progress-complete');
      link.removeAttribute('title');
      if (!link.querySelector('.nav-trailing')) {
        var trailing = document.createElement('span');
        trailing.className = 'nav-trailing';
        trailing.setAttribute('aria-hidden', 'true');
        link.appendChild(trailing);
      }
    });
  }

  function hotelKnowledgeFoundationLabel(progress) {
    var foundationReady = !!(progress && progress.total && progress.completed >= progress.total);
    return foundationReady ? 'Hotel Intelligence ready' : 'Growing Hotel Intelligence';
  }

  function updateCompletionUI() {
    var progress = computeProfileProgress();
    var pctEl = document.getElementById('profileProgressPct');
    var fillEl = document.getElementById('profileProgressFill');
    var countEl = document.getElementById('profileProgressCount');
    var messageEl = document.getElementById('profileProgressMessage');
    var barEl = document.getElementById('profileProgressBar');
    var foundationLabel = hotelKnowledgeFoundationLabel(progress);
    if (pctEl) pctEl.textContent = progress.overall + '%';
    if (fillEl) fillEl.style.width = progress.overall + '%';
    if (countEl) countEl.textContent = foundationLabel;
    if (messageEl) {
      messageEl.textContent = "Add knowledge anytime — one note at a time is enough.";
    }
    if (barEl) {
      barEl.setAttribute('aria-valuenow', String(progress.overall));
      barEl.setAttribute(
        'aria-label',
        foundationLabel === 'Hotel Intelligence ready'
          ? 'Hotel Intelligence ready — keep growing operational memory'
          : 'Growing Hotel Intelligence — add knowledge anytime'
      );
    }
    updateSectionStatuses();
    updateEssentialProgressUI();
  }
  function initProfileStatusPanel() { /* removed */ }
  function initSearch() { /* removed */ }

  function confirmDelete(message) {
    return window.confirm(message || 'Remove this item?');
  }

  function renderSupplyHints(root) {
    if (!root || root.querySelector('.category-hints')) return;
    var wrap = document.createElement('div');
    wrap.className = 'category-hints';
    wrap.innerHTML = '<span class="form-helper" style="margin:0 8px 0 0">Example categories:</span>';
    SUPPLY_CATEGORY_HINTS.forEach(function (c) {
      var s = document.createElement('span');
      s.className = 'category-hint';
      s.textContent = c;
      wrap.appendChild(s);
    });
    root.insertBefore(wrap, root.firstChild);
  }

  function defaultTrackers() {
    return TRACKER_DEFS.map(function (t) { return emptyTracker(t.key, t.label); });
  }

  function appendOtaChannel(root, type) {
    /* fixed four-channel layout — no-op */
  }

  global.HotelProfileKnowledge = {
    SCHEMA_V3: SCHEMA_V3,
    PROFILE_SECTIONS: PROFILE_SECTIONS,
    NAV_LAYERS: NAV_LAYERS,
    ESSENTIAL_PROGRESS_SECTIONS: ESSENTIAL_PROGRESS_SECTIONS,
    POLICY_GROUPS: POLICY_GROUPS,
    PRIMARY_POLICIES: PRIMARY_POLICIES,
    POLICY_NOTES_SECTIONS: POLICY_NOTES_SECTIONS,
    POLICY_NOTES_GROUPS: POLICY_NOTES_GROUPS,
    expandPoliciesNotes: expandPoliciesNotes,
    migrateOtaChannelsToNotes: migrateOtaChannelsToNotes,
    buildOtaChannelNotes: buildOtaChannelNotes,
    DEFAULT_DEPARTMENTS: DEFAULT_DEPARTMENTS,
    RESERVATION_CHANNELS: RESERVATION_CHANNELS,
    OTA_CHANNEL_TYPES: OTA_CHANNEL_TYPES,
    TRACKER_DEFS: TRACKER_DEFS,
    TRACKER_GROUPS: TRACKER_GROUPS,
    SUPPLY_CATEGORY_HINTS: SUPPLY_CATEGORY_HINTS,
    migrateToV3: migrateToV3,
    syncLegacyPoliciesFromStructured: syncLegacyPoliciesFromStructured,
    collectPoliciesStructured: collectPoliciesStructured,
    collectPoliciesNotes: collectPoliciesNotes,
    emptyPoliciesNotes: emptyPoliciesNotes,
    buildPoliciesNotesFromStructured: buildPoliciesNotesFromStructured,
    syncStructuredFromPoliciesNotes: syncStructuredFromPoliciesNotes,
    renderPolicyUI: renderPolicyUI,
    renderPolicyNotesUI: renderPolicyNotesUI,
    renderPaymentPoliciesUI: renderPaymentPoliciesUI,
    polishPolicyField: polishPolicyField,
    polishKnowledgeText: polishKnowledgeText,
    renderReservationsUI: renderReservationsUI,
    renderOtaChannels: renderOtaChannels,
    collectOtaChannels: collectOtaChannels,
    renderTrackers: renderTrackers,
    collectTrackers: collectTrackers,
    emptyOtaChannel: emptyOtaChannel,
    initSidebarNav: initSidebarNav,
    initAreaNav: initAreaNav,
    updateCompletionUI: updateCompletionUI,
    initProfileStatusPanel: initProfileStatusPanel,
    computeAreaSummaries: function () {
      var p = computeProfileProgress();
      return { summaries: [], overall: p.overall };
    },
    computeProfileProgress: computeProfileProgress,
    computeEssentialProgress: computeEssentialProgress,
    updateEssentialProgressUI: updateEssentialProgressUI,
    isSectionComplete: isSectionComplete,
    getSectionProgress: getSectionProgress,
    initSearch: initSearch,
    confirmDelete: confirmDelete,
    renderSupplyHints: renderSupplyHints,
    updateEmptyState: updateEmptyState,
    emptyPolicyEntry: emptyPolicyEntry,
    defaultTrackers: defaultTrackers,
    appendOtaChannel: appendOtaChannel,
    bindDisclosureCards: bindDisclosureCards,
    bindDisclosureCard: bindDisclosureCard,
    setDisclosureExpanded: setDisclosureExpanded,
    anyPolicyFilled: anyPolicyFilled,
    updateSectionStatuses: updateSectionStatuses
  };
})(typeof window !== 'undefined' ? window : globalThis);
