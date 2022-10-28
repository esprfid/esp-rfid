var version = "";

var websock = null;
var wsUri = "ws://" + window.location.host + "/ws";
var utcSeconds;
var timezone;
var data = [];
var ajaxobj;
var isOfficialBoard = false;

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
        "sspin": 0,
        "rfidgain": 32,
        "wifipin": 255,
        "rtype": 1,
        "ltype": 0,
        "rpin": 4,
        "rtime": 400,
        "beeperpin" : 255,
        "ledwaitingpin" : 255,
        "openlockpin": 255,
        "doorbellpin": 255,
        "accessdeniedpin": 255,
        "doorstatpin": 255,
        "beeperpin" : 255,
        "ledwaitingpin" : 255,
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
        "user": "",
        "pswd": "",
        "syncrate": 180,
        "mqttlog": 0
    },
    "logmaintenance": {
      "enabled": 0,
      "rolloverkb": "10",
      "maxlogfilesnumber": 4,
      "spiffwatch": 0
    },
    "ntp": {
        "server": "pool.ntp.org",
        "interval": 30,
        "timezone": 0
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

function browserTime() {
  var d = new Date(0);
  var c = new Date();
  var timestamp = Math.floor((c.getTime() / 1000) + ((c.getTimezoneOffset() * 60) * -1));
  d.setUTCSeconds(timestamp);
  document.getElementById("rtc").innerHTML = d.toUTCString().slice(0, -3);
}

function deviceTime() {
  var t = new Date(0); // The 0 there is the key, which sets the date to the epoch,
  var devTime = Math.floor(utcSeconds + (config.ntp.timezone * 60 * 60));
  t.setUTCSeconds(devTime);
  document.getElementById("utc").innerHTML = t.toUTCString().slice(0, -3);
}

function syncBrowserTime() {
  var d = new Date();
  var timestamp = Math.floor((d.getTime() / 1000));
  var datatosend = {};
  datatosend.command = "settime";
  datatosend.epoch = timestamp;
  websock.send(JSON.stringify(datatosend));
  $("#ntp").click();
}

function handleReader() {
  var rType = parseInt(document.getElementById("readertype").value);
  if (rType === 0 || rType === 4) {
    document.getElementById("wiegandForm").style.display = "none";
    document.getElementById("mfrc522Form").style.display = "block";
    document.getElementById("rc522gain").style.display = "block";
  } else if (rType === 1 || rType === 5) {
    document.getElementById("wiegandForm").style.display = "block";
    document.getElementById("mfrc522Form").style.display = "none";
  } else if (rType === 2 || rType === 6) {
    document.getElementById("wiegandForm").style.display = "none";
    document.getElementById("mfrc522Form").style.display = "block";
    document.getElementById("rc522gain").style.display = "none";
  } else if (rType === 3) {
    document.getElementById("wiegandForm").style.display = "none";
    document.getElementById("mfrc522Form").style.display = "none";
    document.getElementById("rc522gain").style.display = "none";
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
  document.getElementById("lockType").value = config.hardware.ltype;
  document.getElementById("typerly").value = config.hardware.rtype;
  document.getElementById("delay").value = config.hardware.rtime;
  document.getElementById("wifipin").value = config.hardware.wifipin;
  document.getElementById("doorstatpin").value = config.hardware.doorstatpin;
  document.getElementById("maxOpenDoorTime").value = config.hardware.maxOpenDoorTime;
  document.getElementById("doorbellpin").value = config.hardware.doorbellpin;
  document.getElementById("openlockpin").value = config.hardware.openlockpin;
  document.getElementById("accessdeniedpin").value = config.hardware.accessdeniedpin;
  document.getElementById("pincoderequested").value = config.hardware.pincoderequested;
  document.getElementById("ledwaitingpin").value = config.hardware.ledwaitingpin;
  document.getElementById("beeperpin").value = config.hardware.beeperpin;
  if (isOfficialBoard) {
    document.getElementById("readertype").value = 1;
    document.getElementById("wg0pin").value = 5;
    document.getElementById("wg1pin").value = 4;
    document.getElementById("gpiorly").value = 13;
    document.getElementById("wg0pin").disabled = true;
    document.getElementById("wg1pin").disabled = true;
    document.getElementById("gpiorly").disabled = true;
    document.getElementById("readertype").disabled = true;
  } else {
    document.getElementById("readertype").value = config.hardware.readertype;
    document.getElementById("wg0pin").value = config.hardware.wgd0pin;
    document.getElementById("wg1pin").value = config.hardware.wgd1pin;
    document.getElementById("gpioss").value = config.hardware.sspin;
    document.getElementById("gain").value = config.hardware.rfidgain;
    document.getElementById("gpiorly").value = config.hardware.rpin;
    document.getElementById("numrlys").value = numRelays;
    updateRelayForm();
    updateUserModalForm();


    for (var i = 2; i<=numRelays; i++)
    {

      document.getElementById("gpiorly"+i).value = config.hardware["relay"+i].rpin;
      document.getElementById("lockType"+i).value = config.hardware["relay"+i].ltype;
      document.getElementById("typerly"+i).value = config.hardware["relay"+i].rtype;
      document.getElementById("delay"+i).value = config.hardware["relay"+i].rtime;
    }  
  }
  handleReader();
  handleLock();
}

function listlog() {
//  websock.send("{\"command\":\"getlatestlog\", \"page\":" + page + "}");
  websock.send("{\"command\":\"getlatestlog\", \"page\":" + page + ", \"filename\":\"" + theCurrentLogFile +"\"}");
}

function listntp() {
  websock.send("{\"command\":\"gettime\"}");

  document.getElementById("ntpserver").value = config.ntp.server;
  document.getElementById("intervals").value = config.ntp.interval;
  document.getElementById("DropDownTimezone").value = config.ntp.timezone;
  browserTime();
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
  config.hardware.readertype = parseInt(document.getElementById("readertype").value);
  config.hardware.wgd0pin = parseInt(document.getElementById("wg0pin").value);
  config.hardware.wgd1pin = parseInt(document.getElementById("wg1pin").value);
  config.hardware.pincoderequested = document.getElementById("pincoderequested").value == "true";
  config.hardware.sspin = parseInt(document.getElementById("gpioss").value);
  config.hardware.rfidgain = parseInt(document.getElementById("gain").value);
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
  config.hardware["numrelays"] = numRelays; 

  for (var i = 2; i<=numRelays; i++)
  {
    config.hardware["relay"+i].rpin = document.getElementById("gpiorly"+i).value;
    config.hardware["relay"+i].ltype = document.getElementById("lockType"+i).value;
    config.hardware["relay"+i].rtype = document.getElementById("typerly"+i).value;
    config.hardware["relay"+i].rtime = document.getElementById("delay"+i).value;
  }  
  uncommited();
}

function saventp() {
  config.ntp.server = document.getElementById("ntpserver").value;
  config.ntp.interval = parseInt(document.getElementById("intervals").value);
  config.ntp.timezone = parseInt(document.getElementById("DropDownTimezone").value);

  uncommited();
}

function extractOpeningHours() {
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
  config.general.restart = parseInt(document.getElementById("autorestart").value);
  config.general.openinghours = extractOpeningHours();
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
    config.mqtt.host     = document.getElementById("mqtthost").value;
    config.mqtt.port     = parseInt(document.getElementById("mqttport").value);
    config.mqtt.topic    = document.getElementById("mqtttopic").value;
    config.mqtt.user     = document.getElementById("mqttuser").value;
    config.mqtt.pswd     = document.getElementById("mqttpwd").value;
    config.mqtt.syncrate = document.getElementById("syncrate").value;
    config.mqtt.mqttlog = 0;
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

  if (parseInt(document.querySelector("input[name=\"fallbackmode\"]:checked").value) === 1) {
    config.network.fallbackmode = 1;
  } else {
    config.network.fallbackmode = 0;
  }

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
          websock.send(JSON.stringify(config));
          break;
        case "destroy":
          websock.send("{\"command\":\"destroy\"}");
          break;
        case "restart":
          websock.send("{\"command\":\"restart\"}");
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
    //$("input[name=dhcpenabled][value=\"0\"]").attr("checked", "checked");
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
      //$("input[name=hideapenable][value=\"1\"]").attr("checked", "checked");
    }
    handleAP();
  } else {
    document.getElementById("wmodesta").checked = true;
    document.getElementById("wifibssid").value = config.network.bssid;
    document.getElementById("dnsadd").value = config.network.dns;
    document.getElementById("gateway").value = config.network.gateway;
    handleSTA();
  }
  document.getElementById("fallbackmode").value = config.network.fallbackmode;
  document.getElementById("disable_wifi_after_seconds").value = config.network.offtime;

}

