var version = "";

var websock = null;
var wsUri = "ws://" + window.location.host + "/ws";
var utcSeconds;
var data = [];
var ft;
var ajaxobj;

var maxNumRelays=4;
var numRelays=1;

var theCurrentLogFile ="";

var config = {
    "command": "configfile",
    "network": {
        "bssid": "",
        "ssid": "esp-rfid",
        "wmode": 1,
        "hide": 0,
        "pswd": "",
        "offtime": 0,
        "dhcp": 1,
        "ip": "",
        "subnet": "",
        "gateway": "",
        "dns": "",
        "apip": "192.168.4.1",
        "apsubnet": "255.255.255.0",
        "fallbackmode": 0
    },
    "hardware": {
        "readertype": 1,
        "wgd0pin": 4,
        "wgd1pin": 5,
        "rdm6300pin": 4,
        "sspin": 0,
        "rfidgain": 32,
        "wifipin": 255,
        "rtype": 1,
        "ltype": 0,
        "rpin": 4,
        "rtime": 400,
        "doorname": "Door",
        "beeperpin" : 255,
        "ledwaitingpin" : 255,
        "openlockpin": 255,
        "doorbellpin": 255,
        "accessdeniedpin": 255,
        "useridstoragemode": "hexadecimal",
        "requirepincodeafterrfid": 1,
        "allowpincodeonly": 0,
        "removeparitybits": 1,
        "doorstatpin": 255,
        "maxOpenDoorTime": 0
    },
    "general": {
        "hostnm": "esp-rfid",
        "restart": 0,
        "pswd": "admin",
        "openinghours": [
          "111111111111111111111111",
          "111111111111111111111111",
          "111111111111111111111111",
          "111111111111111111111111",
          "111111111111111111111111",
          "111111111111111111111111",
          "111111111111111111111111",
        ]
    },
    "mqtt": {
        "enabled": 0,
        "host": "",
        "port": 1883,
        "topic": "",
        "autotopic": 0,
        "user": "",
        "pswd": "",
        "syncrate": 180,
        "mqttlog": 0
    },
    "ntp": {
        "server": "pool.ntp.org",
        "interval": 30,
        "tzinfo": ""
    },
    "secure_reader": {
        "backend": "PN532_DESFIRE",
        "reader_id": "door_01",
        "desfire_aid": "0x564F4C",
        "desfire_file_id": 1,
        "desfire_key_no": 0,
        "desfire_file_comm_mode": "plain",
        "aes_key": "00112233445566778899AABBCCDDEEFF",
        "rs485_uart": 1,
        "rs485_baud": 115200,
        "rs485_tx_pin": 4,
        "rs485_rx_pin": 5,
        "rs485_dere_pin": 3,
        "pn532_sck_pin": 6,
        "pn532_miso_pin": 2,
        "pn532_mosi_pin": 7,
        "pn532_ss_pin": 10,
        "pn532_reset_pin": 9,
        "card_debounce_ms": 1500,
        "heartbeat_interval_ms": 10000,
        "debug_uid": false
    }
};

var page = 1;
var haspages;
var logdata;
var recordstorestore = 0;
var slot = 0;
var completed = false;
var file = {};
var backupstarted = false;
var restorestarted = false;
var gotInitialData = false;
var wsConnectionPresent = false;

var esprfidcontent;
var websocketMessagesToRetry = [];
var firmwareTarget = "esp32c3";
var maxAccessRoles = 8;
var accessRoles = [];
var selectedRoleIndex = 0;

var secureReaderPinProfiles = {
  esp32c3: {
    pin_profile: "esp32c3",
    rs485_uart: 1,
    rs485_tx_pin: 4,
    rs485_rx_pin: 5,
    rs485_dere_pin: 3,
    pn532_sck_pin: 6,
    pn532_miso_pin: 2,
    pn532_mosi_pin: 7,
    pn532_ss_pin: 10,
    pn532_reset_pin: 9
  },
  esp32: {
    pin_profile: "esp32",
    rs485_uart: 2,
    rs485_tx_pin: 17,
    rs485_rx_pin: 16,
    rs485_dere_pin: 4,
    pn532_sck_pin: 18,
    pn532_miso_pin: 19,
    pn532_mosi_pin: 23,
    pn532_ss_pin: 5,
    pn532_reset_pin: 27
  }
};

function secureReaderPinProfile() {
  return secureReaderPinProfiles[firmwareTarget] || secureReaderPinProfiles.esp32c3;
}

function secureReaderPinsMatch(profile) {
  return config.secure_reader.rs485_uart === profile.rs485_uart &&
    config.secure_reader.rs485_tx_pin === profile.rs485_tx_pin &&
    config.secure_reader.rs485_rx_pin === profile.rs485_rx_pin &&
    config.secure_reader.rs485_dere_pin === profile.rs485_dere_pin &&
    config.secure_reader.pn532_sck_pin === profile.pn532_sck_pin &&
    config.secure_reader.pn532_miso_pin === profile.pn532_miso_pin &&
    config.secure_reader.pn532_mosi_pin === profile.pn532_mosi_pin &&
    config.secure_reader.pn532_ss_pin === profile.pn532_ss_pin &&
    config.secure_reader.pn532_reset_pin === profile.pn532_reset_pin;
}

function applySecureReaderPinProfile(profile) {
  config.secure_reader.pin_profile = profile.pin_profile;
  config.secure_reader.rs485_uart = profile.rs485_uart;
  config.secure_reader.rs485_tx_pin = profile.rs485_tx_pin;
  config.secure_reader.rs485_rx_pin = profile.rs485_rx_pin;
  config.secure_reader.rs485_dere_pin = profile.rs485_dere_pin;
  config.secure_reader.pn532_sck_pin = profile.pn532_sck_pin;
  config.secure_reader.pn532_miso_pin = profile.pn532_miso_pin;
  config.secure_reader.pn532_mosi_pin = profile.pn532_mosi_pin;
  config.secure_reader.pn532_ss_pin = profile.pn532_ss_pin;
  config.secure_reader.pn532_reset_pin = profile.pn532_reset_pin;
}

function normalizeSecureReaderPinsForTarget() {
  var targetProfile = secureReaderPinProfile();
  var profileNames = Object.keys(secureReaderPinProfiles);

  if (!("pin_profile" in config.secure_reader)) {
    config.secure_reader.pin_profile = "";
  }

  for (var i = 0; i < profileNames.length; i++) {
    var profile = secureReaderPinProfiles[profileNames[i]];
    if (profile.pin_profile !== targetProfile.pin_profile && secureReaderPinsMatch(profile)) {
      applySecureReaderPinProfile(targetProfile);
      return;
    }
  }

  if (config.secure_reader.pin_profile &&
      config.secure_reader.pin_profile !== targetProfile.pin_profile &&
      secureReaderPinsMatch(secureReaderPinProfiles[config.secure_reader.pin_profile])) {
    applySecureReaderPinProfile(targetProfile);
  }

  if (firmwareTarget === "esp32c3" && config.secure_reader.rs485_uart > 1) {
    config.secure_reader.rs485_uart = targetProfile.rs485_uart;
  }
  if (!config.secure_reader.pin_profile && secureReaderPinsMatch(targetProfile)) {
    config.secure_reader.pin_profile = targetProfile.pin_profile;
  }
}

function updateFirmwareTargetUi() {
  var secureOption = document.querySelector("#readertype option[value='7']");
  if (secureOption) {
    secureOption.disabled = firmwareTarget === "esp8266";
  }

  var uartInput = document.getElementById("secureRs485Uart");
  if (uartInput) {
    uartInput.max = firmwareTarget === "esp32c3" ? 1 : 2;
  }
}

function ensureSecureReaderConfig() {
  if (!("secure_reader" in config) || typeof config.secure_reader !== "object" || config.secure_reader === null) {
    config.secure_reader = {};
  }

  var pinProfile = secureReaderPinProfile();
  if (!("backend" in config.secure_reader)) config.secure_reader.backend = "PN532_DESFIRE";
  if (!("reader_id" in config.secure_reader)) config.secure_reader.reader_id = "door_01";
  if (!("desfire_aid" in config.secure_reader)) config.secure_reader.desfire_aid = "0x564F4C";
  if (!("desfire_file_id" in config.secure_reader)) config.secure_reader.desfire_file_id = 1;
  if (!("desfire_key_no" in config.secure_reader)) config.secure_reader.desfire_key_no = 0;
  if (!("desfire_file_comm_mode" in config.secure_reader)) config.secure_reader.desfire_file_comm_mode = "plain";
  if (!("aes_key" in config.secure_reader)) config.secure_reader.aes_key = "00112233445566778899AABBCCDDEEFF";
  if (!("pin_profile" in config.secure_reader)) config.secure_reader.pin_profile = pinProfile.pin_profile;
  if (!("rs485_uart" in config.secure_reader)) config.secure_reader.rs485_uart = pinProfile.rs485_uart;
  if (!("rs485_baud" in config.secure_reader)) config.secure_reader.rs485_baud = 115200;
  if (!("rs485_tx_pin" in config.secure_reader)) config.secure_reader.rs485_tx_pin = pinProfile.rs485_tx_pin;
  if (!("rs485_rx_pin" in config.secure_reader)) config.secure_reader.rs485_rx_pin = pinProfile.rs485_rx_pin;
  if (!("rs485_dere_pin" in config.secure_reader)) config.secure_reader.rs485_dere_pin = pinProfile.rs485_dere_pin;
  if (!("pn532_sck_pin" in config.secure_reader)) config.secure_reader.pn532_sck_pin = pinProfile.pn532_sck_pin;
  if (!("pn532_miso_pin" in config.secure_reader)) config.secure_reader.pn532_miso_pin = pinProfile.pn532_miso_pin;
  if (!("pn532_mosi_pin" in config.secure_reader)) config.secure_reader.pn532_mosi_pin = pinProfile.pn532_mosi_pin;
  if (!("pn532_ss_pin" in config.secure_reader)) config.secure_reader.pn532_ss_pin = pinProfile.pn532_ss_pin;
  if (!("pn532_reset_pin" in config.secure_reader)) config.secure_reader.pn532_reset_pin = pinProfile.pn532_reset_pin;
  if (!("card_debounce_ms" in config.secure_reader)) config.secure_reader.card_debounce_ms = 1500;
  if (!("heartbeat_interval_ms" in config.secure_reader)) config.secure_reader.heartbeat_interval_ms = 10000;
  if (!("debug_uid" in config.secure_reader)) config.secure_reader.debug_uid = false;
  normalizeSecureReaderPinsForTarget();
}

function fullWeekSchedule() {
  var schedule = [];
  for (var d = 0; d < 7; d++) {
    schedule.push("111111111111111111111111");
  }
  return schedule;
}

function emptyWeekSchedule() {
  var schedule = [];
  for (var d = 0; d < 7; d++) {
    schedule.push("000000000000000000000000");
  }
  return schedule;
}

