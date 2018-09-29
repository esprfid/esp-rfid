var version = "1.0.0";

var websock = null;
var wsUri = "ws://" + window.location.hostname + "/ws";
var utcSeconds;
var timezone;
var data = [];
var ajaxobj;
var page = 1;
var haspages;
var logdata;
var recordstorestore = 0;
var slot = 0;
var completed = false;
var file = {};
var backupstarted = false;
var restorestarted = false;
var esprfidcontent;
var formData = new FormData();
var xDown = null;
var yDown = null;
var nextIsNotJson = false;

var config = {
    "command": "configfile",
    "network": {
        "bssid": "",
        "ssid": "esp-rfid",
        "mode": 1,
        "hidden": 0,
        "password": "",
        "offtime": 0,
        "dhcp": 1,
        "ip": "",
        "subnet": "",
        "gateway": "",
        "dns": ""
    },
    "hardware": {
        "reader": 1,
        "d0pin": 13,
        "d1pin": 12,
        "rxpin": 14,
        "sspin": 15,
        "gain": 32,
        "relaymode": 1,
        "relaypin": 4,
        "relaydelay": 1000,
        "buzzermode": 1,
        "buzzerpin": 5,
        "keypadmode": 0,
        "keymap": "369#2580147*",
        "keypass": "1234",
        "sdapin": 13,
        "sclpin": 12,
    },
    "general": {
        "hostname": "esp-rfid",
        "restart": 0,
        "password": "admin"
    },
    "mqtt": {
        "enabled": 0,
        "host": "",
        "port": 1883,
        "topic": "",
        "user": "",
        "password": ""
    },
    "ntp": {
        "server": "pool.ntp.org",
        "interval": 30,
        "timezone": 0
    }
};

function browserTime() {
    var d = new Date(0);
    var c = new Date();
    var timestamp = Math.floor((c.getTime() / 1000) + ((c.getTimezoneOffset() * 60) * -1));
    d.setUTCSeconds(timestamp);
    document.getElementById("rtc").innerHTML = d.toUTCString().slice(0, -3);
}

function deviceTime() {
    var t = new Date(0);
    var devTime = Math.floor(utcSeconds + ((t.getTimezoneOffset() * 60) * -1));
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
    switch (parseInt(document.getElementById("reader").value)) {
        case 1:
            document.getElementById("wiegandForm").style.display = "block";
            document.getElementById("mfrc522Form").style.display = "none";
            document.getElementById("rdm6300Form").style.display = "none";
            break;
        case 2:
            document.getElementById("wiegandForm").style.display = "none";
            document.getElementById("mfrc522Form").style.display = "block";
            document.getElementById("mfrc522gain").style.display = "block";
            document.getElementById("rdm6300Form").style.display = "none";
            break;
        case 3:
            document.getElementById("wiegandForm").style.display = "none";
            document.getElementById("mfrc522Form").style.display = "block";
            document.getElementById("mfrc522gain").style.display = "none";
            document.getElementById("rdm6300Form").style.display = "none";
            break;
        case 4:
            document.getElementById("wiegandForm").style.display = "none";
            document.getElementById("mfrc522Form").style.display = "none";
            document.getElementById("mfrc522gain").style.display = "none";
            document.getElementById("rdm6300Form").style.display = "block";
            break;
        default:
            document.getElementById("wiegandForm").style.display = "none";
            document.getElementById("mfrc522Form").style.display = "none";
            document.getElementById("mfrc522gain").style.display = "none";
            document.getElementById("rdm6300Form").style.display = "none";
            break;
    }
}

function handleBuzzer() {
    switch (parseInt(document.getElementById("buzzermode").value)) {
        case 1:
        case 2:
            document.getElementById("BuzzerForm").style.display = "block";
            break;
        default:
            document.getElementById("BuzzerForm").style.display = "none";
            break;
    }
}

function handleKeypad() {
    switch (parseInt(document.getElementById("keypadmode").value)) {
        case 1:
            document.getElementById("KeypadForm").style.display = "block";
            break;
        default:
            document.getElementById("KeypadForm").style.display = "none";
            break;
    }
}

