var websock = null;
var timezone;
var userdata = [];
var page = 1;
var haspages;
var wsUri = "ws://" + window.location.hostname + "/ws";

NProgress.start();

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

function initTable() {
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

function start() {
  if (window.location.protocol === "https:") {
    wsUri = "wss://" + window.location.hostname + "/ws";
  }
  else if (window.location.protocol === "file:") {
	wsUri = "ws://" + "localhost" + "/ws";
  }   
  websock = new WebSocket(wsUri);
  websock.addEventListener('message', socketMessageListener);
  websock.addEventListener('close', socketCloseListener);
  websock.addEventListener('error', socketErrorListener);
  websock.onopen = function(evt) {
    var commandtosend = {};
    websock.send("{\"command\":\"userlist\", \"page\":" + page + "}");
  };
}

function socketMessageListener(evt) {
  var obj = JSON.parse(evt.data);
  if (obj.command === "piccscan") {
    listSCAN(obj);
  } else if (obj.command === "gettime") {
    timezone = obj.timezone;
  } else if (obj.command === "userlist") {
    haspages = obj.haspages;
    if (haspages === 0) {
      document.getElementById("loading-img").style.display = "none";
      initTable();
      $(".footable-show").click();
      $(".fooicon-remove").click();
    }
    builduserdata(obj);
  } else if (obj.command === "result") {
    if (obj.resultof === "userlist") {
      if (page < haspages && obj.result === true) {
        getnextpage();
      } else if (page === haspages) {
        initTable();
        document.getElementById("loading-img").style.display = "none";
		NProgress.done();
        $(".footable-show").click();
        $(".fooicon-remove").click();
		websock.send("{\"command\":\"gettime\"}");
      }
    }
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
