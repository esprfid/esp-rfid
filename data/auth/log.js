var websock = null;
var logdata;
var wsUri;

function twoDigits(value) {
   if(value < 10) {
    return "0" + value;
   }
   return value;
}

function initTable() {
  jQuery(function($) {
    FooTable.init("#latestlogtable", {
        columns: [
            {
            "name": "timestamp",
            "title": "Date",
            "parser": function(value) {
              var vuepoch = new Date(value * 1000);
              var formatted = vuepoch.getUTCFullYear()
                  + "-" + twoDigits(vuepoch.getUTCMonth() + 1) 
                  + "-" + twoDigits(vuepoch.getUTCDate())
                  + "-" + twoDigits(vuepoch.getUTCHours())
                  + ":" + twoDigits(vuepoch.getUTCMinutes())
                  + ":" + twoDigits(vuepoch.getUTCSeconds());
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
          }
        ],
        rows: logdata
      });
  });
}

function start() {
  var protocol = "ws://"; 
  if (window.location.protocol === "https:") {
    protocol = "wss://";
  }
  wsUri =protocol+ window.location.hostname + "/ws"; 
  websock = new WebSocket(wsUri);
  websock.addEventListener('message', socketMessageListener);
  websock.addEventListener('close', socketCloseListener);
  websock.addEventListener('error', socketErrorListener);
  websock.onopen = function(evt) {
    var commandtosend = {};
    commandtosend.command = "latestlog";
    websock.send(JSON.stringify(commandtosend));
    commandtosend = {};
    commandtosend.command = "gettime";
    websock.send(JSON.stringify(commandtosend));
  };
}

function socketMessageListener(evt) {
  var obj = JSON.parse(evt.data);
  if (obj.type === "latestlog") {
    logdata = obj.list;
    initTable();
    document.getElementById("loading-img").style.display = "none";
  }
}

function socketCloseListener(evt) {
    console.log('socket closed');
    websock = new WebSocket(wsUri);
    websock.addEventListener('message', socketMessageListener);
    websock.addEventListener('close', socketCloseListener);
    websock.addEventListener('error', socketErrorListener);
}

function socketErrorListener(evt) {
    console.log('socket error');
    console.log(evt);
}