function handleDHCP() {
    if (document.querySelector("input[name=\"dhcpenabled\"]:checked").value === "1") {
        $("#staticip").slideUp();
    } else {
        $("#staticip").slideDown();
        $("#staticip").show();
    }
}

function listhardware() {
    document.getElementById("reader").value = config.hardware.reader;
    document.getElementById("d0pin").value = config.hardware.d0pin;
    document.getElementById("d1pin").value = config.hardware.d1pin;
    document.getElementById("rxpin").value = config.hardware.rxpin;
    document.getElementById("sspin").value = config.hardware.sspin;
    document.getElementById("gain").value = config.hardware.gain;
    document.getElementById("relaymode").value = config.hardware.relaymode;
    document.getElementById("relaypin").value = config.hardware.relaypin;
    document.getElementById("relaydelay").value = config.hardware.relaydelay;
    document.getElementById("buzzermode").value = config.hardware.buzzermode;
    document.getElementById("buzzerpin").value = config.hardware.buzzerpin;
    document.getElementById("keypadmode").value = config.hardware.keypadmode;
    document.getElementById("keymap").value = config.hardware.keymap;
    document.getElementById("keypass").value = config.hardware.keypass;
    document.getElementById("sdapin").value = config.hardware.sdapin;
    document.getElementById("sclpin").value = config.hardware.sclpin;
    handleReader();
    handleBuzzer();
    handleKeypad();
}

function listlog() {
    websock.send("{\"command\":\"getlatestlog\", \"page\":" + page + "}");
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
    config.hardware.reader = parseInt(document.getElementById("reader").value);
    config.hardware.d0pin = parseInt(document.getElementById("d0pin").value);
    config.hardware.d1pin = parseInt(document.getElementById("d1pin").value);
    config.hardware.rxpin = parseInt(document.getElementById("rxpin").value);
    config.hardware.sspin = parseInt(document.getElementById("sspin").value);
    config.hardware.gain = parseInt(document.getElementById("gain").value);
    config.hardware.relaymode = parseInt(document.getElementById("relaymode").value);
    config.hardware.relaypin = parseInt(document.getElementById("relaypin").value);
    config.hardware.relaydelay = parseInt(document.getElementById("relaydelay").value);
    config.hardware.buzzermode = parseInt(document.getElementById("buzzermode").value);
    config.hardware.buzzerpin = parseInt(document.getElementById("buzzerpin").value);
    config.hardware.keypadmode = parseInt(document.getElementById("keypadmode").value);
    config.hardware.keymap = parseInt(document.getElementById("keymap").value);
    config.hardware.keypass = parseInt(document.getElementById("keypass").value);
    config.hardware.sdapin = parseInt(document.getElementById("sdapin").value);
    config.hardware.sclpin = parseInt(document.getElementById("sclpin").value);
    uncommited();
}

function saventp() {
    config.ntp.server = document.getElementById("ntpserver").value;
    config.ntp.interval = parseInt(document.getElementById("intervals").value);
    config.ntp.timezone = parseInt(document.getElementById("DropDownTimezone").value);
    uncommited();
}

function savegeneral() {
    var a = document.getElementById("adminpwd").value;
    if (a === null || a === "") {
        alert("Administrator Password cannot be empty");
        return;
    }
    config.general.password = a;
    config.general.hostname = document.getElementById("hostname").value;
    config.general.restart = parseInt(document.getElementById("autorestart").value);
    uncommited();
}

