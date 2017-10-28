var websock = null;
var timezone;
var devicetime;
var userdata = {};

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
        rows: userdata
      });
  });
}

function start() {
  websock = new WebSocket("ws://" + window.location.hostname + "/ws");
  websock.onopen = function(evt) {
    var commandtosend = {};
    commandtosend.command = "latestlog";
    websock.send(JSON.stringify(commandtosend));
    commandtosend = {};
    commandtosend.command = "gettime";
    websock.send(JSON.stringify(commandtosend));
  };
  websock.onclose = function(evt) {};
  websock.onerror = function(evt) {
    console.log(evt);
  };
  websock.onmessage = function(evt) {
    var obj = JSON.parse(evt.data);
    if (obj.type === "latestlog") {
      userdata = obj.list;
      initTable();
      document.getElementById("loading-img").style.display = "none";
    } else if (obj.command === "gettime") {
      timezone = obj.timezone;
      devicetime = obj.epoch;
    }
  };
}