function populateOpeningHours() {
  var openingHours = Array(7);
  for(var d=0; d<7; d++) {
    openingHours[d] = "111111111111111111111111";
  }
  var table = document.getElementById("openinghours");
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
  populateOpeningHours();
}

function listmqtt() {
    if (config.mqtt.enabled === 1) {
        $("input[name=\"mqttEnabled\"][value=\"1\"]").prop("checked", true);
    }
    document.getElementById("mqtthost").value = config.mqtt.host;
    document.getElementById("mqttport").value = config.mqtt.port;
    document.getElementById("mqtttopic").value = config.mqtt.topic;
    document.getElementById("mqttuser").value = config.mqtt.user;
    document.getElementById("mqttpwd").value = config.mqtt.pswd;
    document.getElementById("syncrate").value = config.mqtt.syncrate;
    if (config.mqtt.mqttlog === 1) {
        $("input[name=\"mqttlog\"][value=\"1\"]").prop("checked", true);
    }
    if (config.mqtt.mqttha === 1) {
      $("input[name=\"mqttha\"][value=\"1\"]").prop("checked", true);
    }
    
}

function savelogsettings() {
  config.logmaintenance.enabled = 0;
  if (parseInt($("input[name=\"logmaintenanceenabled\"]:checked").val()) === 1) {
      config.logmaintenance.enabled = 1;
  }
  else{
    config.logmaintenance.enabled = 0;
  } 
  config.logmaintenance.rolloverkb     = document.getElementById("rolloverkb").value;
  config.logmaintenance.maxlogfilesnumber     = parseInt(document.getElementById("maxlogfilesnumber").value);
  config.logmaintenance.spiffwatch = 0;
  if (parseInt($("input[name=\"spiffwatch\"]:checked").val()) === 1) {
      config.logmaintenance.spiffwatch = 1;
  }
  else{
      config.logmaintenance.spiffwatch = 0;
  } 
  uncommited();
}

