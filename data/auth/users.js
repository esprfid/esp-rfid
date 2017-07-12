var websock;

function sortTable(n) {
    var table, rows, switching, i, x, y, shouldSwitch, dir, switchcount = 0;
    table = document.getElementById("knowntable");
    switching = true;
    //Set the sorting direction to ascending:
    dir = "asc";
    /*Make a loop that will continue until
    no switching has been done:*/
    while (switching) {
        //start by saying: no switching is done:
        switching = false;
        rows = table.getElementsByTagName("TR");
        /*Loop through all table rows (except the
        first, which contains table headers):*/
        for (i = 1; i < (rows.length - 1); i++) {
            //start by saying there should be no switching:
            shouldSwitch = false;
            /*Get the two elements you want to compare,
            one from current row and one from the next:*/
            x = rows[i].getElementsByTagName("TD")[n];
            y = rows[i + 1].getElementsByTagName("TD")[n];
            /*check if the two rows should switch place,
            based on the direction, asc or desc:*/
            if (dir === "asc") {
                if (x.innerHTML.toLowerCase() > y.innerHTML.toLowerCase()) {
                    //if so, mark as a switch and break the loop:
                    shouldSwitch = true;
                    break;
                }
            } else if (dir === "desc") {
                if (x.innerHTML.toLowerCase() < y.innerHTML.toLowerCase()) {
                    //if so, mark as a switch and break the loop:
                    shouldSwitch = true;
                    break;
                }
            }
        }
        if (shouldSwitch) {
            /*If a switch has been marked, make the switch
            and mark that a switch has been done:*/
            rows[i].parentNode.insertBefore(rows[i + 1], rows[i]);
            switching = true;
            //Each time a switch is done, increase this count by 1:
            switchcount++;
        } else {
            /*If no switching has been done AND the direction is "asc",
            set the direction to "desc" and run the while loop again.*/
            if (switchcount === 0 && dir === "asc") {
                dir = "desc";
                switching = true;
            }
        }
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
                if (elem.style.opacity >= 1) {
                    clearInterval(inInterval);
				}
            }, speed / 50);
        } // end if
    }, speed / 50);
}

function listSCAN(obj) {
    var isKnown = obj.known;
    var uid = obj.uid;
    var uidUP = obj.uid.toUpperCase();
    document.getElementById("uidinp").value = uidUP;
    document.getElementById("typeinp").value = obj.type;
    document.getElementById("username").value = obj.user;
    document.getElementById("access").value = obj.access;
    var ref = document.getElementById("button");
    ref.style.display = "block";
    if (isKnown === 1) {
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
            update(this);
        };
        ref.textContent = "Add";
    }
    fadeOutIn(document.getElementById("fade"), 250);
}

function del(e) {
    var x = confirm("This will remove " + e.id + " from database. Are you sure?");
    if (x) {
        var jsontosend = "{\"uid\":\"" + e.id + "\",\"command\":\"remove\"}";
        websock.send(jsontosend);
    }
}

function tableupdate(e) {
    var datatosend = {};
    datatosend.command = "userfile";
    datatosend.uid = e.dep;
    datatosend.user = document.getElementById(e.dep).getElementsByTagName("td")[1].innerHTML;
    var haveAcc;
    if (document.getElementById(e.dep).getElementsByTagName("td")[2].getElementsByTagName("input")[0].checked) {
        haveAcc = "1";
    } else {
        haveAcc = "0";
    }
    datatosend.haveAcc = haveAcc;
    websock.send(JSON.stringify(datatosend));
    websock.send("{\"command\":\"picclist\"}");
}

function update(e) {
    var datatosend = {};
    datatosend.command = "userfile";
    datatosend.uid = document.getElementById("uidinp").value.toLowerCase();
    datatosend.user = document.getElementById("username").value;
    datatosend.haveAcc = document.getElementById("access").value;
    websock.send(JSON.stringify(datatosend));
    websock.send("{\"command\":\"picclist\"}");
}

function addRowHandlers() {
    var table = document.getElementById("tablebody");
    var rows = table.getElementsByTagName("tr");
    for (var i = 0; i < rows.length; i++) {
        var currentRow = table.rows[i];
        var createClickHandler =
            function(row) {
                return function() {
                    document.getElementById("uidinp").value = row.getElementsByTagName("td")[0].innerHTML;
                    document.getElementById("username").value = row.getElementsByTagName("td")[1].innerHTML;
                    document.getElementById("typeinp").value = "";
                    if (row.getElementsByTagName("td")[2].getElementsByTagName("input")[0].checked) {
                        document.getElementById("access").value = "1";
                    } else {
                        document.getElementById("access").value = "0";
                    }
                    var ref = document.getElementById("button");
                    ref.style.display = "block";
                    ref.dep = document.getElementById("uidinp").value.toLowerCase();
                    ref.className = "btn btn-warning btn-sm";
                    ref.onclick = function() {
                        update(this);
                    };
                    ref.textContent = "Update";
                };
            };
        currentRow.onclick = createClickHandler(currentRow);
    }
}

function listknownPICC(obj) {
    var table = document.getElementById("knowntable").getElementsByTagName("tbody")[0];
    for (var i = 0; i < obj.piccs.length; i++) {
        var x = obj.piccs[i];
        x = x.substring(3);
        var upper = x.toUpperCase();
        var row = table.insertRow(table.rows[0]);
        row.className = "success";
        row.id = x;
        var cell1 = row.insertCell(0);
        cell1.innerHTML = upper;
        var cell2 = row.insertCell(1);
        cell2.innerHTML = obj.users[i];
        var cell3 = row.insertCell(2);
        var inp2 = document.createElement("input");
        inp2.type = "checkbox";
        inp2.id = x + "C";
        inp2.dep = x;
        inp2.onclick = function() {
            tableupdate(this);
        };
        if (obj.access[i] === 1) {
            row.className = "success";
            inp2.checked = true;
        } else {
            row.className = "warning";
            inp2.checked = false;
        }
        cell3.appendChild(inp2);
    }
}

function start() {
    websock = new WebSocket("ws://" + window.location.hostname + "/ws");
    websock.onopen = function(evt) {
        websock.send("{\"command\":\"picclist\"}");
    };
    websock.onclose = function(evt) {
    };
    websock.onerror = function(evt) {
        console.log(evt);
    };
    websock.onmessage = function(evt) {
        var obj = JSON.parse(evt.data);
        if (obj.command === "piccscan") {
            listSCAN(obj);
        } else if (obj.command === "picclist") {
            var node = document.getElementById("tablebody");
            while (node.hasChildNodes()) {
                node.removeChild(node.lastChild);
            }
            document.getElementById("loading-img").style.display = "none";
            listknownPICC(obj);
            sortTable(1);
            addRowHandlers();
        }
    };
}