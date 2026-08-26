// ROBO4 module web UI — served from PROGMEM at http://<host>.local/
// Vanilla JS only (no CDN): the browser may have no internet path when talking to the board.
#pragma once

static const char WEBUI_HTML[] PROGMEM = R"WEBUI(<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>ROBO4 module</title>
<style>
:root{--bg:#f6f8fa;--pan:#ffffff;--ln:#d0d7de;--fg:#1f2328;--dim:#656d76;--ok:#1a7f37;--bad:#cf222e;--warn:#9a6700;--acc:#0969da}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg);font:13px/1.45 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
header{display:flex;gap:12px;align-items:center;flex-wrap:wrap;padding:10px 14px;background:var(--pan);border-bottom:1px solid var(--ln);position:sticky;top:0;z-index:9}
header b{font-size:15px;letter-spacing:.5px}
.pill{padding:2px 8px;border:1px solid var(--ln);border-radius:99px;color:var(--dim)}
.pill.on{color:var(--ok);border-color:var(--ok)}.pill.off{color:var(--bad);border-color:var(--bad)}
.pill.ver{background:var(--acc);border-color:var(--acc);color:#fff;font-weight:700;font-size:14px;letter-spacing:.5px;padding:3px 12px}
nav{display:flex;gap:2px;flex-wrap:wrap;padding:8px 10px;background:var(--pan);border-bottom:1px solid var(--ln)}
nav button{background:none;border:1px solid transparent;color:var(--dim);padding:6px 12px;border-radius:6px;cursor:pointer;font:inherit}
nav button.sel{color:var(--fg);background:var(--pan);border-color:var(--ln);box-shadow:0 1px 0 var(--ln)}
main{padding:14px;max-width:1200px}
section{display:none}section.sel{display:block}
.card{background:var(--pan);border:1px solid var(--ln);border-radius:8px;padding:12px;margin-bottom:14px;box-shadow:0 1px 2px rgba(31,35,40,.06)}
.card h3{margin:0 0 10px;font-size:12px;text-transform:uppercase;letter-spacing:1px;color:var(--dim)}
.wrap{overflow-x:auto}
table{border-collapse:collapse;width:100%;min-width:740px}
th,td{padding:5px 7px;border-bottom:1px solid var(--ln);text-align:right;white-space:nowrap}
th{color:var(--dim);font-weight:400;font-size:11px}
th.l,td.l{text-align:left}
button{background:#f6f8fa;border:1px solid var(--ln);color:var(--fg);padding:4px 9px;border-radius:6px;cursor:pointer;font:inherit}
button:hover{border-color:var(--acc)}
button.p{background:var(--acc);border-color:var(--acc);color:#ffffff;font-weight:600}
button.d{border-color:var(--bad);color:var(--bad)}
input,select{background:var(--pan);border:1px solid var(--ln);color:var(--fg);padding:4px 6px;border-radius:6px;font:inherit}
input[type=range]{padding:0;width:150px;vertical-align:middle}
/* One chip per candidate id, so the sweep is watchable instead of a spinner. */
.sgrid{display:flex;flex-wrap:wrap;gap:4px;margin:10px 0}
.sgrid .c{min-width:30px;text-align:center;padding:3px 6px;border:1px solid var(--ln);border-radius:5px;
  font-size:11px;color:var(--dim);background:var(--pan)}
.sgrid .c.now{border-color:var(--acc);color:var(--acc);font-weight:700}
.sgrid .c.chk{opacity:.45}
.sgrid .c.hit{border-color:var(--ok);color:#fff;background:var(--ok);font-weight:700;opacity:1}
input[type=number]{width:78px}
.row{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:8px}
label{color:var(--dim)}
pre{background:#f6f8fa;border:1px solid var(--ln);border-radius:6px;padding:10px;max-height:340px;overflow:auto;margin:0;font-size:12px;white-space:pre-wrap}
.bar{height:8px;background:#eaeef2;border:1px solid var(--ln);border-radius:99px;overflow:hidden;flex:1;min-width:140px}
.bar i{display:block;height:100%;width:0;background:var(--acc);transition:width .2s}
.hint{color:var(--dim);font-size:12px;margin:6px 0 0}
.danger{color:var(--warn)}
/* Post-mortem banner: what the board was doing when it last died. The only crash report
   available on a unit with no USB access, so it is deliberately hard to miss. */
.pm{border:1px solid var(--bad);background:#fff5f5;color:var(--fg);border-radius:8px;
  padding:10px 12px;margin-bottom:14px;font-size:12px;line-height:1.5}
.pm b{color:var(--bad)}
.pm code{background:#ffe9e9;padding:1px 5px;border-radius:4px}
</style></head><body>

<header>
  <b>ROBO4</b>
  <span class="pill ver" id="p-ver">v-.-.-</span>
  <span class="pill" id="p-host">...</span>
  <span class="pill" id="p-ip">...</span>
  <span class="pill" id="p-wifi">wifi</span>
  <span class="pill" id="p-rssi">-</span>
  <span class="pill" id="p-up">-</span>
  <span class="pill" id="p-fw">-</span>
  <span style="flex:1"></span>
  <button class="d" onclick="api('/api/command?servo=all&cmd=estop')">E-STOP ALL</button>
</header>

<nav id="tabs">
  <button data-t="dash" class="sel">Dashboard</button>
  <button data-t="tools">Servo tools</button>
  <button data-t="mag">Magnets</button>
  <button data-t="cfg">Config</button>
  <button data-t="wifi">Wi-Fi</button>
  <button data-t="ota">OTA update</button>
  <button data-t="log">Log</button>
</nav>

<main>
<div id="pm" class="pm" style="display:none"></div>
<section id="s-dash" class="sel">
  <div class="card"><h3>Servos</h3>
    <div class="wrap"><table><thead><tr>
      <th class="l">#</th><th class="l">label</th><th>angle</th><th>target</th><th>err&deg;</th><th>set</th>
      <th>spd</th><th>load</th><th>mA</th><th>V</th><th>degC</th><th>mode</th><th class="l">actions</th>
    </tr></thead><tbody id="tb"></tbody></table></div>
    <div class="row" style="margin-top:10px">
      <label>speed 1-10</label><input type="number" id="g-spd" value="5" min="1" max="10">
      <label>acc 1-100</label><input type="number" id="g-acc" value="20" min="1" max="100">
      <button class="p" onclick="sendAll()">Send all sliders (sync)</button>
      <button class="p" onclick="api('/api/torque?on=1')">Turn torque ON (hold, no move)</button>
      <button onclick="api('/api/torque?on=0')">Torque OFF (limp)</button>
      <button onclick="api('/api/home')">Home all &rarr; 180&deg;</button>
      <button onclick="api('/api/servo/tune',1)" title="Re-write deadband / Kp / Kd / Ki / torque limit">Re-tune hold</button>
      <span class="hint" id="torqhint"></span>
    </div>
  </div>
</section>

<section id="s-tools">
  <div class="card"><h3>Bus scan - find which IDs exist</h3>
    <div class="row">
      <label>ID from</label><input type="number" id="sf" value="1" min="1" max="253">
      <label>to</label><input type="number" id="stt" value="20" min="1" max="253">
      <label><input type="checkbox" id="sb"> also sweep every baud rate</label>
      <button class="p" onclick="startScan()">Scan</button>
      <button onclick="stopPoll=1">stop watching</button>
      <span id="sstat" class="hint"></span>
    </div>
    <div id="sgrid" class="sgrid"></div>
    <div id="sadopt" class="hint"></div>
    <div class="wrap"><table><thead><tr><th class="l">ID</th><th>baud</th><th>raw pos</th><th>angle</th><th>volt</th><th>degC</th><th>mode</th><th class="l"></th></tr></thead><tbody id="sres"></tbody></table></div>
    <p class="hint">The servos found here <b>become</b> the controlled set: sliders on the Dashboard are
    rebuilt from them and the list is saved, so a reboot keeps it and only a rescan changes it.
    Torque stays OFF afterwards &mdash; discovering a servo never energises it. Scanning pauses
    telemetry and restores the working baud when it finishes.</p>
  </div>
  <div class="card"><h3>Change a servo ID</h3>
    <div class="row">
      <label>current ID</label><input type="number" id="idf" value="1" min="1" max="253">
      <label>new ID</label><input type="number" id="idt" value="2" min="1" max="253">
      <button class="p" onclick="setId()">Write ID</button>
    </div>
    <p class="hint danger">Only ONE servo may be on the bus while writing an ID - every servo answering the old ID takes the new one. EPROM is unlocked, written, verified, re-locked.</p>
  </div>
  <div class="card"><h3>Change a servo baud rate</h3>
    <div class="row">
      <label>ID</label><input type="number" id="bid" value="1" min="1" max="253">
      <label>baud</label><select id="bsel">
        <option value="0">1000000</option><option value="1">500000</option><option value="2">250000</option>
        <option value="3">128000</option><option value="4">115200</option><option value="5">76800</option>
        <option value="6">57600</option><option value="7">38400</option></select>
      <button class="p" onclick="api('/api/servo/setbaud?id='+v('bid')+'&idx='+v('bsel'),1)">Write baud</button>
    </div>
    <p class="hint">After this the servo answers at the new baud only - set the bus baud in Config to match.</p>
  </div>
  <div class="card"><h3>Zero / offset calibration</h3>
    <div class="row">
      <label>ID</label><input type="number" id="cid" value="1" min="1" max="253">
      <button onclick="api('/api/servo/center?id='+v('cid'),1)">Set current position = centre (2048)</button>
      <label>raw offset</label><input type="number" id="cofs" value="0">
      <button onclick="api('/api/servo/ofs?id='+v('cid')+'&val='+v('cofs'),1)">Write offset</button>
    </div>
  </div>
  <div class="card"><h3>Raw register peek / poke</h3>
    <div class="row">
      <label>ID</label><input type="number" id="rid" value="1">
      <label>addr</label><input type="number" id="radr" value="56">
      <label>width</label><select id="rw"><option value="1">byte</option><option value="2" selected>word</option></select>
      <button onclick="api('/api/servo/read?id='+v('rid')+'&addr='+v('radr')+'&len='+v('rw'),1)">Read</button>
      <label>value</label><input type="number" id="rval" value="0">
      <label><input type="checkbox" id="runlock"> unlock EPROM</label>
      <button class="d" onclick="api('/api/servo/write?id='+v('rid')+'&addr='+v('radr')+'&len='+v('rw')+'&val='+v('rval')+'&unlock='+(el('runlock').checked?1:0),1)">Write</button>
    </div>
    <pre id="rout">-</pre>
    <p class="hint">ST3215 map: 5=ID 6=baud 9/10=min-angle 11/12=max-angle 31/32=offset 33=mode 40=torque-en 55=lock 56/57=position 60/61=speed 62/63=load 69=volt 63=temp. Any test expressible as a register write no longer needs a re-flash.</p>
  </div>
</section>

<section id="s-mag">
  <div class="card"><h3>Electromagnets (DRV8833)</h3><div id="mags"></div>
    <div class="row"><button class="d" onclick="api('/api/magnet?all=1&pct=0')">Release all</button></div>
    <p class="hint">Firmware safety net: anything above the safe-hold % is tapered back down if the master goes silent.</p>
  </div>
</section>

<section id="s-cfg">
  <div class="card"><h3>Module identity and bus</h3>
    <div class="row"><label>mDNS host</label><input id="c-host" size="12"><span class="hint">reachable as &lt;host&gt;.local</span></div>
    <div class="row"><label>servo bus baud</label><input type="number" id="c-baud" style="width:110px">
      <label>magnet safe hold %</label><input type="number" id="c-hold" min="0" max="100"></div>
  </div>
  <div class="card"><h3>Servo table - IDs, labels, limits</h3>
    <div class="wrap"><table><thead><tr><th class="l">slot</th><th>ID</th><th class="l">label</th><th>min deg</th><th>max deg</th><th></th></tr></thead><tbody id="cfgtb"></tbody></table></div>
    <div class="row" style="margin-top:8px"><button onclick="addRow()">+ add servo</button>
      <button class="p" onclick="saveCfg()">Save config (persists in NVS)</button>
      <button onclick="api('/api/reboot')">Reboot</button></div>
    <p class="hint">Saved to flash, so IDs / labels / limits / hostname change without re-flashing. One identical binary runs on every module.</p>
  </div>
</section>

<section id="s-wifi">
  <div class="card"><h3>Saved networks (tried in order, forever)</h3><div id="wnets"></div>
    <p class="hint">Reconnect is event-driven with escalating backoff and never blocks the HTTP server. After a long outage the board raises its own AP <b id="apname">ROBO4-...</b> (password <b>robo4robo4</b>) so you can always reach this page and fix credentials - no USB cable.</p>
  </div>
  <div class="card"><h3>Nearby networks</h3>
    <div class="row"><button onclick="wscan()">Scan</button><span id="wstat" class="hint"></span></div>
    <div id="wlist"></div>
  </div>
</section>

<section id="s-ota">
  <div class="card"><h3>Push a new .bin from this browser</h3>
    <p id="otabanner" class="hint">checking OTA partition...</p>
    <div class="row"><input type="file" id="fw" accept=".bin"><button class="p" onclick="upload()">Upload and reboot</button></div>
    <div class="row"><div class="bar"><i id="obar"></i></div><span id="ostat" class="hint">idle</span></div>
    <p class="hint">Arduino IDE: Sketch -> Export Compiled Binary, then drop the .ino.bin here. Servos are de-torqued and magnets released before the write starts.</p>
  </div>
  <div class="card"><h3>Pull from a URL (flash many modules at once)</h3>
    <div class="row"><input id="ourl" size="46" placeholder="http://192.168.1.20:8000/firmware.bin"><button class="p" onclick="pullOta()">Fetch and flash</button></div>
    <div class="row"><span id="pstat" class="hint">idle</span></div>
    <p class="hint">Serve the .bin from your laptop (python -m http.server 8000) and hit this on mod1, mod2, mod3... See tools/flash-all.ps1.</p>
  </div>
  <div class="card"><h3>Arduino IDE over the air</h3>
    <p class="hint">ArduinoOTA also runs: Tools -> Port -> network port <b id="otahost">mod1</b>, upload password <b>robo4ota</b>. Same Upload button, no cable.</p>
  </div>
</section>

<section id="s-log">
  <div class="card"><h3>Device log</h3><div class="row"><button onclick="loadLog()">Refresh</button>
    <label><input type="checkbox" id="lauto" checked> auto</label></div><pre id="logp">-</pre></div>
</section>
</main>

<script>
const el=id=>document.getElementById(id);
const v=id=>el(id).value;
let paused=false, tel=null;

function api(u,show){return fetch(u).then(r=>r.json()).then(d=>{if(show)out(d);return d})
  .catch(e=>{out({ok:false,error:''+e})})}
function out(d){const p=el('rout');if(p)p.textContent=JSON.stringify(d,null,1);}

/* Named rather than inline so code can switch tabs too — the scan jumps back to the
   Dashboard once it has adopted the servos it found. */
function showTab(t){
  [...el('tabs').children].forEach(b=>b.classList.toggle('sel',b.dataset.t===t));
  document.querySelectorAll('main section').forEach(s=>s.classList.toggle('sel',s.id==='s-'+t));
  if(t==='log')loadLog(); if(t==='cfg')fillCfg(); if(t==='wifi')fillWifi();
}
el('tabs').onclick=e=>{const t=e.target.dataset.t;if(!t)return;showTab(t);};

/* ---------- dashboard ---------- */
/* Show WHY the board last restarted and what it was mid-way through. A normal power-on or
   a press of the reset button is not news; a panic, a watchdog or a brownout is. */
let pmShown=0;
function postMortem(d){
  if(pmShown||!d.resetWhy)return;
  pmShown=1;
  const benign=(d.resetWhy==='power-on'||d.resetWhy==='external reset pin'||d.resetWhy==='software restart');
  if(benign&&!d.lastCrumb)return;
  const box=el('pm');
  box.innerHTML='<b>Last restart: '+d.resetWhy+'</b>'+
    (d.lastCrumb?('<br>It was in the middle of: <code>'+d.lastCrumb+'</code> at '+
                  (d.lastCrumbMs/1000).toFixed(1)+'s uptime.'):'<br>No breadcrumb was recorded.')+
    '<br><span style="color:var(--dim)">BROWNOUT means the power supply sagged (servos energising all at once). '+
    'WATCHDOG means something blocked too long. PANIC means a crash. They need different fixes.</span>'+
    ' <button onclick="pmHide()">dismiss</button>';
  box.style.display='block';
}
function pmHide(){el('pm').style.display='none';}
function rows(d){
  const tb=el('tb');
  const sig=d.servos.map(s=>s.id+s.label).join(',');
  if(tb.dataset.sig!==sig){tb.dataset.sig=sig;tb.innerHTML='';
    d.servos.forEach(s=>{const tr=document.createElement('tr');tr.id='r'+s.id;
      tr.innerHTML='<td class="l">'+s.id+'</td><td class="l">'+s.label+'</td><td class="a">-</td><td class="t">-</td><td class="er">-</td>'+
      '<td><input type="range" min="'+s.min+'" max="'+s.max+'" step="0.5" value="180" id="sl'+s.id+'" onchange="mv('+s.id+')">'+
      '<span id="lv'+s.id+'" style="color:var(--dim)"></span> '+
      '<button title="home this servo to 180" style="padding:2px 6px" onclick="homeOne('+s.id+')">&#8962;</button></td>'+
      '<td class="sp">-</td><td class="ld">-</td><td class="ma">-</td><td class="vv">-</td><td class="tp">-</td><td class="md">-</td>'+
      '<td class="l"><button class="d" onclick="api(\'/api/command?servo='+s.id+'&cmd=stop\')">stop</button> '+
      '<button onclick="api(\'/api/command?servo='+s.id+'&cmd=torquetoggle\')">torq</button> '+
      '<button onclick="api(\'/api/identify?id='+s.id+'\')">identify</button></td>';
      tb.appendChild(tr);});}
  d.servos.forEach(s=>{const r=el('r'+s.id);if(!r)return;const q=c=>r.querySelector('.'+c);
    q('a').textContent=s.currentAngle==null?'--':s.currentAngle.toFixed(1);
    q('a').style.color=s.connected?(s.moving?'var(--acc)':'var(--fg)'):'var(--bad)';
    q('t').textContent=s.targetAngle==null?'--':s.targetAngle.toFixed(1);
    // Holding error against the 0.3 deg goal. Grey while limp (a limp joint is not trying),
    // green within spec, amber drooping, red being pushed off target and not winning.
    if(s.currentAngle==null||s.targetAngle==null){q('er').textContent='--';}
    else{const e=Math.abs(s.targetAngle-s.currentAngle);
      q('er').textContent=e.toFixed(2);
      q('er').style.color=!s.torque?'var(--dim)':e<=0.3?'var(--ok)':e<=1?'var(--warn)':'var(--bad)';}
    q('sp').textContent=s.speed;q('ld').textContent=s.loadAbs;
    q('ma').textContent=s.currentmA==null?'--':s.currentmA;
    q('vv').textContent=s.voltageV==null?'--':s.voltageV;
    q('tp').textContent=s.tempC==null?'--':s.tempC;
    q('tp').style.color=s.tempC>55?'var(--bad)':s.tempC>45?'var(--warn)':'';
    q('md').textContent=s.mode+(s.torque?'':' /off');
    // While torque is OFF the joint can be moved by hand, so the slider tracks the real
    // angle. Once torque is on the slider is an INPUT and must not be yanked around under
    // the operator's cursor, so it is left alone.
    const sl=el('sl'+s.id);
    if(sl&&!s.torque&&s.currentAngle!=null&&document.activeElement!==sl){
      sl.value=s.currentAngle;el('lv'+s.id).textContent=s.currentAngle.toFixed(0);}});
  const anyTorque=d.servos.some(s=>s.torque);
  const th=el('torqhint');
  if(th)th.textContent=d.servos.length===0?'no servos — run a scan in Tools'
    :anyTorque?'':'all limp — sliders follow the arm; press Turn torque ON to hold';
}
function homeOne(id){api('/api/command?servo='+id+'&cmd=home');}
function mv(id){el('lv'+id).textContent=(+v('sl'+id)).toFixed(0);
  api('/api/command?servo='+id+'&cmd=pos&angle='+v('sl'+id)+'&speed='+v('g-spd')+'&acc='+v('g-acc'));}
function sendAll(){if(!tel)return;let q='/api/batch?speed='+v('g-spd')+'&acc='+v('g-acc');
  tel.servos.forEach(s=>{q+='&'+s.id+'='+v('sl'+s.id)});api(q);}

function mags(d){const box=el('mags');const sig='m'+d.magnets.length;
  if(box.dataset.sig!==sig){box.dataset.sig=sig;
    box.innerHTML=d.magnets.map(m=>'<div class="row"><label>ch '+m.ch+'</label>'+
      '<input type="range" min="0" max="100" value="'+m.pct+'" '+
      'oninput="el(\'mp'+m.ch+'\').textContent=this.value+\'%\';api(\'/api/magnet?ch='+m.ch+'&pct=\'+this.value)">'+
      '<span id="mp'+m.ch+'">'+m.pct+'%</span>'+
      '<button onclick="api(\'/api/magnet?ch='+m.ch+'&pct=100\')">grab 100</button>'+
      '<button onclick="api(\'/api/magnet?ch='+m.ch+'&pct=40\')">hold 40</button>'+
      '<button class="d" onclick="api(\'/api/magnet?ch='+m.ch+'&pct=0\')">release</button>'+
      '<span class="hint" id="mage'+m.ch+'"></span></div>').join('');}
  d.magnets.forEach(m=>{const e=el('mage'+m.ch);if(e)e.textContent='last cmd '+(m.ageMs/1000).toFixed(1)+'s ago';});}

async function poll(){
  if(!paused){try{
    const d=await(await fetch('/api/telemetry')).json();tel=d;
    postMortem(d);
    el('p-host').textContent=d.wifi.hostname+'.local';
    el('p-ip').textContent=d.wifi.ip;
    el('p-wifi').textContent=d.wifi.mode+' '+(d.wifi.ssid||'-');
    el('p-wifi').className='pill '+(d.wifi.connected?'on':'off');
    el('p-rssi').textContent=d.wifi.rssi+' dBm';
    el('p-up').textContent=(d.ms/1000|0)+'s up / '+d.wifi.drops+' drops';
    el('p-ver').textContent='v'+d.fw;
    const ob=el('otabanner'), sp=d.otaSpace|0;
    if(ob){ if(sp>0){ ob.textContent='OTA ready - free partition '+(sp/1048576).toFixed(2)+
        ' MB, this sketch is '+(d.sketchSize/1024|0)+' kB'; ob.style.color='var(--ok)'; }
      else { ob.textContent='NO OTA PARTITION on this board - wireless upload CANNOT work. '+
        'Re-flash over USB with Tools > Partition Scheme set to a name containing "with OTA".';
        ob.style.color='var(--bad)'; } }
    document.title='ROBO4 '+d.wifi.hostname+' v'+d.fw;
    el('p-fw').textContent=(d.heap/1024|0)+'k heap';
    rows(d);mags(d);
    if(el('lauto').checked&&el('s-log').classList.contains('sel'))loadLog();
  }catch(e){el('p-wifi').className='pill off';}}
  setTimeout(poll,paused?1000:400);
}

/* ---------- scan ---------- */
let stopPoll=0;
function startScan(){
  stopPoll=0;
  el('sres').innerHTML='';el('sadopt').textContent='';
  el('sstat').textContent='starting...';
  // Draw the whole candidate range up front so there is something to watch from frame one.
  const a=+v('sf'),b=+v('stt');let g='';
  for(let i=a;i<=b;i++)g+='<span class="c" id="sc'+i+'">'+i+'</span>';
  el('sgrid').innerHTML=g;
  api('/api/scan?from='+a+'&to='+b+'&allbaud='+(el('sb').checked?1:0)).then(()=>setTimeout(pollScan,120));
}
function pollScan(){
  if(stopPoll)return;
  fetch('/api/scan/status').then(r=>r.json()).then(d=>{
    // Everything below `at` in this pass has been probed; mark it so progress is visible even
    // though the poll only ever samples the sweep, never sees every individual id.
    for(let i=d.from;i<=d.to;i++){const c=el('sc'+i);if(!c)continue;
      c.classList.toggle('now',d.active&&i===d.at);
      if(i<d.at||!d.active)c.classList.add('chk');}
    d.found.forEach(f=>{const c=el('sc'+f.id);if(c){c.className='c hit';c.title='found @ '+f.baud;}});

    el('sstat').textContent=d.active
      ? 'checking id '+d.at+' of '+d.from+'-'+d.to+(d.passes>1?(' · baud pass '+d.pass+'/'+d.passes+' ('+d.baud+')'):'')+' · found '+d.found.length
      : 'done · '+d.found.length+' servo(s) found';

    el('sres').innerHTML=d.found.map(f=>'<tr><td class="l">'+f.id+'</td><td>'+f.baud+'</td><td>'+f.pos+'</td><td>'+
      (f.pos*360/4095).toFixed(1)+'</td><td>'+(f.volt/10)+'</td><td>'+f.temp+'</td><td>'+f.mode+'</td>'+
      '<td class="l"><button onclick="api(\'/api/identify?id='+f.id+'\')">identify</button></td></tr>').join('');

    if(d.active){setTimeout(pollScan,150);return;}
    // Finished. The board has already adopted these and left torque OFF; say so and offer the
    // jump rather than yanking the tab away while the result is still being read.
    if(d.found.length){
      el('sadopt').innerHTML='<b>'+d.found.length+' servo(s) adopted</b> — sliders rebuilt, torque left OFF. '+
        '<button class="p" onclick="poll();showTab(\'dash\')">Open Dashboard</button>';
      poll();
    } else el('sadopt').textContent='nothing found - check power, wiring and the baud rate, then rescan.';
  }).catch(e=>{el('sstat').textContent='lost contact with the board ('+e+') - retrying';
    setTimeout(pollScan,700);});
}
function setId(){if(!confirm('Only ONE servo may be connected. Write ID '+v('idf')+' -> '+v('idt')+'?'))return;
  api('/api/servo/setid?from='+v('idf')+'&to='+v('idt'),1).then(d=>alert(JSON.stringify(d)));}

/* ---------- config ---------- */
function fillCfg(){fetch('/api/config').then(r=>r.json()).then(d=>{
  el('c-host').value=d.host;el('c-baud').value=d.baud;el('c-hold').value=d.magSafeHold;
  el('cfgtb').innerHTML='';d.servos.forEach(s=>addRow(s));});}
function addRow(s){s=s||{id:1,label:'J?',min:0,max:360};const tb=el('cfgtb');
  const tr=document.createElement('tr');
  tr.innerHTML='<td class="l">'+(tb.children.length+1)+'</td>'+
   '<td><input type="number" class="ci" value="'+s.id+'" min="1" max="253"></td>'+
   '<td class="l"><input class="cl" size="10" value="'+s.label+'"></td>'+
   '<td><input type="number" class="cmin" value="'+s.min+'"></td>'+
   '<td><input type="number" class="cmax" value="'+s.max+'"></td>'+
   '<td><button class="d" onclick="this.closest(\'tr\').remove()">x</button></td>';
  tb.appendChild(tr);}
function saveCfg(){const rows=[...el('cfgtb').children].map(tr=>
   tr.querySelector('.ci').value+':'+tr.querySelector('.cl').value+':'+
   tr.querySelector('.cmin').value+':'+tr.querySelector('.cmax').value).join('|');
  api('/api/config/set?host='+encodeURIComponent(v('c-host'))+'&baud='+v('c-baud')+
      '&hold='+v('c-hold')+'&servos='+encodeURIComponent(rows),1)
   .then(d=>{alert('saved: '+JSON.stringify(d));fillCfg();});}

/* ---------- wifi ---------- */
function fillWifi(){fetch('/api/wifi').then(r=>r.json()).then(d=>{
  el('apname').textContent=d.apName;
  el('wnets').innerHTML=d.slots.map((s,i)=>'<div class="row"><label>slot '+i+'</label>'+
   '<input id="ws'+i+'" size="18" placeholder="ssid" value="'+s+'">'+
   '<input id="wp'+i+'" size="18" type="password" placeholder="password (blank = keep)">'+
   '<button class="p" onclick="saveWifi('+i+')">Save</button>'+
   '<button class="d" onclick="clearWifi('+i+')">Clear</button></div>').join('')+
   '<div class="row"><button onclick="api(\'/api/wifi/reconnect\',1)">Reconnect now</button></div>';});}
function saveWifi(i){api('/api/wifi/set?slot='+i+'&ssid='+encodeURIComponent(v('ws'+i))+
  '&pass='+encodeURIComponent(v('wp'+i)),1).then(fillWifi);}
function clearWifi(i){api('/api/wifi/set?slot='+i+'&ssid=&pass=&force=1',1).then(fillWifi);}
function wscan(){el('wstat').textContent='scanning...';
  fetch('/api/wifi/scan').then(r=>r.json()).then(d=>{el('wstat').textContent=d.nets.length+' found';
   el('wlist').innerHTML='<div class="wrap"><table><thead><tr><th class="l">ssid</th><th>rssi</th><th>ch</th><th>enc</th><th></th></tr></thead><tbody>'+
   d.nets.map(n=>'<tr><td class="l">'+n.ssid+'</td><td>'+n.rssi+'</td><td>'+n.ch+'</td><td>'+(n.open?'open':'wpa')+'</td>'+
   '<td><button onclick="pick(\''+n.ssid+'\')">use in slot 0</button></td></tr>').join('')+'</tbody></table></div>';});}
/* The "Fetch and flash" button called this and it did not exist — the handler was never
   written, so the OTA-from-URL path was dead in the UI even though /api/ota/url works.
   The board stops serving HTTP the moment the pull starts (single core, blocking write),
   so a failed fetch here is expected and is not an error worth alarming about. */
function pullOta(){
  const u=v('ourl').trim();
  if(!u){alert('Enter the URL of the .bin, e.g. http://192.168.1.20:8000/esp32_multi-v0.0.3.ino.bin');return;}
  if(!confirm('Flash from\n'+u+'\n\nThe board reboots when it finishes. Continue?'))return;
  el('pstat').textContent='asking the board to pull '+u+' ...';
  fetch('/api/ota/url?u='+encodeURIComponent(u))
    .then(r=>r.json())
    .then(d=>{el('pstat').textContent=d.ok?'pulling - the board is offline while it writes, then reboots. Reload in ~30s.'
                                          :('refused: '+(d.error||JSON.stringify(d)));})
    .catch(()=>{el('pstat').textContent='pull started (board stopped responding, which is expected). Reload in ~30s.';});
}
function pick(s){if(el('ws0'))el('ws0').value=s;alert('put '+s+' in slot 0 - type the password and press Save');}

/* ---------- ota ---------- */
function upload(){const f=el('fw').files[0];if(!f)return alert('pick a .bin first');
  paused=true;const fd=new FormData();fd.append('f',f,f.name);
  const x=new XMLHttpRequest();x.open('POST','/api/ota?size='+f.size);
  el('ostat').style.color='';
  x.upload.onprogress=e=>{const p=e.loaded/e.total*100;el('obar').style.width=p+'%';
    el('ostat').textContent=(p>=100?'sent 100% - board is verifying...':p.toFixed(0)+'%')+
      ' ('+(e.loaded/1024|0)+'/'+(e.total/1024|0)+' kB)';};
  x.onload=()=>{
    if(x.status===200){el('ostat').textContent='written OK - rebooting, page reloads in 12 s';
      setTimeout(()=>location.reload(),12000);}
    else{el('ostat').style.color='var(--bad)';
      el('ostat').textContent='FAILED ('+x.status+'): '+x.responseText;
      el('obar').style.width='0';paused=false;}};
  x.onerror=()=>{el('ostat').style.color='var(--bad)';
    el('ostat').textContent='connection dropped mid-upload';paused=false;};
  x.send(fd);}

function loadLog(){fetch('/api/log').then(r=>r.text()).then(t=>{el('logp').textContent=t;});}

fetch('/api/config').then(r=>r.json()).then(d=>{el('otahost').textContent=d.host;});
poll();
</script></body></html>)WEBUI";