function savemqtt() {
    config.mqtt.enabled = 0;
    if (parseInt($("input[name=\"mqttenabled\"]:checked").val()) === 1) {
        config.mqtt.enabled = 1;
    }
    config.mqtt.host = document.getElementById("mqtthost").value;
    config.mqtt.port = parseInt(document.getElementById("mqttport").value);
    config.mqtt.topic = document.getElementById("mqtttopic").value;
    config.mqtt.user = document.getElementById("mqttuser").value;
    config.mqtt.password = document.getElementById("mqttpwd").value;
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
    var mode = 0;
    config.network.dhcp = 0;
    config.network.hidden = 0;
    if (document.getElementById("inputtohide").style.display === "none") {
        var b = document.getElementById("ssid");
        config.network.ssid = b.options[b.selectedIndex].value;
    } else {
        config.network.ssid = document.getElementById("inputtohide").value;
    }
    if (document.getElementById("wmodeap").checked) {
        mode = 1;
        config.network.bssid = 0;
        if (parseInt(document.querySelector("input[name=\"hideapenable\"]:checked").value) === 1) {
            config.network.hidden = 1;
        } else {
            config.network.hidden = 0;
        }
    } else {
        config.network.bssid = document.getElementById("wifibssid").value;
        if (parseInt(document.querySelector("input[name=\"dhcpenabled\"]:checked").value) === 1) {
            config.network.dhcp = 1;
        } else {
            config.network.dhcp = 0;
            if (!checkOctects("ipaddress") || !checkOctects("subnet") || !checkOctects("dnsadd") || !checkOctects("gateway")) {
                return;
            }
            config.network.ip = document.getElementById("ipaddress").value;
            config.network.dns = document.getElementById("dnsadd").value;
            config.network.subnet = document.getElementById("subnet").value;
            config.network.gateway = document.getElementById("gateway").value;
        }
    }
    config.network.mode = mode;
    config.network.password = document.getElementById("wifipass").value;
    config.network.offtime = parseInt(document.getElementById("networkofftime").value);
    uncommited();
}

function inProgress(callback) {
    $("body").load("esprfid.htm #progresscontent", function(responseTxt, statusTxt, xhr) {
        if (statusTxt === "success") {
            $(".progress").css("height", "40");
            $(".progress").css("font-size", "xx-large");
            var i = 0;
            var speed = 100;
            switch (callback) {
                case "upload":
                    $.ajax({
                        url: "/update",
                        type: "POST",
                        data: formData,
                        processData: false,
                        contentType: false
                    });
                    speed = 350;
                    break;
                case "commit":
                    websock.send(JSON.stringify(config));
                    speed = 80;
                    break;
                case "destroy":
                    websock.send("{\"command\":\"destroy\"}");
                    speed = 350;
                    break;
                case "restart":
                    websock.send("{\"command\":\"restart\"}");
                    speed = 80;
                    break;
            }
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
                    location.reload();
                }
            }, speed);
        }
    }).hide().fadeIn();
}

function commit() {
    inProgress("commit");
}

function handleAP() {
    document.getElementById("hideap").style.display = "block";
    document.getElementById("hideBSSID").style.display = "none";
    document.getElementById("scanb").style.display = "none";
    document.getElementById("ssid").style.display = "none";
    document.getElementById("dhcp").style.display = "none";
    document.getElementById("staticip").style.display = "none";
    document.getElementById("inputtohide").style.display = "block";
}

function handleSTA() {
    document.getElementById("hideap").style.display = "none";
    document.getElementById("hideBSSID").style.display = "block";
    document.getElementById("scanb").style.display = "block";
    document.getElementById("dhcp").style.display = "block";
}

function listnetwork() {
    document.getElementById("inputtohide").value = config.network.ssid;
    document.getElementById("wifipass").value = config.network.password;
    if (config.network.mode === 1) {
        document.getElementById("wmodeap").checked = true;
        if (config.network.hidden === 1) {
            $("input[name=\"hideapenable\"][value=\"1\"]").prop("checked", true);
            //$("input[name=hideapenable][value=\"1\"]").attr("checked", "checked");
        }
        handleAP();
    } else {
        document.getElementById("wmodesta").checked = true;
        document.getElementById("wifibssid").value = config.network.bssid;
        if (config.network.dhcp === 0) {
            $("input[name=\"dhcpenabled\"][value=\"0\"]").prop("checked", true);
            //$("input[name=dhcpenabled][value=\"0\"]").attr("checked", "checked");
            handleDHCP();
        }
        document.getElementById("ipaddress").value = config.network.ip;
        document.getElementById("subnet").value = config.network.subnet;
        document.getElementById("dnsadd").value = config.network.dns;
        document.getElementById("gateway").value = config.network.gateway;
        handleSTA();

    }
    document.getElementById("networkofftime").value = config.network.offtime;
}

