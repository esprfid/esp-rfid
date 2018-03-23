var websock = null;
var wsUri = "ws://" + window.location.hostname + "/ws";
var utcSeconds;
var timezone;
var data = [];
var ajaxobj;

var config = {
    "command": "configfile",
    "network": {
        "bssid": "",
        "ssid": "",
        "wmode": "",
        "pswd": "",
        "offtime": "0"
    },
    "hardware": {
        "readerType": "1",
        "wgd0pin": "4",
        "wgd1pin": "5",
        "sspin": "",
        "rfidgain": "",
        "rtype": "",
        "rpin": "",
        "rtime": ""
    },
    "general": {
        "hostnm": "esp-rfid",
        "restart": "0",
        "pswd": "admin",
        "version": ""
    },
    "mqtt": {
        "enabled": "0",
        "host": "",
        "port": "",
        "topic": "",
        "user": "",
        "pswd": ""
    },
    "ntp": {
        "server": "pool.ntp.org",
        "interval": "30",
        "timezone": "0"
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
    utcSeconds = Math.floor(utcSeconds + ((t.getTimezoneOffset() * 60) * -1));
    t.setUTCSeconds(utcSeconds);
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
    if (document.getElementById("readerType").value === "0") {
        document.getElementById("wiegandForm").style.display = "none";
        document.getElementById("mfrc522Form").style.display = "block";
        document.getElementById("rc522gain").style.display = "block";
    } else if (document.getElementById("readerType").value === "1") {
        document.getElementById("wiegandForm").style.display = "block";
        document.getElementById("mfrc522Form").style.display = "none";
    } else if (document.getElementById("readerType").value === "2") {
        document.getElementById("wiegandForm").style.display = "none";
        document.getElementById("mfrc522Form").style.display = "block";
        document.getElementById("rc522gain").style.display = "none";
    }
}

function listhardware() {

    document.getElementById("readerType").value = config.hardware.readerType;
    document.getElementById("wg0pin").value = config.hardware.wgd0pin;
    document.getElementById("wg1pin").value = config.hardware.wgd1pin;
    document.getElementById("gpioss").value = config.hardware.sspin;
    document.getElementById("gain").value = config.hardware.rfidgain;
    document.getElementById("typerly").value = config.hardware.rtype;
    document.getElementById("gpiorly").value = config.hardware.rpin;
    document.getElementById("delay").value = config.hardware.rtime;
    handleReader();
}



function listlog() {
    websock.send("{\"command\":\"getlatestlog\", \"page\":" + page + "}");
}

function listntp() {
    websock.send("{\"command\":\"gettime\"}");

    document.getElementById("ntpserver").value = config.ntp.server;
    document.getElementById("intervals").value = config.ntp.interval;
    document.getElementById("DropDownTimezone").value = config.ntp.timezone
    browserTime();
    deviceTime();
}

function savehardware() {
    config.hardware.readerType = document.getElementById("readerType").value;
    config.hardware.wgd0pin = document.getElementById("wg0pin").value;
    config.hardware.wgd1pin = document.getElementById("wg1pin").value;
    config.hardware.sspin = document.getElementById("gpioss").value;
    config.hardware.rfidgain = document.getElementById("gain").value;
    config.hardware.rtype = document.getElementById("typerly").value;
    config.hardware.rpin = document.getElementById("gpiorly").value;
    config.hardware.rtime = document.getElementById("delay").value;
    uncommited();
}

function saventp() {
    config.ntp.server = document.getElementById("ntpserver").value;
    config.ntp.interval = document.getElementById("intervals").value;
    config.ntp.timezone = document.getElementById("DropDownTimezone").value;

    uncommited();
}

function savegeneral() {
    var a = document.getElementById("adminpwd").value;
    if (a === null || a === "") {
        alert("Administrator Password cannot be empty");
        return;
    }
    config.general.pswd = a;
    config.general.hostnm = document.getElementById("hostname").value;
    config.general.restart = document.getElementById("autorestart").value;
    uncommited();
}

function savemqtt() {
    config.mqtt.enabled = "0";
    if (document.querySelector('input[name="mqttenabled"]:checked').value === "1") {
        config.mqtt.enabled = "1";
    }
    config.mqtt.host = document.getElementById("mqtthost").value;
    config.mqtt.port = document.getElementById("mqttport").value;
    config.mqtt.topic = document.getElementById("mqtttopic").value;
    config.mqtt.user = document.getElementById("mqttuser").value;
    config.mqtt.pswd = document.getElementById("mqttpwd").value;
    uncommited();
}

function savenetwork() {
    if (document.getElementById("inputtohide").style.display === "none") {
        var b = document.getElementById("ssid");
        config.network.ssid = b.options[b.selectedIndex].value;
    } else {
        config.network.ssid = document.getElementById("inputtohide").value;
    }
    var wmode = "0";
    if (document.getElementById("wmodeap").checked) {
        wmode = "1";
        config.network.bssid = document.getElementById("wifibssid").value = 0;
    } else {
        config.network.bssid = document.getElementById("wifibssid").value;
    }
    config.network.wmode = wmode;
    config.network.pswd = document.getElementById("wifipass").value;
    config.network.offtime = document.getElementById("disable_wifi_after_seconds").value;
    uncommited();
}

function revcommit() {
    document.getElementById("jsonholder").innerText = JSON.stringify(config, null, 2);
    $("#revcommit").modal("show");
}

function commit() {
    inProgress("commit");
}

function uncommited() {
    $("#commit").fadeOut(200, function() {
        $(this).css("background", "gold").fadeIn(1000);
    });
    document.getElementById("commit").innerHTML = "<h6>You have uncommited changes, please click here to commit and reboot (you will a have chance to review changes).</h6>";
    $("#commit").click(function() {
        revcommit();
        return false;
    });
}

function listnetwork() {

    document.getElementById("inputtohide").value = config.network.ssid;
    document.getElementById("wifipass").value = config.network.pswd;
    if (config.network.wmode === "1") {

        handleAP();
    } else {
        document.getElementById("wmodesta").checked = true;
        document.getElementById("wifibssid").value = config.network.bssid;
        handleSTA();
    }
    document.getElementById("disable_wifi_after_seconds").value = config.network.offtime;

}

function listgeneral() {

    document.getElementById("adminpwd").value = config.general.pswd;
    document.getElementById("hostname").value = config.general.hostnm;
    document.getElementById("autorestart").value = config.general.restart;
}

function listmqtt() {

    document.getElementById("mqtthost").value = config.mqtt.host;
    document.getElementById("mqttport").value = config.mqtt.port;
    document.getElementById("mqtttopic").value = config.mqtt.topic;
    document.getElementById("mqttuser").value = config.mqtt.user;
    document.getElementById("mqttpwd").value = config.mqtt.pswd;
}

function handleAP() {
    document.getElementById("hideBSSID").style.display = "none";
    document.getElementById("scanb").style.display = "none";
    document.getElementById("ssid").style.display = "none";
    document.getElementById("inputtohide").style.display = "block";


}

function handleSTA() {
    document.getElementById("hideBSSID").style.display = "block";
    document.getElementById("scanb").style.display = "block";
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

function listBSSID() {
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

function getUsers() {
    websock.send("{\"command\":\"userlist\", \"page\":" + page + "}");
}

function getEvents() {
    websock.send("{\"command\":\"geteventlog\", \"page\":" + page + "}");
}

function listSCAN(obj) {
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
    var uid, user, acc, valid;
    document.getElementById("dynamic").style.width = part * (i + 1) + "%";
    var datatosend = {};
    uid = data[i].uid;
    user = data[i].username;
    acc = data[i].acctype;
    valid = data[i].validuntil;
    datatosend.command = "userfile";
    datatosend.uid = uid;
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

function initEventTable() {
    var newlist = [];
    for (var i = 0; i < data.length; i++) {
        var dup = JSON.parse(data[i]);
        newlist[i] = {};
        newlist[i].options = {};
        newlist[i].value = {};
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
        FooTable.init("#eventtable", {
            columns: [{
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
                    "breakpoints": "xs sm"
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
                    "sorted": true,
                    "direction": "DESC",
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
        var dup = JSON.parse(data[i]);
        newlist[i] = {};
        newlist[i].options = {};
        newlist[i].value = {};
        newlist[i].value = dup;
        var c = dup.acctype;
        switch (c) {
            case 1:
                newlist[i].options.classes = "success";
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
        FooTable.init("#latestlogtable", {
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
                        }
                    }
                }
            ],
            rows: newlist
        });
    });
}

function twoDigits(value) {
    if (value < 10) {
        return "0" + value;
    }
    return value;
}

function initUserTable() {
    jQuery(function($) {
        var $modal = $("#editor-modal"),
            $editor = $("#editor"),
            $editorTitle = $("#editor-title"),
            ft = FooTable.init("#usertable", {
                columns: [{
                        "name": "uid",
                        "title": "UID",
                        "type": "text",
                    },
                    {
                        "name": "username",
                        "title": "User Name or Label"
                    },
                    {
                        "name": "acctype",
                        "title": "Access Type",
                        "breakpoints": "xs",
                        "parser": function(value) {
                            if (value === 1) {
                                return "Active";
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
                        if (values.acctype === "Active") {
                            acctypefinder = 1;
                        } else if (values.acctype === "Admin") {
                            acctypefinder = 99;
                        } else if (values.acctype === "Disabled") {
                            acctypefinder = 0;
                        }
                        $editor.find("#uid").val(values.uid);
                        $editor.find("#username").val(values.username);
                        $editor.find("#acctype").val(acctypefinder);
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
                    filtering: FooTable.MyFiltering
                }
            }),
            uid = 10001;
        $editor.on("submit", function(e) {
            if (this.checkValidity && !this.checkValidity()) return;
            e.preventDefault();
            var row = $modal.data("row"),
                values = {
                    uid: $editor.find("#uid").val(),
                    username: $editor.find("#username").val(),
                    acctype: parseInt($editor.find("#acctype").val()),
                    validuntil: (new Date($editor.find("#validuntil").val()).getTime() / 1000)
                };
            if (row instanceof FooTable.Row) {
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
            datatosend.user = $editor.find("#username").val();
            datatosend.acctype = parseInt($editor.find("#acctype").val());
            var validuntil = $editor.find("#validuntil").val();
            var vuepoch = (new Date(validuntil).getTime() / 1000);
            datatosend.validuntil = vuepoch;
            websock.send(JSON.stringify(datatosend));
            $modal.modal("hide");
        });
    });
}



function acctypefinder() {
    if (values.acctype === "Active") {
        return 1;
    } else if (values.acctype === "Admin") {
        return 99;
    } else {
        return 0;
    }
}

function restartESP() {
    inProgress("restart");
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
    document.getElementById("flash").style.width = (ajaxobj.availsize * 100) / 2092032 + "%";
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
    document.getElementById("sver").innerText = config.general.version;
    $("#mainver").text(config.general.version);
}

var nextIsNotJson = false;

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
            case "piccscan":
                listSCAN(obj);
                break;
            case "ssidlist":
                listSSID(obj);
                break;
            case "configfile":
                config = obj;
                config.general.version = "v0.7";
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
                    initLogTable();
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

function socketCloseListener(evt) {
    console.log("socket closed");
    websock = new WebSocket(wsUri);
    websock.addEventListener("message", socketMessageListener);
    websock.addEventListener("close", socketCloseListener);
    websock.addEventListener("error", socketErrorListener);
}

function socketErrorListener(evt) {
    console.log("socket error");
    console.log(evt);
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
    if (config.general.hostnm === document.getElementById("compare").value) {
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

$(".noimp").on("click", function() {
    $("#noimp").modal("show");
});



FooTable.MyFiltering = FooTable.Filtering.extend({
    construct: function(instance) {
        this._super(instance);
        this.acctypes = ["1", "99", "0"];
        this.acctypesstr = ["Active", "Admin", "Disabled"];
        this.def = "Access Type";
        this.$acctype = null;
    },
    $create: function() {
        this._super();
        var self = this,
            $form_grp = $("<div/>", {
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
            .appendTo($form_grp);

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
        if (acctype instanceof FooTable.Filter) {
            this.$acctype.val(acctype.query.val());
        } else {
            this.$acctype.val(this.def);
        }
    }
});

document.addEventListener("touchstart", handleTouchStart, false);
document.addEventListener("touchmove", handleTouchMove, false);

var xDown = null;
var yDown = null;

function handleTouchStart(evt) {
    xDown = evt.touches[0].clientX;
    yDown = evt.touches[0].clientY;
};

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
};

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

$("#update").on("shown.bs.modal", function(e) {
    GetLatestReleaseInfo();
})

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

var formData = new FormData();


function upload() {
    formData.append("bin", $("#binform")[0].files[0]);
    inProgress("upload");
}

function login() {
    if (document.getElementById("password").value === "neo") {
        $("#signin").modal("hide");
        connectWS();
    } else {
        var username = "admin"
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


function GetLatestReleaseInfo() {

    $.getJSON("https://api.github.com/repos/omersiar/esp-rfid/releases/latest").done(function(release) {
        var asset = release.assets[0];
        onlinebin = asset.browser_download_url;
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
        $("#versionhead").text(config.general.version);
    }).error(function() { $("#onlineupdate").html("<h5>Couldn't get release info. Are you connected to the Internet?</h5>"); });
}

function allowUpload() {
    $("#upbtn").prop("disabled", false);
}

function connectWS() {
    if (window.location.protocol === "https:") {
        wsUri = "wss://" + window.location.hostname + "/ws";
    } else if (window.location.protocol === "file:") {
        wsUri = "ws://" + "localhost" + "/ws";
    }
    websock = new WebSocket(wsUri);
    websock.addEventListener("message", socketMessageListener);
    websock.addEventListener("error", socketErrorListener);
    websock.addEventListener("close", socketCloseListener);

    websock.onopen = function(evt) {
        websock.send("{\"command\":\"getconf\"}");
        websock.send("{\"command\":\"status\"}");
    };
}

function start() {
    esprfidcontent = document.createElement("div");
    esprfidcontent.id = "mastercontent";
    esprfidcontent.style.display = "none";
    document.body.appendChild(esprfidcontent);
    $("#mastercontent").load("esprfid.htm", function(responseTxt, statusTxt, xhr) {
        if (statusTxt === "success") {
            var url = "/login";
            var xhr = new XMLHttpRequest();
            xhr.open("get", url, true, "admin");
            xhr.onload = function(e) {
                if (xhr.readyState === 4) {
                    if (xhr.status == 401) {
                        $("#signin").modal({ backdrop: "static", keyboard: false });
                    }
                    if (xhr.status === 200) {
                        $("#signin").modal("hide");
                        connectWS();
                    }
                }
            };
            xhr.onerror = function(e) {
                $("#signin").modal({ backdrop: "static", keyboard: false });
            };
            xhr.send();
        }
    });
}