function listlogsettings() {

  // downstream compatibility

 if (!(config.hasOwnProperty("logmaintenance"))) 
  {
    logmaintenanceJson =
    { 
      "enabled": 0,
      "rolloverkb": "10",
      "maxlogfilesnumber": 5,
      "spiffwatch": 0
    };

    config["logmaintenance"] = logmaintenanceJson; 
  }


  if (config.logmaintenance.enabled === 1) {
      $("input[name=\"logmaintenanceenabled\"][value=\"1\"]").prop("checked", true);
  }
  document.getElementById("rolloverkb").value = config.logmaintenance.rolloverkb;
  document.getElementById("maxlogfilesnumber").value = config.logmaintenance.maxlogfilesnumber;
  if (config.logmaintenance.spiffwatch === 1) {
      $("input[name=\"spiffwatch\"][value=\"1\"]").prop("checked", true);
  }
 
}

function getFileList() {
    websock.send("{\"command\":\"listfiles\", \"page\":" + page + "}");
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
  websock.send("{\"command\":\"scan\"}");
  document.getElementById("scanb").innerHTML = "...";
  document.getElementById("inputtohide").style.display = "none";
  var node = document.getElementById("ssid");
  node.style.display = "inline";
  while (node.hasChildNodes()) {
    node.removeChild(node.lastChild);
  }
}

function getUsers() {
  websock.send("{\"command\":\"userlist\", \"page\":" + page + "}");
}

function getEvents() {
  websock.send("{\"command\":\"geteventlog\", \"page\":" + page + ", \"filename\":\"" + theCurrentLogFile +"\"}");
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
      document.getElementById("acctype").value = obj.acctype;
    }
  }
}

function getnextpage(mode) {
  if (!backupstarted) {
    document.getElementById("loadpages").innerHTML = "Loading " + page + "/" + haspages;
  }

  if (page < haspages) {
    page = page + 1;
    var commandtosend = {};
    commandtosend.command = mode;
    commandtosend.page = page;
    if ((mode === "geteventlog") || (mode === "getlatestlog")) { 
      commandtosend.filename = theCurrentLogFile;
    }
    websock.send(JSON.stringify(commandtosend));
  }
}

