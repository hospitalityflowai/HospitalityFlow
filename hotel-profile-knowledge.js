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
    { id: 'departments-shifts', label: 'Departments & Shifts', shortLabel: 'Departments', icon: 'users', layer: 'essential' },
    { id: 'policies', label: 'Policies', shortLabel: 'Policies', icon: 'document', layer: 'essential' },
    { id: 'hotel-knowledge', label: 'Hotel Knowledge', shortLabel: 'Hotel Knowledge', icon: 'knowledge', layer: 'essential' },
    { id: 'reservations-payments', label: 'Reservations & Payments', shortLabel: 'Reservations & Payments', icon: 'card', layer: 'optional' },
    { id: 'guest-services', label: 'Guest Services', shortLabel: 'Guest Services', icon: 'concierge', layer: 'optional' },
    { id: 'inventory', label: 'Inventory', shortLabel: 'Inventory', icon: 'box', layer: 'optional' },
    { id: 'operations', label: 'Operations', shortLabel: 'Operations', icon: 'activity', layer: 'optional' },
    { id: 'operational-knowledge', label: 'Operational Knowledge', shortLabel: 'Operational Knowledge', icon: 'activity', layer: 'optional' },
    { id: 'advanced-settings', label: 'Advanced Settings', shortLabel: 'Advanced', icon: 'settings', layer: 'advanced' }
  ];

  var NAV_LAYERS = [
    { id: 'essential', label: 'Essential Setup', defaultExpanded: true },
    { id: 'optional', label: 'Optional Modules', defaultExpanded: false },
    { id: 'advanced', label: 'Advanced', defaultExpanded: false }
  ];

  var ESSENTIAL_PROGRESS_SECTIONS = [
    'general', 'rooms-facilities', 'departments-shifts', 'policies', 'hotel-knowledge'
  ];

  var PROGRESS_SECTIONS = [
    'general', 'rooms-facilities', 'departments-shifts', 'policies',
    'reservations-payments', 'guest-services', 'inventory', 'operations'
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
    { type: 'bookingCom', label: 'Booking.com' },
    { type: 'expedia', label: 'Expedia' },
    { type: 'direct', label: 'Direct bookings' },
    { type: 'corporate', label: 'Corporate bookings' }
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

  function emptyOtaChannel(type, label) {
    return {
      type: type, label: label, paymentModel: '', prepaidOrPayAtProperty: '', refundable: '',
      cancellationDeadline: '', virtualCardActivation: '', cardExpiryRules: '', commissionNotes: '',
      invoiceRules: '', refundProcedure: '', specialInstructions: ''
    };
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
        generalNotes: '', hotelStandards: '', vipRules: '', commonTerms: '',
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
    var structured = (data && data.policiesStructured) || { guest: {}, payment: {}, operational: {}, custom: {} };
    if (!structured.custom) structured.custom = {};
    renderPolicyList(root, PRIMARY_POLICIES, structured, true);
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
    var metaText = hasContent ? (trimDisclosureText(entry.summary) || 'Configured') : 'Not configured';
    card.innerHTML =
      '<div class="policy-card-header">' +
      '<button type="button" class="disclosure-card-toggle policy-card-toggle" aria-expanded="' + (hasContent ? 'true' : 'false') + '">' +
      '<span class="policy-card-title-wrap">' +
      '<span class="policy-card-title">' + esc(label) + '</span>' +
      '<span class="disclosure-card-meta">' + esc(metaText.length > 48 ? metaText.substring(0, 48) + '…' : metaText) + '</span>' +
      '</span>' +
      disclosureChevron() +
      '</button>' +
      (isCustom ? '<button type="button" class="icon-btn remove-custom-policy" aria-label="Remove policy"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>' : '') +
      '</div>' +
      '<div class="disclosure-card-body"' + (hasContent ? '' : ' hidden') + '>' +
      '<input type="hidden" data-f="title" value="' + esc(entry.title || label) + '">' +
      '<div class="form-group"><label class="form-label">Short summary</label><input class="form-input" data-f="summary" value="' + esc(entry.summary) + '" placeholder="One-line summary for staff"></div>' +
      '<div class="form-group"><label class="form-label">Detailed instructions</label><textarea class="notes-textarea" data-f="instructions" style="min-height:72px" placeholder="What should staff do?">' + esc(entry.instructions) + '</textarea></div>' +
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
    var channels = (data && data.otaChannels) || [];
    root.innerHTML = '';
    RESERVATION_CHANNELS.forEach(function (def, idx) {
      var ch = channelByType(channels, def.type) || emptyOtaChannel(def.type, def.label);
      ch.label = ch.label || def.label;
      root.appendChild(buildReservationCard(ch, idx));
    });
    bindDisclosureCards(root, '.reservation-card');
    root.querySelectorAll('[data-more-toggle]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var card = btn.closest('[data-ota-channel]');
        if (!card) return;
        var panel = card.querySelector('[data-more-panel]');
        var open = panel && panel.hidden;
        if (panel) panel.hidden = !open;
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        btn.textContent = open ? 'Hide more settings' : 'More settings';
      });
    });
  }

  function buildReservationCard(ch, idx) {
    var hasContent = otaChannelHasContent(ch);
    var metaText = hasContent ? 'Configured' : 'Not configured';
    var card = document.createElement('div');
    card.className = 'reservation-card disclosure-card disclosure-card--collapsed' + (hasContent ? ' disclosure-card--filled' : '');
    card.setAttribute('data-ota-channel', idx);
    card.innerHTML =
      '<button type="button" class="reservation-card-header disclosure-card-toggle" data-collapse-toggle aria-expanded="false">' +
      '<span class="reservation-card-title">' + esc(ch.label) + '</span>' +
      '<span class="reservation-card-status">' +
      '<span class="disclosure-card-meta">' + metaText + '</span>' +
      disclosureChevron() +
      '</span>' +
      '</button>' +
      '<div class="reservation-card-body disclosure-card-body" hidden>' +
      '<input type="hidden" data-f="type" value="' + esc(ch.type) + '">' +
      '<input type="hidden" data-f="label" value="' + esc(ch.label) + '">' +
      '<div class="form-grid">' +
      field('Payment type', 'paymentModel', ch.paymentModel) +
      field('Prepaid or pay at property', 'prepaidOrPayAtProperty', ch.prepaidOrPayAtProperty) +
      field('Refundable or non-refundable', 'refundable', ch.refundable) +
      field('Cancellation rules', 'cancellationDeadline', ch.cancellationDeadline) +
      fieldArea('Payment timing', 'invoiceRules', ch.invoiceRules) +
      fieldArea('Invoice notes', 'commissionNotes', ch.commissionNotes) +
      fieldArea('Special instructions', 'specialInstructions', ch.specialInstructions) +
      '</div>' +
      '<button type="button" class="disclosure-btn" data-more-toggle aria-expanded="false">More settings</button>' +
      '<div class="disclosure-panel" data-more-panel hidden>' +
      '<div class="form-grid">' +
      field('Virtual card activation', 'virtualCardActivation', ch.virtualCardActivation) +
      field('Virtual card expiry rules', 'cardExpiryRules', ch.cardExpiryRules) +
      fieldArea('Commission rules', 'commissionNotes', ch.commissionNotes) +
      fieldArea('Refund procedure', 'refundProcedure', ch.refundProcedure) +
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
    return '<div class="form-group full"><label class="form-label">' + label + '</label><textarea class="notes-textarea" data-f="' + name + '" style="min-height:64px">' + esc(val) + '</textarea></div>';
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
    if (trimDisclosureText(summary)) meta.textContent = summary.length > 48 ? summary.substring(0, 48) + '…' : summary;
    else if (trimDisclosureText(instructions)) meta.textContent = 'Configured';
    else meta.textContent = 'Not configured';
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
      '<span class="nav-check" aria-hidden="true">✓</span>';
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
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        setActive(id);
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

  function isSectionComplete(sectionId) {
    switch (sectionId) {
      case 'general':
        return fieldHasText('hotelName');
      case 'rooms-facilities':
        return (document.querySelectorAll('#roomsTableBody [data-room-row]').length > 0) ||
          Array.from(document.querySelectorAll('#facilityGrid input[type="checkbox"]:checked')).length > 0 ||
          Array.from(document.querySelectorAll('#facilityCustomList input[type="checkbox"]:checked')).length > 0;
      case 'departments-shifts':
        return document.querySelectorAll('#deptGrid [data-dept]').length > 0 ||
          document.querySelectorAll('#shiftTableBody tr').length > 0 ||
          document.querySelectorAll('#termList [data-term]').length > 0;
      case 'policies':
        return anyPolicyFilled('policyStructuredRoot');
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
        return Array.from(document.querySelectorAll('#trackersList [data-tracker]')).some(function (card) {
          var cb = card.querySelector('[data-f="enabled"]');
          return cb && cb.checked;
        }) || document.querySelectorAll('#emailRecipientList [data-email-recipient]').length > 0;
      case 'operational-knowledge':
        return fieldHasText('okStaffingContext') ||
          document.querySelectorAll('#okKnowledgeList [data-ok-entry]').length > 0 ||
          document.querySelectorAll('#okSourcesList [data-ok-source]').length > 0 ||
          document.querySelectorAll('[data-ok-step]').length > 0;
      case 'hotel-knowledge':
        return anyFieldHasText([
          'hkGeneralNotes', 'hkHotelStandards', 'hkVipRules', 'hkCommonTerms',
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

  function updateEssentialProgressUI() {
    var progress = computeEssentialProgress();
    var panel = document.getElementById('essentialProgressPanel');
    var titleEl = document.getElementById('essentialProgressTitle');
    var pctEl = document.getElementById('essentialProgressPct');
    var fillEl = document.getElementById('essentialProgressFill');
    var countEl = document.getElementById('essentialProgressCount');
    var messageEl = document.getElementById('essentialProgressMessage');
    var barEl = document.getElementById('essentialProgressBar');

    if (panel) {
      panel.classList.toggle('is-complete', progress.isComplete);
    }
    if (titleEl) {
      titleEl.textContent = progress.isComplete
        ? 'Essential Setup Complete'
        : 'Essential Setup — ' + progress.completed + ' of ' + progress.total + ' complete';
    }
    if (pctEl) pctEl.textContent = progress.overall + '%';
    if (fillEl) fillEl.style.width = progress.overall + '%';
    if (countEl) countEl.textContent = progress.completed + ' / ' + progress.total;
    if (messageEl) {
      messageEl.textContent = progress.isComplete
        ? 'Core setup complete. Your Hotel Brain is ready to power AI Shift Handover. Continue adding knowledge over time to make Hospitality Flow even smarter.'
        : 'Complete the core sections first. Optional modules can be added over time.';
    }
    var brainStatusEl = document.getElementById('hotelBrainStatus');
    if (brainStatusEl) {
      brainStatusEl.textContent = progress.isComplete ? 'Ready' : 'Building';
      brainStatusEl.classList.toggle('progress-stat-value--ready', progress.isComplete);
      brainStatusEl.classList.toggle('progress-stat-value--building', !progress.isComplete);
      brainStatusEl.classList.remove('progress-stat-value--muted');
    }
    if (barEl) {
      barEl.setAttribute('aria-valuenow', String(progress.overall));
      barEl.setAttribute('aria-label', progress.isComplete
        ? 'Essential Setup complete'
        : 'Essential Setup ' + progress.overall + ' percent complete');
    }
  }

  function updateSectionStatuses() {
    document.querySelectorAll('.section-nav-link').forEach(function (link) {
      var id = link.getAttribute('data-section');
      if (id) link.classList.toggle('is-complete', isSectionComplete(id));
    });
  }

  function updateCompletionUI() {
    var progress = computeProfileProgress();
    var pctEl = document.getElementById('profileProgressPct');
    var fillEl = document.getElementById('profileProgressFill');
    var countEl = document.getElementById('profileProgressCount');
    var barEl = document.getElementById('profileProgressBar');
    if (pctEl) pctEl.textContent = progress.overall + '%';
    if (fillEl) fillEl.style.width = progress.overall + '%';
    if (countEl) countEl.textContent = progress.completed + ' / ' + progress.total;
    if (barEl) {
      barEl.setAttribute('aria-valuenow', String(progress.overall));
      barEl.setAttribute('aria-label', 'Full profile coverage ' + progress.overall + ' percent complete');
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
    RESERVATION_CHANNELS: RESERVATION_CHANNELS,
    OTA_CHANNEL_TYPES: OTA_CHANNEL_TYPES,
    TRACKER_DEFS: TRACKER_DEFS,
    TRACKER_GROUPS: TRACKER_GROUPS,
    SUPPLY_CATEGORY_HINTS: SUPPLY_CATEGORY_HINTS,
    migrateToV3: migrateToV3,
    syncLegacyPoliciesFromStructured: syncLegacyPoliciesFromStructured,
    collectPoliciesStructured: collectPoliciesStructured,
    renderPolicyUI: renderPolicyUI,
    renderPaymentPoliciesUI: renderPaymentPoliciesUI,
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
