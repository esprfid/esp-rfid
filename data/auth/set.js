var websock;
var utcSeconds;

function listCONF(obj) {
  document.getElementById("inputtohide").value = obj.ssid;
  document.getElementById("wifipass").value = obj.pswd;
  document.getElementById("gpioss").value = obj.sspin;
  document.getElementById("gain").value = obj.rfidgain;
  document.getElementById("gpiorly").value = obj.rpin;
  document.getElementById("delay").value = obj.rtime;
  document.getElementById("adminpwd").value = obj.adminpwd;
  document.getElementById("ntpserver").value = obj.ntpserver;
  document.getElementById("intervals").value = obj.ntpinterval;
  document.getElementById("DropDownTimezone").value = obj.timezone;
  document.getElementById("hostname").value = obj.hostnm;
  if (obj.wmode === "1") {
    document.getElementById("wmodeap").checked = true;
  }
  else {
    document.getElementById("wifibssid").value = obj.bssid;
    document.getElementById("hideBSSID").style.display = "block";
  }
  var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(obj, null, 2));
  var dlAnchorElem = document.getElementById("downloadSet");
  dlAnchorElem.setAttribute("href", dataStr);
  dlAnchorElem.setAttribute("download", "esp-rfid-settings.json");
}

function browserTime() {
    var today = new Date();
    document.getElementById("rtc").innerHTML = today;
}

function deviceTime() {
var t = new Date(0); // The 0 there is the key, which sets the date to the epoch
t.setUTCSeconds(utcSeconds);
var d = t.toUTCString();
  document.getElementById("utc").innerHTML = d;
  utcSeconds = utcSeconds + 1;
}

var t = setInterval(browserTime, 1000);
var tt = setInterval(deviceTime, 1000);

function syncBrowserTime() {
  var d = new Date();
  var timestamp = Math.floor((d.getTime() / 1000) + ((d.getTimezoneOffset() * 60) * -1));
  var datatosend = {};
  datatosend.command = "settime";
  datatosend.epoch = timestamp;
  websock.send(JSON.stringify(datatosend));
  location.reload();
}

function handleAP() {
  document.getElementById("hideBSSID").style.display = "none";
}

function handleSTA() {
  document.getElementById("hideBSSID").style.display = "block";
}

function listSSID(obj) {
  var select = document.getElementById("ssid");
  for (var i = 0; i < obj.ssid.length; i++) {
    var opt = document.createElement("option");
    opt.value = obj.ssid[i];
    opt.bssidvalue = obj.bssid[i];
    opt.innerHTML = obj.ssid[i];
    select.appendChild(opt);
  }
  document.getElementById("scanb").innerHTML = "Re-Scan";
}

function listBSSID(obj) {
  var select = document.getElementById("ssid");
  document.getElementById("wifibssid").value = select.options[select.selectedIndex].bssidvalue;
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

function saveConf() {
  var a = document.getElementById("adminpwd").value;
  if (a === null || a === "") {
    alert("Administrator Password cannot be empty");
    return;
  }
  var ssid;
  if (document.getElementById("inputtohide").style.display === "none") {
    var b = document.getElementById("ssid");
    ssid = b.options[b.selectedIndex].value;
  } else {
    ssid = document.getElementById("inputtohide").value;
  }
  var datatosend = {};
  datatosend.command = "configfile";
  var wmode = "0";
  if (document.getElementById("wmodeap").checked) {
    wmode = "1";
    datatosend.bssid = document.getElementById("wifibssid").value = 0;
  }
  else {
    datatosend.bssid= document.getElementById("wifibssid").value;
  }
  datatosend.ssid = ssid;
  datatosend.wmode = wmode;
  datatosend.pswd = document.getElementById("wifipass").value;
  datatosend.sspin = document.getElementById("gpioss").value;
  datatosend.rfidgain = document.getElementById("gain").value;
  datatosend.rpin = document.getElementById("gpiorly").value;
  datatosend.rtime = document.getElementById("delay").value;
  datatosend.ntpserver =document.getElementById("ntpserver").value;
  datatosend.ntpinterval = document.getElementById("intervals").value;
  datatosend.timezone = document.getElementById("DropDownTimezone").value;
  datatosend.hostnm = document.getElementById("hostname").value;
  datatosend.adminpwd = a;
  websock.send(JSON.stringify(datatosend));
  location.reload();
}

function testRelay() {
  websock.send("{\"command\":\"testrelay\"}");
}

function backupuser() {
  websock.send("{\"command\":\"picclist\"}");
}

function backupset() {
  var dlAnchorElem = document.getElementById("downloadSet");
  dlAnchorElem.click();
}

function piccBackup(obj) {
  var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(obj, null, 2));
  var dlAnchorElem = document.getElementById("downloadUser");
  dlAnchorElem.setAttribute("href", dataStr);
  dlAnchorElem.setAttribute("download", "esp-rfid-users.json");
  dlAnchorElem.click();
}