function builddata(obj) {
  data = data.concat(obj.list);
}

function testRelay(xnum) {
  websock.send("{\"command\":\"testrelay" + xnum + "\"}");
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

function listStats() {
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
        case "#hardwarecontent":
          listhardware();
          break;
        case "#logsettingscontent":
          listlogsettings();
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
  websock.send(JSON.stringify(commandtosend));
}

function backupset() {
  saveLogfile(config,"downloadSet","esp-rfid-settings.json")
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
            uncommited();
          }
        }
      };
      reader.readAsText(input.files[0]);
    }
  }
}

function restore1by1(i, len, data) {
  var part = 100 / len;
  var uid, pincode, user, acc, valid;
  document.getElementById("dynamic").style.width = part * (i + 1) + "%";
  var datatosend = {};
  uid = data[i].uid;
  pincode = data[i].pincode;
  user = data[i].username;
  acc = data[i].acctype;
  valid = data[i].validuntil;
  datatosend.command = "userfile";
  datatosend.uid = uid;
  datatosend.pincode = pincode;
  datatosend.user = user;
  datatosend.acctype = acc;
  datatosend.validuntil = valid;
  websock.send(JSON.stringify(datatosend));
  slot++;
  if (slot === len) {
    document.getElementById("dynamic").className = "progress-bar progress-bar-success";
    document.getElementById("dynamic").innerHTML = "Completed";
    document.getElementById("dynamic").style.width = "100%";
    restorestarted = false;
    completed = true;
    slot = 0;
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
//  var newlist = [];
//  for (var i = 0; i < data.length; i++) {
//    var dup = JSON.parse(data[i]);
//    newlist[i] = {};
//    newlist[i].options = {};
//    newlist[i].value = {};
//    newlist[i].value = dup;
//  }
  jQuery(function($) {
    window.FooTable.init("#spifftable", {
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
              //'<span class="glyphicon glyphicon-chevron-up" aria-hidden="true"></span></a>'
          }
      }

      ],
      rows: data
    });
    function rollover(e)
    { 
      websock.send("{\"command\":\"logMaintenance\" , \"action\":\"rollover\", \"filename\":\"" + this.getAttribute('filename') + "\"}");
    }
    function splitfile(e)
    { 
      websock.send("{\"command\":\"logMaintenance\" , \"action\":\"split\", \"filename\":\"" + this.getAttribute('filename') + "\"}");
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
        websock.send("{\"command\":\"logMaintenance\" , \"action\":\"delete\", \"filename\":\"" + this.getAttribute('filename') + "\"}");
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
    newlist[i].value = dup;
    try {
      var dup = JSON.parse(data[i]);
      dup.uid = i;
    } catch(e)
    {
      var dup = {"uid":i,"type":"ERRO","src":"WEBIF","desc":"Error in logfile entry","data":data[i],"time":1}
    }
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
    window.FooTable.init("#eventtable", {
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
    newlist[i].value = dup;
    var c = dup.acctype;
    switch (c) {
      case 1:
        newlist[i].options.classes = "success";
        break;
      case 2:
        newlist[i].options.classes = "warning";
        break;
      case 99:
        newlist[i].options.classes = "info";
        break;
      case 0:
        newlist[i].options.classes = "warning";
        break;
      case 98:
        newlist[i].options.classes = "danger";
        break;
      default:
        break;
    }

  }
  jQuery(function($) {
    window.FooTable.init("#latestlogtable", {
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
          "name": "acctype",
          "title": "Access",
          "breakpoints": "xs sm",
          "parser": function(value) {
            if (value === 1) {
              return "Granted";
            } else if (value === 99) {
              return "Admin";
            } else if (value === 0) {
              return "Disabled";
            } else if (value === 98) {
              return "Unknown";
            } else if (value === 2) {
              return "Expired";
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
            "name": "acctype",
            "title": "Access Rl1",
            "breakpoints": "xs",
            "parser": function(value) {
              if (value === 1) {
                return "Always";
              } else if (value === 99) {
                return "Admin";
              } else if (value === 0) {
                return "Disabled";
              }
              return value;
            },
          },
          {
            "name": "acctype2",
            "title": "Access Rl2",
            "breakpoints": "xs",
            "visible": false,
            "parser": function(value) {
              if (value === 1) {
                return "Always";
              } else if (value === 99) {
                return "Admin";
              } else if (value === 0) {
                return "Disabled";
              }
              return value;
            },
          },
          {
            "name": "acctype3",
            "title": "Access Rl3",
            "breakpoints": "xs",
            "visible": false,
            "parser": function(value) {
              if (value === 1) {
                return "Always";
              } else if (value === 99) {
                return "Admin";
              } else if (value === 0) {
                return "Disabled";
              }
              return value;
            },
          },
          {
            "name": "acctype4",
            "title": "Access Rl4",
            "breakpoints": "xs",
            "visible": false,
            "parser": function(value) {
              if (value === 1) {
                return "Always";
              } else if (value === 99) {
                return "Admin";
              } else if (value === 0) {
                return "Disabled";
              }
              return value;
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
            },
          }
        ],
        rows: data,
        editing: {
          showText: "<span class=\"fooicon fooicon-pencil\" aria-hidden=\"true\"></span> Edit Users",
          addText: "New User",
          addRow: function() {
            $editor[0].reset();
            $editorTitle.text("Add a new User");
            $modal.modal("show");
          },
          editRow: function(row) {
            var acctypefinder;
            var values = row.val();

            function giveAccType(xnum){
              var xval;
              if (xnum===1) xval = values.acctype;
              if (xnum===2) xval = values.acctype2;
              if (xnum===3) xval = values.acctype3;
              if (xnum===4) xval = values.acctype4;
              if (xval === "Always")  return 1;
              if (xval === "Admin")  return 99;
              if (xval === "Disabled") return 0;
            }
            $editor.find("#uid").val(values.uid);
            $editor.find("#pincode").val(values.pincode);
            $editor.find("#username").val(values.username);
            $editor.find("#acctype").val(giveAccType(1));
            $editor.find("#acctype2").val(giveAccType(2));
            $editor.find("#acctype3").val(giveAccType(3));
            $editor.find("#acctype4").val(giveAccType(4));
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
              websock.send(jsontosend);
              row.delete();
            }
          }
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
      var row = $modal.data("row"),
        values = {
          uid: $editor.find("#uid").val(),
          pincode: $editor.find("#pincode").val(),
          username: $editor.find("#username").val(),
          acctype: parseInt($editor.find("#acctype").val()),
          acctype2: parseInt($editor.find("#acctype2").val()),
          acctype3: parseInt($editor.find("#acctype3").val()),
          acctype4: parseInt($editor.find("#acctype4").val()),
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
      datatosend.acctype = parseInt($editor.find("#acctype").val());
      datatosend.acctype2 = parseInt($editor.find("#acctype2").val());
      datatosend.acctype3 = parseInt($editor.find("#acctype3").val());
      datatosend.acctype4 = parseInt($editor.find("#acctype4").val());
      var validuntil = $editor.find("#validuntil").val();
      var vuepoch = (new Date(validuntil).getTime() / 1000);
      datatosend.validuntil = vuepoch;
      websock.send(JSON.stringify(datatosend));
      $modal.modal("hide");
    });
  });

  ft=FooTable.get('#usertable');
  

  for (var i=2; i<= maxNumRelays; i++)
  {
    if (i<= numRelays) 
    {
      //FooTable.get('#usertable').draw();
      ft.columns.get("acctype"+i).visible=true;
    }
    else
    {
      ft.columns.get("acctype"+i).visible=false;
    }  
    ft.draw();
  }
}

function restartESP() {
  inProgress("restart");
}

function socketMessageListener(evt) {
  var obj = JSON.parse(evt.data);
  if (obj.hasOwnProperty("command")) {
    switch (obj.command) {
      case "status":
        if (obj.hasOwnProperty("board")) {
          isOfficialBoard = true;
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
        timezone = obj.timezone;
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
        if (!('wifipin' in config.hardware)) config.hardware.wifipin = 255;
        if (!('doorstatpin' in config.hardware)) config.hardware.doorstatpin = 255;
        if (!('maxOpenDoorTime' in config.hardware)) config.hardware.maxOpenDoorTime = 0;
        if (!('doorbellpin' in config.hardware)) config.hardware.doorbellpin = 255;
        if (!('accessdeniedpin' in config.hardware)) config.hardware.accessdeniedpin = 255;
        if ('numrelays' in config.hardware) numRelays = config.hardware["numrelays"]; else config.hardware["numrelays"] = numRelays;
        break;
      default:
        break;
    }
  }
  if (obj.hasOwnProperty("resultof")) {


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
          if (theCurrentLogFile === "/eventlog.json")
          {
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


      default:
        break;
    }
  }

}

function clearevent() {
  if (confirm('Deleting the Event log file can not be undone - delete ?')) {
    websock.send("{\"command\":\"clearevent\"}");
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
    websock.send("{\"command\":\"clearlatest\"}");
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

function updateRelayForm(){
  var i;
  for (i=2; i<= maxNumRelays; i++)
  {

    // downstream compatibility
    if (!(config.hardware.hasOwnProperty("relay"+i))) 
    {
      var relayJson =
      { 
        "rtype": 1,
        "ltype": 0,
        "rpin": 4,
        "rtime": 400,
      };
      config.hardware["relay"+i] = relayJson; 
    }
    

    var relayForm = $("#relayform");
    var relayparent= $("#relayformparent");
    if (i<= numRelays) 
    {
      var existingRelayForm = document.getElementById("relayform" + i);
      if (!(existingRelayForm))
      {
        var relayFormClone = relayForm.clone(true);
        var cloneObj = relayFormClone[0];
        relayFormClone.attr('id', 'relayform' + i);

        var str = cloneObj.innerHTML;
        str=str.replace("Relay 1 Settings","Relay "+i + " settings");
        str=str.replace ("gpiorly","gpiorly" +i);
        str=str.replace ("lockType","lockType" +i);
        str=str.replace ("typerly","typerly" +i);
        str=str.replace ("handleLock(1)","handleLock(" +i+")");
        str=str.replace ("testRelay(1)","testRelay(" +i+")");
        str=str.replace ("activateTimeForm","activateTimeForm"+i);
        cloneObj.innerHTML=str.replace ("delay","delay" +i);
        relayparent[0].appendChild(relayFormClone[0]);
      }
      handleLock(i);
    } else {
      var removeRelayForm = document.getElementById("relayform" + i);
      if (removeRelayForm)
      {
        relayparent[0].removeChild(removeRelayForm);
      }
    }
  }
}

function updateUserModalForm(){
  var i;
  for (i=2; i<= maxNumRelays; i++)
  {
    var accTypeForm = $("#useracctype");
    var accParent= $("#usermodalbody");
    if (i<= numRelays) 
    {
      var existingaccTypeForm = document.getElementById("useracctype" + i);
      if (!(existingaccTypeForm))
      {
        var accTypeFormClone = accTypeForm.clone(true);
        var cloneObj = accTypeFormClone[0];
        accTypeFormClone.attr('id', 'useracctype' + i);

        var str = cloneObj.innerHTML;
        str=str.replace(/acctype/g,"acctype"+i);
        str=str.replace("Access Type","Access Relay "+i);
        cloneObj.innerHTML=str;
        accParent[0].appendChild(cloneObj);
      }
    } else {
      var removeAccForm = document.getElementById("useracctype" + i);
      if (removeAccForm)
      {
        accParent[0].removeChild(removeAccForm);
      }
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
  websock.send("{\"command\":\"status\"}");
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
$("#logsettings").click(function() {
  getContent("#logsettingscontent");
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
    this.acctypes = ["1", "99", "0"];
    this.acctypesstr = ["Always", "Admin", "Disabled"];
    this.def = "Access Type";
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

    $.each(self.acctypes, function(i, acctype) {
      self.$acctype.append($("<option/>").text(self.acctypesstr[i]).val(self.acctypes[i]));
    });
  },
  _onStatusDropdownChanged: function(e) {
    var self = e.data.self,
      selected = $(this).val();
    if (selected !== self.def) {
      self.addFilter("acctype", selected, ["acctype"]);
    } else {
      self.removeFilter("acctype");
    }
    self.filter();
  },
  draw: function() {
    this._super();
    var acctype = this.find("acctype");
    if (acctype instanceof window.FooTable.Filter) {
      this.$acctype.val(acctype.query.val());
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
  websock.send("{\"command\":\"status\"}");
  $("#ws-connection-status").slideUp();
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
    if (!gotInitialData) {
      websock.send("{\"command\":\"getconf\"}");
      gotInitialData = true;
    }
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