function standardScheduleFromLegacy() {
  if (config.general && config.general.openinghours && config.general.openinghours.length === 7) {
    return config.general.openinghours.slice(0, 7);
  }
  return fullWeekSchedule();
}

function defaultAccessRoles() {
  return [
    {id: 0, name: "Disabled", enabled: false, admin: false, relay_mask: 0, schedule: emptyWeekSchedule()},
    {id: 1, name: "Standard", enabled: true, admin: false, relay_mask: 15, schedule: standardScheduleFromLegacy()},
    {id: 99, name: "Admin", enabled: true, admin: true, relay_mask: 15, schedule: fullWeekSchedule()}
  ];
}

function normalizeRole(role) {
  if (!role) role = {};
  role.id = parseInt(role.id);
  if (isNaN(role.id)) role.id = 0;
  role.name = role.name || (role.id === 99 ? "Admin" : "Role");
  role.enabled = !!role.enabled;
  role.admin = !!role.admin || role.id === 99;
  role.relay_mask = parseInt(role.relay_mask);
  if (isNaN(role.relay_mask)) role.relay_mask = role.admin ? 15 : 1;
  role.relay_mask = role.relay_mask & 15;
  if (!Array.isArray(role.schedule) || role.schedule.length !== 7) {
    role.schedule = role.admin ? fullWeekSchedule() : (role.enabled ? fullWeekSchedule() : emptyWeekSchedule());
  }
  for (var d = 0; d < 7; d++) {
    if (typeof role.schedule[d] !== "string" || role.schedule[d].length !== 24) {
      role.schedule[d] = role.admin ? "111111111111111111111111" : "000000000000000000000000";
    }
  }
  if (role.id === 99) {
    role.name = "Admin";
    role.enabled = true;
    role.admin = true;
    role.relay_mask = 15;
    role.schedule = fullWeekSchedule();
  }
  return role;
}

function ensureAccessRoles() {
  if (!Array.isArray(accessRoles) || accessRoles.length === 0) {
    accessRoles = defaultAccessRoles();
  }
  accessRoles = accessRoles.slice(0, maxAccessRoles).map(normalizeRole);
  if (!roleById(99)) {
    if (accessRoles.length >= maxAccessRoles) accessRoles.pop();
    accessRoles.push(normalizeRole({id: 99, name: "Admin", enabled: true, admin: true, relay_mask: 15, schedule: fullWeekSchedule()}));
  }
  if (!roleById(1) && accessRoles.length < maxAccessRoles) {
    accessRoles.push(normalizeRole({id: 1, name: "Standard", enabled: true, admin: false, relay_mask: 15, schedule: standardScheduleFromLegacy()}));
  }
  if (!roleById(0) && accessRoles.length < maxAccessRoles) {
    accessRoles.push(normalizeRole({id: 0, name: "Disabled", enabled: false, admin: false, relay_mask: 0, schedule: emptyWeekSchedule()}));
  }
}

function roleById(id) {
  id = parseInt(id);
  for (var i = 0; i < accessRoles.length; i++) {
    if (parseInt(accessRoles[i].id) === id) return accessRoles[i];
  }
  return null;
}

function roleNameById(id) {
  var role = roleById(id);
  return role ? role.name : "Disabled";
}

function roleIdFromLegacy(acctype) {
  acctype = parseInt(acctype);
  if (acctype === 99) return 99;
  if (acctype === 1) return 1;
  return 0;
}

function roleLegacyAccessType(roleId) {
  var role = roleById(roleId);
  if (!role || !role.enabled) return 0;
  if (role.admin) return 99;
  return 1;
}

function renderRoleOptions($select, selectedRoleId) {
  ensureAccessRoles();
  $select.empty();
  accessRoles.forEach(function(role) {
    $select.append($("<option/>").text(role.name).val(role.id));
  });
  if (selectedRoleId !== undefined && selectedRoleId !== null) {
    $select.val(parseInt(selectedRoleId));
  }
}

function getRoles() {
  sendWebsocketWithRetry("{\"command\":\"getroles\"}");
}

function roleRelayMaskFromEditor() {
  var mask = 0;
  for (var i = 1; i <= maxNumRelays; i++) {
    var checkbox = document.getElementById("roleRelay" + i);
    if (checkbox && checkbox.checked) {
      mask |= (1 << (i - 1));
    }
  }
  return mask;
}

function setRoleRelayChecks(role) {
  for (var i = 1; i <= maxNumRelays; i++) {
    var checkbox = document.getElementById("roleRelay" + i);
    var label = document.getElementById("roleRelayLabel" + i);
    if (checkbox) {
      checkbox.checked = (role.relay_mask & (1 << (i - 1))) !== 0;
      checkbox.disabled = role.admin || !role.enabled || i > numRelays;
    }
    if (label) {
      label.style.display = i <= numRelays ? "inline-block" : "none";
    }
  }
}

function populateRoleHours(schedule) {
  var table = document.getElementById("rolehours");
  if (!table) return;
  table.innerHTML = "";
  var firstRow = document.createElement("tr");
  firstRow.appendChild(document.createElement("th"));
  for (var hour = 0; hour < 24; hour++) {
    var th = document.createElement("th");
    th.innerText = hour;
    firstRow.appendChild(th);
  }
  table.appendChild(firstRow);
  var weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  for (var day = 0; day < 7; day++) {
    var tr = document.createElement("tr");
    var firstCol = document.createElement("td");
    firstCol.innerHTML = "<b>" + weekDays[day] + "</b>";
    tr.appendChild(firstCol);
    for (var h = 0; h < 24; h++) {
      var td = document.createElement("td");
      var checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = schedule[day][h] === "1";
      td.appendChild(checkbox);
      tr.appendChild(td);
    }
    table.appendChild(tr);
  }
}

function extractRoleHours() {
  var table = document.getElementById("rolehours");
  if (!table) return fullWeekSchedule();
  var days = Array.from(table.getElementsByTagName("tr")).slice(1);
  var schedule = [];
  for (var d = 0; d < 7; d++) {
    var hours = days[d].getElementsByTagName("input");
    var dayFlags = "";
    for (var h = 0; h < 24; h++) {
      dayFlags += hours[h].checked ? "1" : "0";
    }
    schedule.push(dayFlags);
  }
  return schedule;
}

function loadRoleEditor() {
  ensureAccessRoles();
  if (selectedRoleIndex >= accessRoles.length) selectedRoleIndex = 0;
  var role = accessRoles[selectedRoleIndex];
  if (!role) return;
  document.getElementById("roleName").value = role.name;
  document.getElementById("roleEnabled").checked = role.enabled;
  document.getElementById("roleAdmin").checked = role.admin;
  document.getElementById("roleName").disabled = role.id === 99;
  document.getElementById("roleEnabled").disabled = role.id === 99;
  document.getElementById("roleAdmin").disabled = role.id === 99;
  document.getElementById("deleteRoleBtn").disabled = role.id === 99;
  setRoleRelayChecks(role);
  populateRoleHours(role.schedule);
}

function selectRoleForEdit() {
  if (document.getElementById("roleName") && accessRoles[selectedRoleIndex]) {
    saveRoleEditorToMemory();
  }
  var selector = document.getElementById("roleSelector");
  selectedRoleIndex = selector ? parseInt(selector.value) : 0;
  if (isNaN(selectedRoleIndex)) selectedRoleIndex = 0;
  loadRoleEditor();
}

function renderRoleSelector() {
  ensureAccessRoles();
  var selector = document.getElementById("roleSelector");
  if (!selector) return;
  selector.innerHTML = "";
  accessRoles.forEach(function(role, index) {
    var option = document.createElement("option");
    option.value = index;
    option.text = role.name;
    selector.appendChild(option);
  });
  if (selectedRoleIndex >= accessRoles.length) selectedRoleIndex = 0;
  selector.value = selectedRoleIndex;
}

function listroles() {
  ensureAccessRoles();
  renderRoleSelector();
  loadRoleEditor();
}

function addRole() {
  ensureAccessRoles();
  if (document.getElementById("roleName")) {
    saveRoleEditorToMemory();
  }
  if (accessRoles.length >= maxAccessRoles) {
    alert("Maximum 8 roles");
    return;
  }
  var nextId = 2;
  while (roleById(nextId) && nextId < 99) nextId++;
  accessRoles.push(normalizeRole({id: nextId, name: "Role " + nextId, enabled: true, admin: false, relay_mask: 1, schedule: fullWeekSchedule()}));
  selectedRoleIndex = accessRoles.length - 1;
  listroles();
}

function deleteRole() {
  ensureAccessRoles();
  var role = accessRoles[selectedRoleIndex];
  if (!role || role.id === 99) return;
  if (!confirm("Remove role " + role.name + "?")) return;
  accessRoles.splice(selectedRoleIndex, 1);
  selectedRoleIndex = 0;
  listroles();
}

function saveRoleEditorToMemory() {
  ensureAccessRoles();
  var role = accessRoles[selectedRoleIndex];
  if (!role) return;
  if (role.id !== 99) {
    role.name = document.getElementById("roleName").value || role.name;
    role.enabled = document.getElementById("roleEnabled").checked;
    role.admin = document.getElementById("roleAdmin").checked;
    role.relay_mask = role.admin ? 15 : roleRelayMaskFromEditor();
    role.schedule = role.admin ? fullWeekSchedule() : extractRoleHours();
  }
  accessRoles[selectedRoleIndex] = normalizeRole(role);
}

function saveRoles() {
  if (document.getElementById("roleName")) {
    saveRoleEditorToMemory();
  }
  ensureAccessRoles();
  sendWebsocketWithRetry(JSON.stringify({command: "rolesfile", roles: accessRoles}));
}

function sendWebsocket(msg) {
  websock.send(msg);
}

function sendWebsocketWithRetry(msg) {
  websock.send(msg);
  websocketMessagesToRetry.push({
    message: msg,
    timestamp: Date.now()
  });

  setTimeout(function(){
    retrySendWebsocket();
  }, 10000);
}

function retrySendWebsocket() {
  if(websocketMessagesToRetry.length > 0) {
    var now = Date.now();
    var oldestMessage = websocketMessagesToRetry[0];
    if(now - oldestMessage.timestamp > 10000) {
      sendWebsocketWithRetry(oldestMessage.message);
      websocketMessagesToRetry.shift();
    }

    setTimeout(function(){
      retrySendWebsocket();
    }, 10000);
  }
}

function deviceTime() {
  var t = new Date(utcSeconds * 1000); // milliseconds from epoch
  document.getElementById("device-time").innerHTML = t.toString();
}

function syncBrowserTime() {
  var d = new Date();
  var timestamp = Math.floor((d.getTime() / 1000));
  var datatosend = {};
  datatosend.command = "settime";
  datatosend.epoch = timestamp;
  sendWebsocket(JSON.stringify(datatosend));
  $("#ntp").click();
}

