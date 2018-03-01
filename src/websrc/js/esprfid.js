var websock = null;
var wsUri = "ws://" + window.location.hostname + "/ws";
var timezone;
var userdata = [];
var config =  {
  "command": "configfile",
  "network": {
    "bssid": "",
    "ssid": "",
    "wmode": "",
    "pswd": "",
    "offtime": ""
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
    "pswd": "admin"
  },
  "mqtt": {
    "host": "",
    "port": "",
    "topic": "",
    "user": "",
    "pswd": ""
  },
  "ntp": {
    "ntpserver": "pool.ntp.org",
    "ntpinterval": "30",
    "timezone": "0"
  }
};

var page = 1;
var haspages;
var logdata;   


function listhardware() {
  $('#dismiss').click();
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

function handleReader() {
  if (document.getElementById("readerType").value === "0") {
      document.getElementById("wiegandForm").style.display = "none";
      document.getElementById("mfrc522Form").style.display = "block";
  }
  else if (document.getElementById("readerType").value === "1") {
    document.getElementById("wiegandForm").style.display = "block";
    document.getElementById("mfrc522Form").style.display = "none";
  }
}

function listlog() {

  websock.send("{\"command\":\"latestlog\"}");
}

function savehardware() {
  config.hardware.readerType = document.getElementById("readerType").value
  config.hardware.wgd0pin = document.getElementById("wg0pin").value;
  config.hardware.wgd1pin = document.getElementById("wg1pin").value;
  config.hardware.sspin = document.getElementById("gpioss").value;
  config.hardware.rfidgain = document.getElementById("gain").value;
  config.hardware.rtype = document.getElementById("typerly").value;
  config.hardware.rpin = document.getElementById("gpiorly").value;
  config.hardware.rtime = document.getElementById("delay").value;
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

function revcommit(){
  document.getElementById("jsonholder").innerText = JSON.stringify(config, null, 2);
  $('#revcommit').modal('show');
}

function commit(){
  websock.send(JSON.stringify(config));
  location.reload();
}

function uncommited() {
    $('#commit').fadeOut(200, function(){
    $(this).css('background', 'gold').fadeIn(1000);
});
    document.getElementById("commit").innerHTML = "<h6>You have uncommited changes, please click here to commit and reboot (you will a have chance to review changes).</h6>"
    $('#commit').click(function(){ revcommit(); return false; });
}

function listnetwork() {
  $('#dismiss').click();
  document.getElementById("inputtohide").value = config.network.ssid;
   document.getElementById("wifipass").value = config.network.pswd;
     if (config.network.wmode === "1") {
    
    handleAP()
  } else {
    document.getElementById("wmodesta").checked = true;
    document.getElementById("wifibssid").value = config.network.bssid;
    handleSTA();
  }
  document.getElementById("disable_wifi_after_seconds").value = config.network.offtime;

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

function listSCAN(obj) {
  if (obj.known === 1) {
    $(".fooicon-remove").click();
    document.querySelector('input.form-control[type=text]').value = obj.uid;
    $(".fooicon-search").click();
  } else {
    $(".footable-add").click();
    document.getElementById("uid").value = obj.uid;
    document.getElementById("picctype").value = obj.type;
    document.getElementById("username").value = obj.user;
    document.getElementById("acctype").value = obj.acctype;
  }
}

function getnextpage() {
  document.getElementById("loadpages").innerHTML = "Loading " + page + "/" + haspages;
  if (page < haspages) {
    page = page + 1;
    var commandtosend = {};
    commandtosend.command = "userlist";
    commandtosend.page = page;
    websock.send(JSON.stringify(commandtosend));
  }
}

function builduserdata(obj) {
  userdata = userdata.concat(obj.list);
}


function testRelay() {
  websock.send("{\"command\":\"testrelay\"}");
} 


function getUsershtm() {
    page = 1;
  userdata = [];
          $("#ajaxcontent").load("users.htm", function(responseTxt, statusTxt, xhr){
            if(statusTxt == "success") getUsers(); 
        });
}

function getloghtm() {
          $("#ajaxcontent").load("log.htm", function(responseTxt, statusTxt, xhr){
            if(statusTxt == "success") listlog(); 
        });
}

function getnetworkhtm() {
          $("#ajaxcontent").load("network.htm", function(responseTxt, statusTxt, xhr){
            if(statusTxt == "success") listnetwork(); 
        });
}

function gethardwarehtm() {
          $("#ajaxcontent").load("hardware.htm", function(responseTxt, statusTxt, xhr){
            if(statusTxt == "success") listhardware(); 
        });
}

function initLogTable() {
  $('#dismiss').click();
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
          },
          {
            "name": "acctype",
            "title": "Access",
            "breakpoints": "xs sm",
            "parser": function(value) {
            if (value == 1) {
              return "Granted";
            } else if (value == 99) {
              return "GrantedAdmin";
            } else if (value == 0) {
              return "Disabled";
            } else {
            return "Unknown";
              }
            }
          }
        ],
        rows: logdata
      });
  });
}

