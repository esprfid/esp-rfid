var websock;

function start() {
    websock = new WebSocket('ws://' + window.location.hostname + '/ws');
    websock.onopen = function(evt) {
        console.log('ESP WebSock Open');
        websock.send('{"command":"getconf"}');
        websock.send('{"command":"picclist"}');
    };
    websock.onclose = function(evt) {
        console.log('ESP WebSock Close');
    };
    websock.onerror = function(evt) {
        console.log(evt);
    };
    websock.onmessage = function(evt) {
        console.log(evt.data);
        obj = JSON.parse(evt.data);
        if (obj.command == "ssidlist") {
            listSSID(obj);
        } else if (obj.command == "configfile") {
            listCONF(obj);
        } else if (obj.command == "piccscan") {
            listSCAN(obj);
        } else if (obj.command == "picclist") {
            listknownPICC(obj);
        }
    };
}

function listCONF(obj) {
    console.log(obj);
    document.getElementById('inputtohide').value = obj.ssid;
    document.getElementById('wifipass').value = obj.pswd;
    document.getElementById('gpioss').value = obj.sspin;
    document.getElementById('gpiorst').value = obj.rstpin;
    document.getElementById('gain').value = obj.rfidgain;
}

function listSSID(obj) {
    var select = document.getElementById('ssid');
    for (var i = 0; i < obj.ssid.length; i++) {
        var x = obj.ssid[i];
        var opt = document.createElement('option');
        opt.value = x;
        opt.innerHTML = x;
        select.appendChild(opt);
    }
    document.getElementById('scanb').innerHTML = 'Re-Scan';
}

function scanWifi() {
    websock.send('{"command":"scan"}');
    document.getElementById('scanb').innerHTML = '...';
    document.getElementById('inputtohide').style.display = 'none';
    var node = document.getElementById('ssid');
    node.style.display = 'inline';
    while (node.hasChildNodes()) {
        node.removeChild(node.lastChild);
    }
}

function saveConf() {
    var ssid;
    if (document.getElementById('inputtohide').style.display == 'none') {
        var b = document.getElementById('ssid');
        ssid = b.options[b.selectedIndex].value;
    } else {
        ssid = document.getElementById('inputtohide').value;
    }
    var datatosend = {};
    datatosend.command = "configfile";
    datatosend.ssid = ssid;
    datatosend.pswd = document.getElementById('wifipass').value;
    datatosend.sspin = document.getElementById('gpioss').value;
    datatosend.rstpin = document.getElementById('gpiorst').value;
    datatosend.rfidgain = document.getElementById('gain').value;
    console.log(JSON.stringify(datatosend));
    websock.send(JSON.stringify(datatosend));
}

function listSCAN(obj) {
    var epochTime = obj.epoch;
    var isKnown = obj.known;
    var uid = obj.uid;
    var uidUP = obj.uid.toUpperCase();
    var type = obj.type.toUpperCase();
    var ref = document.getElementById('picctype');
    
    ref.innerHTML = "UID: " + uidUP + " Type: " + type + " ";

    var btn = document.createElement('button');

    if (isKnown == 1) {

        btn.id = uid;
        btn.classList.add("btn", "btn-danger", "btn-xs");
        btn.onclick = function() {
            del(this);
        };
        btn.textContent = "Remove";
        ref.appendChild(btn);

    } else {

        btn.id = uid;
        btn.classList.add("btn", "btn-success", "btn-xs");
        btn.onclick = function() {
            add(this);
        };
        btn.textContent = "Add";

        ref.appendChild(btn);
    }
}

function add(e) {
        var x = confirm('This will add ' + e.id + ' to database. Are you sure?');
        if (x) {
            var jsontosend = '{"uid":"' + e.id + '","command":"add"}';
            websock.send(jsontosend);
        }
    }

function del(e) {
        var x = confirm('This will remove ' + e.id + ' from database. Are you sure?');
        if (x) {
            var jsontosend = '{"uid":"' + e.id + '","command":"remove"}';
            websock.send(jsontosend);
        }
  
}



function listknownPICC(obj) {
    var table = document.getElementById("knowntable").getElementsByTagName('tbody')[0];
    
    for (var i = 0; i < obj.piccs.length; i++) {
        var x = obj.piccs[i];
        x = x.substring(3);
        var upper = x.toUpperCase();
        var row = table.insertRow(table.rows[0]);
        row.className = 'success';
        var cell1 = row.insertCell(0);
        cell1.value = upper;
        cell1.innerHTML = upper;
        var cell2 = row.insertCell(1);
        var inp = document.createElement('input');
        inp.classList.add("input-sm");
        cell2.appendChild(inp);
        var cell3 = row.insertCell(2);
        var btn = document.createElement('button');
        btn.onclick = function() {del(this);};
        btn.id = x;
        btn.classList.add("btn", "btn-danger", "btn-xs");
        btn.textContent = "X";
        cell3.appendChild(btn);
        
        

    }
    console.log(obj);
}