function handleReader() {
  var rType = parseInt(document.getElementById("readertype").value);
  document.getElementById("secureReaderForm").style.display = "none";
  if (rType === 0) {
    document.getElementById("wiegandForm").style.display = "none";
    document.getElementById("mfrc522Form").style.display = "block";
    document.getElementById("rc522gain").style.display = "block";
    document.getElementById("rdm6300").style.display = "none";
  } else if (rType === 1) {
    document.getElementById("wiegandForm").style.display = "block";
    document.getElementById("mfrc522Form").style.display = "none";
    document.getElementById("rdm6300").style.display = "none";
  } else if (rType === 2) {
    document.getElementById("wiegandForm").style.display = "none";
    document.getElementById("mfrc522Form").style.display = "block";
    document.getElementById("rc522gain").style.display = "none";
    document.getElementById("rdm6300").style.display = "none";
  } else if (rType === 3) {
    document.getElementById("wiegandForm").style.display = "none";
    document.getElementById("mfrc522Form").style.display = "none";
    document.getElementById("rc522gain").style.display = "none";
    document.getElementById("rdm6300").style.display = "block";
  } else if (rType === 4) {
    document.getElementById("wiegandForm").style.display = "none";
    document.getElementById("mfrc522Form").style.display = "block";
    document.getElementById("rc522gain").style.display = "none";
    document.getElementById("rdm6300").style.display = "block";
  } else if (rType === 5) {
    document.getElementById("wiegandForm").style.display = "block";
    document.getElementById("mfrc522Form").style.display = "none";
    document.getElementById("rc522gain").style.display = "none";
    document.getElementById("rdm6300").style.display = "block";
  } else if (rType === 6) {
    document.getElementById("wiegandForm").style.display = "none";
    document.getElementById("mfrc522Form").style.display = "block";
    document.getElementById("rc522gain").style.display = "none";
    document.getElementById("rdm6300").style.display = "block";
  } else if (rType === 7) {
    document.getElementById("wiegandForm").style.display = "none";
    document.getElementById("mfrc522Form").style.display = "block";
    document.getElementById("rc522gain").style.display = "none";
    document.getElementById("rdm6300").style.display = "none";
    document.getElementById("secureReaderForm").style.display = "block";
  }
}

function handleLock(xnum) {
  var xstr="";
  if (xnum>1) {xstr="" + xnum}
  var lType = parseInt(document.getElementById("lockType"+xstr).value);
  if (lType === 0) {
    document.getElementById("activateTimeForm"+xstr).style.display = "block";
  } else if (lType === 1) {
    document.getElementById("activateTimeForm"+xstr).style.display = "none";
  }
}

function listhardware() {
  ensureSecureReaderConfig();
  updateFirmwareTargetUi();
  document.getElementById("lockType").value = config.hardware.ltype;
  document.getElementById("typerly").value = config.hardware.rtype;
  document.getElementById("delay").value = config.hardware.rtime;
  document.getElementById("wifipin").value = config.hardware.wifipin;
  document.getElementById("doorstatpin").value = config.hardware.doorstatpin;
  document.getElementById("maxOpenDoorTime").value = config.hardware.maxOpenDoorTime;
  document.getElementById("doorbellpin").value = config.hardware.doorbellpin;
  document.getElementById("openlockpin").value = config.hardware.openlockpin;
  document.getElementById("accessdeniedpin").value = config.hardware.accessdeniedpin;
  document.getElementById("useridstoragemode").value = config.hardware.useridstoragemode;
  document.getElementById("requirepincodeafterrfid").checked = config.hardware.requirepincodeafterrfid;
  document.getElementById("allowpincodeonly").checked = config.hardware.allowpincodeonly;
  document.getElementById("removeparitybits").checked = config.hardware.removeparitybits;
  document.getElementById("ledwaitingpin").value = config.hardware.ledwaitingpin;
  document.getElementById("beeperpin").value = config.hardware.beeperpin;
  document.getElementById("readertype").value = config.hardware.readertype;
  document.getElementById("wg0pin").value = config.hardware.wgd0pin;
  document.getElementById("wg1pin").value = config.hardware.wgd1pin;
  document.getElementById("rdm6300pin").value = config.hardware.rdm6300pin;
  document.getElementById("gpioss").value = config.hardware.sspin;
  document.getElementById("gain").value = config.hardware.rfidgain;
  document.getElementById("secureBackend").value = config.secure_reader.backend;
  document.getElementById("secureReaderId").value = config.secure_reader.reader_id;
  document.getElementById("secureDesfireAid").value = config.secure_reader.desfire_aid;
  document.getElementById("secureDesfireFileId").value = config.secure_reader.desfire_file_id;
  document.getElementById("secureDesfireKeyNo").value = config.secure_reader.desfire_key_no;
  document.getElementById("secureDesfireCommMode").value = config.secure_reader.desfire_file_comm_mode;
  document.getElementById("secureAesKey").value = config.secure_reader.aes_key;
  document.getElementById("secureRs485Uart").value = config.secure_reader.rs485_uart;
  document.getElementById("secureRs485Baud").value = config.secure_reader.rs485_baud;
  document.getElementById("secureRs485Tx").value = config.secure_reader.rs485_tx_pin;
  document.getElementById("secureRs485Rx").value = config.secure_reader.rs485_rx_pin;
  document.getElementById("secureRs485Dere").value = config.secure_reader.rs485_dere_pin;
  document.getElementById("securePn532Sck").value = config.secure_reader.pn532_sck_pin;
  document.getElementById("securePn532Miso").value = config.secure_reader.pn532_miso_pin;
  document.getElementById("securePn532Mosi").value = config.secure_reader.pn532_mosi_pin;
  document.getElementById("securePn532Ss").value = config.secure_reader.pn532_ss_pin;
  document.getElementById("securePn532Reset").value = config.secure_reader.pn532_reset_pin;
  document.getElementById("secureCardDebounce").value = config.secure_reader.card_debounce_ms;
  document.getElementById("secureHeartbeat").value = config.secure_reader.heartbeat_interval_ms;
  document.getElementById("secureDebugUid").checked = config.secure_reader.debug_uid;
  document.getElementById("gpiorly").value = config.hardware.rpin;
  document.getElementById("doorname").value = config.hardware.doorname || "";
  document.getElementById("numrlys").value = numRelays;
  updateRelayForm();
  updateUserModalForm();

  for (var i = 2; i<=numRelays; i++) {
    document.getElementById("gpiorly"+i).value = config.hardware["relay"+i].rpin;
    document.getElementById("lockType"+i).value = config.hardware["relay"+i].ltype;
    document.getElementById("typerly"+i).value = config.hardware["relay"+i].rtype;
    document.getElementById("delay"+i).value = config.hardware["relay"+i].rtime;
    document.getElementById("doorname"+i).value = config.hardware["relay"+i].doorname || "";
  }
  handleReader();
  handleLock();
}

function listlog() {
  sendWebsocket("{\"command\":\"getlatestlog\", \"page\":" + page + ", \"filename\":\"" + theCurrentLogFile +"\"}");
}

function listntp() {
  sendWebsocket("{\"command\":\"gettime\"}");

  document.getElementById("ntpserver").value = config.ntp.server;
  document.getElementById("intervals").value = config.ntp.interval;
  document.getElementById("DropDownTimezone").value = config.ntp.tzinfo;
  deviceTime();
}

function revcommit() {
  document.getElementById("jsonholder").innerText = JSON.stringify(config, null, 2);
  $("#revcommit").modal("show");
}

function uncommited() {
  $("#commit").fadeOut(200, function() {
    $(this).css("background", "gold").fadeIn(1000);
  });
  document.getElementById("commit").innerHTML = "<h6>You have uncommited changes, please click here to review and commit.</h6>";
  $("#commit").click(function() {
    revcommit();
    return false;
  });
}

function savehardware() {
  ensureSecureReaderConfig();
  config.hardware.readertype = parseInt(document.getElementById("readertype").value);
  config.hardware.wgd0pin = parseInt(document.getElementById("wg0pin").value);
  config.hardware.wgd1pin = parseInt(document.getElementById("wg1pin").value);
  config.hardware.rdm6300pin = parseInt(document.getElementById("rdm6300pin").value);
  config.hardware.useridstoragemode = document.getElementById("useridstoragemode").value;
  config.hardware.requirepincodeafterrfid = document.getElementById("requirepincodeafterrfid").checked;
  config.hardware.allowpincodeonly = document.getElementById("allowpincodeonly").checked;
  config.hardware.removeparitybits = document.getElementById("removeparitybits").checked;
  config.hardware.sspin = parseInt(document.getElementById("gpioss").value);
  config.hardware.rfidgain = parseInt(document.getElementById("gain").value);
  config.secure_reader.backend = document.getElementById("secureBackend").value;
  config.secure_reader.pin_profile = firmwareTarget;
  config.secure_reader.reader_id = document.getElementById("secureReaderId").value;
  config.secure_reader.desfire_aid = document.getElementById("secureDesfireAid").value;
  config.secure_reader.desfire_file_id = parseInt(document.getElementById("secureDesfireFileId").value);
  config.secure_reader.desfire_key_no = parseInt(document.getElementById("secureDesfireKeyNo").value);
  config.secure_reader.desfire_file_comm_mode = document.getElementById("secureDesfireCommMode").value;
  config.secure_reader.aes_key = document.getElementById("secureAesKey").value;
  config.secure_reader.rs485_uart = parseInt(document.getElementById("secureRs485Uart").value);
  config.secure_reader.rs485_baud = parseInt(document.getElementById("secureRs485Baud").value);
  config.secure_reader.rs485_tx_pin = parseInt(document.getElementById("secureRs485Tx").value);
  config.secure_reader.rs485_rx_pin = parseInt(document.getElementById("secureRs485Rx").value);
  config.secure_reader.rs485_dere_pin = parseInt(document.getElementById("secureRs485Dere").value);
  config.secure_reader.pn532_sck_pin = parseInt(document.getElementById("securePn532Sck").value);
  config.secure_reader.pn532_miso_pin = parseInt(document.getElementById("securePn532Miso").value);
  config.secure_reader.pn532_mosi_pin = parseInt(document.getElementById("securePn532Mosi").value);
  config.secure_reader.pn532_ss_pin = parseInt(document.getElementById("securePn532Ss").value);
  config.secure_reader.pn532_reset_pin = parseInt(document.getElementById("securePn532Reset").value);
  config.secure_reader.card_debounce_ms = parseInt(document.getElementById("secureCardDebounce").value);
  config.secure_reader.heartbeat_interval_ms = parseInt(document.getElementById("secureHeartbeat").value);
  config.secure_reader.debug_uid = document.getElementById("secureDebugUid").checked;
  config.hardware.rtype = parseInt(document.getElementById("typerly").value);
  config.hardware.ltype = parseInt(document.getElementById("lockType").value);
  config.hardware.rpin = parseInt(document.getElementById("gpiorly").value);
  config.hardware.rtime = parseInt(document.getElementById("delay").value);
  config.hardware.wifipin = parseInt(document.getElementById("wifipin").value);
  config.hardware.doorstatpin = parseInt(document.getElementById("doorstatpin").value);
  config.hardware.maxOpenDoorTime = parseInt(document.getElementById("maxOpenDoorTime").value);
  config.hardware.doorbellpin = parseInt(document.getElementById("doorbellpin").value);
  config.hardware.openlockpin = parseInt(document.getElementById("openlockpin").value);
  config.hardware.accessdeniedpin = parseInt(document.getElementById("accessdeniedpin").value);
  config.hardware.beeperpin = parseInt(document.getElementById("beeperpin").value);
  config.hardware.ledwaitingpin = parseInt(document.getElementById("ledwaitingpin").value);
  config.hardware.doorname = document.getElementById("doorname").value;
  config.hardware["numrelays"] = numRelays; 

  for (var i = 2; i<=numRelays; i++)
  {
    config.hardware["relay"+i].rpin = document.getElementById("gpiorly"+i).value;
    config.hardware["relay"+i].ltype = document.getElementById("lockType"+i).value;
    config.hardware["relay"+i].rtype = document.getElementById("typerly"+i).value;
    config.hardware["relay"+i].rtime = document.getElementById("delay"+i).value;
    config.hardware["relay"+i].doorname = document.getElementById("doorname"+i).value;
  }  
  uncommited();
}

