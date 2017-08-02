var websock;

function listCONF(obj) {
    document.getElementById("inputtohide").value = obj.ssid;
    document.getElementById("wifipass").value = obj.pswd;
    document.getElementById("gpioss").value = obj.sspin;
    document.getElementById("gain").value = obj.rfidgain;
    document.getElementById("gpiorly").value = obj.rpin;
    document.getElementById("delay").value = obj.rtime;
    document.getElementById("adminpwd").value = obj.adminpwd;
    if (obj.wmode === "1") {
      document.getElementById("wmodeap").checked = true;
    }
      var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(obj, null, 2));
var dlAnchorElem = document.getElementById("downloadSet");
dlAnchorElem.setAttribute("href",     dataStr     );
dlAnchorElem.setAttribute("download", "esp-rfid-settings.json");
}

function listSSID(obj) {
    var select = document.getElementById("ssid");
    for (var i = 0; i < obj.ssid.length; i++) {
        var opt = document.createElement("option");
        opt.value = obj.ssid[i];
        opt.innerHTML = obj.ssid[i];
        select.appendChild(opt);
    }
    document.getElementById("scanb").innerHTML = "Re-Scan";
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
    if (a===null || a==="") {
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
    var wmode = "0";
    if (document.getElementById("wmodeap").checked) {
      wmode = "1";
    }
    var datatosend = {};
    datatosend.command = "configfile";
    datatosend.ssid = ssid;
    datatosend.wmode = wmode;
    datatosend.pswd = document.getElementById("wifipass").value;
    datatosend.sspin = document.getElementById("gpioss").value;
    datatosend.rfidgain = document.getElementById("gain").value;
    datatosend.rpin = document.getElementById("gpiorly").value;
    datatosend.rtime = document.getElementById("delay").value;
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
dlAnchorElem.setAttribute("href",     dataStr     );
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
                }
                catch (e) {
                  alert("Not a valid backup");
                  return;
                }
                if (json.command === "configfile") {
                    var x = confirm("File seems to be valid, do you wish to continue?");
                    if (x) {
                        websock.send(JSON.stringify(json));
                        location.reload();
                    }
                }
            };
            reader.readAsText(input.files[0]);
        }
    }
}


function start() {
    websock = new WebSocket("ws://" + window.location.hostname + "/ws");
    websock.onopen = function(evt) {
        websock.send("{\"command\":\"getconf\"}");
        document.getElementById("loading-img").style.display = "none";
    };
    websock.onclose = function(evt) {
    };
    websock.onerror = function(evt) {
        console.log(evt);
    };
    websock.onmessage = function(evt) {
        var obj = JSON.parse(evt.data);
        if (obj.command === "ssidlist") {
            listSSID(obj);
        } else if (obj.command === "configfile") {
            listCONF(obj);
        }
        else if (obj.command === "picclist") {
            piccBackup(obj);
        }
    };
}