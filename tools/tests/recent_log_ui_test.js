const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const source = fs.readFileSync(require('path').join(__dirname, '../../src/websrc/js/esprfid.js'), 'utf8');
const elements = {};
let tables = 0, errors = 0, download;
const context = {
  theCurrentLogFile: '/latestlog.json', recentLogRequest: null,
  recentLogRequestId: 0, recentLogBatch: [], recentLogKind: 'latest',
  logOlderBefore: 0, data: [], websocketMessagesToRetry: [],
  document: {getElementById: id => elements[id] || (elements[id] = {style: {}})},
  FooTable: {get: () => null},
  initLatestLogTable: () => tables++, initEventTable: () => tables++,
  alert: () => errors++, saveLogfile: (...args) => download = args
};
context.sendWebsocketWithRetry = message => context.websocketMessagesToRetry.push({message});
vm.createContext(context);
['requestRecentLogPage', 'getRecentLogs', 'loadOlderLogs', 'receiveRecentLog', 'downloadEntireLog'].forEach(name => {
  const begin = source.indexOf('function ' + name + '(');
  const end = source.indexOf('\nfunction ', begin + 1);
  vm.runInContext(source.slice(begin, end), context);
});
context.getRecentLogs('latest');
const firstId = context.recentLogRequest.requestid;
const receive = overrides => context.receiveRecentLog(Object.assign({
  requestid: context.recentLogRequest.requestid, result: true,
  list: ['record'], start: 300, nextoffset: 400, end: 500, more: false
}, overrides));
receive({more: true});
assert.equal(tables, 0);
assert.equal(context.recentLogRequest.offset, 400);
context.receiveRecentLog({requestid: firstId, list:['duplicate']});
assert.equal(context.recentLogBatch.length, 1);
receive({nextoffset: 500});
assert.equal(tables, 1);
assert.equal(context.data.length, 2);
assert.equal(context.logOlderBefore, 300);
assert.equal(elements.olderlatestlogbtn.disabled, false);
context.loadOlderLogs('latest');
assert.equal(context.recentLogRequest.end, 300);
receive({start:0, end:300});
assert.equal(context.data.length, 3);
assert.equal(elements.olderlatestlogbtn.disabled, true);
context.getRecentLogs('event');
receive({list:[], start:0, end:0, nextoffset:0});
assert.equal(elements.oldereventlogbtn.disabled, true);
context.getRecentLogs('event');
receive({result:false});
assert.equal(errors, 1);
assert.equal(elements['loading-img'].style.display, 'none');
context.$ = {ajax: options => {
  assert.equal(options.url, '/logdata');
  const chain = {
    done: callback => { callback('old\nnew\n'); return chain; },
    fail: () => chain, always: callback => { callback(); return chain; }
  };
  return chain;
}};
context.downloadEntireLog('latest');
assert.equal(download[0].type, 'esp-rfid-accesslog');
assert.deepEqual(Array.from(download[0].list), ['old','new']);
assert.equal(elements.savelatestlogbtn.disabled, false);
console.log('PASS: recent/older pages, duplicate responses, empty/error logs and full export');