function saventp() {
  config.ntp.server = document.getElementById("ntpserver").value;
  config.ntp.interval = parseInt(document.getElementById("intervals").value);
  config.ntp.tzinfo = document.getElementById("DropDownTimezone").value;

  uncommited();
}

function extractOpeningHours() {
  if (!document.getElementById("openinghours")) return standardScheduleFromLegacy();
  // removing header row
  var days = Array.from(document.getElementById("openinghours").getElementsByTagName("tr")).slice(1);
  var openingHours = []
  for(var d=0; d<7; d++) {
    var hours = days[d].getElementsByTagName("input");
    var dayFlags = "";
    for(var h=0; h<24; h++) {
      dayFlags += hours[h].checked ? "1" : "0";
    }
    openingHours.push(dayFlags);
  }
  return openingHours;
}

function savegeneral() {
  var a = document.getElementById("adminpwd").value;
  if (a === null || a === "") {
    alert("Administrator Password cannot be empty");
    return;
  }
  config.general.pswd = a;
  config.general.hostnm = document.getElementById("hostname").value;
  if(document.getElementById("autorestart").value == "custom") {
    config.general.restart = parseInt(document.getElementById("autorestart-custom").value);
  } else {
    config.general.restart = parseInt(document.getElementById("autorestart").value);
  }
  if (document.getElementById("openinghours")) {
    config.general.openinghours = extractOpeningHours();
  }
  uncommited();
}

function savemqtt() {
    config.mqtt.enabled = 0;
    if (parseInt($("input[name=\"mqttEnabled\"]:checked").val()) === 1) {
        config.mqtt.enabled = 1;
    }
    else{
      config.mqtt.enabled = 0;
    } 
    config.mqtt.host      = document.getElementById("mqtthost").value;
    config.mqtt.port      = parseInt(document.getElementById("mqttport").value);
    config.mqtt.topic     = document.getElementById("mqtttopic").value;
    config.mqtt.autotopic = document.getElementById("mqttautotopic").checked;
    config.mqtt.user      = document.getElementById("mqttuser").value;
    config.mqtt.pswd      = document.getElementById("mqttpwd").value;
    config.mqtt.syncrate  = document.getElementById("syncrate").value;
    config.mqtt.mqttlog   = 0;
    if (parseInt($("input[name=\"mqttlog\"]:checked").val()) === 1) {
        config.mqtt.mqttlog = 1;
    }
    else{
        config.mqtt.mqttlog = 0;
    } 
    config.mqtt.mqttha = 0;
    if (parseInt($("input[name=\"mqttha\"]:checked").val()) === 1) {
        config.mqtt.mqttha = 1;
    }
    else{
        config.mqtt.mqttha = 0;
    } 
    uncommited();
}

function checkOctects(input) {
  var ipformat = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  var call = document.getElementById(input);
  if (call.value.match(ipformat)) {
    return true;
  } else {
    alert("You have entered an invalid address on " + input);
    call.focus();
    return false;
  }

}

function savenetwork() {
  var wmode = 0;
  config.network.dhcp = 0;
  config.network.hide = 0;
  if (document.getElementById("inputtohide").style.display === "none") {
    var b = document.getElementById("ssid");
    config.network.ssid = b.options[b.selectedIndex].value;
  } else {
    config.network.ssid = document.getElementById("inputtohide").value;
  }
  if (document.getElementById("wmodeap").checked) {
    wmode = 1;
    config.network.bssid = "";
    if (!checkOctects("ipaddress")) {
      return;
    }
    if (!checkOctects("subnet")) {
      return;
    }
    config.network.apip = document.getElementById("ipaddress").value;
    config.network.apsubnet = document.getElementById("subnet").value;

    if (parseInt(document.querySelector("input[name=\"hideapenable\"]:checked").value) === 1) {
      config.network.hide = 1;
    } else {
      config.network.hide = 0;
    }
  } else {
    config.network.bssid = document.getElementById("wifibssid").value;
    if (parseInt(document.querySelector("input[name=\"dhcpenabled\"]:checked").value) === 1) {
      config.network.dhcp = 1;
    } else {

      config.network.dhcp = 0;

      if (!checkOctects("ipaddress")) {
        return;
      }
      if (!checkOctects("subnet")) {
        return;
      }
      if (!checkOctects("dnsadd")) {
        return;
      }
      if (!checkOctects("gateway")) {
        return;
      }

      config.network.ip = document.getElementById("ipaddress").value;
      config.network.dns = document.getElementById("dnsadd").value;
      config.network.subnet = document.getElementById("subnet").value;
      config.network.gateway = document.getElementById("gateway").value;
    }
  }
  config.network.wmode = wmode;
  config.network.pswd = document.getElementById("wifipass").value;

  config.network.fallbackmode = document.forms.fallbackmodeForm.fallbackmode.value;
  config.network.offtime = parseInt(document.getElementById("disable_wifi_after_seconds").value);
  uncommited();
}

var formData = new FormData();

function inProgress(callback) {
  $("body").load("esprfid.htm #progresscontent", function(responseTxt, statusTxt, xhr) {
    if (statusTxt === "success") {
      $(".progress").css("height", "40");
      $(".progress").css("font-size", "xx-large");
      var i = 0;
      var prg = setInterval(function() {
        $(".progress-bar").css("width", i + "%").attr("aria-valuenow", i).html(i + "%");
        i++;
        if (i === 101) {
          clearInterval(prg);
          var a = document.createElement("a");
          a.href = "http://" + config.general.hostnm + ".local";
          a.innerText = "Try to reconnect ESP";
          document.getElementById("reconnect").appendChild(a);
          document.getElementById("reconnect").style.display = "block";
          document.getElementById("updateprog").className = "progress-bar progress-bar-success";
          document.getElementById("updateprog").innerHTML = "Completed";
        }
      }, 500);
      switch (callback) {
        case "upload":
          $.ajax({
            url: "/update",
            type: "POST",
            data: formData,
            processData: false,
            contentType: false
          });
          break;
        case "commit":
          sendWebsocket(JSON.stringify(config));
          break;
        case "destroy":
          sendWebsocket("{\"command\":\"destroy\"}");
          break;
        case "restart":
          sendWebsocket("{\"command\":\"restart\"}");
          break;
        default:
          break;

      }
    }
  }).hide().fadeIn();
}

function commit() {
  inProgress("commit");
}

function handleAP() {
  document.getElementById("ipaddress").value = config.network.apip;
  document.getElementById("subnet").value = config.network.apsubnet;
  document.getElementById("hideap").style.display = "block";
  document.getElementById("hideBSSID").style.display = "none";
  document.getElementById("scanb").style.display = "none";
  document.getElementById("ssid").style.display = "none";
  document.getElementById("dhcp").style.display = "none";
  $("#staticip1").slideDown();
  $("#staticip1").show();
  //document.getElementById("staticip1").style.display = "block";
  $("#staticip2").slideUp();
  //document.getElementById("staticip2").style.display = "none";
  document.getElementById("inputtohide").style.display = "block";
}

function handleDHCP() {
  if (document.querySelector("input[name=\"dhcpenabled\"]:checked").value === "1") {
    $("#staticip2").slideUp();
    $("#staticip1").slideUp();
  } else {
    document.getElementById("ipaddress").value = config.network.ip;
    document.getElementById("subnet").value = config.network.subnet;
    $("#staticip1").slideDown();
    $("#staticip1").show();
    $("#staticip2").slideDown();
    $("#staticip2").show();
  }
}

function handleSTA() {
  document.getElementById("hideap").style.display = "none";
  document.getElementById("hideBSSID").style.display = "block";
  document.getElementById("scanb").style.display = "block";
  document.getElementById("dhcp").style.display = "block";
  if (config.network.dhcp === 0) {
    $("input[name=\"dhcpenabled\"][value=\"0\"]").prop("checked", true);
  }
  handleDHCP();
}

function listnetwork() {

  document.getElementById("inputtohide").value = config.network.ssid;
  document.getElementById("wifipass").value = config.network.pswd;
  if (config.network.wmode === 1) {
    document.getElementById("wmodeap").checked = true;
    if (config.network.hide === 1) {
      $("input[name=\"hideapenable\"][value=\"1\"]").prop("checked", true);
    }
    handleAP();
  } else {
    document.getElementById("wmodesta").checked = true;
    document.getElementById("wifibssid").value = config.network.bssid;
    document.getElementById("dnsadd").value = config.network.dns;
    document.getElementById("gateway").value = config.network.gateway;
    handleSTA();
  }
  document.forms.fallbackmodeForm.fallbackmode.value = config.network.fallbackmode;
  document.getElementById("disable_wifi_after_seconds").value = config.network.offtime;

}

function populateOpeningHours() {
  var table = document.getElementById("openinghours");
  if (!table) return;
  var openingHours = Array(7);
  for(var d=0; d<7; d++) {
    openingHours[d] = "111111111111111111111111";
  }
  if (config.general.openinghours) {
    openingHours = config.general.openinghours.map(function(day) { return day.split("") });
  }

  var firstRow = document.createElement("tr");
  var spacerTh = document.createElement("th");
  firstRow.appendChild(spacerTh);
  for(hour = 0; hour<24; hour++) {
    var th = document.createElement("th");
    th.innerText = hour;
    firstRow.appendChild(th);
  }
  table.appendChild(firstRow);
  var weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  for(var day=0; day<7; day++) {
    var tr = document.createElement("tr");
    var firstCol = document.createElement("td");
    firstCol.innerHTML = "<b>" + weekDays[day] + "</b>";
    tr.appendChild(firstCol);
    for(var hour=0; hour<24; hour++) {
      var td = document.createElement("td");
      var checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = openingHours[day][hour] == 1;
      td.appendChild(checkbox);
      tr.appendChild(td);
    }
    table.appendChild(tr);
  }
}

