var websock = null;
var wsUri = "ws://" + window.location.hostname + "/ws";
var timezone;
var userdata = [];
var page = 1;
var haspages;
var logdata;    

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
                $('#users').click(function(){ getUsershtm(); return false; });
                $('#latestlog').click(function(){ getloghtm(); return false; });
                

                $('.noimp').on('click', function () {
                    $('#noimp').modal('show');
                });

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
function listlog() {

  websock.send("{\"command\":\"latestlog\"}");
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
    case "result":
        if (obj.resultof === "userlist") {
      if (page < haspages && obj.result === true) {
        getnextpage();
      } else if (page === haspages) {
        initUserTable();
        document.getElementById("loading-img").style.display = "none";
        
        $(".footable-show").click();
        $(".fooicon-remove").click();

    websock.send("{\"command\":\"gettime\"}");
      }
    }
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
    default:
        console.log("[ WARN ] Unknown command ");
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