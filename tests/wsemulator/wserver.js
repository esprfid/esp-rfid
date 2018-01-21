console.log("[ INFO ] Starting ESP-RFID WebSocket Emulation Server");

const WebSocket = require('ws');

console.log("[ INFO ] You can connect to ws://localhost (default port is 80)");

const wss = new WebSocket.Server({
    port: 80
});

wss.broadcast = function broadcast(data) {
    wss.clients.forEach(function each(client) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
};

var users = [{
        "uid": "12c9298d",
        "username": "Nikki Kidd",
        "acctype": 0,
        "validuntil": 4562316475
    },
    {
        "uid": "70f3675d",
        "username": "Maria Cohen",
        "acctype": 1,
        "validuntil": 1048061447
    },
    {
        "uid": "80c2489b",
        "username": "Hilda Whitaker",
        "acctype": 1,
        "validuntil": 9154328938
    },
    {
        "uid": "14a8590b",
        "username": "Eloise Floyd",
        "acctype": 1,
        "validuntil": 7903845677
    },
    {
        "uid": "84f2342d",
        "username": "Grimes Davenport",
        "acctype": 0,
        "validuntil": 4362181899
    },
    {
        "uid": "53f5031b",
        "username": "Wanda Jones",
        "acctype": 1,
        "validuntil": 8077084354
    },
    {
        "uid": "72c4667c",
        "username": "Weaver Sampson",
        "acctype": 0,
        "validuntil": 9712710211
    },
    {
        "uid": "23a9198d",
        "username": "Nash Hernandez",
        "acctype": 1,
        "validuntil": 8752373818
    },
    {
        "uid": "24c8875b",
        "username": "Elvia Vance",
        "acctype": 1,
        "validuntil": 1956504821
    },
    {
        "uid": "91c3021b",
        "username": "Lucinda Fischer",
        "acctype": 1,
        "validuntil": 3697215988
    },
    {
        "uid": "19c2258d",
        "username": "Gregory Cline",
        "acctype": 1,
        "validuntil": 4515022519
    },
    {
        "uid": "65f1947b",
        "username": "Lidia Hancock",
        "acctype": 1,
        "validuntil": 2333382745
    },
    {
        "uid": "21c9851d",
        "username": "Lina George",
        "acctype": 0,
        "validuntil": 8146061670
    },
    {
        "uid": "13c2627d",
        "username": "Fields Macdonald",
        "acctype": 0,
        "validuntil": 8564191761
    },
    {
        "uid": "61f7214b",
        "username": "Mollie Dean",
        "acctype": 1,
        "validuntil": 3201049552
    },
    {
        "uid": "94f4198b",
        "username": "Silva Lawrence",
        "acctype": 0,
        "validuntil": 3967606320
    },
    {
        "uid": "52c4392d",
        "username": "Tyler Gonzalez",
        "acctype": 0,
        "validuntil": 7258523602
    },
    {
        "uid": "74f9928c",
        "username": "Summers Whitehead",
        "acctype": 0,
        "validuntil": 3326998231
    },
    {
        "uid": "52f6266c",
        "username": "Misty Williams",
        "acctype": 1,
        "validuntil": 1760784347
    },
    {
        "uid": "71f4745c",
        "username": "Sanchez Osborn",
        "acctype": 1,
        "validuntil": 9210015456
    },
    {
        "uid": "65a5218c",
        "username": "Brown Glover",
        "acctype": 0,
        "validuntil": 6616351487
    },
    {
        "uid": "82f6569d",
        "username": "Pat Flowers",
        "acctype": 1,
        "validuntil": 2176624484
    },
    {
        "uid": "21a6381c",
        "username": "Tanya Mcmillan",
        "acctype": 1,
        "validuntil": 7135500634
    },
    {
        "uid": "62c8616b",
        "username": "Norma Perry",
        "acctype": 0,
        "validuntil": 8382065121
    },
    {
        "uid": "23f2325b",
        "username": "Etta Mooney",
        "acctype": 1,
        "validuntil": 5466868107
    },
    {
        "uid": "33a5116b",
        "username": "Marissa Waller",
        "acctype": 0,
        "validuntil": 8998269761
    },
    {
        "uid": "23c7176b",
        "username": "Kari Gutierrez",
        "acctype": 1,
        "validuntil": 3100510208
    }
]

var configfile = {};

function remove(uidKey) {
    for (var i = 0; i < users.length; i++) {
        if (users[i].uid === uidKey) {
            console.log("[ INFO ] Removed: " + JSON.stringify(users[i]));
            users = users.slice(i);
        }
    }
}

function sendUserList(page) {
    var datatosend = {};
    datatosend.command = "userlist"
    datatosend.page = page;
    datatosend.haspages = Math.ceil(users.length / 15);
    datatosend.list = [];
    var zero = 0;
    for (var i = ((page - 1) * 15); i < (page * 15); i++) {
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

function sendStatus() {
	var stats = {
        "command": "status",
        "heap": 30000,
        "chipid": "emu413",
		"cpu": "80/160",
		"availsize": 55555,
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
    ws.on('message', function incoming(message) {
        var obj = JSON.parse(message);
        console.log("[ INFO ] Got Command: " + obj.command);
        switch (obj.command) {
            case "remove":
                console.log("[ INFO ] Removing " + obj.uid);
                remove(obj.uid);
                break;
            case "configfile":
                configfile = JSON.stringify(obj, null, 2);
                console.log("[ INFO ] New configuration is recieved" + configfile);
                break;
            case "userlist":
                console.log("[ INFO ] Sending User List Page: " + obj.page);
                sendUserList(obj.page);
                break;
			case "status":
				console.log("[ INFO ] Sending Fake Emulator Status");
				sendStatus();
            default:
                console.log("[ WARN ] Unknown command ");
        }
    });
});