function listgeneral() {
  document.getElementById("adminpwd").value = config.general.pswd;
  document.getElementById("hostname").value = config.general.hostnm;
  document.getElementById("autorestart").value = config.general.restart;
  document.getElementById("autorestart-custom").value = config.general.restart;
  // if value is not same as the restart option, it's custom
  var checkedOption = document.querySelector("#content #autorestart option:checked");
  if(!checkedOption || parseInt(checkedOption.value) != config.general.restart) {
    $("#autorestart-custom").removeClass("hidden");
    document.getElementById("autorestart").value = "custom";
  }
  $("#autorestart").on("change", function() {
    if (this.value == "custom") {
      $("#autorestart-custom").removeClass("hidden");
    } else {
      $("#autorestart-custom").addClass("hidden");
    }
  });
}

function listmqtt() {
    if (config.mqtt.enabled === 1) {
        $("input[name=\"mqttEnabled\"][value=\"1\"]").prop("checked", true);
    }
    document.getElementById("mqtthost").value = config.mqtt.host;
    document.getElementById("mqttport").value = config.mqtt.port;
    document.getElementById("mqtttopic").value = config.mqtt.topic;
    document.getElementById("mqttautotopic").checked = config.mqtt.autotopic;
    document.getElementById("mqttuser").value = config.mqtt.user;
    document.getElementById("mqttpwd").value = config.mqtt.pswd;
    document.getElementById("syncrate").value = config.mqtt.syncrate || 180;
    if (config.mqtt.mqttlog === 1) {
        $("input[name=\"mqttlog\"][value=\"1\"]").prop("checked", true);
    }
    if (config.mqtt.mqttha === 1) {
      $("input[name=\"mqttha\"][value=\"1\"]").prop("checked", true);
    }
    
}

function getFileList() {
    sendWebsocket("{\"command\":\"listfiles\", \"page\":" + page + "}");
}

function listBSSID() {
  var select = document.getElementById("ssid");
  document.getElementById("wifibssid").value = select.options[select.selectedIndex].bssidvalue;
}

function listSSID(obj) {
  var select = document.getElementById("ssid");
  for (var i = 0; i < obj.list.length; i++) {
    var x = parseInt(obj.list[i].rssi);
    var percentage = Math.min(Math.max(2 * (x + 100), 0), 100);
    var opt = document.createElement("option");
    opt.value = obj.list[i].ssid;
    opt.bssidvalue = obj.list[i].bssid;
    opt.innerHTML = "BSSID: " + obj.list[i].bssid + ", Signal Strength: %" + percentage + ", Network: " + obj.list[i].ssid;
    select.appendChild(opt);
  }
  document.getElementById("scanb").innerHTML = "Re-Scan";
  listBSSID();
}

function scanWifi() {
  sendWebsocket("{\"command\":\"scan\"}");
  document.getElementById("scanb").innerHTML = "...";
  document.getElementById("inputtohide").style.display = "none";
  var node = document.getElementById("ssid");
  node.style.display = "inline";
  while (node.hasChildNodes()) {
    node.removeChild(node.lastChild);
  }
}

function getUsers() {
  sendWebsocketWithRetry("{\"command\":\"userlist\", \"page\":" + page + "}");
}

function getEvents() {
  sendWebsocketWithRetry("{\"command\":\"geteventlog\", \"page\":" + page + ", \"filename\":\"" + theCurrentLogFile +"\"}");
}

function isVisible(e) {
  return !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length);
}

function listSCAN(obj) {
  var elm = document.getElementById("usersbanner");
  if (isVisible(elm)) {
    if (obj.known === 1) {
      $(".fooicon-remove").click();
      document.querySelector("input.form-control[type=text]").value = obj.uid;
      $(".fooicon-search").click();
    } else {
      $(".footable-add").click();
      document.getElementById("uid").value = obj.uid;
      document.getElementById("picctype").value = obj.type;
      document.getElementById("username").value = obj.user;
      renderRoleOptions($("#roleid"), obj.role_id || roleIdFromLegacy(obj.acctype));
    }
  }
}

function getnextpage(mode) {
  if (!backupstarted) {
    document.getElementById("loadpages").innerHTML = "Loading " + page + "/" + haspages;
  }

  // check received previous page

  if (page < haspages) {
    page = page + 1;
    var commandtosend = {};
    commandtosend.command = mode;
    commandtosend.page = page;
    if ((mode === "geteventlog") || (mode === "getlatestlog")) { 
      commandtosend.filename = theCurrentLogFile;
    }
    sendWebsocketWithRetry(JSON.stringify(commandtosend));
  } else if (page == haspages) {
    backupstarted = false;
  }
}

function builddata(obj) {
  data = data.concat(obj.list);
}

function testRelay(xnum) {
  sendWebsocket("{\"command\":\"testrelay" + xnum + "\"}");
}

function colorStatusbar(ref) {
  var percentage = ref.style.width.slice(0, -1);
  if (percentage > 50) {
    ref.className = "progress-bar progress-bar-success";
  } else if (percentage > 25) {
    ref.className = "progress-bar progress-bar-warning";
  } else {
    ref.class = "progress-bar progress-bar-danger";
  }
}

function removeModal() {
  $("#restoremodal").modal("hide");
  $("body").removeClass("modal-open");
  $("body").css("padding-right", "0px");
  $(".modal-backdrop").remove();
}

function listStats() {
  removeModal();
  version = ajaxobj.version;
  document.getElementById("chip").innerHTML = ajaxobj.chipid;
  document.getElementById("cpu").innerHTML = ajaxobj.cpu + " Mhz";
  document.getElementById("uptime").innerHTML = ajaxobj.uptime;
  document.getElementById("heap").innerHTML = ajaxobj.heap + " Bytes";
  document.getElementById("heap").style.width = (ajaxobj.heap * 100) / 40960 + "%";
  colorStatusbar(document.getElementById("heap"));
  document.getElementById("flash").innerHTML = ajaxobj.availsize + " Bytes";
  document.getElementById("flash").style.width = (ajaxobj.availsize * 100) / (ajaxobj.availsize + ajaxobj.sketchsize) + "%";
  colorStatusbar(document.getElementById("flash"));
  document.getElementById("spiffs").innerHTML = ajaxobj.availspiffs + " Bytes";
  document.getElementById("spiffs").style.width = (ajaxobj.availspiffs * 100) / ajaxobj.spiffssize + "%";
  colorStatusbar(document.getElementById("spiffs"));
  document.getElementById("ssidstat").innerHTML = ajaxobj.ssid;
  document.getElementById("ip").innerHTML = ajaxobj.ip;
  document.getElementById("gate").innerHTML = ajaxobj.gateway;
  document.getElementById("mask").innerHTML = ajaxobj.netmask;
  document.getElementById("dns").innerHTML = ajaxobj.dns;
  document.getElementById("mac").innerHTML = ajaxobj.mac;
  document.getElementById("sver").innerText = version;
  document.getElementById("systemname").innerHTML = ajaxobj.hostname;
  document.getElementById("systemnamedevice").innerHTML = ajaxobj.hostname;
  $("#mainver").text(version);
}

function getContent(contentname) {
  $("#dismiss").click();
  $(".overlay").fadeOut().promise().done(function() {
    var content = $(contentname).html();
    $("#ajaxcontent").html(content).promise().done(function() {
      switch (contentname) {
        case "#statuscontent":
          listStats();
          break;
        case "#backupcontent":
          break;
        case "#ntpcontent":
          listntp();
          break;
        case "#mqttcontent":
          listmqtt();
          break;
        case "#generalcontent":
          listgeneral();
          break;
        case "#rolescontent":
          listroles();
          break;
        case "#hardwarecontent":
          listhardware();
          break;
        case "#logmaintenancecontent":
          page = 1;
          data = [];
          getFileList();
          break;
        case "#networkcontent":
          listnetwork();
          break;
        case "#logcontent":
          page = 1;
          data = [];
          listlog();
          break;
        case "#userscontent":
          page = 1;
          data = [];
          ensureAccessRoles();
          getUsers();
          break;
        case "#eventcontent":
          page = 1;
          data = [];
          getEvents();
          break;
        default:
          break;
      }
      $("[data-toggle=\"popover\"]").popover({
        container: "body"
      });
      $(this).hide().fadeIn();
    });
  });
}

function backupuser() {
  page = 1;
  backupstarted = true;
  data = [];
  var commandtosend = {};
  commandtosend.command = "userlist";
  commandtosend.page = page;
  sendWebsocketWithRetry(JSON.stringify(commandtosend));
}

function backupset() {
  saveLogfile(config,"downloadSet","esp-rfid-settings.json")
}

function backuproles() {
  ensureAccessRoles();
  saveLogfile({type: "esp-rfid-roles", command: "rolesfile", roles: accessRoles}, "downloadRoles", "esp-rfid-roles.json");
}

function piccBackup(obj) {
  saveLogfile(obj,"downloadUser","esp-rfid-users.json")
  backupstarted = false;
}

function restoreSet() {
  var input = document.getElementById("restoreSet");
  var reader = new FileReader();
  if ("files" in input) {
    if (input.files.length === 0) {
      alert("You did not select file to restore!");
    } else {
      reader.onload = function() {
        var json;
        try {
          json = JSON.parse(reader.result);
        } catch (e) {
          alert("Not a valid backup file!");
          return;
        }
        if (json.command === "configfile") {
          var x = confirm("File seems to be valid, do you wish to continue?");
          if (x) {
            config = json;
            ensureSecureReaderConfig();
            uncommited();
          }
        }
      };
      reader.readAsText(input.files[0]);
    }
  }
}

function restoreRoles() {
  var input = document.getElementById("restoreRoles");
  var reader = new FileReader();
  if ("files" in input) {
    if (input.files.length === 0) {
      alert("You did not select file to restore!");
    } else {
      reader.onload = function() {
        var json;
        try {
          json = JSON.parse(reader.result);
        } catch (e) {
          alert("Not a valid backup file!");
          return;
        }
        if (json.command === "rolesfile" && Array.isArray(json.roles)) {
          if (confirm("File seems to be valid, do you wish to continue?")) {
            accessRoles = json.roles.map(normalizeRole);
            saveRoles();
          }
        }
      };
      reader.readAsText(input.files[0]);
    }
  }
}

