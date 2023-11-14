console.log("[ INFO ] Starting ESP-RFID WebSocket Emulation Server");

const WebSocket = require("ws");

console.log("[ INFO ] You can connect to ws://localhost (default port is 8080)");

const wss = new WebSocket.Server({
    port: 8080
});

wss.broadcast = function broadcast(data) {
    wss.clients.forEach(function each(client) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
};

var networks = {
    "command": "ssidlist",
    "list": [{
            "ssid": "Company's Network",
            "bssid": "4c:f4:39:a1:41",
            "rssi": "-84"
        },
        {
            "ssid": "Home Router",
            "bssid": "8a:e6:63:a8:15",
            "rssi": "-42"
        },
        {
            "ssid": "SSID Shown Here",
            "bssid": "8a:f5:86:c3:12",
            "rssi": "-77"
        },
        {
            "ssid": "Great Wall of WPA",
            "bssid": "9c:f1:90:c5:15",
            "rssi": "-80"
        },
        {
            "ssid": "Not Internet",
            "bssid": "8c:e4:57:c5:16",
            "rssi": "-87"
        }
    ]
}

var latestlog = [
    {"timestamp":1518198383,"uid":"8ab424c10","username":"Moody Bond","acctype":1},
    {"timestamp":1514952461,"uid":"4de212c96","username":"Unknown","acctype":0},
    {"timestamp":1516598710,"uid":"8de284c27","username":"Marta Cooley","acctype":99},
    {"timestamp":1516649998,"uid":"4db504c86","username":"Simmons Sosa","acctype":1},
    {"timestamp":1517133201,"uid":"9db178a36","username":"Jimmie Sheppard","acctype":1},
    {"timestamp":1516257556,"uid":"4cf690a75","username":"Rutledge Murray","acctype":1},
    {"timestamp":1515661586,"uid":"4ab792d39","username":"Unknown","acctype":0},
    {"timestamp":1515524537,"uid":"9cf869a85","username":"Rollins Villarreal","acctype":1},
    {"timestamp": 1515823122,"uid":"9db221c40","username": "Hayden Baird","acctype": 1},
    {"timestamp": 1515066066,"uid": "8cb891d34","username": "Tucker Boyer","acctype": 1},
    {"timestamp":1518198383,"uid":"8ab424c10","username":"Moody Bond","acctype":1},
    {"timestamp":1514952461,"uid":"4de212c96","username":"Unknown","acctype":0},
    {"timestamp":1516598710,"uid":"8de284c27","username":"Marta Cooley","acctype":99},
    {"timestamp":1516649998,"uid":"4db504c86","username":"Simmons Sosa","acctype":1},
    {"timestamp":1517133201,"uid":"9db178a36","username":"Jimmie Sheppard","acctype":1},
    {"timestamp":1516257556,"uid":"4cf690a75","username":"Rutledge Murray","acctype":1},
    {"timestamp":1515661586,"uid":"4ab792d39","username":"Unknown","acctype":0},
    {"timestamp":1515524537,"uid":"9cf869a85","username":"Rollins Villarreal","acctype":1},
    {"timestamp": 1515823122,"uid":"9db221c40","username": "Hayden Baird","acctype": 1},
    {"timestamp": 1515066066,"uid": "8cb891d34","username": "Tucker Boyer","acctype": 1},
    {"timestamp":1518198383,"uid":"8ab424c10","username":"Moody Bond","acctype":1},
    {"timestamp":1514952461,"uid":"4de212c96","username":"Unknown","acctype":0},
    {"timestamp":1516598710,"uid":"8de284c27","username":"Marta Cooley","acctype":99},
    {"timestamp":1516649998,"uid":"4db504c86","username":"Simmons Sosa","acctype":1},
    {"timestamp":1517133201,"uid":"9db178a36","username":"Jimmie Sheppard","acctype":1},
    {"timestamp":1516257556,"uid":"4cf690a75","username":"Rutledge Murray","acctype":1},
    {"timestamp":1515661586,"uid":"4ab792d39","username":"Unknown","acctype":0},
    {"timestamp":1515524537,"uid":"9cf869a85","username":"Rollins Villarreal","acctype":1},
    {"timestamp": 1515823122,"uid":"9db221c40","username": "Hayden Baird","acctype": 1},
    {"timestamp": 1515066066,"uid": "8cb891d34","username": "Tucker Boyer","acctype": 1},
    {"timestamp":1518198383,"uid":"8ab424c10","username":"Moody Bond","acctype":1},
    {"timestamp":1514952461,"uid":"4de212c96","username":"Unknown","acctype":0},
    {"timestamp":1516598710,"uid":"8de284c27","username":"Marta Cooley","acctype":99},
    {"timestamp":1516649998,"uid":"4db504c86","username":"Simmons Sosa","acctype":1},
    {"timestamp":1517133201,"uid":"9db178a36","username":"Jimmie Sheppard","acctype":1},
    {"timestamp":1516257556,"uid":"4cf690a75","username":"Rutledge Murray","acctype":1},
    {"timestamp":1515661586,"uid":"4ab792d39","username":"Unknown","acctype":0},
    {"timestamp":1515524537,"uid":"9cf869a85","username":"Rollins Villarreal","acctype":1},
    {"timestamp": 1515823122,"uid":"9db221c40","username": "Hayden Baird","acctype": 1},
    {"timestamp": 1515066066,"uid": "8cb891d34","username": "Tucker Boyer","acctype": 1},
];

var eventlog = [
    { "type": "WARN", "src": "sys", "desc": "Event log cleared!", "data": "", "time": 1520523010 },
    { "type": "WARN", "src": "sys", "desc": "Event log cleared!", "data": "", "time": 1520523010 },
    { "type": "INFO", "src": "wifi", "desc": "WiFi is connected", "data": "SMC", "time": 13 },
    { "type": "INFO", "src": "sys", "desc": "System setup completed, running", "data": "", "time": 13 },
    { "type": "INFO", "src": "wifi", "desc": "WiFi is connected", "data": "SMC", "time": 13 },
    { "type": "INFO", "src": "sys", "desc": "System setup completed, running", "data": "", "time": 13 },
    { "type": "WARN", "src": "websrv", "desc": "New login attempt", "data": "", "time": 1520578744 },
    { "type": "INFO", "src": "websrv", "desc": "Login success!", "data": "", "time": 1520578744 },
    { "type": "INFO", "src": "wifi", "desc": "WiFi is connected", "data": "SMC", "time": 13 },
    { "type": "INFO", "src": "sys", "desc": "System setup completed, running", "data": "", "time": 13 },
    { "type": "WARN", "src": "websrv", "desc": "New login attempt", "data": "", "time": 1520583560 },
    { "type": "WARN", "src": "sys", "desc": "Event log cleared!", "data": "", "time": 1520523010 },
    { "type": "WARN", "src": "sys", "desc": "Event log cleared!", "data": "", "time": 1520523010 },
    { "type": "INFO", "src": "wifi", "desc": "WiFi is connected", "data": "SMC", "time": 13 },
    { "type": "INFO", "src": "sys", "desc": "System setup completed, running", "data": "", "time": 13 },
    { "type": "INFO", "src": "wifi", "desc": "WiFi is connected", "data": "SMC", "time": 13 },
    { "type": "INFO", "src": "sys", "desc": "System setup completed, running", "data": "", "time": 13 },
    { "type": "WARN", "src": "websrv", "desc": "New login attempt", "data": "", "time": 1520578744 },
    { "type": "INFO", "src": "websrv", "desc": "Login success!", "data": "", "time": 1520578744 },
    { "type": "INFO", "src": "wifi", "desc": "WiFi is connected", "data": "SMC", "time": 13 },
    { "type": "INFO", "src": "sys", "desc": "System setup completed, running", "data": "", "time": 13 },
    { "type": "WARN", "src": "websrv", "desc": "New login attempt", "data": "", "time": 1520583560 },
    { "type": "WARN", "src": "sys", "desc": "Event log cleared!", "data": "", "time": 1520523010 },
    { "type": "WARN", "src": "sys", "desc": "Event log cleared!", "data": "", "time": 1520523010 },
    { "type": "INFO", "src": "wifi", "desc": "WiFi is connected", "data": "SMC", "time": 13 },
    { "type": "INFO", "src": "sys", "desc": "System setup completed, running", "data": "", "time": 13 },
    { "type": "INFO", "src": "wifi", "desc": "WiFi is connected", "data": "SMC", "time": 13 },
    { "type": "INFO", "src": "sys", "desc": "System setup completed, running", "data": "", "time": 13 },
    { "type": "WARN", "src": "websrv", "desc": "New login attempt", "data": "", "time": 1520578744 },
    { "type": "INFO", "src": "websrv", "desc": "Login success!", "data": "", "time": 1520578744 },
    { "type": "INFO", "src": "wifi", "desc": "WiFi is connected", "data": "SMC", "time": 13 },
    { "type": "INFO", "src": "sys", "desc": "System setup completed, running", "data": "", "time": 13 },
    { "type": "WARN", "src": "websrv", "desc": "New login attempt", "data": "", "time": 1520583560 },
    { "type": "WARN", "src": "sys", "desc": "Event log cleared!", "data": "", "time": 1520523010 },
    { "type": "WARN", "src": "sys", "desc": "Event log cleared!", "data": "", "time": 1520523010 },
    { "type": "INFO", "src": "wifi", "desc": "WiFi is connected", "data": "SMC", "time": 13 },
    { "type": "INFO", "src": "sys", "desc": "System setup completed, running", "data": "", "time": 13 },
    { "type": "INFO", "src": "wifi", "desc": "WiFi is connected", "data": "SMC", "time": 13 },
    { "type": "INFO", "src": "sys", "desc": "System setup completed, running", "data": "", "time": 13 },
    { "type": "WARN", "src": "websrv", "desc": "New login attempt", "data": "", "time": 1520578744 },
    { "type": "INFO", "src": "websrv", "desc": "Login success!", "data": "", "time": 1520578744 },
    { "type": "INFO", "src": "wifi", "desc": "WiFi is connected", "data": "SMC", "time": 13 },
    { "type": "INFO", "src": "sys", "desc": "System setup completed, running", "data": "", "time": 13 },
    { "type": "WARN", "src": "websrv", "desc": "New login attempt", "data": "", "time": 1520583560 },
];

var users = [{
        "uid": "12c9298d",
        "pincode": "1234",
        "username": "Nikki Kidd",
        "acctype": 0,
        "validsince": 0,
        "validuntil": 4562316475
    },
    {
        "uid": "70f3675d",
        "pincode": "1234",
        "username": "Maria Cohen",
        "acctype": 1,
        "validsince": 0,
        "validuntil": 1048061447
    },
    {
        "uid": "80c2489b",
        "pincode": "1234",
        "username": "Hilda Whitaker",
        "acctype": 1,
        "validsince": 0,
        "validuntil": 9154328938
    },
    {
        "uid": "14a8590b",
        "pincode": "1234",
        "username": "Eloise Floyd",
        "acctype": 1,
        "validsince": 0,
        "validuntil": 7903845677
    },
    {
        "uid": "84f2342d",
        "pincode": "1234",
        "username": "Grimes Davenport",
        "acctype": 0,
        "validsince": 0,
        "validuntil": 4362181899
    },
    {
        "uid": "53f5031b",
        "pincode": "1234",
        "username": "Wanda Jones",
        "acctype": 1,
        "validsince": 0,
        "validuntil": 8077084354
    },
    {
        "uid": "72c4667c",
        "pincode": "1234",
        "username": "Weaver Sampson",
        "acctype": 0,
        "validsince": 0,
        "validuntil": 9712710211
    },
    {
        "uid": "23a9198d",
        "pincode": "1234",
        "username": "Nash Hernandez",
        "acctype": 1,
        "validsince": 0,
        "validuntil": 8752373818
    },
    {
        "uid": "24c8875b",
        "pincode": "1234",
        "username": "Elvia Vance",
        "acctype": 1,
        "validsince": 0,
        "validuntil": 1956504821
    },
    {
        "uid": "91c3021b",
        "pincode": "1234",
        "username": "Lucinda Fischer",
        "acctype": 1,
        "validsince": 0,
        "validuntil": 3697215988
    },
    {
        "uid": "19c2258d",
        "pincode": "1234",
        "username": "Gregory Cline",
        "acctype": 1,
        "validsince": 0,
        "validuntil": 4515022519
    },
    {
        "uid": "65f1947b",
        "pincode": "1234",
        "username": "Lidia Hancock",
        "acctype": 1,
        "validsince": 0,
        "validuntil": 2333382745
    },
    {
        "uid": "21c9851d",
        "pincode": "1234",
        "username": "Lina George",
        "acctype": 0,
        "validsince": 0,
        "validuntil": 8146061670
    },
    {
        "uid": "13c2627d",
        "pincode": "1234",
        "username": "Fields Macdonald",
        "acctype": 0,
        "validsince": 0,
        "validuntil": 8564191761
    },
    {
        "uid": "61f7214b",
        "pincode": "1234",
        "username": "Mollie Dean",
        "acctype": 1,
        "validsince": 0,
        "validuntil": 3201049552
    },
    {
        "uid": "94f4198b",
        "pincode": "1234",
        "username": "Silva Lawrence",
        "acctype": 0,
        "validsince": 0,
        "validuntil": 3967606320
    },
    {
        "uid": "52c4392d",
        "pincode": "1234",
        "username": "Tyler Gonzalez",
        "acctype": 0,
        "validsince": 0,
        "validuntil": 7258523602
    },
    {
        "uid": "74f9928c",
        "pincode": "1234",
        "username": "Summers Whitehead",
        "acctype": 0,
        "validsince": 0,
        "validuntil": 3326998231
    },
    {
        "uid": "52f6266c",
        "pincode": "1234",
        "username": "Misty Williams",
        "acctype": 1,
        "validsince": 0,
        "validuntil": 1760784347
    },
    {
        "uid": "71f4745c",
        "pincode": "1234",
        "username": "Sanchez Osborn",
        "acctype": 1,
        "validsince": 0,
        "validuntil": 9210015456
    },
    {
        "uid": "65a5218c",
        "pincode": "1234",
        "username": "Brown Glover",
        "acctype": 0,
        "validsince": 0,
        "validuntil": 6616351487
    },
    {
        "uid": "82f6569d",
        "pincode": "1234",
        "username": "Pat Flowers",
        "acctype": 1,
        "validsince": 0,
        "validuntil": 2176624484
    },
    {
        "uid": "21a6381c",
        "pincode": "1234",
        "username": "Tanya Mcmillan",
        "acctype": 1,
        "validsince": 0,
        "validuntil": 7135500634
    },
    {
        "uid": "62c8616b",
        "pincode": "1234",
        "username": "Norma Perry",
        "acctype": 0,
        "validsince": 0,
        "validuntil": 8382065121
    },
    {
        "uid": "23f2325b",
        "pincode": "1234",
        "username": "Etta Mooney",
        "acctype": 1,
        "validsince": 0,
        "validuntil": 5466868107
    },
    {
        "uid": "33a5116b",
        "pincode": "1234",
        "username": "Marissa Waller",
        "acctype": 0,
        "validsince": 0,
        "validuntil": 8998269761
    },
    {
        "uid": "23c7176b",
        "pincode": "1234",
        "username": "Kari Gutierrez",
        "acctype": 1,
        "validsince": 0,
        "validuntil": 3100510208
    }
];

var configfile = {
    "command": "configfile",
    "network": {
        "bssid": "aa:bb:Cc:dd:ee",
        "ssid": "SMC",
        "wmode": "0",
        "pswd": "33355555",
        "offtime": "180"
    },
    "hardware": {
        "readertype": "1",
        "wgd0pin": "4",
        "wgd1pin": "5",
        "sspin": "15",
        "rfidgain": "32",
        "rtype": "1",
        "rpin": "16",
        "rtime": "300",
        "useridstoragemode": "hexadecimal",
        "requirepincodeafterrfid": 1,
        "allowpincodeonly": 0,
    },
    "general": {
        "hostnm": "esp-rfid",
        "restart": "86400",
        "pswd": "admin",
        "version": "v0.6",
        "openinghours": [
            "111111111111111111111111",
            "000000000000011100000000",
            "111111111111111111111111",
            "000011111000000000000000",
            "000000000000000000000000",
            "000000000111111000000000",
            "000000000000000000000000",
        ]
    },
    "mqtt": {
        "host": "",
        "port": "",
        "topic": "",
        "user": "",
        "pswd": ""
    },
    "ntp": {
        "server": "pool.ntp.org",
        "interval": "30",
        "tzinfo": ""
    }
};

function remove(uidKey) {
    for (var i = 0; i < users.length; i++) {
        if (users[i].uid === uidKey) {
            console.log("[ INFO ] Removed: " + JSON.stringify(users[i]));
            users.splice(i, 1);
        }
    }
}

function updateuser(obj) {
    for (var i = 0; i < users.length; i++) {
        if (users[i].uid === obj.uid) {
            console.log("[ INFO ] Old User settings: " + JSON.stringify(users[i]));
            users.splice(i, 1);
            break;
        }
    }
    var newdata = {};
    newdata.uid = obj.uid;
    newdata.pincode = obj.pincode;
    newdata.username = obj.user;
    newdata.acctype = obj.acctype;
    newdata.validsince = obj.validsince;
    newdata.validuntil = obj.validuntil;
    console.log("[ INFO ] New User settings: " + JSON.stringify(newdata));
    users.push(newdata);
    var res = {
        "command": "result",
        "resultof": "userfile",
        "result": true
    };
    wss.broadcast(res);
}

function sendUserList(page) {
    var datatosend = {};
    datatosend.command = "userlist"
    datatosend.page = page;
    datatosend.haspages = Math.ceil(users.length / 10);
    datatosend.list = [];
    var zero = 0;
    for (var i = ((page - 1) * 10); i < (page * 10); i++) {
        if (typeof users[i] !== "undefined") {
            datatosend.list[zero++] = users[i];
        }
    }
    wss.broadcast(datatosend);
    var res = {
        "command": "result",
        "resultof": "userlist",
        "result": true
    };
    wss.broadcast(res);
}

function sendEventLog(page) {
    var datatosend = {};
    datatosend.command = "eventlist"
    datatosend.page = page;
    datatosend.haspages = Math.ceil(eventlog.length / 10);
    datatosend.list = [];
    var zero = 0;
    for (var i = ((page - 1) * 10); i < (page * 10); i++) {
        if (typeof eventlog[i] !== "undefined") {
            datatosend.list[zero++] = JSON.stringify(eventlog[i]);
        }
    }
    wss.broadcast(datatosend);
    var res = {
        "command": "result",
        "resultof": "eventlist",
        "result": true
    };
    wss.broadcast(res);
}

function sendLatestLog(page) {
    var datatosend = {};
    datatosend.command = "latestlist"
    datatosend.page = page;
    datatosend.haspages = Math.ceil(latestlog.length / 10);
    datatosend.list = [];
    var zero = 0;
    for (var i = ((page - 1) * 10); i < (page * 10); i++) {
        if (typeof latestlog[i] !== "undefined") {
            datatosend.list[zero++] = JSON.stringify(latestlog[i]);
        }
    }
    wss.broadcast(datatosend);
    var res = {
        "command": "result",
        "resultof": "latestlist",
        "result": true
    };
    wss.broadcast(res);
}

function sendStatus() {
    var stats = {
        "command": "status",
        "heap": 30000,
        "chipid": "emu413",
        "cpu": "80/160",
        "availsize": 555555,
        "availspiffs": 445555,
        "spiffssize": 888888,
        "uptime": "1 Day 6 Hours",
        "ssid": "emuSSID",
        "dns": "8.8.8.8",
        "mac": "EM:44:11:33:22",
        "ip": "192.168.2.2",
        "gateway": "192.168.2.1",
        "netmask": "255.255.255.0"
    };
    wss.broadcast(stats);
}

wss.on('connection', function connection(ws) {
    ws.on("error", () => console.log("[ WARN ] WebSocket Error - Assume a client is disconnected."));
    ws.on('message', function incoming(message) {
        var obj = JSON.parse(message);
        console.log("[ INFO ] Got Command: " + obj.command);
        switch (obj.command) {
            case "remove":
                console.log("[ INFO ] Removing " + obj.uid);
                remove(obj.uid);
                break;
            case "configfile":
                configfile = obj;
                console.log("[ INFO ] New configuration file is recieved");
                configfile = obj;
                break;
            case "userlist":
                console.log("[ INFO ] Sending User List, page: " + obj.page);
                sendUserList(obj.page);
                break;
            case "status":
                console.log("[ INFO ] Sending Fake Emulator Status");
                sendStatus();
                break;
            case "userfile":
                console.log("[ INFO ] User Update " + obj.uid);
                updateuser(obj);
                break;
            case "testrelay":
                console.log("[ INFO ] Test relay button");
                process.stderr.write("\007");
                break;
            case "getlatestlog":
                console.log("[ INFO ] Sending latest log file, page: " + obj.page);
                sendLatestLog(obj.page);
                break;
            case "scan":
                console.log("[ INFO ] Sending Fake Wireless Networks");
                wss.broadcast(networks);
                break;
            case "gettime":
                console.log("[ INFO ] Sending time");
                var res = {};
                res.command = "gettime";
                res.epoch = Math.floor((new Date).getTime() / 1000);
                wss.broadcast(res);
                break;
            case "settime":
                console.log("[ INFO ] Setting time (fake)");
                var res = {};
                res.command = "gettime";
                res.epoch = Math.floor((new Date).getTime() / 1000);
                wss.broadcast(res);
                break;
            case "getconf":
                console.log("[ INFO ] Sending configuration file (if set any)");
                wss.broadcast(configfile);
                break;
            case "geteventlog":
                console.log("[ INFO ] Sending eventlog, page: " + obj.page);
                sendEventLog(obj.page);
                break;
            default:
                console.log("[ WARN ] Unknown command ");
                break;
        }
    });
});