function initUserTable() {
  $('#dismiss').click();
  jQuery(function($) {
    var $modal = $('#editor-modal'),
      $editor = $('#editor'),
      $editorTitle = $('#editor-title'),
      ft = FooTable.init('#usertable', {
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
              } else if (value===99) {
                return "Admin";
              } else {
                return "Disabled";
              }
            },
          },
          {
            "name": "validuntil",
            "title": "Valid Until",
            "breakpoints": "xs sm",
              "parser": function(value) {
                  var vuepoch = new Date(value * 1000);
                  var formatted = vuepoch.getFullYear()
                        + '-' + twoDigits(vuepoch.getMonth() + 1) 
                        + '-' + twoDigits(vuepoch.getDate());
                  return formatted;
            },
          }
        ],
        rows: userdata,
        editing: {
      showText: "<span class=\"fooicon fooicon-pencil\" aria-hidden=\"true\"></span> Edit Users",
      addText: "New User",
          addRow: function() {
            $editor[0].reset();
            $editorTitle.text('Add a new User');
            $modal.modal('show');
          },
          editRow: function(row) {
            var acctypefinder;
            var values = row.val();
            if (values.acctype === "Active") {
    acctypefinder = 1;
  }
  else if (values.acctype === "Admin") {
    acctypefinder = 99;
  }
  else if (values.acctype === "Disabled"){
    acctypefinder = 0;
  }
            $editor.find('#uid').val(values.uid);
            $editor.find('#username').val(values.username);
            $editor.find('#acctype').val(acctypefinder);
            $editor.find('#validuntil').val(values.validuntil);
            $modal.data('row', row);
            $editorTitle.text('Edit User # ' + values.username);
            $modal.modal('show');
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
    $editor.on('submit', function(e) {
      if (this.checkValidity && !this.checkValidity()) return;
      e.preventDefault();
      var row = $modal.data('row'),
        values = {
          uid: $editor.find('#uid').val(),
          username: $editor.find('#username').val(),
          acctype: acctypeparser(),
          validuntil: $editor.find('#validuntil').val()
        };
      if (row instanceof FooTable.Row) {
        row.val(values);
      } else {
        values.id = uid++;
        ft.rows.add(values);
      }
      var datatosend = {};
      datatosend.command = "userfile";
      datatosend.uid = $editor.find('#uid').val();
      datatosend.user = $editor.find('#username').val();
      datatosend.acctype = $editor.find('#acctype').val();
      var validuntil = $editor.find('#validuntil').val();
      var vuepoch = (new Date(validuntil).getTime() / 1000) + (timezone * 60 * 60);
      datatosend.validuntil = vuepoch;
      websock.send(JSON.stringify(datatosend));


      $modal.modal('hide');
    });
  });
}

function acctypefinder() {
  if (values.acctype === "Active") {
    return 1;
  }
  else if (values.acctype === "Admin"){
    return 99;
  }
  else {
    return 0;
  }
}

function acctypeparser(){
  var $editor = $('#editor');
  if($editor.find('#acctype option:selected').val() == 1){
    return "Active";
  } else if ($editor.find('#acctype option:selected').val() == 99) {
    return "Admin";
  } else {
    return "Disabled";
  }
}

function twoDigits(value) {
   if(value < 10) {
    return '0' + value;
   }
   return value;
}


function colorStatusbar(ref) {
  var percentage = ref.style.width.slice(0, -1);
  if (percentage > 50) ref.className = "progress-bar progress-bar-success";
  else if (percentage > 25) ref.className = "progress-bar progress-bar-warning";
  else ref.class = "progress-bar progress-bar-danger";
}
           
function listStats() {
  document.getElementById("chip").innerHTML = ajaxobj.chipid;
  document.getElementById("cpu").innerHTML = ajaxobj.cpu + " Mhz";
  document.getElementById("uptime").innerHTML = ajaxobj.uptime;
  document.getElementById("heap").innerHTML = ajaxobj.heap + " Bytes";
  document.getElementById("heap").style.width = (ajaxobj.heap * 100) / 81920 + "%";
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
  websock.send("{\"command\":\"getconf\"}");
}