function restore1by1(i, len, data) {
  var part = 100 / len;
  document.getElementById("dynamic").style.width = part * (i + 1) + "%";
  var datatosend = {};
  datatosend.command = "userfile";
  datatosend.uid = data[i].uid;
  datatosend.pincode = data[i].pincode;
  datatosend.user = data[i].username;
  datatosend.role_id = data[i].role_id || roleIdFromLegacy(data[i].acctype);
  datatosend.acctype = data[i].acctype || roleLegacyAccessType(datatosend.role_id);
  datatosend.acctype2 = data[i].acctype2 || datatosend.acctype;
  datatosend.acctype3 = data[i].acctype3 || datatosend.acctype;
  datatosend.acctype4 = data[i].acctype4 || datatosend.acctype;
  datatosend.validsince = data[i].validsince;
  datatosend.validuntil = data[i].validuntil;
  sendWebsocketWithRetry(JSON.stringify(datatosend));
  slot++;
  if (slot === len) {
    document.getElementById("dynamic").className = "progress-bar progress-bar-success";
    document.getElementById("dynamic").innerHTML = "Completed";
    document.getElementById("dynamic").style.width = "100%";
    restorestarted = false;
    completed = true;
    slot = 0;
    recordstorestore = 0;
    document.getElementById("restoreclose").style.display = "block";
  }
}

function restoreUser() {
  var input = document.getElementById("restoreUser");
  var reader = new FileReader();
  if ("files" in input) {
    if (input.files.length === 0) {
      alert("You did not select any file to restore");
    } else {
      reader.onload = function() {
        var json;
        try {
          json = JSON.parse(reader.result);
        } catch (e) {
          alert("Not a valid backup file");
          return;
        }
        if (json.type === "esp-rfid-userbackup") {
          var x = confirm("File seems to be valid, do you wish to continue?");
          if (x) {
            recordstorestore = json.list.length;
            data = json.list;
            restorestarted = true;
            completed = false;
            $("#restoremodal").modal({
              backdrop: "static",
              keyboard: false
            });
            restore1by1(slot, recordstorestore, data);
          }
        }
      };
      reader.readAsText(input.files[0]);
    }
  }
}

function twoDigits(value) {
  if (value < 10) {
    return "0" + value;
  }
  return value;
}

function initFileListTable() {
  jQuery(function($) {
    ft = window.FooTable.init("#spifftable", {
      columns: [{
          "name": "filename",
          "title": "File Name",
          "type": "text",
          "sorted": true,
          "direction": "ASC"
        },
        {
          "name": "filename",
          "title": "File Type",
          "parser": function(value) 
          {
            if (value === "/latestlog.json") 
            {
              return("Main Access Log");
            }
            if (value === "/eventlog.json") 
            {
              return("Main Event Log");
            }
            if (value.indexOf("latestlog") >= 0)
            {
              return("Access Log");
            }
            if (value.indexOf("eventlog") >= 0)
            {
              return("Event Log");
            }
            return("Log file");
          }
        },
        {
          "name": "filesize",
          "title": "Size (KB)",
          "breakpoints": "xs sm",
          "parser": function(value) {
              value = value / 1024;
              return (
                value
                  .toFixed(2) // always two decimal digits
                  .replace('.', ',') // replace decimal point character with ,
                  .replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.') + ' KB'
              ) // use . as a separator

            }
        },
        {
          "name":"filename",
          "title":"Action",
          "type":"text",
          "formatter": function (value) 
          {
            var actions = $('<div/>')

            var user_button = ($('<a/>', {'class':'btn btn-sm btn-default','filename':value})
                .append($('<span/>', {'class': 'glyphicon glyphicon-trash'}))
                .on("click", this, deletefile))
                .appendTo(actions); 
            var user_button = ($('<a/>', {'class':'btn btn-sm btn-default','filename':value})
                .append($('<span/>', {'class': 'glyphicon glyphicon-search'}))
                .on("click", this, viewfile))
                .appendTo(actions);
            var user_button = ($('<a/>', {'class':'btn btn-sm btn-default','filename':value})
                .append($('<span/>', {'class': 'glyphicon glyphicon-resize-full'}))
                .on("click", this, splitfile))
                .appendTo(actions);
            
            if ( (value === "/latestlog.json") || (value === "/eventlog.json") )
            {
              var user_button = ($('<a/>', {'class':'btn btn-sm btn-default','filename':value})
              .append($('<span/>', {'class': 'glyphicon glyphicon-refresh'}))
              .on("click", this, rollover))
              .appendTo(actions);
            } 

            return actions;
          }
      }

      ],
      rows: data
    });
    function rollover(e)
    { 
      sendWebsocket("{\"command\":\"logMaintenance\" , \"action\":\"rollover\", \"filename\":\"" + this.getAttribute('filename') + "\"}");
    }
    function splitfile(e)
    { 
      sendWebsocket("{\"command\":\"logMaintenance\" , \"action\":\"split\", \"filename\":\"" + this.getAttribute('filename') + "\"}");
    }
    function viewfile(e)
    { 
      theCurrentLogFile = this.getAttribute('filename');
      if (theCurrentLogFile.indexOf("latestlog") >= 0)
      {
        getContent("#logcontent");
      }
      if (theCurrentLogFile.indexOf("eventlog") >= 0)
      {
        getContent("#eventcontent");
      }

    }
    function deletefile(e)
    { 
      if (confirm("Really delete " + this.getAttribute('filename') + " ? This can not be undone!"))
      {
        sendWebsocket("{\"command\":\"logMaintenance\" , \"action\":\"delete\", \"filename\":\"" + this.getAttribute('filename') + "\"}");
      }
    }
  });
}

function initEventTable() {
  var newlist = [];
  for (var i = 0; i < data.length; i++) {
    newlist[i] = {};
    newlist[i].options = {};
    newlist[i].value = {};
    var dup = {};
    try {
      dup = JSON.parse(data[i]);
      dup.uid = i;
    } catch(e)
    {
      dup = {"uid":i,"type":"ERRO","src":"WEBIF","desc":"Error in logfile entry","data":data[i],"time":1}
    }
    newlist[i].value = dup;
    var c = dup.type;
    switch (c) {
      case "WARN":
        newlist[i].options.classes = "warning";
        break;
      case "INFO":
        newlist[i].options.classes = "info";
        break;
      case "ERRO":
        newlist[i].options.classes = "danger";
        break;
      default:
        break;
    }

  }
  jQuery(function($) {
    ft = window.FooTable.init("#eventtable", {
      columns: [{
          "name": "uid",
          "title": "ID",
          "type": "text",
          "sorted": true,
          "direction": "DESC"
        },
        {
          "name": "type",
          "title": "Event Type",
          "type": "text"
        },
        {
          "name": "src",
          "title": "Source"
        },
        {
          "name": "desc",
          "title": "Description"
        },
        {
          "name": "data",
          "title": "Additional Data",
          "breakpoints": "xs sm",
          "style": "font-family:monospace"
        },
        {
          "name": "time",
          "title": "Date",
          "parser": function(value) {
            if (value < 1520665101) {
              return value;
            } else {  
              var comp = new Date();
              value = Math.floor(value + ((comp.getTimezoneOffset() * 60) * -1));
              var vuepoch = new Date(value * 1000);
              var formatted = vuepoch.getUTCFullYear() +
                "-" + twoDigits(vuepoch.getUTCMonth() + 1) +
                "-" + twoDigits(vuepoch.getUTCDate()) +
                "-" + twoDigits(vuepoch.getUTCHours()) +
                ":" + twoDigits(vuepoch.getUTCMinutes()) +
                ":" + twoDigits(vuepoch.getUTCSeconds());
              return formatted;
            }
          },
          "breakpoints": "xs sm"
        }
      ],
      rows: newlist
    });
  });
}

function initLatestLogTable() {
  var newlist = [];
  for (var i = 0; i < data.length; i++) {
    newlist[i] = {};
    newlist[i].options = {};
    newlist[i].value = {};
    try {
      var dup = JSON.parse(data[i]);
    } catch(e)
    {
      var dup = {"uid":0,"acctype":99,"timestamp":0,"username":"Error in logfile entry"}
    }
    if (!dup.role_name) {
      dup.role_name = roleNameById(dup.role_id || roleIdFromLegacy(dup.acctype));
    }
    newlist[i].value = dup;
    var c = dup.access;
    switch (c) {
      case 1:
        newlist[i].options.classes = "success";
        break;
      case 0:
        newlist[i].options.classes = "danger";
        break;
      default:
        break;
    }
  }
  jQuery(function($) {
    ft = window.FooTable.init("#latestlogtable", {
      columns: [{
          "name": "timestamp",
          "title": "Date",
          "parser": function(value) {
            var comp = new Date();
            value = Math.floor(value + ((comp.getTimezoneOffset() * 60) * -1));
            var vuepoch = new Date(value * 1000);
            var formatted = vuepoch.getUTCFullYear() +
              "-" + twoDigits(vuepoch.getUTCMonth() + 1) +
              "-" + twoDigits(vuepoch.getUTCDate()) +
              "-" + twoDigits(vuepoch.getUTCHours()) +
              ":" + twoDigits(vuepoch.getUTCMinutes()) +
              ":" + twoDigits(vuepoch.getUTCSeconds());
            return formatted;
          },
          "sorted": true,
          "direction": "DESC"
        },
        {
          "name": "uid",
          "title": "UID",
          "type": "text",
          "style": "font-family:monospace"
        },
        {
          "name": "username",
          "title": "User Name or Label"
        },
        {
          "name": "role_name",
          "title": "Role",
          "breakpoints": "xs sm",
          "parser": function(value) {
            return value || "Legacy";
          }
        },
        {
          "name": "access",
          "title": "Access",
          "breakpoints": "xs sm",
          "parser": function(value) {
            if (value === 1) {
              return "Granted";
            } else if (value === 0) {
              return "Denied";
            } else {
              return "Unknown";
            }
          }
        }
      ],
      rows: newlist
    });
  });
}