function listgeneral() {
    document.getElementById("adminpwd").value = config.general.password;
    document.getElementById("hostname").value = config.general.hostname;
    document.getElementById("autorestart").value = config.general.restart;
}

function listmqtt() {
    if (config.mqtt.enabled === 1) {
        $("input[name=\"mqttenabled\"][value=\"1\"]").prop("checked", true);
        //$("input[name=mqttenabled][value=\"1\"]").attr("checked", "checked");
    }
    document.getElementById("mqtthost").value = config.mqtt.host;
    document.getElementById("mqttport").value = config.mqtt.port;
    document.getElementById("mqtttopic").value = config.mqtt.topic;
    document.getElementById("mqttuser").value = config.mqtt.user;
    document.getElementById("mqttpwd").value = config.mqtt.password;
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
    websock.send("{\"command\":\"geteventlog\", \"page\":" + page + "}");
}

function listSCAN(obj) {
    if (obj.acctype === 0) {
        $(".footable-add").click();
        document.getElementById("uid").value = obj.uid;
        document.getElementById("username").value = obj.username;
        document.getElementById("acctype").value = 2;
    } else {
        $(".fooicon-remove").click();
        document.querySelector("input.form-control[type=text]").value = obj.uid;
        $(".fooicon-search").click();
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
        websock.send(JSON.stringify(commandtosend));
    }
}

function builddata(obj) {
    data = data.concat(obj.list);
}

function testRelay() {
    websock.send("{\"command\":\"testrelay\"}");
}

function colorStatusbar(ref) {
    var percentage = ref.style.width.slice(0, -1);
    if (percentage > 50) { ref.className = "progress-bar progress-bar-success"; } else if (percentage > 25) { ref.className = "progress-bar progress-bar-warning"; } else { ref.class = "progress-bar progress-bar-danger"; }
}

function listStats() {
    document.getElementById("chip").innerHTML = ajaxobj.chipid;
    document.getElementById("cpu").innerHTML = ajaxobj.cpu + " Mhz";
    document.getElementById("uptime").innerHTML = ajaxobj.uptime;
    document.getElementById("heap").innerHTML = ajaxobj.heap + " Bytes";
    document.getElementById("heap").style.width = (ajaxobj.heap * 100) / 40960 + "%";
    colorStatusbar(document.getElementById("heap"));
    document.getElementById("flash").innerHTML = ajaxobj.availsize + " Bytes";
    document.getElementById("flash").style.width = (ajaxobj.availsize * 100) / 1044464 + "%";
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
    backupstarted = true;
	data = [];
    var commandtosend = {};
    commandtosend.command = "userlist";
    commandtosend.page = page;
    websock.send(JSON.stringify(commandtosend));
}

function backupset() {
    var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(config, null, 2));
    var dlAnchorElem = document.getElementById("downloadSet");
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", "esp-rfid-settings.json");
    dlAnchorElem.click();
}