function start() {
  if (window.location.protocol === "https:") {
    wsUri = "wss://" + window.location.hostname + "/ws";
  }
  else if (window.location.protocol === "file:") {
    wsUri = "ws://" + "localhost" + "/ws";
  }
  websock = new WebSocket(wsUri);
  websock.addEventListener('message', socketMessageListener);
  websock.addEventListener('error', socketErrorListener);
  websock.addEventListener('close', socketCloseListener);

  websock.onopen = function(evt) {
    websock.send("{\"command\":\"status\"}");
  };
}

function socketMessageListener(evt) {
  var obj = JSON.parse(evt.data);
  switch (obj.command) {
    case "status":
        $('#dismiss').click();
        ajaxobj = obj;
        $("#ajaxcontent").load("status.htm", function(responseTxt, statusTxt, xhr){
            if(statusTxt == "success") listStats();
        });
        break;
    case "userlist":
        haspages = obj.haspages;
        if (haspages === 0) {
      document.getElementById("loading-img").style.display = "none";
      initUserTable();
      $(".footable-show").click();
      $(".fooicon-remove").click();
      break;
    }
    builduserdata(obj);
    break;
    case "gettime":
    timezone = obj.timezone;
    break;
    case "piccscan":
     listSCAN(obj);
     break;
    case "latestlog":
    logdata = obj.list;
    initLogTable();
    document.getElementById("loading-img").style.display = "none";
    break;
    case "ssidlist":
    listSSID(obj);
    break;
    case "configfile":
    config = obj;
    break;
    default:
        console.log("[ WARN ] Unknown command ");
        break;
  }

    switch (obj.resultof) {
    case "latestlog":
    if (obj.result === false) {
      $('#dismiss').click();
      logdata = [];
    initLogTable();
    document.getElementById("loading-img").style.display = "none";
    }
    break;
    case "userlist":
    if (page < haspages && obj.result === true) {
        getnextpage();
      } else if (page === haspages) {
        initUserTable();
        document.getElementById("loading-img").style.display = "none";
        
        $(".footable-show").click();
        $(".fooicon-remove").click();

    websock.send("{\"command\":\"gettime\"}");
      }
      break;


        default:
        console.log("[ WARN ] Unknown type ");
        break;
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


$(document).ready(function(){

                $('#dismiss, .overlay').on('click', function () {
                    $('#sidebar').removeClass('active');
                    $('.overlay').fadeOut();
                });

                $('#sidebarCollapse').on('click', function () {
                    $('#sidebar').addClass('active');
                    $('.overlay').fadeIn();
                    $('.collapse.in').toggleClass('in');
                    $('a[aria-expanded=true]').attr('aria-expanded', 'false');
                });
                $('#status').click(function(){ websock.send("{\"command\":\"status\"}"); return false; });
                $('#network').click(function(){ getnetworkhtm(); return false; });
                $('#hardware').click(function(){ gethardwarehtm(); return false; });
                $('#users').click(function(){ getUsershtm(); return false; });
                $('#latestlog').click(function(){ getloghtm(); return false; });
                

                $('.noimp').on('click', function () {
                    $('#noimp').modal('show');
                });

                $( document ).ajaxComplete(function() {
    $('[data-toggle="popover"]').popover({
    container: 'body'
}); 
});

                FooTable.MyFiltering = FooTable.Filtering.extend({
  construct: function(instance) {
    this._super(instance);
    this.acctypes = ['1', '99', '0'];
    this.acctypesstr = ['Active', 'Admin', 'Disabled'];
    this.def = 'Access Type';
    this.$acctype = null;
  },
  $create: function() {
    this._super();
    var self = this,
      $form_grp = $('<div/>', {
        'class': 'form-group'
      })
      .append($('<label/>', {
        'class': 'sr-only',
        text: 'Status'
      }))
      .prependTo(self.$form);

    self.$acctype = $('<select/>', {
        'class': 'form-control'
      })
      .on('change', {
        self: self
      }, self._onStatusDropdownChanged)
      .append($('<option/>', {
        text: self.def
      }))
      .appendTo($form_grp);

    $.each(self.acctypes, function(i, acctype) {
      self.$acctype.append($('<option/>').text(self.acctypesstr[i]).val(self.acctypes[i]));
    });
  },
  _onStatusDropdownChanged: function(e) {
    var self = e.data.self,
      selected = $(this).val();
    if (selected !== self.def) {
      self.addFilter('acctype', selected, ['acctype']);
    } else {
      self.removeFilter('acctype');
    }
    self.filter();
  },
  draw: function() {
    this._super();
    var acctype = this.find('acctype');
    if (acctype instanceof FooTable.Filter) {
      this.$acctype.val(acctype.query.val());
    } else {
      this.$acctype.val(this.def);
    }
  }
});
                });