function initUserTable() {
  updateUserModalForm();
  jQuery(function($) {
    var $modal = $("#editor-modal"),
      $editor = $("#editor"),
      $editorTitle = $("#editor-title"),
      ft = window.FooTable.init("#usertable", {
        columns: [{
            "name": "uid",
            "title": "UID",
            "type": "text",
            "style": "font-family:monospace"
          },
          {
            "name": "pincode",
            "title": "Pin code",
            "type": "text",
            "visible": false
          },
          {
            "name": "username",
            "title": "User Name or Label"
          },
          {
            "name": "role_id",
            "title": "Role ID",
            "visible": false
          },
          {
            "name": "role_name",
            "title": "Role",
            "breakpoints": "xs sm",
            "parser": function(value) {
              return value || "Disabled";
            }
          },
          {
            "name": "validsince",
            "title": "Valid Since",
            "breakpoints": "xs sm",
            "parser": function(value) {
              var comp = new Date();
              var vuepoch;
              if (value) {
                value = Math.floor(value + ((comp.getTimezoneOffset() * 60) * -1));
                vuepoch = new Date(value * 1000);
              } else {
                vuepoch = new Date(0);
              }
              var formatted = vuepoch.getFullYear() +
                "-" + twoDigits(vuepoch.getMonth() + 1) +
                "-" + twoDigits(vuepoch.getDate());
              return formatted;
            },
          },
          {
            "name": "validuntil",
            "title": "Valid Until",
            "breakpoints": "xs sm",
            "parser": function(value) {
              var comp = new Date();
              value = Math.floor(value + ((comp.getTimezoneOffset() * 60) * -1));
              var vuepoch = new Date(value * 1000);
              var formatted = vuepoch.getFullYear() +
                "-" + twoDigits(vuepoch.getMonth() + 1) +
                "-" + twoDigits(vuepoch.getDate());
              return formatted;
            }
          }
        ],
        rows: data,
        editing: {
          showText: "<span class=\"fooicon fooicon-pencil\" aria-hidden=\"true\"></span> Edit Users",
          addText: "New User",
          addRow: function() {
            $editor[0].reset();
            renderRoleOptions($editor.find("#roleid"), 1);
            $editorTitle.text("Add a new User");
            $modal.modal("show");
          },
          editRow: function(row) {
            var values = row.val();
            var roleId = values.role_id;
            if (roleId === undefined || roleId === null || roleId === "") {
              roleId = roleIdFromLegacy(values.acctype);
            }
            $editor.find("#uid").val(values.uid);
            $editor.find("#pincode").val(values.pincode);
            $editor.find("#username").val(values.username);
            renderRoleOptions($editor.find("#roleid"), roleId);
            $editor.find("#validsince").val(values.validsince);
            $editor.find("#validuntil").val(values.validuntil);
            $modal.data("row", row);
            $editorTitle.text("Edit User # " + values.username);
            $modal.modal("show");
          },
          deleteRow: function(row) {
            var uid = row.value.uid;
            var username = row.value.username;
            if (confirm("This will remove " + uid + " : " + username + " from database. Are you sure?")) {
              var jsontosend = "{\"uid\":\"" + uid + "\",\"command\":\"remove\"}";
              sendWebsocket(jsontosend);
              row.delete();
            }
          }
        },
        paging: {
          size: 10
        },
        components: {
          filtering: window.FooTable.MyFiltering
        }
      }),
      uid = 10001;
    $editor.on("submit", function(e) {
      if (this.checkValidity && !this.checkValidity()) {
        return;
      }
      e.preventDefault();
      var selectedRoleId = parseInt($editor.find("#roleid").val());
      var selectedRole = roleById(selectedRoleId);
      var selectedLegacyType = roleLegacyAccessType(selectedRoleId);
      var row = $modal.data("row"),
        values = {
          uid: $editor.find("#uid").val(),
          pincode: $editor.find("#pincode").val(),
          username: $editor.find("#username").val(),
          role_id: selectedRoleId,
          role_name: selectedRole ? selectedRole.name : "Disabled",
          validsince: (new Date($editor.find("#validsince").val()).getTime() / 1000),
          validuntil: (new Date($editor.find("#validuntil").val()).getTime() / 1000)
        };
      if (row instanceof window.FooTable.Row) {
        row.delete();
        values.id = uid++;
        ft.rows.add(values);
      } else {
        values.id = uid++;
        ft.rows.add(values);
      }
      var datatosend = {};
      datatosend.command = "userfile";
      datatosend.uid = $editor.find("#uid").val();
      datatosend.pincode = $editor.find("#pincode").val();
      datatosend.user = $editor.find("#username").val();
      datatosend.role_id = selectedRoleId;
      datatosend.acctype = selectedLegacyType;
      datatosend.acctype2 = selectedLegacyType === 99 ? 1 : selectedLegacyType;
      datatosend.acctype3 = selectedLegacyType === 99 ? 1 : selectedLegacyType;
      datatosend.acctype4 = selectedLegacyType === 99 ? 1 : selectedLegacyType;
      var validsince = $editor.find("#validsince").val();
      var vsepoch = (new Date(validsince).getTime() / 1000);
      datatosend.validsince = vsepoch;
      var validuntil = $editor.find("#validuntil").val();
      var vuepoch = (new Date(validuntil).getTime() / 1000);
      datatosend.validuntil = vuepoch;
      sendWebsocket(JSON.stringify(datatosend));
      $modal.modal("hide");
    });
  });
}

function restartESP() {
  inProgress("restart");
}

function socketMessageListener(evt) {
  var obj = JSON.parse(evt.data);
  if (obj.hasOwnProperty("command")) {
    switch (obj.command) {
      case "status":
        if (obj.firmware_target) {
          firmwareTarget = obj.firmware_target;
          updateFirmwareTargetUi();
          ensureSecureReaderConfig();
        }
        ajaxobj = obj;
        getContent("#statuscontent");
        break;
      case "userlist":
        haspages = obj.haspages;
        if (haspages === 0) {
          if (!backupstarted) {
            document.getElementById("loading-img").style.display = "none";
            initUserTable();
            $(".footable-show").click();
            $(".fooicon-remove").click();
          }
          break;
        }
        builddata(obj);
        break;
      case "roleslist":
        maxAccessRoles = obj.max_roles || 8;
        accessRoles = Array.isArray(obj.roles) ? obj.roles.map(normalizeRole) : defaultAccessRoles();
        ensureAccessRoles();
        if (document.getElementById("roleSelector")) {
          listroles();
        }
        break;
      case "eventlist":
        haspages = obj.haspages;
        if (haspages === 0) {
          document.getElementById("loading-img").style.display = "none";
          initEventTable();
          break;
        }
        builddata(obj);
        break;
      case "latestlist":
        haspages = obj.haspages;
        if (haspages === 0) {
          document.getElementById("loading-img").style.display = "none";
          initLatestLogTable();
          break;
        }
        builddata(obj);
        break;
      case "listfiles":
        haspages = obj.haspages;
        if (haspages === 0) {
            document.getElementById("loading-img").style.display = "none";
            initFileListTable();
            break;
          }
          builddata(obj);
          break;
      case "gettime":
        utcSeconds = obj.epoch;
        deviceTime();
        break;
      case "piccscan":
        listSCAN(obj);
        break;
      case "ssidlist":
        listSSID(obj);
        break;
      case "configfile":
        config = obj;
        if (obj.firmware_target) {
          firmwareTarget = obj.firmware_target;
        }
        if (!('wifipin' in config.hardware)) config.hardware.wifipin = 255;
        if (!('doorstatpin' in config.hardware)) config.hardware.doorstatpin = 255;
        if (!('maxOpenDoorTime' in config.hardware)) config.hardware.maxOpenDoorTime = 0;
        if (!('doorbellpin' in config.hardware)) config.hardware.doorbellpin = 255;
        if (!('accessdeniedpin' in config.hardware)) config.hardware.accessdeniedpin = 255;
        if (!('openlockpin' in config.hardware)) config.hardware.openlockpin = 255;
        if (!('beeperpin' in config.hardware)) config.hardware.beeperpin = 255;
        if (!('ledwaitingpin' in config.hardware)) config.hardware.ledwaitingpin = 255;
        if (!('ltype' in config.hardware)) config.hardware.ltype = 0;
        if (!('useridstoragemode' in config.hardware)) config.hardware.useridstoragemode = "hexadecimal";
        if (!('removeparitybits' in config.hardware)) config.hardware.removeparitybits = true;
        if ('numrelays' in config.hardware) numRelays = config.hardware["numrelays"]; else config.hardware["numrelays"] = numRelays;
        ensureSecureReaderConfig();
        ensureAccessRoles();
        break;
      default:
        break;
    }
  }
  if (obj.hasOwnProperty("resultof")) {
    websocketMessagesToRetry.shift();
    switch (obj.resultof) {
      case "latestlog":
        if (obj.result === false) {
          logdata = [];
          initLatestLogTable();
          document.getElementById("loading-img").style.display = "none";
        }
        break;
      case "userlist":
        if (page < haspages && obj.result === true) {
          getnextpage("userlist");
        } else if (page === haspages) {
          if (!backupstarted) {
            initUserTable();
            document.getElementById("loading-img").style.display = "none";

            $(".footable-show").click();
            $(".fooicon-remove").click();
          } else {
            file.type = "esp-rfid-userbackup";
            file.version = "v0.6";
            file.list = data;
            piccBackup(file);
          }
          break;
        }
        break;
      case "eventlist":
        document.getElementById("saveeventlogbtn").disabled=true;
        document.getElementById("cleareventlogbtn").disabled=true;
        if (page < haspages && obj.result === true) {
          getnextpage("geteventlog");
        } else if (page === haspages) {
          initEventTable();
          document.getElementById("saveeventlogbtn").disabled=false;
          // only enable delete button for main event log
          // others need to be done from the maintenance section
          if (theCurrentLogFile === "/eventlog.json") {
            document.getElementById("cleareventlogbtn").disabled=false;
          }
          document.getElementById("loading-img").style.display = "none";
        }
        break;
      case "latestlist":
        document.getElementById("savelatestlogbtn").disabled=true; 
        document.getElementById("clearlatestlogbtn").disabled=true; 
        if (page < haspages && obj.result === true) {
          getnextpage("getlatestlog");
        } else if (page === haspages) {
          initLatestLogTable();
          document.getElementById("savelatestlogbtn").disabled=false; 
          if (theCurrentLogFile === "/latestlog.json")
          {
            document.getElementById("clearlatestlogbtn").disabled=false; 
          } 
          document.getElementById("loading-img").style.display = "none";
        }
        break;
      case "listfiles":
        if (page < haspages && obj.result === true) {
          getnextpage("listfiles");
        } else if (page === haspages) {
          initFileListTable();
          document.getElementById("loading-img").style.display = "none";
        }
        break;
      case "logfileMaintenance":
        if (obj.result === false) 
        {
          if (obj.hasOwnProperty("message"))
          {
            alert (obj.message);
          } else 
          {
            alert ("Operation failed")
          }
        } else
        {
          $("#logmaintenance").click();
        }
        break;
      case "userfile":
        if (restorestarted) {
          if (!completed && obj.result === true) {
            restore1by1(slot, recordstorestore, data);
          }
        }
        break;
      case "rolesfile":
        if (obj.result !== true) {
          alert("Roles save failed");
        }
        break;
      default:
        break;
    }
  }
}

function clearevent() {
  if (confirm('Deleting the Event log file can not be undone - delete ?')) {
    sendWebsocket("{\"command\":\"clearevent\"}");
    $("#eventlog").click();
  }
}

function saveLogfile(obj,anchorElement,filename) {
  var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(obj, null, 2));
  var dlAnchorElem = document.getElementById(anchorElement);
  dlAnchorElem.setAttribute("href", dataStr);
  dlAnchorElem.setAttribute("download", filename);
  dlAnchorElem.click();
}

function saveevent() {
  file.type = "esp-rfid-eventlog";
  file.list = data;
  saveLogfile(file,"downloadEvent","esp-rfid-eventlog.json");
}

function savelatest() {
  file.type = "esp-rfid-accesslog";
  file.list = data;
  saveLogfile(file,"downloadLatest","esp-rfid-accesslog.json");
}

function clearlatest() {
  if (confirm('Deleting the Access log file can not be undone - delete ?')) {
    sendWebsocket("{\"command\":\"clearlatest\"}");
    $("#latestlog").click();
  }
}