function restoreSet() {
  var input = document.getElementById("restoreSet");
  var reader = new FileReader();
  if ("files" in input) {
    if (input.files.length === 0) {
      alert("You did not select file to restore");
    } else {
      reader.onload = function() {
        var json;
        try {
          json = JSON.parse(reader.result);
        } catch (e) {
          alert("Not a valid backup file");
          return;
        }
        if (json.command === "configfile") {
          var x = confirm("File seems to be valid, do you wish to continue?");
          if (x) {
            websock.send(JSON.stringify(json));
            alert("Device now should reboot with new settings");
            location.reload();
          }
        }
      };
      reader.readAsText(input.files[0]);
    }
  }
}

function restore1by1(n, uid, user, acc, len) {
  setTimeout(function() {
    var datatosend = {};
    datatosend.command = "userfile";
    datatosend.uid = uid;
    datatosend.user = user;
    datatosend.acctype = acc;
    websock.send(JSON.stringify(datatosend));
    var elem = document.getElementById("dynamic");
    var part = 100 / len;
    elem.style.width = part * n + "%";
    if (n === len) {
      document.getElementById("dynamic").innerHTML = "Completed";
    }
  }, 200 * n);
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
        if (json.command === "picclist") {
          var x = confirm("File seems to be valid, do you wish to continue?");
          if (x) {
            document.getElementById("pbar").style.display = "block";
            var len = json.piccs.length;
            for (var i = 1; i <= len; i++) {
              var uid = json.piccs[i - 1].slice(3);
              var user = json.users[i - 1];
              var acc = json.acctype[i - 1];
              restore1by1(i, uid, user, acc, len);
            }
          }
        }
      };
      reader.readAsText(input.files[0]);
    }
  }
}

function colorStatusbar(ref) {
	var percentage = ref.style.width.slice(0,-1);
	if (percentage > 50) ref.className = "progress-bar progress-bar-success";
	else if (percentage > 25) ref.className = "progress-bar progress-bar-warning";
	else ref.class="progress-bar progress-bar-danger";
}

function refreshStats() {
  websock.send("{\"command\":\"status\"}");
  document.getElementById("status").style.display = "block";
  document.getElementById("refstat").innerHTML = "Refresh";
}


  
function listStats(obj) {
  document.getElementById("chip").innerHTML = obj.chipid;
  document.getElementById("cpu").innerHTML = obj.cpu + " Mhz";
  document.getElementById("heap").innerHTML = obj.heap + " Bytes";
  document.getElementById("heap").style.width = (obj.heap * 100) / 81920 + "%";
  colorStatusbar(document.getElementById("heap"));
  document.getElementById("flash").innerHTML = obj.availsize + " Bytes";
  document.getElementById("flash").style.width = (obj.availsize * 100) / 1044464 + "%";
  colorStatusbar(document.getElementById("flash"));
  document.getElementById("spiffs").innerHTML = obj.availspiffs + " Bytes";
	document.getElementById("spiffs").style.width = (obj.availspiffs *100) / obj.spiffssize + "%";
	colorStatusbar(document.getElementById("spiffs"));
  document.getElementById("ssidstat").innerHTML = obj.ssid;
  document.getElementById("ip").innerHTML = obj.ip;
  document.getElementById("gate").innerHTML = obj.gateway;
  document.getElementById("mask").innerHTML = obj.netmask;
  document.getElementById("dns").innerHTML = obj.dns;
  document.getElementById("mac").innerHTML = obj.mac;
}




function start() {
  websock = new WebSocket("ws://" + window.location.hostname + "/ws");
  websock.onopen = function(evt) {
    websock.send("{\"command\":\"getconf\"}");
    websock.send("{\"command\":\"gettime\"}");
    document.getElementById("loading-img").style.display = "none";
  };
  websock.onclose = function(evt) {};
  websock.onerror = function(evt) {
    console.log(evt);
  };
  websock.onmessage = function(evt) {
    var obj = JSON.parse(evt.data);
    if (obj.command === "ssidlist") {
      listSSID(obj);
    } else if (obj.command === "configfile") {
      listCONF(obj);
    } else if (obj.command === "gettime") {
      utcSeconds = obj.epoch;
    } else if (obj.command === "picclist") {
      piccBackup(obj);
    } else if (obj.command === "status") {
      listStats(obj);
    }
  };
}