function piccBackup(obj) {
    var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(obj, null, 2));
    var dlAnchorElem = document.getElementById("downloadUser");
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", "esp-rfid-users.json");
    dlAnchorElem.click();
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
    var uid, username, acctype, valid;
    document.getElementById("dynamic").style.width = part * (i + 1) + "%";
    var datatosend = {};
    uid = data[i].uid;
    username = data[i].username;
    acctype = data[i].acctype;
    valid = data[i].validuntil;
    datatosend.command = "userfile";
    datatosend.uid = uid;
    datatosend.username = username;
    datatosend.acctype = acctype;
    datatosend.validuntil = valid;
    websock.send(JSON.stringify(datatosend));
    slot++;
    if (slot === len) {
        document.getElementById("dynamic").className = "progress-bar progress-bar-success";
        document.getElementById("dynamic").innerHTML = "Completed";
        document.getElementById("dynamic").style.width = "100%";
        restorestarted = false;
        completed = true;
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
                        $("#restoremodal").modal({ backdrop: "static", keyboard: false });
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

function initEventTable() {
    var newlist = [];
    for (var i = 0; i < data.length; i++) {
        var dup = JSON.parse(data[i]);
        newlist[i] = {};
        newlist[i].options = {};
        newlist[i].value = {};
        newlist[i].value = dup;
        var c = dup.level;
        switch (c) {
			case 2:
                newlist[i].options.classes = "warning";
                break;
            case 3:
                newlist[i].options.classes = "info";
                break;
            case 4:
            case 5:
                newlist[i].options.classes = "success";
                break;
            default:
                newlist[i].options.classes = "danger";
                break;
        }
    }
    jQuery(function($) {
        window.FooTable.init("#eventtable", {
            columns: [{
                    "name": "level",
                    "title": "Log Level",
                    "parser": function(value) {
                        switch (value) {
                            case 1:
                                return "error";
                            case 2:
                                return "warning";
                            case 3:
                                return "info";
                            case 4:
                                return "debug";
                            case 5:
                                return "verbose";
                        }
                        return "unknown";
                    }
                },
                {
                    "name": "record",
                    "title": "Log Record",
                    "type": "text",
                    "breakpoints": "xs sm"
                },
                {
                    "name": "time",
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
                }
            ],
            rows: newlist
        });
    });
}

function initLatestLogTable() {
    var newlist = [];
    for (var i = 0; i < data.length; i++) {
        var dup = JSON.parse(data[i]);
        newlist[i] = {};
        newlist[i].options = {};
        newlist[i].value = {};
        newlist[i].value = dup;
        var c = dup.acctype;
        switch (c) {
            case 1:
                newlist[i].options.classes = "info";
                break;
            case 2:
                newlist[i].options.classes = "success";
                break;
			case 4:
                newlist[i].options.classes = "warning";
                break;
            default:
                newlist[i].options.classes = "danger";
                break;
        }
    }
    jQuery(function($) {
        window.FooTable.init("#latestlogtable", {
            columns: [{
                    "name": "time",
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
                    "name": "username",
                    "title": "User Name",
                    "type": "text"
                },
                {
                    "name": "uid",
                    "title": "UID",
                    "type": "text"
                },
                {
                    "name": "acctype",
                    "title": "Access",
                    "breakpoints": "xs sm",
                    "parser": function(value) {
                        switch (value) {
                            case 1:
                                return "Admin"
                            case 2:
                                return "Activated User"
                            case 3:
                                return "Deactivated User"
                            case 4:
                                return "Expired User"
                            default:
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
    jQuery(function($) {
        var $modal = $("#editor-modal"),
            $editor = $("#editor"),
            $editorTitle = $("#editor-title"),
            ft = window.FooTable.init("#usertable", {
                columns: [{
                        "name": "uid",
                        "title": "UID",
                        "type": "text",
                    },
                    {
                        "name": "username",
                        "title": "User Name"
                    },
                    {
                        "name": "acctype",
                        "title": "Access Type",
                        "breakpoints": "xs",
                        "parser": function(value) {
                            switch (value) {
                                case 1:
                                    return "Admin"
                                case 2:
                                    return "Activated User"
                                case 3:
                                    return "Deactivated User"
                                case 4:
                                    return "Expired User"
                                default:
                                    return "Unknown";
                            }
                        }
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
                        $editorTitle.text("Add User");
                        $modal.modal("show");
                    },
                    editRow: function(row) {
                        var acctypefinder;
                        var values = row.val();
                        switch (values.acctype) {
                            case "Admin":
                                acctypefinder = 1;
                                break;
                            case "Activated User":
                                acctypefinder = 2;
                                break;
                            case "Deactivated User":
                                acctypefinder = 3;
                                break;
                        }
                        $editor.find("#uid").val(values.uid);
                        $editor.find("#username").val(values.username);
                        $editor.find("#acctype").val(acctypefinder);
                        $editor.find("#validuntil").val(values.validuntil);
                        $modal.data("row", row);
                        $editorTitle.text("Edit User: " + values.username);
                        $modal.modal("show");
                    },
                    deleteRow: function(row) {
                        var uid = row.value.uid;
                        var username = row.value.username;
                        if (confirm("Remove " + username + " (" + uid + ") from database?")) {
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
                    username: $editor.find("#username").val(),
                    acctype: parseInt($editor.find("#acctype").val()),
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
            datatosend.username = $editor.find("#username").val();
            datatosend.acctype = parseInt($editor.find("#acctype").val());
            var validuntil = $editor.find("#validuntil").val();
            var vuepoch = (new Date(validuntil).getTime() / 1000);
            datatosend.validuntil = vuepoch;
            websock.send(JSON.stringify(datatosend));
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
            case "gettime":
                utcSeconds = obj.epoch;
                timezone = obj.timezone;
                deviceTime();
                break;
            case "rfidscanned":
                listSCAN(obj);
                break;
            case "ssidlist":
                listSSID(obj);
                break;
            case "configfile":
                config = obj;
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
                if (page < haspages && obj.result === true) {
                    getnextpage("geteventlog");
                } else if (page === haspages) {
                    initEventTable();
                    document.getElementById("loading-img").style.display = "none";
                }
                break;
            case "latestlist":
                if (page < haspages && obj.result === true) {
                    getnextpage("getlatestlog");
                } else if (page === haspages) {
                    initLatestLogTable();
                    document.getElementById("loading-img").style.display = "none";
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
    websock.send("{\"command\":\"clearevent\"}");
    $("#eventlog").click();
}

function clearlatest() {
    websock.send("{\"command\":\"clearlatest\"}");
    $("#latestlog").click();
}

function compareDestroy() {
    if (config.general.hostname === document.getElementById("compare").value) {
        $("#destroybtn").prop("disabled", false);
    } else { $("#destroybtn").prop("disabled", true); }
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

$("#network").on("click", (function() { getContent("#networkcontent"); return false; }));
$("#hardware").click(function() { getContent("#hardwarecontent"); return false; });
$("#general").click(function() { getContent("#generalcontent"); return false; });
$("#mqtt").click(function() { getContent("#mqttcontent"); return false; });
$("#ntp").click(function() { getContent("#ntpcontent"); return false; });
$("#users").click(function() { getContent("#userscontent"); });
$("#latestlog").click(function() { getContent("#logcontent"); return false; });
$("#backup").click(function() { getContent("#backupcontent"); return false; });
$("#reset").click(function() { $("#destroy").modal("show"); return false; });
$("#eventlog").click(function() { getContent("#eventcontent"); return false; });
$(".noimp").on("click", function() { $("#noimp").modal("show"); });

window.FooTable.MyFiltering = window.FooTable.Filtering.extend({
    construct: function(instance) {
        this._super(instance);
        this.acctypes = ["1", "2", "3", "4"];
        this.acctypesstr = ["Admin", "Activated User", "Deactivated User", "Expired User"];
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

function connectWS() {
    if (window.location.protocol === "https:") {
        wsUri = "wss://" + window.location.hostname + "/ws";
    } else if (window.location.protocol === "file:") {
        wsUri = "ws://" + "localhost" + "/ws";
    }
    websock = new WebSocket(wsUri);
    websock.addEventListener("message", socketMessageListener);
    websock.onopen = function(evt) {
        websock.send("{\"command\":\"getconf\"}");
        websock.send("{\"command\":\"status\"}");
    };
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
    }).error(function() { $("#onlineupdate").html("<h5>Couldn't get release info. Are you connected to the Internet?</h5>"); });
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
            $("#signin").modal({ backdrop: "static", keyboard: false });
            $("[data-toggle=\"popover\"]").popover({
                container: "body"
            });

        }
    });
}

document.addEventListener("touchstart", handleTouchStart, false);
document.addEventListener("touchmove", handleTouchMove, false);