function changeRelayNumber(){
  numRelays = $("#numrlys :selected").val();

  // downstream config compatibility

  config.hardware["numrelays"] = numRelays; 

  // add the missing form elements

  updateRelayForm();
  updateUserModalForm();
}

function updateRelayForm() {
  for (var i = 2; i <= maxNumRelays; i++) {
    // downstream compatibility
    if (!(config.hardware.hasOwnProperty("relay" + i))) {
      var relayJson =
      { 
        "rtype": 1,
        "ltype": 0,
        "rpin": 4,
        "rtime": 400,
      };
      config.hardware["relay" + i] = relayJson; 
    }

    var relayForm = $("#relayform");
    var relayparent= $("#relayformparent");
    if (i<= numRelays) {
      var existingRelayForm = document.getElementById("relayform" + i);
      if (!(existingRelayForm)) {
        var relayFormClone = relayForm.clone(true);
        var cloneObj = relayFormClone[0];
        relayFormClone.attr('id', 'relayform' + i);

        var str = cloneObj.innerHTML;
        str=str.replace("Relay 1 Settings","Relay "+i + " settings");
        str=str.replace ("gpiorly","gpiorly" +i);
        str=str.replace ("lockType","lockType" +i);
        str=str.replace ("typerly","typerly" +i);
        str=str.replace ("doorname","doorname" +i);
        str=str.replace ("handleLock(1)","handleLock(" +i+")");
        str=str.replace ("testRelay(1)","testRelay(" +i+")");
        str=str.replace ("activateTimeForm","activateTimeForm"+i);
        cloneObj.innerHTML=str.replace ("delay","delay" +i);
        relayparent[0].appendChild(relayFormClone[0]);
      }
      handleLock(i);
    } else {
      var removeRelayForm = document.getElementById("relayform" + i);
      if (removeRelayForm) {
        relayparent[0].removeChild(removeRelayForm);
      }
    }
  }
}

function updateUserModalForm(){
  ensureAccessRoles();
  $("#useracctype label").text("Role");
  renderRoleOptions($("#roleid"), 1);
  for (var i=2; i<= maxNumRelays; i++) {
    var accParent= $("#usermodalbody");
    var removeAccForm = document.getElementById("useracctype" + i);
    if (removeAccForm)
    {
      accParent[0].removeChild(removeAccForm);
    }
  }
}

function compareDestroy() {
  if (config.general.hostnm === document.getElementById("compare").value) {
    $("#destroybtn").prop("disabled", false);
  } else {
    $("#destroybtn").prop("disabled", true);
  }
}

function destroy() {
  inProgress("destroy");
}

$("#dismiss, .overlay").on("click", function() {
  $("#sidebar").removeClass("active");
  $(".overlay").fadeOut();
});

$("#sidebarCollapse").on("click", function() {
  $("#sidebar").addClass("active");
  $(".overlay").fadeIn();
  $(".collapse.in").toggleClass("in");
  $("a[aria-expanded=true]").attr("aria-expanded", "false");
});

$("#status").click(function() {
  sendWebsocket("{\"command\":\"status\"}");
  return false;
});

$("#network").on("click", (function() {
  getContent("#networkcontent");
  return false;
}));
$("#hardware").click(function() {
  getContent("#hardwarecontent");
  return false;
});
$("#general").click(function() {
  getContent("#generalcontent");
  return false;
});
$("#roles").click(function() {
  getContent("#rolescontent");
  return false;
});
$("#mqtt").click(function() {
  getContent("#mqttcontent");
  return false;
});
$("#ntp").click(function() {
  getContent("#ntpcontent");
  return false;
});
$("#users").click(function() {
  getContent("#userscontent");
});
$("#latestlog").click(function() {
  theCurrentLogFile="/latestlog.json";
  getContent("#logcontent");
  return false;
});
$("#backup").click(function() {
  getContent("#backupcontent");
  return false;
});
$("#reset").click(function() {
  $("#destroy").modal("show");
  return false;
});
$("#eventlog").click(function() {
  theCurrentLogFile = "/eventlog.json";
  getContent("#eventcontent");
  return false;
});
$("#logmaintenance").click(function() {
  getContent("#logmaintenancecontent");
  return false;
});
$(".noimp").on("click", function() {
  $("#noimp").modal("show");
});

window.FooTable.MyFiltering = window.FooTable.Filtering.extend({
  construct: function(instance) {
    this._super(instance);
    ensureAccessRoles();
    this.def = "Role";
    this.$acctype = null;
  },
  $create: function() {
    this._super();
    var self = this,
      $formgrp = $("<div/>", {
        "class": "form-group"
      })
      .append($("<label/>", {
        "class": "sr-only",
        text: "Status"
      }))
      .prependTo(self.$form);

    self.$acctype = $("<select/>", {
        "class": "form-control"
      })
      .on("change", {
        self: self
      }, self._onStatusDropdownChanged)
      .append($("<option/>", {
        text: self.def
      }))
      .appendTo($formgrp);

    $.each(accessRoles, function(i, role) {
      self.$acctype.append($("<option/>").text(role.name).val(role.name));
    });
  },
  _onStatusDropdownChanged: function(e) {
    var self = e.data.self,
      selected = $(this).val();
    if (selected !== self.def) {
      self.addFilter("role_name", selected, ["role_name"]);
    } else {
      self.removeFilter("role_name");
    }
    self.filter();
  },
  draw: function() {
    this._super();
    var roleName = this.find("role_name");
    if (roleName instanceof window.FooTable.Filter) {
      this.$acctype.val(roleName.query.val());
    } else {
      this.$acctype.val(this.def);
    }
  }
});

var xDown = null;
var yDown = null;

function handleTouchStart(evt) {
  xDown = evt.touches[0].clientX;
  yDown = evt.touches[0].clientY;
}

function handleTouchMove(evt) {
  if (!xDown || !yDown) {
    return;
  }

  var xUp = evt.touches[0].clientX;
  var yUp = evt.touches[0].clientY;

  var xDiff = xDown - xUp;
  var yDiff = yDown - yUp;

  if (Math.abs(xDiff) > Math.abs(yDiff)) { /*most significant*/
    if (xDiff > 0) {
      $("#dismiss").click();
    } else {
      $("#sidebarCollapse").click();
      /* right swipe */
    }
  } else {
    if (yDiff > 0) {
      /* up swipe */
    } else {
      /* down swipe */
    }
  }
  /* reset values */
  xDown = null;
  yDown = null;
}

function logout() {
  jQuery.ajax({
      type: "GET",
      url: "/login",
      async: false,
      username: "logmeout",
      password: "logmeout",
    })
    .done(function() {
      // If we don"t get an error, we actually got an error as we expect an 401!
    })
    .fail(function() {
      // We expect to get an 401 Unauthorized error! In this case we are successfully
      // logged out and we redirect the user.
      document.location = "index.html";
    });
  return false;
}

function wsConnectionActive() {
  wsConnectionPresent = true;
  $("#ws-connection-status").slideUp();
  if (!gotInitialData) {
    sendWebsocket("{\"command\":\"status\"}");
    sendWebsocket("{\"command\":\"getconf\"}");
    sendWebsocket("{\"command\":\"getroles\"}");
    gotInitialData = true;
  }
}

function wsConnectionClosed() {
  wsConnectionPresent = false;
  $("#ws-connection-status").slideDown();
  connectWS();
}

function keepWSConnectionOpen() {
  if (!wsConnectionPresent) {
    setTimeout(connectWS, 5000);
  }
}

function connectWS() {
  if(wsConnectionPresent) {
    return;
  }

  if (window.location.protocol === "https:") {
    wsUri = "wss://" + window.location.hostname + ":" + window.location.port + "/ws";
  } else if (window.location.protocol === "file:" ||
      ["0.0.0.0", "localhost", "127.0.0.1"].includes(window.location.hostname)) {
    wsUri = "ws://localhost:8080/ws";
  }
  websock = new WebSocket(wsUri);
  websock.addEventListener("message", socketMessageListener);

  websock.onopen = function(evt) {
    wsConnectionActive();
  };

  websock.onclose = function(evt) {
    wsConnectionClosed();
  };

  keepWSConnectionOpen();
}

function upload() {
  formData.append("bin", $("#binform")[0].files[0]);
  inProgress("upload");
}

function login() {
  if (document.getElementById("password").value === "neo") {
    $("#signin").modal("hide");
    connectWS();
  } else {
    var username = "admin";
    var password = document.getElementById("password").value;
    var url = "/login";
    var xhr = new XMLHttpRequest();
    xhr.open("get", url, true, username, password);
    xhr.onload = function(e) {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          $("#signin").modal("hide");
          connectWS();
        } else {
          alert("Incorrect password!");
        }
      }
    };
    xhr.send(null);
  }
}

function getLatestReleaseInfo() {

  $.getJSON("https://api.github.com/repos/esprfid/esp-rfid/releases/latest").done(function(release) {
    var asset = release.assets[0];
    var downloadCount = 0;
    for (var i = 0; i < release.assets.length; i++) {
      downloadCount += release.assets[i].download_count;
    }
    var oneHour = 60 * 60 * 1000;
    var oneDay = 24 * oneHour;
    var dateDiff = new Date() - new Date(release.published_at);
    var timeAgo;
    if (dateDiff < oneDay) {
      timeAgo = (dateDiff / oneHour).toFixed(1) + " hours ago";
    } else {
      timeAgo = (dateDiff / oneDay).toFixed(1) + " days ago";
    }

    var releaseInfo = release.name + " was updated " + timeAgo + " and downloaded " + downloadCount.toLocaleString() + " times.";
    $("#downloadupdate").attr("href", asset.browser_download_url);
    $("#releasehead").text(releaseInfo);
    $("#releasebody").text(release.body);
    $("#releaseinfo").fadeIn("slow");
    $("#versionhead").text(version);
  }).error(function() {
    $("#onlineupdate").html("<h5>Couldn't get release info. Are you connected to the Internet?</h5>");
  });
}

$("#update").on("shown.bs.modal", function(e) {
  getLatestReleaseInfo();
});

function allowUpload() {
  $("#upbtn").prop("disabled", false);
}

function start() {
  esprfidcontent = document.createElement("div");
  esprfidcontent.id = "mastercontent";
  esprfidcontent.style.display = "none";
  document.body.appendChild(esprfidcontent);
  $("#signin").on("shown.bs.modal", function() {
    $("#password").focus().select();
  });
  $("#mastercontent").load("esprfid.htm", function(responseTxt, statusTxt, xhr) {
    if (statusTxt === "success") {
      $("#signin").modal({
        backdrop: "static",
        keyboard: false
      });
      $("[data-toggle=\"popover\"]").popover({
        container: "body"
      });

    }
  });
}

document.addEventListener("touchstart", handleTouchStart, false);
document.addEventListener("touchmove", handleTouchMove, false);
