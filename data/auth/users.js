var websock;

function start() {
    websock = new WebSocket('ws://' + window.location.hostname + '/ws');
    websock.onopen = function(evt) {
        console.log('ESP WebSock Open');
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
        if  (obj.command == "piccscan") {
            listSCAN(obj);
        } else if (obj.command == "picclist") {
          document.getElementById('loading-img').style.display = "none";
            listknownPICC(obj);
        }
    };
}


function listSCAN(obj) {
    var epochTime = obj.epoch;
    var isKnown = obj.known;
    var uid = obj.uid;
    var uidUP = obj.uid.toUpperCase();
    document.getElementById('uidinp').value = uidUP;
    document.getElementById('typeinp').value = obj.type;
    document.getElementById('username').value = obj.user;
    document.getElementById('access').value = obj.access;
    var ref =  document.getElementById('button');
    ref.style.display = "block";
    if (isKnown == 1) {
        ref.dep = uid;
        ref.className = "btn btn-warning btn-sm";
        ref.onclick = function() {
            update(this);
        };
        ref.textContent = "Update";
    } else {
        ref.dep = uid;
        ref.className = "btn btn-success btn-sm";
        ref.onclick = function() {
            add(this);
        };
        ref.textContent = "Add";
    }
    fadeOutIn(document.getElementById('fade'), 250);

}

function add(e) {
    var x = confirm('This will add ' + e.dep + ' to database. Are you sure?');
    if (x) {
        var jsontosend = '{"uid":"' + e.dep + '","command":"add"}';
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

function update(e) {
  var x = confirm('This will update ' + e.dep + ' on database. Are you sure?');
  if (x) {
  var datatosend = {};
  datatosend.command = "userfile";
  datatosend.uid = e.dep;
  datatosend.user = document.getElementById('username').value;
  datatosend.haveAcc = document.getElementById('access').value;
  console.log(JSON.stringify(datatosend));
  websock.send(JSON.stringify(datatosend));
  }
}

  function fadeOutIn(elem, speed) {
                if (!elem.style.opacity) {
                    elem.style.opacity = 1;
                } // end if
                var outInterval = setInterval(function() {
                    elem.style.opacity -= 0.02;
                    if (elem.style.opacity <= 0) {
                        clearInterval(outInterval);
                        var inInterval = setInterval(function() {
                            elem.style.opacity = Number(elem.style.opacity) + 0.02;
                            if (elem.style.opacity >= 1)
                                clearInterval(inInterval);
                        }, speed / 50);
                    } // end if
                }, speed / 50);
            }

function tableupdate(e) {
  var datatosend = {};
  datatosend.command = "userfile";
  datatosend.uid = e.value;
  datatosend.user = document.getElementById(e.value).value;
  var acc = 0;
  if (document.getElementById(e.value + "C").checked === true) {
    acc = 1;
  }
  datatosend.haveAcc = acc;
  console.log(JSON.stringify(datatosend));
  websock.send(JSON.stringify(datatosend));
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
        cell1.innerHTML = upper;
        var cell2 = row.insertCell(1);
        var inp = document.createElement('input');
        inp.classList.add("input-sm");
        inp.id = x;
        inp.value = obj.users[i];
        cell2.appendChild(inp);
        
        var cell3 = row.insertCell(2);
        var inp2 = document.createElement('input');
        inp2.type = "checkbox";
        inp2.id = x + "C";
        if (obj.access[i] == 1) {
          row.className = 'success';
          inp2.checked = true;
        }
        else {
          row.className = 'warning';
          inp2.checked = false;
        }
        cell3.appendChild(inp2);
        
        var cell4 = row.insertCell(3);
        var btn = document.createElement('button');
        btn.onclick = function() {
            tableupdate(this);
        };
        btn.value = x;
        btn.classList.add("btn", "btn-warning", "btn-xs");
        btn.innerHTML = "&#10004";
        cell4.appendChild(btn);
    }
    console.log(obj);
}