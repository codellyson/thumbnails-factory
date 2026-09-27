  // ---- usage counts -----------------------------------------------------
  // Anonymous counts via Aptabase: event name plus a preset or layout name.
  // Never the picture, headline, logo or file name. No cookies; the session
  // id is random, lasts an hour of activity, and lives only in this tab.
  // Nothing is sent from file://, and localhost events are marked debug.
  var TRACK = {
    key: 'A-US-7751406996',
    url: 'https://us.aptabase.com/api/v0/event',
    debug: /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) || /\.(localhost|test)$/.test(location.hostname),
    on: location.protocol === 'https:' || location.protocol === 'http:',
    session: '', last: 0
  };
  function track(name, props){
    if (!TRACK.on || typeof fetch !== 'function') return;
    var now = Date.now();
    if (!TRACK.session || now - TRACK.last > 3600e3) {
      TRACK.session = Math.floor(now/1000) + String(Math.floor(Math.random()*1e8)).padStart(8, '0');
    }
    TRACK.last = now;
    try {
      fetch(TRACK.url, {
        method:'POST', credentials:'omit', keepalive:true,
        headers:{ 'Content-Type':'application/json', 'App-Key':TRACK.key },
        body: JSON.stringify({
          timestamp: new Date(now).toISOString(), sessionId: TRACK.session, eventName: name,
          systemProps: { locale: navigator.language || '', isDebug: TRACK.debug, appVersion: '', sdkVersion: 'aptabase-web@0.5.0' },
          props: props || {}
        })
      }).catch(function(){});
    } catch (e) {}
  }
  // ---- platform presets -------------------------------------------------
  // safe: fractions of the canvas kept clear of headline/logo/badge, so the
  // artwork survives each platform's own UI chrome (captions, action rails,
  // duration badges, profile avatars).
  var PRESETS = [
    { id:'youtube',        short:'YouTube',      label:'YouTube thumbnail',      w:1280, h:720,  play:true,  safe:{t:.055,r:.05,b:.07,l:.05} },
    { id:'youtube-shorts', short:'Shorts',       label:'YouTube Shorts cover',   w:1080, h:1920, play:false, safe:{t:.08,r:.17,b:.20,l:.06} },
    { id:'tiktok',         short:'TikTok',       label:'TikTok cover',           w:1080, h:1920, play:false, safe:{t:.10,r:.20,b:.22,l:.06} },
    { id:'instagram-reel', short:'Reel, Story',  label:'Instagram Reel or Story',w:1080, h:1920, play:false, safe:{t:.12,r:.17,b:.20,l:.06} },
    { id:'instagram-post', short:'Instagram',    label:'Instagram post',         w:1080, h:1350, play:false, safe:{t:.06,r:.06,b:.08,l:.06} },
    { id:'instagram-square',short:'IG square',   label:'Instagram square',       w:1080, h:1080, play:false, safe:{t:.06,r:.06,b:.08,l:.06} },
    { id:'x',              short:'X',            label:'X card',                 w:1600, h:900,  play:true,  safe:{t:.055,r:.05,b:.07,l:.05} },
    { id:'facebook',       short:'Facebook',     label:'Facebook link image',    w:1200, h:630,  play:false, safe:{t:.06,r:.05,b:.08,l:.05} },
    { id:'linkedin',       short:'LinkedIn',     label:'LinkedIn post image',    w:1200, h:627,  play:false, safe:{t:.06,r:.05,b:.08,l:.05} },
    { id:'twitch',         short:'Twitch',       label:'Twitch thumbnail',       w:1280, h:720,  play:true,  safe:{t:.055,r:.05,b:.10,l:.05} },
    { id:'podcast',        short:'Podcast',      label:'Podcast cover art',      w:3000, h:3000, play:false, safe:{t:.07,r:.07,b:.09,l:.07} },
    { id:'blog-og',        short:'Blog, link',   label:'Blog or link preview',   w:1200, h:630,  play:false, safe:{t:.06,r:.05,b:.08,l:.05} },
    { id:'custom',         short:'Custom',       label:'Custom size',            w:1280, h:720,  play:false, safe:{t:.055,r:.05,b:.07,l:.05} }
  ];
  function presetById(id){
    for (var i=0;i<PRESETS.length;i++) if (PRESETS[i].id === id) return PRESETS[i];
    return PRESETS[0];
  }

  // ---- bottom-line colour -----------------------------------------------
  // Three stops, because the house gradient runs purple to lilac to warm and
  // a straight two-stop blend between the ends does not pass through lilac.
  var PALETTES = [
    { id:'kk',    name:'KreativeKorna', stops:['#b9a4ff','#d9a2ff','#ffb27a'] },
    { id:'white', name:'Plain white',   stops:['#ffffff','#ffffff','#ffffff'] },
    { id:'signal',name:'Signal yellow', stops:['#ffc21a','#ffc21a','#ffc21a'] },
    { id:'ember', name:'Ember',         stops:['#ff512f','#f09819','#ffd200'] },
    { id:'mint',  name:'Mint',          stops:['#a8ff78','#78ffd6','#43c6ac'] },
    { id:'ice',   name:'Ice',           stops:['#a1c4fd','#c2e9fb','#ffffff'] },
    { id:'rose',  name:'Rose',          stops:['#ff9a9e','#f6a1c8','#fad0c4'] },
    { id:'custom',name:'Custom',        stops:null },
    // These two come last so they wrap onto their own row: stock looks first,
    // then the ones read out of whatever you uploaded.
    { id:'fromFrame', name:'From the image', stops:null, from:'frame' },
    { id:'fromLogo',  name:'From the logo',  stops:null, from:'logo' }
  ];
  function paletteById(id){
    for (var i=0;i<PALETTES.length;i++) if (PALETTES[i].id === id) return PALETTES[i];
    return PALETTES[0];
  }
  function activeStops(){
    var p = paletteById(state.palette);
    if (p.stops) return p.stops;
    if (p.from) return state.derived[p.from] || state.customStops;
    return state.customStops;
  }

  // ---- reading colours out of an image ----------------------------------
  function rgbToHsl(r, g, b){
    r/=255; g/=255; b/=255;
    var max = Math.max(r,g,b), min = Math.min(r,g,b), l = (max+min)/2, h = 0, sat = 0;
    if (max !== min) {
      var d = max - min;
      sat = l > 0.5 ? d/(2-max-min) : d/(max+min);
      if (max === r) h = ((g-b)/d + (g < b ? 6 : 0)) / 6;
      else if (max === g) h = ((b-r)/d + 2) / 6;
      else h = ((r-g)/d + 4) / 6;
    }
    return [h, sat, l];
  }
  function hslToHex(h, sat, l){
    function f(n){
      var k = (n + h*12) % 12, a = sat * Math.min(l, 1-l);
      var v = l - a * Math.max(-1, Math.min(k-3, Math.min(9-k, 1)));
      return Math.round(v*255);
    }
    return '#' + [f(0),f(8),f(4)].map(function(v){
      return ('0' + v.toString(16)).slice(-2);
    }).join('');
  }
  function hueGap(a, b){ var d = Math.abs(a-b); return Math.min(d, 1-d); }

  // Samples the image small, bins by hue weighted towards saturated mid-tones,
  // then takes the three strongest hues that are far enough apart to read as a
  // gradient rather than one colour three times. Lightness is pinned near the
  // top of the range because these stops sit on a darkened photo.
  var BINS = 24;
  function paletteFromImage(source){
    var N = 72;
    var oc = document.createElement('canvas'); oc.width = N; oc.height = N;
    var g = oc.getContext('2d', { willReadFrequently:true });
    var data;
    try {
      g.drawImage(source, 0, 0, N, N);
      data = g.getImageData(0, 0, N, N).data;
    } catch(e){ return null; }

    var bins = [], i;
    for (i = 0; i < BINS; i++) bins.push({ w:0, s:0, l:0, n:0 });
    for (var q = 0; q < data.length; q += 4) {
      if (data[q+3] < 128) continue;                      // transparent logo edges
      var hsl = rgbToHsl(data[q], data[q+1], data[q+2]);
      if (hsl[2] < 0.06 || hsl[2] > 0.96) continue;       // crushed or blown out
      if (hsl[1] < 0.12) continue;                        // grey carries no hue
      var b = Math.min(BINS-1, Math.floor(hsl[0]*BINS));
      bins[b].w += hsl[1] * (1 - Math.abs(hsl[2]-0.55));
      bins[b].s += hsl[1]; bins[b].l += hsl[2]; bins[b].n++;
    }

    var ranked = [];
    for (i = 0; i < BINS; i++) if (bins[i].n) ranked.push({ i:i, b:bins[i] });
    ranked.sort(function(a, b){ return b.b.w - a.b.w; });

    var picked = [];
    ranked.forEach(function(o){
      if (picked.length >= 3) return;
      var h = (o.i + 0.5) / BINS;
      var apart = picked.every(function(c){ return hueGap(c.h, h) >= 1.5/BINS; });
      if (apart) picked.push({ h:h, s:o.b.s/o.b.n, l:o.b.l/o.b.n });
    });
    if (!picked.length) return ['#ffffff','#f0f0f0','#d6d6d6'];   // greyscale source
    while (picked.length < 3) {
      var base = picked[0], sign = picked.length === 1 ? 1 : -1;
      picked.push({ h:(base.h + sign*0.075 + 1) % 1, s:base.s, l:base.l });
    }

    // Keep the dominant hue first, then walk the shorter way round.
    var head = picked[0], rest = picked.slice(1);
    var wayA = hueGap(head.h, rest[0].h) + hueGap(rest[0].h, rest[1].h);
    var wayB = hueGap(head.h, rest[1].h) + hueGap(rest[1].h, rest[0].h);
    var ordered = wayB < wayA ? [head, rest[1], rest[0]] : [head, rest[0], rest[1]];

    var LIGHT = [0.76, 0.72, 0.69];
    return ordered.map(function(c, n){
      return hslToHex(c.h, Math.max(0.5, Math.min(0.95, c.s)), LIGHT[n]);
    });
  }
  function cssGradient(stops){
    return 'linear-gradient(90deg,' + stops[0] + ' 0%,' + stops[1] + ' 45%,' + stops[2] + ' 100%)';
  }

  var cv = document.getElementById('cv'), ctx = cv.getContext('2d');
  var state = {
    preset:'youtube', customW:1280, customH:720,
    panX:0, panY:0, safe:false, feed:false,
    palette:'kk', customStops:['#b9a4ff','#d9a2ff','#ffb27a'],
    logoSrc:null,  // null means the logo this tool ships with
    phonePanX:0, phonePanY:0,   // framing of the second picture, as fractions of its box
    derived:{ frame:null, logo:null }   // colours read out of each uploaded asset
  };

  // ---- the control schema -----------------------------------------------
  // Every setting a person can change is declared here, once. From this list
  // the page builds the panel, sets each default, decides what is remembered
  // between visits, wires the handler, and shows each control only for the
  // templates that use it. A template reads state[key] while drawing and
  // nothing else; adding a control is adding an entry.
  //
  //   key       the state key it sets (custom widgets without a key set none)
  //   type      text, color, range, choice, toggle, font, image or custom
  //   label     a string, or { _:default, <template>:override }
  //   def       the default value; its type is the type a saved value must have
  //   group     the folding panel it sits in; none means the top of the panel,
  //             'toggles' means the checkbox list under the panels
  //   for       the templates it belongs to; absent means every template
  //   when      a further condition, e.g. the phone's parts need a phone
  //   row       controls sharing a row name sit side by side
  //   pair      a colour picker to set beside a text field
  //   unit      for a range: '%' stores a fraction (times scale), else a number
  //   persist   false for settings that start fresh on every visit
  //   change    extra work after the value is set (the redraw is automatic)
  //
  // Groups appear in the order they are first mentioned.
  var ALL = ['bleed', 'showcase', 'launch', 'versus'];
  var CONTROLS = [
    { key:'layout', type:'custom', label:'Template', def:'bleed', build:buildTemplatePicker },
    { key:'main', type:'image', slot:'main', big:true, persist:false,
      label:{ _:'Image', showcase:'Window picture', launch:'Window picture', versus:'After picture' },
      button:'Choose an image', ids:{ pick:'pick', file:'file' } },
    { key:'zoom', type:'range', label:'Zoom', min:100, max:250, unit:'%', def:1.25, persist:false, row:'frame' },
    { key:'vig', type:'range', label:'Shading', min:0, max:100, unit:'%', scale:0.7, def:0.7, persist:false, row:'frame', for:['bleed'] },
    { key:'second', type:'image', slot:'second', persist:false, for:['versus'], label:'Before picture',
      button:'Choose before picture', reset:'Remove',
      hint:'Or drop a file on the left card. Drag on it to move the picture.' },
    { key:'phoneZoom', type:'range', label:'Before zoom', min:100, max:250, unit:'%', def:1, persist:false, for:['versus'], id:'beforeZoom' },
    { key:'line1', type:'text', label:{ _:'Top line', versus:'Before' }, def:'TYPE YOUR', maxlength:24,
      pair:{ key:'line1Color', aria:'Top line colour' } },
    { key:'line1Color', type:'color', def:'#ffffff', paired:true },
    { key:'line2', type:'text', label:{ _:'Bottom line', versus:'After' }, def:'HEADLINE HERE', maxlength:24 },
    { id:'palette', type:'custom', build:buildPaletteSlot, join:true },

    // Launch's own label above its headline
    { key:'badge', type:'text', group:'Project tag', for:['launch'], label:'Text', def:'', maxlength:32,
      placeholder:'JUSTDB', hint:'An outlined label above the headline. Leave it empty for none.' },
    { key:'pillSize', type:'range', group:'Project tag', for:['launch'], label:'Size', min:70, max:160, unit:'%', def:1 },

    { key:'kick1', type:'text', group:'Kicker', for:['launch', 'versus'], label:'First line', def:'YOUR CHANNEL', maxlength:32, placeholder:'YOUR CHANNEL' },
    { key:'kick2', type:'text', group:'Kicker', for:['launch', 'versus'], label:'Accent line', def:'EPISODE 01', maxlength:24, placeholder:'EPISODE 01',
      hint:'Two short lines in a corner bracket. Leave both empty to show the logo instead.' },

    { key:'headFont', type:'font', group:'Text', label:'Headline font', def:'archivo-black', list:function(){ return HEAD_FONTS; },
      change:function(){ ensureFont(headFace()); } },
    { key:'headScale', type:'range', group:'Text', label:'Headline size', min:60, max:140, unit:'%', def:1,
      hint:'The headline still shrinks to fit its space; this sets how big it starts.' },
    { key:'monoFont', type:'font', group:'Text', for:['launch', 'versus'], label:'Kicker and labels font', def:'jetbrains',
      list:function(){ return MONO_FONTS; }, change:function(){ ensureFont(monoFace()); } },
    { id:'fontUpload', type:'custom', group:'Text', build:buildFontUpload },

    { key:'winTitle', type:'text', group:'Window', for:['showcase', 'launch'], label:'Title', def:'', maxlength:40, placeholder:'index.html' },
    { key:'sticker', type:'text', group:'Window', for:['launch'], label:'Sticker', def:'', maxlength:28,
      placeholder:'IT BROKE. I LEFT IT IN.', hint:'A label in the title bar. It takes the title’s place.',
      pair:{ key:'stickerColor', aria:'Sticker colour' } },
    { key:'stickerColor', type:'color', def:'#ff5b3a', paired:true },
    { key:'winStyle', type:'choice', group:'Window', for:['showcase'], label:'Style', def:'dark',
      options:[['dark','Dark'], ['light','Light'], ['plain','No frame']] },
    { key:'winTurn', type:'range', group:'Window', for:['showcase'], label:'Turn', min:0, max:35, unit:'°', def:17, row:'win' },
    { key:'winTilt', type:'range', group:'Window', for:['showcase', 'launch'], label:'Tilt', min:-12, max:12, unit:'°', def:-4, row:'win' },

    { key:'phone', type:'toggle', group:'Phone', for:['showcase'], label:'Show a phone beside the window', def:true },
    { key:'second', type:'image', slot:'second', persist:false, group:'Phone', for:['showcase'], when:hasPhone,
      label:'Phone picture', button:'Choose phone picture', reset:'Remove picture', id:'phonePic',
      hint:'Or drop a file on the phone. Drag on it to move the picture.' },
    { key:'phoneZoom', type:'range', group:'Phone', for:['showcase'], when:hasPhone, label:'Zoom', min:100, max:250, unit:'%', def:1, persist:false },
    { key:'cap1', type:'text', group:'Phone', for:['showcase'], when:hasPhone, label:'Text on screen', def:'', maxlength:18, placeholder:'First line', row:'caps' },
    { key:'cap2', type:'text', group:'Phone', for:['showcase'], when:hasPhone, label:'Accent line', def:'', maxlength:18, placeholder:'Second line', row:'caps',
      pair:{ key:'capColor', aria:'Accent line colour' } },
    { key:'capColor', type:'color', def:'#ffd23f', paired:true },
    { key:'handle', type:'text', group:'Phone', for:['showcase'], when:hasPhone, label:'Handle', def:'', maxlength:30, placeholder:'@yourname' },
    { key:'dots', type:'toggle', group:'Phone', for:['showcase'], when:hasPhone, label:'Like and share buttons', def:true },
    { key:'phoneSide', type:'choice', group:'Phone', for:['showcase'], when:hasPhone, label:'Side', def:'right', options:[['left','Left'], ['right','Right']] },
    { key:'phoneSize', type:'range', group:'Phone', for:['showcase'], when:hasPhone, label:'Size', min:70, max:130, unit:'%', def:1, row:'phoneFit' },
    { key:'phoneTilt', type:'range', group:'Phone', for:['showcase'], when:hasPhone, label:'Tilt', min:-15, max:15, unit:'°', def:6, row:'phoneFit' },

    { key:'glow', type:'choice', group:'Backdrop', for:['showcase'], label:'Glow', def:'image',
      options:[['image','Picture'], ['palette','Colours'], ['none','None']] },
    { key:'glowAmt', type:'range', group:'Backdrop', for:['showcase'], label:'Strength', min:0, max:100, unit:'%', def:0.6 },
    { key:'backdrop', type:'image', slot:'backdrop', persist:false, group:'Backdrop', for:['showcase'], label:'Picture',
      button:'Choose backdrop picture', reset:'Use the window picture' },

    { key:'tone', type:'choice', group:'Background', for:['showcase', 'launch', 'versus'], label:'Base colour', def:'neutral',
      options:[['neutral','Neutral'], ['palette','From colours'], ['custom','Custom']],
      hint:'The dark behind everything. From colours takes a deep shade of the palette.' },
    { key:'toneColor', type:'color', group:'Background', for:['showcase', 'launch', 'versus'], when:function(){ return state.tone === 'custom'; },
      label:'Colour', def:'#18171d' },
    { key:'dotGrid', type:'toggle', group:'Background', for:['launch'], label:'Dot grid', def:true },

    { key:'splitAngle', type:'range', group:'Split', for:['versus'], label:'Angle', min:0, max:20, unit:'°', def:6 },
    { key:'beforeFade', type:'range', group:'Split', for:['versus'], label:'Before word strength', min:15, max:100, unit:'%', def:0.55 },
    { key:'beforeCard', type:'choice', group:'Split', for:['versus'], label:'Before card', def:'dark',
      options:[['dark','Dark'], ['light','Light'], ['match','Like after']] },
    { key:'arrow', type:'toggle', group:'Split', for:['versus'], label:'Arrow between the pictures', def:true },

    { id:'logoSlot', type:'custom', group:'Logo', build:buildLogoSlot },
    { key:'logo', type:'toggle', group:'Logo', label:'Show it on the thumbnail', def:true, persist:false },
    { key:'logoSize', type:'range', group:'Logo', label:'Size', min:50, max:160, unit:'%', def:1 },

    { key:'play', type:'toggle', group:'toggles', for:['bleed'], label:'Play badge', def:true, persist:false,
      enabled:function(){ return !!current().play; } }
  ];
  function hasPhone(){ return state.phone; }

  // Defaults first, then whatever was saved - but only where the saved value
  // is the same kind of thing, so a stale or hand-edited entry cannot break
  // the page.
  CONTROLS.forEach(function(ctl){
    if (ctl.key && ctl.def !== undefined && !(ctl.key in state)) state[ctl.key] = ctl.def;
  });
  function remembered(){
    var seen = {};
    return CONTROLS.filter(function(ctl){
      if (!ctl.key || ctl.def === undefined || ctl.persist === false || seen[ctl.key]) return false;
      return (seen[ctl.key] = true);
    });
  }

  try {
    var saved = JSON.parse(localStorage.getItem('tf-state') || 'null');
    if (saved) {
      if (saved.preset) state.preset = saved.preset;
      if (saved.customW) state.customW = saved.customW;
      if (saved.customH) state.customH = saved.customH;
      if (saved.palette) state.palette = saved.palette;
      if (saved.customStops && saved.customStops.length === 3) state.customStops = saved.customStops;
      if (saved.logoSrc) state.logoSrc = saved.logoSrc;
      if (saved.derived) state.derived = saved.derived;
      if (typeof saved.feed === 'boolean') state.feed = saved.feed;
      remembered().forEach(function(ctl){
        var v = saved[ctl.key];
        if (typeof v === typeof ctl.def && (typeof v !== 'number' || isFinite(v))) state[ctl.key] = v;
      });
      // Before the badge was free text it was a series name and an episode.
      if (typeof saved.badge !== 'string' && (saved.series || saved.episode)) {
        state.badge = [saved.series, saved.episode && /^\d+$/.test(saved.episode) ? 'EP ' + saved.episode : saved.episode]
          .filter(Boolean).join(' · ');
      }
    }
  } catch(e){}
  // A window or card wants the whole screenshot; only a full picture crops.
  if (state.layout !== 'bleed') state.zoom = 1;

  // Active preset, with the custom size folded in.
  function current(){
    var p = presetById(state.preset);
    if (p.id !== 'custom') return p;
    return { id:p.id, short:p.short, label:p.label, w:state.customW, h:state.customH, play:p.play, safe:p.safe };
  }

  // The starting backdrop is painted here rather than shipped as a baked-in
  // photo, so the file stays small and carries nobody's screenshot.
  function makeDefaultFrame(){
    var W = 1600, H = 1600;
    var oc = document.createElement('canvas'); oc.width = W; oc.height = H;
    var g = oc.getContext('2d');
    var base = g.createLinearGradient(0, 0, W, H);
    base.addColorStop(0,'#101c2b'); base.addColorStop(0.5,'#16293a'); base.addColorStop(1,'#0c1219');
    g.fillStyle = base; g.fillRect(0, 0, W, H);
    [[0.22,0.26,0.44,'rgba(139,108,240,.55)'],
     [0.79,0.36,0.40,'rgba(248,147,95,.42)'],
     [0.55,0.82,0.46,'rgba(58,188,188,.30)'],
     [0.10,0.86,0.32,'rgba(192,122,232,.30)']].forEach(function(b){
      var rg = g.createRadialGradient(W*b[0], H*b[1], 0, W*b[0], H*b[1], W*b[2]);
      rg.addColorStop(0, b[3]); rg.addColorStop(1,'rgba(0,0,0,0)');
      g.fillStyle = rg; g.fillRect(0, 0, W, H);
    });
    g.globalAlpha = 0.05; g.strokeStyle = '#ffffff'; g.lineWidth = 2;
    for (var x = -H; x < W; x += 48) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x+H, H); g.stroke(); }
    g.globalAlpha = 1;
    return oc;
  }

  var DEFAULT_LOGO = LOGO_SRC;
  // frame fills the window (or the whole frame in Full picture); the phone and
  // the backdrop glow have their own pictures and fall back to it.
  var logo = new Image(), frame = makeDefaultFrame(), phoneImg = null, bgImg = null;
  var ready = { logo:false, frame:true, font:false };
  logo.onload = function(){ ready.logo = true; updateLogoThumb(); refreshDerived('logo', logo); draw(); };
  logo.onerror = function(){ setStatus('That file could not be read as an image.', 'err'); };
  logo.src = state.logoSrc || DEFAULT_LOGO;
  if (document.fonts && document.fonts.ready) {
    document.fonts.load('88px "Archivo Black"').then(function(){ ready.font = true; draw(); });
    document.fonts.load('700 20px "JetBrains Mono"').then(function(){ draw(); });
    document.fonts.ready.then(function(){ ready.font = true; draw(); });
  } else { ready.font = true; }

  // ---- fonts ------------------------------------------------------------
  // Two roles, each with a choice: the headline face, and the monospace face
  // the kicker and labels are set in. Stock faces come from Google Fonts and
  // load only when picked; `track` is the tight tracking, in em, that the
  // newer templates apply, since a condensed face needs far less than a wide
  // one. A font file of your own can join either list for the session.
  var HEAD_FONTS = [
    { id:'archivo-black', name:'Archivo Black', family:'Archivo Black', weight:400, track:-0.045, css:'Archivo+Black' },
    { id:'anton',         name:'Anton',         family:'Anton',         weight:400, track:-0.01,  css:'Anton' },
    { id:'bebas',         name:'Bebas Neue',    family:'Bebas Neue',    weight:400, track:0,      css:'Bebas+Neue' },
    { id:'inter',         name:'Inter Black',   family:'Inter',         weight:900, track:-0.05,  css:'Inter:wght@900' },
    { id:'montserrat',    name:'Montserrat Black', family:'Montserrat', weight:900, track:-0.04,  css:'Montserrat:wght@900' },
    { id:'poppins',       name:'Poppins ExtraBold', family:'Poppins',   weight:800, track:-0.04,  css:'Poppins:wght@800' },
    { id:'bricolage',     name:'Bricolage Grotesque', family:'Bricolage Grotesque', weight:800, track:-0.045, css:'Bricolage+Grotesque:wght@800' },
    { id:'space-grotesk', name:'Space Grotesk', family:'Space Grotesk', weight:700, track:-0.04,  css:'Space+Grotesk:wght@700' },
    { id:'oswald',        name:'Oswald',        family:'Oswald',        weight:700, track:-0.01,  css:'Oswald:wght@700' },
    { id:'dm-serif',      name:'DM Serif Display', family:'DM Serif Display', weight:400, track:-0.02, css:'DM+Serif+Display' },
    { id:'playfair',      name:'Playfair Display Black', family:'Playfair Display', weight:900, track:-0.03, css:'Playfair+Display:wght@900' }
  ];
  var MONO_FONTS = [
    { id:'jetbrains',  name:'JetBrains Mono', family:'JetBrains Mono', weight:700, css:'JetBrains+Mono:wght@700' },
    { id:'space-mono', name:'Space Mono',     family:'Space Mono',     weight:700, css:'Space+Mono:wght@700' },
    { id:'ibm-plex',   name:'IBM Plex Mono',  family:'IBM Plex Mono',  weight:700, css:'IBM+Plex+Mono:wght@700' },
    { id:'dm-mono',    name:'DM Mono',        family:'DM Mono',        weight:500, css:'DM+Mono:wght@500' },
    { id:'fira-code',  name:'Fira Code',      family:'Fira Code',      weight:700, css:'Fira+Code:wght@700' },
    { id:'courier',    name:'Courier Prime',  family:'Courier Prime',  weight:700, css:'Courier+Prime:wght@700' }
  ];
  function fontById(list, id){
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return list[0];
  }
  var headFace = function(){ return fontById(HEAD_FONTS, state.headFont); };
  var monoFace = function(){ return fontById(MONO_FONTS, state.monoFont); };

  // Fetches a stock face the first time it is picked, then redraws once the
  // browser has it. A face that fails to load leaves the fallback in place.
  var fontLinks = { 'archivo-black':true, 'jetbrains':true };   // already in the page's own stylesheet link
  function ensureFont(f){
    if (!f.css || fontLinks[f.id]) return;
    fontLinks[f.id] = true;
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=' + f.css + '&display=swap';
    document.head.appendChild(link);
    if (document.fonts && document.fonts.load) {
      link.onload = function(){
        document.fonts.load(f.weight + ' 40px "' + f.family + '"').then(function(){ draw(); }, function(){});
      };
    }
  }

  function headlineFont(px){
    var f = headFace();
    return f.weight + ' ' + px + 'px "' + f.family + '", "Archivo Black", Helvetica, Arial, sans-serif';
  }

  function fitSize(c, text, maxW, startPx, minPx){
    var px = startPx, step = Math.max(1, startPx/22);
    while (px > minPx) {
      c.font = headlineFont(px);
      if (c.measureText(text).width <= maxW) break;
      px -= step;
    }
    return px;
  }

  // ---- showcase pieces --------------------------------------------------
  // Drawn in canvas rather than shipped as mockup images, so the file stays
  // small and every piece scales with the output size.
  var UI_FONT = '-apple-system, "Segoe UI", Helvetica, Arial, sans-serif';

  function roundRect(c, x, y, w, h, r){
    r = Math.min(r, w/2, h/2);
    c.beginPath();
    c.moveTo(x+r, y);
    c.arcTo(x+w, y, x+w, y+h, r);
    c.arcTo(x+w, y+h, x, y+h, r);
    c.arcTo(x, y+h, x, y, r);
    c.arcTo(x, y, x+w, y, r);
    c.closePath();
  }
  function noShadow(c){ c.shadowColor='transparent'; c.shadowBlur=0; c.shadowOffsetY=0; }

  // Draws img to cover the box, the way CSS object-fit: cover does. The pan
  // stops where the picture's edge meets the box's, so a drag can never
  // pull in an empty strip.
  function cover(c, img, x, y, w, h, zoom, dx, dy){
    var s = Math.max(w/img.width, h/img.height) * (zoom || 1);
    var iw = img.width*s, ih = img.height*s;
    var mx = (iw-w)/2, my = (ih-h)/2;
    dx = Math.max(-mx, Math.min(mx, dx || 0));
    dy = Math.max(-my, Math.min(my, dy || 0));
    c.drawImage(img, x + (w-iw)/2 + dx, y + (h-ih)/2 + dy, iw, ih);
    return [dx, dy];
  }

  // The backdrop glow: the image shrunk to a few dozen pixels, then stretched
  // back up, is a blur every browser can draw. Browsers with canvas filters
  // get a smoother one on top of that.
  var glow = null, glowOf = null;
  function glowFor(img){
    if (glowOf === img) return glow;
    var gw = 48, gh = Math.max(1, Math.round(gw * img.height / img.width));
    glow = document.createElement('canvas'); glow.width = gw; glow.height = gh;
    glow.getContext('2d').drawImage(img, 0, 0, gw, gh);
    glowOf = img;
    return glow;
  }
  // Glow comes from the image, from the headline colours, or not at all. The
  // image can be the wrong colour for the words; the palette never is.
  function drawBackdrop(c, W, H, k){
    if (state.glow === 'image') {
      c.save();
      c.globalAlpha = state.glowAmt;
      if (typeof c.filter === 'string') c.filter = 'blur(' + Math.round(24*k) + 'px)';
      c.imageSmoothingQuality = 'high';
      cover(c, glowFor(bgImg || frame), -0.05*W, -0.05*H, 1.1*W, 1.1*H);
      c.restore();
    } else if (state.glow === 'palette') {
      var st = activeStops(), R = Math.max(W, H);
      [[0.78, 0.08, 0.55, st[0]], [0.98, 0.62, 0.45, st[2]], [0.45, 0.0, 0.35, st[1]]].forEach(function(b){
        var rg = c.createRadialGradient(W*b[0], H*b[1], 0, W*b[0], H*b[1], R*b[2]);
        rg.addColorStop(0, b[3]); rg.addColorStop(1, 'rgba(0,0,0,0)');
        c.save(); c.globalAlpha = state.glowAmt*0.7; c.fillStyle = rg; c.fillRect(0, 0, W, H); c.restore();
      });
    }
    // Darkest where the headline sits, so the glow reads as light behind the
    // cards rather than a photo behind the words.
    var g = c.createLinearGradient(0, 0, W, 0);
    g.addColorStop(0, 'rgba(8,9,13,.92)'); g.addColorStop(0.55, 'rgba(8,9,13,.72)');
    g.addColorStop(1, 'rgba(8,9,13,.5)');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    var g2 = c.createLinearGradient(0, H, 0, 0);
    g2.addColorStop(0, 'rgba(8,9,13,.8)'); g2.addColorStop(0.6, 'rgba(8,9,13,.2)');
    g2.addColorStop(1, 'rgba(8,9,13,0)');
    c.fillStyle = g2; c.fillRect(0, 0, W, H);
  }

  // A desktop window: title bar, three lights, the image below. The face is
  // painted flat on its own canvas first, then laid onto the thumbnail turned
  // away in depth (see drawTurned).
  var faceCv = document.createElement('canvas');
  function paintWindowFace(w, h, panX, panY){
    var fw = Math.max(1, Math.ceil(w)), fh = Math.max(1, Math.ceil(h));
    if (faceCv.width !== fw || faceCv.height !== fh) { faceCv.width = fw; faceCv.height = fh; }
    var c = faceCv.getContext('2d');
    c.clearRect(0, 0, fw, fh);
    var light = state.winStyle === 'light', plain = state.winStyle === 'plain';
    var r = (plain ? 0.03 : 0.022)*w, bar = plain ? 0 : BAR*w;
    c.save();
    roundRect(c, 0, 0, w, h, r); c.clip();
    c.fillStyle = light ? '#f2f2f4' : '#1b1c21'; c.fillRect(0, 0, w, h);
    shown.win = cover(c, frame, 0, bar, w, h - bar, state.zoom, panX, panY);
    if (bar) {
      c.fillStyle = light ? '#e6e6e9' : '#26272d'; c.fillRect(0, 0, w, bar);
      c.fillStyle = light ? 'rgba(0,0,0,.12)' : 'rgba(0,0,0,.35)';
      c.fillRect(0, bar - Math.max(1, bar*0.03), w, Math.max(1, bar*0.03));
    }
    // Light from the upper left, falling off toward the far edge: this is
    // most of what sells the turn.
    var lit = c.createLinearGradient(0, 0, w, h);
    lit.addColorStop(0, 'rgba(255,255,255,.07)'); lit.addColorStop(0.4, 'rgba(255,255,255,0)');
    lit.addColorStop(1, 'rgba(0,0,0,.28)');
    c.fillStyle = lit; c.fillRect(0, 0, w, h);
    c.restore();
    var lr = bar*0.16, ly = bar/2;
    if (bar) ['#ff5f57','#febc2e','#28c840'].forEach(function(col, i){
      c.beginPath(); c.arc(bar*0.5 + i*lr*3.1, ly, lr, 0, Math.PI*2);
      c.fillStyle = col; c.fill();
    });
    if (bar && state.winTitle) {
      c.font = '600 ' + (bar*0.34).toFixed(1) + 'px ' + UI_FONT;
      c.fillStyle = light ? 'rgba(0,0,0,.72)' : 'rgba(255,255,255,.82)'; c.textBaseline = 'middle';
      c.fillText(state.winTitle, bar*0.5 + lr*9.5, ly, w - bar*2 - lr*10);
    }
    roundRect(c, 0.5, 0.5, w-1, h-1, r);
    c.strokeStyle = 'rgba(255,255,255,.14)'; c.lineWidth = Math.max(1, w*0.0018); c.stroke();
    return faceCv;
  }

  // Lays a flat face onto the canvas turned about its vertical axis, near edge
  // on the left, the way CSS rotateY with perspective would. Canvas 2D has no
  // projective transform, so the face goes down in thin vertical strips, each
  // scaled by its own depth. The result is scaled back up to the box's width
  // and centred on it, so the layout code can treat it as an ordinary box.
  var FOCAL = 2.2;
  function drawTurned(c, face, x, y, w, h, deg){
    var turn = state.winTurn*Math.PI/180;
    var f = FOCAL*w, sin = Math.sin(turn), cos = Math.cos(turn);
    function at(u){ var z = u*sin, sc = f/(f + z); return { x:u*cos*sc, s:sc }; }
    var L = at(-w/2), R = at(w/2);
    var fit = w / (R.x - L.x), mid = (L.x + R.x)/2;
    function px(u){ var q = at(u); return { x:(q.x - mid)*fit, s:q.s*fit }; }
    // Cast from an outline pulled in off the rounded corners, so none of its
    // square corners peek out from behind the face.
    var ins = 0.016*w, tl = px(-w/2 + ins), tr = px(w/2 - ins), ih = h - 2*ins;

    c.save();
    c.translate(x + w/2, y + h/2); c.rotate(deg*Math.PI/180);
    c.shadowColor = 'rgba(0,0,0,.75)'; c.shadowBlur = 0.1*w; c.shadowOffsetY = 0.035*w;
    c.beginPath();
    c.moveTo(tl.x, -ih*tl.s/2); c.lineTo(tr.x, -ih*tr.s/2);
    c.lineTo(tr.x, ih*tr.s/2); c.lineTo(tl.x, ih*tl.s/2); c.closePath();
    c.fillStyle = '#15161a'; c.fill();
    noShadow(c);
    c.imageSmoothingQuality = 'high';
    var n = Math.max(24, Math.min(480, Math.ceil(w/2))), sw = face.width/n;
    for (var i = 0; i < n; i++) {
      var a = px(-w/2 + i*w/n), b = px(-w/2 + (i+1)*w/n);
      var dh = h * (a.s + b.s)/2;
      // Half a pixel of overlap hides the seams between strips.
      c.drawImage(face, i*sw, 0, sw, face.height, a.x, -dh/2, b.x - a.x + 0.5, dh);
    }
    c.restore();
  }
  function drawWindow(c, x, y, w, h, deg, panX, panY){
    drawTurned(c, paintWindowFace(w, h, panX, panY), x, y, w, h, deg);
  }

  // A phone playing a Short: frame, island, the picture, and optionally the
  // burned-in caption, the handle and the action rail.
  function drawPhone(c, x, y, w, h, deg, preview){
    var img = phoneImg;
    var r = 0.16*w, bez = 0.035*w, sw = w - 2*bez, sh = h - 2*bez;
    c.save();
    c.translate(x + w/2, y + h/2); c.rotate(deg*Math.PI/180); c.translate(-w/2, -h/2);
    // side buttons, behind the body so only their outer edge shows
    c.fillStyle = '#2c2d32';
    [[-1, 0.2, 0.05], [-1, 0.29, 0.09], [-1, 0.4, 0.09], [1, 0.3, 0.13]].forEach(function(b){
      roundRect(c, b[0] < 0 ? -w*0.012 : w - w*0.008, h*b[1], w*0.02, h*b[2], w*0.008); c.fill();
    });
    c.shadowColor = 'rgba(0,0,0,.75)'; c.shadowBlur = 0.2*w; c.shadowOffsetY = 0.07*w;
    roundRect(c, 0, 0, w, h, r); c.fillStyle = '#0c0c0e'; c.fill();
    noShadow(c);
    // The frame catches the same upper-left light as the window.
    var rim = c.createLinearGradient(0, 0, w, h);
    rim.addColorStop(0, '#6a6b72'); rim.addColorStop(0.35, '#34353a'); rim.addColorStop(1, '#232428');
    roundRect(c, w*0.006, w*0.006, w - w*0.012, h - w*0.012, r);
    c.strokeStyle = rim; c.lineWidth = w*0.012; c.stroke();

    c.save();
    roundRect(c, bez, bez, sw, sh, r - bez); c.clip();
    if (img) {
      shown.phone = cover(c, img, bez, bez, sw, sh, state.phoneZoom, state.phonePanX*w, state.phonePanY*w);
    } else {
      // No picture of its own: a dark screen tinted with the headline colours,
      // never the window's picture shown twice.
      var st = activeStops(), sg = c.createLinearGradient(bez, bez, bez + sw, bez + sh);
      sg.addColorStop(0, '#15161c'); sg.addColorStop(1, '#0b0c10');
      c.fillStyle = sg; c.fillRect(bez, bez, sw, sh);
      var tg = c.createRadialGradient(bez + sw*0.3, bez + sh*0.25, 0, bez + sw*0.3, bez + sh*0.25, sh*0.7);
      tg.addColorStop(0, st[0]); tg.addColorStop(1, 'rgba(0,0,0,0)');
      c.save(); c.globalAlpha = 0.35; c.fillStyle = tg; c.fillRect(bez, bez, sw, sh); c.restore();
      if (preview) {
        c.font = '600 ' + (sw*0.075).toFixed(1) + 'px ' + UI_FONT;
        c.fillStyle = 'rgba(255,255,255,.55)'; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText('Drop a picture', bez + sw/2, bez + sh*0.32);
        c.fillText('on the phone', bez + sw/2, bez + sh*0.32 + sw*0.1);
        c.textAlign = 'left'; c.textBaseline = 'alphabetic';
      }
    }
    var shade = c.createLinearGradient(0, bez + sh, 0, bez + sh*0.55);
    shade.addColorStop(0, 'rgba(0,0,0,.55)'); shade.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = shade; c.fillRect(bez, bez, sw, sh);

    var cx = bez + sw/2;
    var caps = [state.cap1, state.cap2].map(function(t){ return (t || '').toUpperCase(); });
    if (caps[0] || caps[1]) {
      var cpx = Math.min(sw*0.14, fitSize(c, caps[0].length >= caps[1].length ? caps[0] : caps[1], sw*0.78, sw*0.14, sw*0.05));
      c.font = headlineFont(cpx); c.textAlign = 'center'; c.textBaseline = 'alphabetic';
      c.lineJoin = 'round'; c.lineWidth = cpx*0.16; c.strokeStyle = 'rgba(0,0,0,.9)';
      var cy = bez + sh*0.6;
      caps.forEach(function(t, i){
        if (!t) return;
        var ty = cy + i*cpx*1.08;
        c.shadowColor = 'rgba(0,0,0,.6)'; c.shadowBlur = cpx*0.3;
        c.strokeText(t, cx, ty); noShadow(c);
        c.fillStyle = i ? state.capColor : '#ffffff';
        c.fillText(t, cx, ty);
      });
      c.textAlign = 'left';
    }
    if (state.dots) {
      var dr = sw*0.055, dx = bez + sw - dr*1.9;
      for (var i = 0; i < 3; i++) {
        c.beginPath(); c.arc(dx, bez + sh*(0.63 + i*0.085), dr, 0, Math.PI*2);
        c.shadowColor = 'rgba(0,0,0,.5)'; c.shadowBlur = dr*0.8;
        c.fillStyle = '#ffffff'; c.fill(); noShadow(c);
      }
    }
    if (state.handle) {
      var hp = sw*0.058, handle = state.handle.charAt(0) === '@' ? state.handle : '@' + state.handle;
      c.font = '700 ' + hp.toFixed(1) + 'px ' + UI_FONT;
      c.fillStyle = '#ffffff'; c.textBaseline = 'alphabetic';
      c.shadowColor = 'rgba(0,0,0,.7)'; c.shadowBlur = hp*0.4;
      c.fillText(handle, bez + sw*0.07, bez + sh*0.94, sw*0.7);
      noShadow(c);
    }
    // glass: a faint diagonal sheen across the upper part of the screen
    var sheen = c.createLinearGradient(bez, bez, bez + sw*0.9, bez + sh*0.5);
    sheen.addColorStop(0, 'rgba(255,255,255,.1)'); sheen.addColorStop(0.5, 'rgba(255,255,255,.03)');
    sheen.addColorStop(0.5001, 'rgba(255,255,255,0)');
    c.fillStyle = sheen; c.fillRect(bez, bez, sw, sh);
    c.restore();

    // island
    roundRect(c, w/2 - sw*0.17, bez + sh*0.018, sw*0.34, sw*0.09, sw*0.045);
    c.fillStyle = '#000'; c.fill();
    c.restore();
  }

  // Launch's project tag, the outlined label above its headline. A dot typed
  // between words gets room to breathe.
  function pillText(){
    return state.badge.trim().toUpperCase().replace(/\s*·\s*/g, '  ·  ');
  }
  // Where the window and phone sit relative to each other, in units of the
  // window's width: the phone overlaps the window's lower right corner.
  // arrange() applies the phone's side and size on top of this.
  // Tall rooms get the stacked version, with the phone hanging lower and bigger.
  var SHOWCASE = {
    side:  { win:{ x:0, y:0.02, w:1, h:0.74 }, phone:{ x:0.66, y:0.2, w:0.42, h:0.8 } },
    stack: { win:{ x:0, y:0.02, w:1, h:0.72 }, phone:{ x:0.5, y:0.42, w:0.45, h:0.86 } },
    alone: { win:{ x:0, y:0.02, w:1, h:0.74 } }
  };

  // Applies the phone's side and size to an arrangement, then measures the
  // result, so the fitting code never has to know either setting exists.
  // The window takes the picture's own shape, plus its title bar, so a
  // screenshot is shown whole rather than cut mid-line. Very tall or very
  // wide pictures are held to a sane window and cropped from there.
  var WIN_ASPECT = { min:1.2, max:2.2 }, BAR = 0.058;
  function windowHeight(){
    var a = frame.width / frame.height;
    a = Math.max(WIN_ASPECT.min, Math.min(WIN_ASPECT.max, a));
    return 1/a + (state.winStyle === 'plain' ? 0 : BAR);
  }
  function arrange(l){
    var win = { x:l.win.x, y:l.win.y, w:l.win.w, h:windowHeight() }, ph = null;
    if (l.phone) {
      var sz = state.phoneSize, p = l.phone;
      // The phone hangs at the same fraction of the window's height whatever
      // shape the window took, then grows or shrinks about its middle.
      var py = l.win.y + (p.y - l.win.y) * win.h / l.win.h;
      ph = { w:p.w*sz, h:p.h*sz, x:p.x, y:py + p.h*(1-sz)/2 };
      if (state.phoneSide === 'left') {
        var span = Math.max(win.x + win.w, ph.x + ph.w);
        win.x = span - win.x - win.w;
        ph.x = span - ph.x - ph.w;
      }
    }
    var boxes = ph ? [win, ph] : [win];
    var x0 = Math.min.apply(null, boxes.map(function(b){ return b.x; }));
    var y0 = Math.min.apply(null, boxes.map(function(b){ return b.y; }));
    var x1 = Math.max.apply(null, boxes.map(function(b){ return b.x + b.w; }));
    var y1 = Math.max.apply(null, boxes.map(function(b){ return b.y + b.h; }));
    boxes.forEach(function(b){ b.x -= x0; b.y -= y0; });
    return { w:x1 - x0, h:y1 - y0, win:win, phone:ph };
  }

  // ---- sizes and corners -------------------------------------------------
  // Every measurement is derived from the target size, so one routine covers
  // 1280x720 and 1080x1920 alike. k is the geometric-mean scale against the
  // original 1280x720 design.
  // Corners a platform prints over. YouTube puts the video's length in the
  // bottom right; the showcase and the play badge stay out of it. Sizes are
  // fractions of the canvas, measured from that corner.
  var STAMPS = { youtube:{ w:0.14, h:0.12 } };

  var phoneHit = null;   // the phone's box on the preview, for routing a drop
  // The pan each picture was actually drawn at, after cover() stopped it at
  // the edge. A drag starts from here, so pulling past the edge and back
  // does not leave a dead zone to cross first.
  var shown = { win:[0,0], phone:[0,0] };
  // Full picture and Showcase: the tool's first two layouts, which share one
  // routine because they share their headline and logo row.
  function drawClassic(c, p, opts){
    var W = p.w, H = p.h;
    var k = Math.sqrt((W*H)/(1280*720));
    var s = p.safe;
    var left = W*s.l, right = W*(1-s.r), top = H*s.t, bottom = H*(1-s.b);
    var stamp = STAMPS[p.id], stampX = stamp ? W*(1-stamp.w) : W, stampY = stamp ? H*(1-stamp.h) : H;
    var portrait = (W/H) < 1.2;
    var show = state.layout === 'showcase';
    c.fillStyle = show ? baseTone('#0b0e14') : '#0b0e14'; c.fillRect(0,0,W,H);

    if (show) {
      drawBackdrop(c, W, H, k);
    } else {
      if (ready.frame) shown.win = cover(c, frame, 0, 0, W, H, state.zoom, state.panX*W, state.panY*H);

      // vignette
      var v = state.vig;
      var g1 = c.createLinearGradient(0,H,0,H-H*0.55);
      g1.addColorStop(0,'rgba(5,7,12,'+(0.94*v/0.7).toFixed(3)+')');
      g1.addColorStop(0.55,'rgba(5,7,12,'+(0.55*v/0.7).toFixed(3)+')');
      g1.addColorStop(1,'rgba(5,7,12,0)');
      c.fillStyle = g1; c.fillRect(0,0,W,H);
      var g2 = c.createRadialGradient(W/2,H*0.35,300*k,W/2,H*0.35,900*k);
      g2.addColorStop(0,'rgba(0,0,0,0)');
      g2.addColorStop(1,'rgba(0,0,0,'+(0.45*v/0.7).toFixed(3)+')');
      c.fillStyle = g2; c.fillRect(0,0,W,H);
    }

    // headline metrics. Showcase gives the words the left half in landscape and
    // the full width under the cards otherwise, and lets them grow bigger.
    var badge = state.play && p.play && !show;
    var r = 75*k;
    var maxW = right - left, startPx = 88*k*state.headScale;
    var cardsX = left + (right - left)*0.46;
    if (show) {
      // Tall covers are width-starved: every pixel of headline height is taken
      // from the cards, so the words come down a size there.
      startPx = ((W/H) < 0.85 ? 100*k : portrait ? 130*k : 150*k) * state.headScale;
      if (!portrait) maxW = cardsX - left - 0.02*W;
    }
    if (badge && !portrait) maxW -= (2*r + 0.02*W);
    var l1 = state.line1.toUpperCase(), l2 = state.line2.toUpperCase();
    c.textBaseline = 'alphabetic';
    var px2 = l2 ? fitSize(c, l2, maxW, startPx, 28*k) : 0;
    var px1 = l1 ? fitSize(c, l1, maxW, startPx, 28*k) : 0;
    var blockH = (px2 ? px2*1.06 : 0) + (px1 ? px1*1.06 : 0);

    // Play badge: beside the headline in landscape. The portrait branch is not
    // reachable today, since every preset with play:true is landscape - it is
    // kept only so a portrait preset that opts in still lands somewhere sane.
    if (badge) {
      var pcx, pcy;
      if (portrait) { pcx = right - r; pcy = bottom - blockH - r - 0.02*H; }
      else { pcx = right - r; pcy = Math.min(bottom, stampY - 0.015*H) - 87*k; }
      c.save();
      c.translate(pcx, pcy); c.rotate(-6*Math.PI/180);
      c.beginPath(); c.arc(0,0,87*k,0,Math.PI*2);
      c.fillStyle='rgba(255,0,51,.3)'; c.fill();
      c.shadowColor='rgba(0,0,0,.7)'; c.shadowBlur=40*k; c.shadowOffsetY=14*k;
      c.beginPath(); c.arc(0,0,r,0,Math.PI*2);
      c.fillStyle='#ff0033'; c.fill();
      c.shadowColor='transparent'; c.shadowBlur=0; c.shadowOffsetY=0;
      c.beginPath(); c.moveTo(-18*k,-32*k); c.lineTo(-18*k,32*k); c.lineTo(38*k,0); c.closePath();
      c.fillStyle='#fff'; c.fill();
      c.restore();
    }

    // the logo, top left
    var lh = 88*k*state.logoSize;
    var hasRow = !!(state.logo && ready.logo);
    if (hasRow) {
      c.shadowColor='rgba(0,0,0,.6)'; c.shadowBlur=20*k; c.shadowOffsetY=8*k;
      c.drawImage(logo, left, top, logo.width * (lh/logo.height), lh);
      noShadow(c);
    }
    // Measured to the top of the capitals, not the line box, so the gap
    // above the headline is the gap you see.
    var wordsTop = bottom - (l1 ? (px2 ? px2*1.06 : 0) + px1*0.74 : px2*0.74);

    // the window and phone, fitted into whatever room the words leave
    if (show) {
      var rx0, rx1, ry0, ry1;
      if (portrait) {
        rx0 = left; rx1 = right;
        ry0 = top + (hasRow ? lh + 0.03*H : 0);
        ry1 = wordsTop - 0.035*H;
      } else {
        rx0 = cardsX; rx1 = right; ry1 = bottom;
        ry0 = top;
      }
      var lay = null, u = 0;
      (state.phone ? [SHOWCASE.side, SHOWCASE.stack] : [SHOWCASE.alone]).forEach(function(l){
        var b = arrange(l);
        // 0.92 leaves room for the corners the tilt swings outward.
        var fit = 0.92 * Math.min((rx1-rx0)/b.w, (ry1-ry0)/b.h);
        if (fit > u) { u = fit; lay = b; }
      });
      if (lay) {
        // Width runs out first in tall rooms. The spare height goes above the
        // cards, under the logo row, so they sit on the headline.
        var ox = portrait ? rx0 + ((rx1-rx0) - lay.w*u)/2 : rx1 - lay.w*u;
        var oy = portrait ? ry1 - lay.h*u : ry0 + ((ry1-ry0) - lay.h*u)/2;
        // Out of the timestamp corner: lift the pieces clear of it, and if
        // there is no room to lift them, shrink them until there is.
        var clearY = stampY - 0.02*H;
        if (ox + lay.w*u > stampX && oy + lay.h*u > clearY) {
          oy = clearY - lay.h*u;
          if (oy < ry0) {
            u = Math.max(0, (clearY - ry0) / lay.h); oy = ry0;
            if (!portrait) ox = rx1 - lay.w*u;
          }
        }
        var wb = lay.win;
        drawWindow(c, ox + wb.x*u, oy + wb.y*u, wb.w*u, wb.h*u, state.winTilt,
                   state.panX*W, state.panY*H);
        if (lay.phone) {
          var ph = lay.phone;
          drawPhone(c, ox + ph.x*u, oy + ph.y*u, ph.w*u, ph.h*u, state.phoneTilt, opts.preview);
          if (opts.preview) phoneHit = { x:ox + ph.x*u, y:oy + ph.y*u, w:ph.w*u, h:ph.h*u };
        }
      }
    }

    // headline
    var yBottom = bottom;
    if (l2) {
      c.font = headlineFont(px2);
      var lg = c.createLinearGradient(left, 0, left + Math.min(c.measureText(l2).width, maxW), 0);
      var st = activeStops();
      lg.addColorStop(0, st[0]); lg.addColorStop(0.45, st[1]); lg.addColorStop(1, st[2]);
      c.shadowColor='rgba(0,0,0,.85)'; c.shadowBlur=18*k; c.shadowOffsetY=4*k;
      c.fillStyle = lg;
      c.fillText(l2, left, yBottom);
      noShadow(c);
      yBottom -= px2*1.06;
    }
    if (l1) {
      c.font = headlineFont(px1);
      c.shadowColor='rgba(0,0,0,.9)'; c.shadowBlur=22*k; c.shadowOffsetY=5*k;
      c.fillStyle = state.line1Color;
      c.fillText(l1, left, yBottom);
      noShadow(c);
    }

  }

  // ---- templates --------------------------------------------------------
  // A template is a whole arrangement of the thumbnail. Every template draws
  // from the same content - headline, pictures, badge, kicker, palette - so
  // switching keeps what was typed. Each one gets the canvas, the size and the
  // render options, and reads everything else from state.

  // The size's working box: safe edges, the timestamp corner, and its shape.
  function box(p){
    var W = p.w, H = p.h, s = p.safe, stamp = STAMPS[p.id];
    return {
      W:W, H:H, k:Math.sqrt((W*H)/(1280*720)),
      left:W*s.l, right:W*(1-s.r), top:H*s.t, bottom:H*(1-s.b),
      stamp:stamp, stampX: stamp ? W*(1-stamp.w) : W, stampY: stamp ? H*(1-stamp.h) : H,
      wide:(W/H) >= 1.2
    };
  }

  // The dark a template is built on. Neutral is the template's own; From
  // colours is a deep shade of the palette's first stop, so a pink palette
  // sits on plum and a yellow one on olive; Custom is whatever was picked.
  function baseTone(neutral){
    if (state.tone === 'custom') return state.toneColor;
    if (state.tone !== 'palette') return neutral;
    var n = parseInt(activeStops()[0].slice(1), 16);
    var hsl = rgbToHsl(n>>16&255, n>>8&255, n&255);
    return hslToHex(hsl[0], Math.min(hsl[1], 0.45), 0.1);
  }

  // The one solid colour a template leans on: the palette's last stop, the
  // bright end of every stock gradient.
  function accent(){ return activeStops()[2]; }
  // Near-black or white, whichever reads on the given colour. The cut-off
  // defaults high for big fills; small bold labels on a mid tone (the coral
  // sticker) read better dark, so they pass a lower one.
  function inkOn(hex, cut){
    var n = parseInt(hex.slice(1), 16);
    return (0.299*(n>>16&255) + 0.587*(n>>8&255) + 0.114*(n&255)) > (cut || 150) ? '#16151a' : '#ffffff';
  }
  function monoFont(px){
    var f = monoFace();
    return f.weight + ' ' + px.toFixed(1) + 'px "' + f.family + '", "JetBrains Mono", ui-monospace, Menlo, monospace';
  }
  // Canvas letter-spacing support is still patchy, so the kicker is set a
  // letter at a time.
  function spaced(c, text, x, y, track){
    for (var i = 0; i < text.length; i++) { c.fillText(text[i], x, y); x += c.measureText(text[i]).width + track; }
    return x;
  }

  // The kicker: a corner bracket in the accent and two short monospace lines
  // inside it, say a series and an episode. With both lines empty the logo
  // takes its place. Returns the height it used.
  function drawKicker(c, x, y, k){
    var a = state.kick1.trim().toUpperCase(), b = state.kick2.trim().toUpperCase();
    if (!a && !b) {
      if (!(state.logo && ready.logo)) return 0;
      var lh = 88*k*state.logoSize;
      c.drawImage(logo, x, y, logo.width * lh / logo.height, lh);
      return lh;
    }
    var arm = 100*k, th = 20*k, fpx = 21*k, tx = x + 40*k;
    c.fillStyle = accent();
    c.fillRect(x, y, arm, th); c.fillRect(x, y, th, arm);
    c.font = monoFont(fpx); c.textBaseline = 'alphabetic';
    c.fillStyle = '#ffffff'; if (a) spaced(c, a, tx, y + 52*k, fpx*0.12);
    c.fillStyle = accent();  if (b) spaced(c, b, tx, y + 82*k, fpx*0.12);
    return arm;
  }

  // A drawn arrow, so it carries the headline's weight whatever the font has.
  function drawArrow(c, x, midY, px, color){
    var len = px*0.8, head = len*0.42;
    c.save();
    c.strokeStyle = color; c.lineWidth = px*0.15; c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath();
    c.moveTo(x, midY); c.lineTo(x + len, midY);
    c.moveTo(x + len - head, midY - head); c.lineTo(x + len, midY); c.lineTo(x + len - head, midY + head);
    c.stroke();
    c.restore();
    return len + px*0.3;   // the room it took, gap included
  }

  // Largest box of a shape that fits a region, centred, then lifted - or
  // shrunk, when there is no room to lift - out of the timestamp corner.
  function fitBox(g, x0, y0, x1, y1, aspect, slack){
    var w = Math.max(0, Math.min(x1 - x0, (y1 - y0) * aspect) * (slack || 1)), h = w / aspect;
    var x = x0 + (x1 - x0 - w)/2, y = y0 + (y1 - y0 - h)/2;
    var clearY = g.stampY - 0.02*g.H;
    if (x + w > g.stampX && y + h > clearY) {
      y = clearY - h;
      if (y < y0) { h = Math.max(0, clearY - y0); w = h * aspect; y = y0; x = x0 + (x1 - x0 - w)/2; }
    }
    return { x:x, y:y, w:w, h:h };
  }

  // The screenshot's own shape, held to a sane window.
  function shotAspect(img){
    return Math.max(WIN_ASPECT.min, Math.min(WIN_ASPECT.max, img.width / img.height));
  }

  // A fine grid, the stand-in for a picture that has not been dropped yet.
  function gridFill(c, x, y, w, h, line, step){
    c.save();
    c.beginPath(); c.rect(x, y, w, h); c.clip();
    c.strokeStyle = line; c.lineWidth = Math.max(1, step*0.03);
    c.beginPath();
    for (var gx = x + step; gx < x + w; gx += step) { c.moveTo(gx, y); c.lineTo(gx, y + h); }
    for (var gy = y + step; gy < y + h; gy += step) { c.moveTo(x, gy); c.lineTo(x + w, gy); }
    c.stroke();
    c.restore();
  }
  function placeholderLabel(c, x, y, w, h, text, color){
    c.font = '600 ' + Math.max(10, w*0.045).toFixed(1) + 'px ' + UI_FONT;
    c.fillStyle = color; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(text, x + w/2, y + h/2);
    c.textAlign = 'left'; c.textBaseline = 'alphabetic';
  }

  // The newer templates set their headline tight, the way display type is
  // set, which makes the words bigger in the same width. Browsers without
  // canvas letter-spacing get the font's own spacing; the fitting measures
  // whichever is in effect, so nothing overflows either way.
  function tightFont(c, px){
    c.font = headlineFont(px);
    if ('letterSpacing' in c) c.letterSpacing = (headFace().track * px).toFixed(1) + 'px';
  }
  function looseFont(c){ if ('letterSpacing' in c) c.letterSpacing = '0px'; }

  // Shrinks a headline until it and whatever sits beside it fit the width.
  function fitWith(c, text, maxW, startPx, minPx, extra){
    var px = startPx, step = Math.max(1, startPx/30);
    while (px > minPx) {
      tightFont(c, px);
      if (c.measureText(text).width + extra(px) <= maxW) break;
      px -= step;
    }
    looseFont(c);
    return px;
  }
  function none(){ return 0; }

  // The outlined tag the Launch template sets above its headline.
  function drawTag(c, x, capTop, h){
    var t = pillText(); if (!t) return 0;
    var fpx = h*0.52, A = accent();
    c.font = headlineFont(fpx);
    var w = c.measureText(t).width + h*0.9;
    roundRect(c, x, capTop, w, h, h*0.2);
    c.lineWidth = Math.max(1.5, h*0.06); c.strokeStyle = A; c.stroke();
    c.fillStyle = A; c.textBaseline = 'middle';
    c.fillText(t, x + h*0.45, capTop + h*0.54);
    c.textBaseline = 'alphabetic';
    return h;
  }

  // Launch: dot-grid dark, kicker, outlined tag, a big two-line headline with
  // an arrow after the first line, and the screenshot in a window framed in
  // the accent, with an optional sticker in its title bar.
  var LAUNCH_BAR = 0.07, LAUNCH_EDGE = 0.014;
  function drawLaunchWindow(c, x, y, w, h, deg, panX, panY){
    var A = accent(), bw = Math.max(3, w*LAUNCH_EDGE), r = w*0.035, bar = w*LAUNCH_BAR;
    c.save();
    c.translate(x + w/2, y + h/2); c.rotate(deg*Math.PI/180); c.translate(-w/2, -h/2);
    c.shadowColor = 'rgba(0,0,0,.55)'; c.shadowBlur = w*0.06; c.shadowOffsetY = w*0.02;
    roundRect(c, 0, 0, w, h, r); c.fillStyle = A; c.fill();
    noShadow(c);
    var ix = bw, iy = bw, iw = w - 2*bw, ih = h - 2*bw;
    c.save();
    roundRect(c, ix, iy, iw, ih, r - bw); c.clip();
    c.fillStyle = '#1c1b21'; c.fillRect(ix, iy, iw, ih);
    shown.win = cover(c, frame, ix, iy + bar, iw, ih - bar, state.zoom, panX, panY);
    c.fillStyle = '#29282f'; c.fillRect(ix, iy, iw, bar);
    c.restore();
    var lr = bar*0.16;
    ['#ff5f57', A, '#6b6870'].forEach(function(col, i){
      c.beginPath(); c.arc(ix + bar*0.5 + i*lr*3.1, iy + bar/2, lr, 0, Math.PI*2);
      c.fillStyle = col; c.fill();
    });
    var label = state.sticker.trim().toUpperCase();
    if (label) {
      var sh = bar*0.62, fpx = sh*0.5;
      c.font = monoFont(fpx);
      var sw = c.measureText(label).width + fpx*0.1*label.length + sh*0.9;
      var sx = ix + iw - bar*0.25 - sw, sy = iy + (bar - sh)/2;
      roundRect(c, sx, sy, sw, sh, sh*0.14); c.fillStyle = state.stickerColor; c.fill();
      c.fillStyle = inkOn(state.stickerColor, 110); c.textBaseline = 'middle';
      spaced(c, label, sx + sh*0.45, sy + sh*0.55, fpx*0.1);
      c.textBaseline = 'alphabetic';
    } else if (state.winTitle) {
      c.font = monoFont(bar*0.3); c.fillStyle = 'rgba(255,255,255,.6)'; c.textBaseline = 'middle';
      c.fillText(state.winTitle, ix + bar*0.5 + lr*9.5, iy + bar/2);
      c.textBaseline = 'alphabetic';
    }
    c.restore();
  }

  function drawLaunch(c, p, opts){
    var g = box(p), W = g.W, H = g.H, k = g.k;
    c.fillStyle = baseTone('#0f0e12'); c.fillRect(0, 0, W, H);
    // The dot grid, all in one path: at podcast size it is a couple of
    // thousand dots, and one fill keeps that cheap.
    if (state.dotGrid) {
      var step = 32*k, dr = Math.max(0.8, 1.6*k);
      c.beginPath();
      for (var y = step/2; y < H; y += step) for (var x = step/2; x < W; x += step) { c.moveTo(x + dr, y); c.arc(x, y, dr, 0, Math.PI*2); }
      c.fillStyle = 'rgba(255,255,255,.07)'; c.fill();
    }

    var kh = drawKicker(c, g.left, g.top, k);
    var textTop = g.top + (kh ? kh + 0.06*H : 0);
    var colR = g.wide ? g.left + (g.right - g.left)*0.46 : g.right;
    var maxW = colR - g.left;
    var l1 = state.line1.toUpperCase(), l2 = state.line2.toUpperCase();
    var start = (g.wide ? 150 : 130)*k*state.headScale;
    var px1 = l1 ? fitWith(c, l1, maxW, start, 24*k, function(px){ return px*1.1; }) : 0;
    var px2 = l2 ? fitWith(c, l2, maxW, start, 24*k, none) : 0;
    var tagH = pillText() ? 56*k*state.pillSize : 0;
    var blockH = (tagH ? tagH + 0.035*H : 0) + (px1 ? px1*0.74 : 0) + (px1 && px2 ? px2*1.02 : px2*0.74);

    // Wide: the words in the left column, centred in the height below the
    // kicker. Otherwise the words sit at the bottom and the window takes the
    // room between them and the kicker.
    // Wide: the words centre on the same band as the window - the full safe
    // height - and only drop when the kicker is in the way.
    var capTop = g.wide ? Math.max(textTop, g.top + (g.bottom - g.top - blockH)/2) : g.bottom - blockH;
    if (tagH) { drawTag(c, g.left, capTop, tagH); capTop += tagH + 0.035*H; }
    var base = capTop;
    if (l1) {
      base += px1*0.74;
      tightFont(c, px1); c.fillStyle = state.line1Color;
      c.fillText(l1, g.left, base);
      var after = c.measureText(l1).width;
      looseFont(c);
      drawArrow(c, g.left + after + px1*0.28, base - px1*0.36, px1, state.line1Color);
    }
    if (l2) {
      base += l1 ? px2*1.02 : px2*0.74;
      tightFont(c, px2);
      var st = activeStops(), lg = c.createLinearGradient(g.left, 0, g.left + Math.min(c.measureText(l2).width, maxW), 0);
      lg.addColorStop(0, st[0]); lg.addColorStop(0.45, st[1]); lg.addColorStop(1, st[2]);
      c.fillStyle = lg; c.fillText(l2, g.left, base);
      looseFont(c);
    }

    var a = shotAspect(frame);
    var winAspect = 1 / (1/a + LAUNCH_BAR + 2*LAUNCH_EDGE);
    var r = g.wide
      ? fitBox(g, g.left + (g.right - g.left)*0.5, g.top, g.right, g.bottom, winAspect, 0.94)
      : fitBox(g, g.left, textTop, g.right, capTop - (tagH ? tagH + 0.035*H : 0) - 0.05*H, winAspect, 0.94);
    if (!g.wide) r.x = g.left;   // stacked: on the words' edge, not centred
    if (r.w > 0) drawLaunchWindow(c, r.x, r.y, r.w, r.h, state.winTilt, state.panX*W, state.panY*H);
  }

  // Before -> After: a diagonal split, dark on one side and the palette on
  // the other. The top line is the dim "before" word over the before
  // picture; the bottom line follows an arrow over the after picture, which
  // gets the heavier card with a hard offset shadow.
  function drawVersus(c, p, opts){
    var g = box(p), W = g.W, H = g.H, k = g.k, st = activeStops(), ink = inkOn(st[2]);
    c.fillStyle = baseTone('#18171d'); c.fillRect(0, 0, W, H);
    // In a tall frame the split sits halfway through the room that is
    // actually usable - below the kicker, above the platform's own bottom
    // strip - so both halves get the same space, not the same pixels.
    var kickRoom = (state.kick1.trim() || state.kick2.trim()) ? 100*k : (state.logo && ready.logo ? 88*k*state.logoSize : 0);
    // The split's lean, as an angle: half of its rise either side of the
    // middle - across the height in a wide frame, across the width in a tall.
    var lean = Math.tan(state.splitAngle * Math.PI/180);
    var mid = (g.top + (kickRoom ? kickRoom + 0.03*H : 0) + g.bottom) / 2, tilt = lean*W/2, slant = lean*H/2;
    var fill = c.createLinearGradient(0, 0, W, H);
    fill.addColorStop(0, st[1]); fill.addColorStop(1, st[2]);
    c.beginPath();
    if (g.wide) { c.moveTo(W/2 + slant, 0); c.lineTo(W, 0); c.lineTo(W, H); c.lineTo(W/2 - slant, H); }
    else { c.moveTo(0, mid + tilt); c.lineTo(W, mid - tilt); c.lineTo(W, H); c.lineTo(0, H); }
    c.closePath(); c.fillStyle = fill; c.fill();

    var kh = drawKicker(c, g.left, g.top, k);
    var l1 = state.line1.toUpperCase(), l2 = state.line2.toUpperCase();
    var gap = 0.03*W;
    // the two halves: where each word and its card may go
    var A, B;
    if (g.wide) {
      var y0 = g.top + (kh ? kh + 0.07*H : 0);
      A = { x0:g.left, x1:W*0.455 - gap*0.5, y0:y0, y1:g.bottom };
      B = { x0:W*0.545 + gap*0.5, x1:g.right, y0:y0, y1:g.bottom };
    } else {
      A = { x0:g.left, x1:g.right, y0:g.top + (kh ? kh + 0.03*H : 0), y1:mid - tilt - 0.02*H };
      B = { x0:g.left, x1:g.right, y0:mid + tilt + 0.025*H, y1:g.bottom };
    }
    // One size for both words, so neither side shouts over the other; never
    // more than a fifth of a half's height.
    var start = Math.min(130*k*state.headScale, (A.y1 - A.y0)*0.2, (B.y1 - B.y0)*0.2);
    var px = Math.min(
      l1 ? fitWith(c, l1, A.x1 - A.x0, start, 20*k, none) : start,
      l2 ? fitWith(c, l2, B.x1 - B.x0, start, 20*k, none) : start);

    var aspect = shotAspect(frame);
    var cardTop = function(R){ return R.y0 + px*0.74 + (g.wide ? 0.05 : 0.025)*H; };
    var ra = fitBox(g, A.x0, cardTop(A), A.x1, A.y1, aspect, 0.96);
    var rb = fitBox(g, B.x0, cardTop(B), B.x1, B.y1 - 12*k, aspect, 0.96);
    // equal cards, so the comparison is fair
    var cw = Math.min(ra.w, rb.w), ch = cw / aspect;
    ra = { x:A.x0, y:cardTop(A), w:cw, h:ch };
    rb = { x:B.x0, y:cardTop(B), w:cw, h:ch };   // on the after word's edge, as the before card is on its own

    // words
    c.textBaseline = 'alphabetic';
    if (l1) {
      c.save(); c.globalAlpha = state.beforeFade;
      tightFont(c, px); c.fillStyle = state.line1Color;
      c.fillText(l1, A.x0, A.y0 + px*0.74);
      looseFont(c);
      c.restore();
    }
    if (l2) {
      tightFont(c, px); c.fillStyle = ink;
      c.fillText(l2, B.x0, B.y0 + px*0.74);
      looseFont(c);
    }

    var rad = 16*k;
    if (cw > 0) {
      // The before card is quiet by default - dark, soft edge - and can go
      // light, or match the after card when the two should read as equals.
      drawCard(c, ra, state.beforeCard, phoneImg, state.phoneZoom, state.phonePanX*ra.w, state.phonePanY*ra.w, k, rad,
               opts.preview ? 'Drop the before picture here' : '', 'phone');
      if (opts.preview) phoneHit = { x:ra.x, y:ra.y, w:ra.w, h:ra.h };
      drawCard(c, rb, 'match', frame, state.zoom, state.panX*W, state.panY*H, k, rad, '', 'win');

      // The arrow sits on the split, in a dark disc so it reads on either
      // side: between the cards in a wide frame; in a tall one at the split's
      // right end, pointing down, clear of the after word under it.
      var cx, cy, dr;
      if (g.wide) {
        cx = (ra.x + ra.w + rb.x) / 2; cy = ra.y + ch/2;
        dr = Math.max(14*k, Math.min(46*k, (rb.x - (ra.x + ra.w)) * 0.62));
      } else {
        dr = 46*k;
        cx = g.right - dr; cy = mid + tilt - 2*tilt*(cx / W);
      }
      if (state.arrow) {
        c.save();
        c.shadowColor = 'rgba(0,0,0,.45)'; c.shadowBlur = dr*0.5; c.shadowOffsetY = dr*0.12;
        c.beginPath(); c.arc(cx, cy, dr, 0, Math.PI*2); c.fillStyle = '#16151a'; c.fill();
        noShadow(c);
        c.translate(cx, cy); if (!g.wide) c.rotate(Math.PI/2);
        drawArrow(c, -dr*0.46, 0, dr*1.15, st[2]);
        c.restore();
      }
    }
  }

  // A picture card in one of three styles. 'dark': dark fill, soft grey
  // edge. 'light': white fill, thin ink edge. 'match': white, a heavy ink
  // edge and a hard offset shadow - the after card's look. With no picture
  // it shows a fine grid, and in the preview a hint to drop one.
  function drawCard(c, r, style, img, zoom, dx, dy, k, rad, hint, which){
    var dark = style === 'dark', bold = style === 'match';
    var edge = bold ? Math.max(2, 5*k) : 0;
    if (bold) { roundRect(c, r.x + 12*k, r.y + 12*k, r.w, r.h, rad); c.fillStyle = '#16151a'; c.fill(); }
    roundRect(c, r.x, r.y, r.w, r.h, rad); c.fillStyle = dark ? '#1d1c22' : '#ffffff'; c.fill();
    c.save();
    roundRect(c, r.x + edge, r.y + edge, r.w - 2*edge, r.h - 2*edge, rad - edge); c.clip();
    if (img) shown[which] = cover(c, img, r.x + edge, r.y + edge, r.w - 2*edge, r.h - 2*edge, zoom, dx, dy);
    else {
      gridFill(c, r.x, r.y, r.w, r.h, dark ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.07)', r.w/15);
      if (hint) placeholderLabel(c, r.x, r.y, r.w, r.h, hint, dark ? 'rgba(255,255,255,.4)' : 'rgba(0,0,0,.4)');
    }
    c.restore();
    roundRect(c, r.x, r.y, r.w, r.h, rad);
    if (bold) { c.lineWidth = edge; c.strokeStyle = '#16151a'; }
    else { c.lineWidth = Math.max(1.5, 3*k); c.strokeStyle = dark ? '#4a4652' : '#16151a'; }
    c.stroke();
  }

  var TEMPLATES = [
    { id:'bleed', name:'Full picture', hint:'The image fills the frame.',
      labels:{ img:'Image', l1:'Top line', l2:'Bottom line' },
      draw:function(c, p, o){ drawClassic(c, p, o); } },
    { id:'showcase', name:'Showcase', hint:'The image sits in a window on a dark backdrop, with a phone beside it.',
      labels:{ img:'Window picture', l1:'Top line', l2:'Bottom line' },
      draw:function(c, p, o){ drawClassic(c, p, o); } },
    { id:'launch', name:'Launch', hint:'A big two-line headline with an arrow, and the screenshot in a framed window.',
      labels:{ img:'Window picture', l1:'Top line', l2:'Bottom line' },
      draw:drawLaunch },
    { id:'versus', name:'Before → After', hint:'Two pictures side by side on a split, the second one lifted.',
      labels:{ img:'After picture', l1:'Before', l2:'After' },
      draw:drawVersus }
  ];
  function templateById(id){
    for (var i = 0; i < TEMPLATES.length; i++) if (TEMPLATES[i].id === id) return TEMPLATES[i];
    return TEMPLATES[0];
  }

  function drawGuides(c, p){
    var g = box(p), k = g.k, W = g.W, H = g.H;
    c.save();
    c.strokeStyle = 'rgba(255,196,0,.95)';
    c.lineWidth = Math.max(2, 3*k);
    c.setLineDash([14*k, 10*k]);
    c.strokeRect(g.left, g.top, g.right - g.left, g.bottom - g.top);
    if (g.stamp) {
      // a stand-in for the platform's own timestamp, where it will land
      var bw = 0.07*W, bh = 0.05*H, bx = W - 0.012*W - bw, by = H - 0.02*H - bh;
      c.setLineDash([]);
      roundRect(c, bx, by, bw, bh, bh*0.18); c.fillStyle = 'rgba(0,0,0,.8)'; c.fill();
      c.font = '600 ' + (bh*0.55).toFixed(1) + 'px ' + UI_FONT;
      c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText('12:34', bx + bw/2, by + bh/2);
      c.textAlign = 'left'; c.textBaseline = 'alphabetic';
      c.setLineDash([8*k, 6*k]);
      c.strokeRect(g.stampX, g.stampY, W - g.stampX, H - g.stampY);
    }
    c.restore();
  }

  // ---- renderer ---------------------------------------------------------
  function render(c, p, opts){
    opts = opts || {};
    if (opts.preview) phoneHit = null;
    c.clearRect(0, 0, p.w, p.h);
    templateById(state.layout).draw(c, p, opts);
    if (opts.guides) drawGuides(c, p);
  }


  var firstDraw = true;
  function draw(){
    var p = current();
    if (cv.width !== p.w || cv.height !== p.h) {
      cv.width = p.w; cv.height = p.h;
      // The cross-fade answers a size the person just picked. On the first
      // paint nobody picked anything, so a saved size would wash in for no
      // reason; skip it there.
      if (!firstDraw) {
        cv.classList.add('resizing');
        requestAnimationFrame(function(){
          requestAnimationFrame(function(){ cv.classList.remove('resizing'); });
        });
      }
    }
    render(ctx, p, { guides: state.safe, preview: true });
    tintWell();
    document.getElementById('what').textContent = p.label;
    document.getElementById('dims').innerHTML = p.w + ' &times; ' + p.h;
    if (customChip) sizeChip(customChip, p.id === 'custom' ? p : presetById('custom'));
    firstDraw = false;
    scheduleFeed();
    scheduleThumbs();
  }

  // ---- the well around the preview --------------------------------------
  // A 48x27 copy of the thumbnail, stretched and blurred by CSS, lights the
  // well; the average of those pixels, darkened, fills whatever the glow does
  // not reach. Shrinking the canvas this far costs well under a millisecond,
  // so it keeps up with a drag.
  var ambient = document.getElementById('ambient'), actx = ambient.getContext('2d', { willReadFrequently:true });
  var wellEl = document.getElementById('wrap');
  function tintWell(){
    try {
      actx.drawImage(cv, 0, 0, ambient.width, ambient.height);
      var d = actx.getImageData(0, 0, ambient.width, ambient.height).data, r = 0, g = 0, b = 0, n = d.length/4;
      for (var i = 0; i < d.length; i += 4) { r += d[i]; g += d[i+1]; b += d[i+2]; }
      // Kept well below the picture's own brightness, so the preview stays the
      // brightest thing in the well and its edges still read.
      var k = 0.55;
      wellEl.style.backgroundColor = 'rgb(' + Math.round(r/n*k) + ',' + Math.round(g/n*k) + ',' + Math.round(b/n*k) + ')';
    } catch (e) { /* a tainted canvas cannot be read; the default well stays */ }
  }

  // ---- feed-size preview ------------------------------------------------
  // Where each size is actually seen, and how wide it is there in CSS pixels.
  // The editor shows the thumbnail big; people meet it small. Only the places
  // where it is small enough to lose detail are listed: an Instagram post
  // fills the phone in the feed, so only its profile-grid tile is here.
  var FEED = {
    'youtube':          [['Suggested videos', 168], ['Home feed on a phone', 360]],
    'youtube-shorts':   [['Shorts shelf', 150]],
    'tiktok':           [['Profile grid', 124]],
    'instagram-reel':   [['Profile grid', 124]],
    'instagram-post':   [['Profile grid', 124]],
    'instagram-square': [['Profile grid', 124]],
    'x':                [['Timeline on a phone', 340]],
    'facebook':         [['Feed on a phone', 340]],
    'linkedin':         [['Feed on a phone', 340]],
    'twitch':           [['Browse grid', 240]],
    'podcast':          [['App list', 64], ['Show page', 160]],
    'blog-og':          [['Chat link preview', 240], ['Feed on a phone', 340]],
    'custom':           [['Small', 160], ['Medium', 320]]
  };
  var feedEl = document.getElementById('feed'), feedRow = document.getElementById('feedRow');
  var feedTimer = 0, feedSrc = document.createElement('canvas');

  // Redrawing the full-size picture again costs a frame, so the strip waits
  // until edits pause instead of following every drag step.
  function scheduleFeed(){
    if (!state.feed) return;
    clearTimeout(feedTimer);
    feedTimer = setTimeout(renderFeed, 150);
  }

  // Halving in steps before the last resize keeps fine detail from turning to
  // shimmer, which a single big jump would do - and would make small text look
  // worse than it really will.
  function shrinkTo(src, w, h){
    var cur = src;
    while (cur.width / 2 > w) {
      var half = document.createElement('canvas');
      half.width = Math.round(cur.width/2); half.height = Math.round(cur.height/2);
      var hg = half.getContext('2d'); hg.imageSmoothingQuality = 'high';
      hg.drawImage(cur, 0, 0, half.width, half.height);
      cur = half;
    }
    return cur;
  }

  function renderFeed(){
    var p = current();
    feedSrc.width = p.w; feedSrc.height = p.h;
    render(feedSrc.getContext('2d'), p, { guides:false });   // exactly what downloads
    var dpr = Math.min(3, window.devicePixelRatio || 1);
    feedRow.textContent = '';
    (FEED[p.id] || FEED.custom).forEach(function(spot){
      var cssW = spot[1], cssH = Math.floor(cssW * p.h / p.w);   // 168 wide is 94 tall, as YouTube draws it
      var fig = document.createElement('figure'); fig.className = 'feeditem';
      fig.style.width = cssW + 'px';
      var out = document.createElement('canvas');
      out.width = Math.round(cssW*dpr); out.height = Math.round(cssH*dpr);
      // Height follows the width, so a screen narrower than the spot shrinks
      // the tile instead of squashing it.
      out.style.width = cssW + 'px'; out.style.height = 'auto';
      out.setAttribute('role', 'img');
      out.setAttribute('aria-label', 'Your thumbnail at ' + cssW + ' by ' + cssH + ' pixels, as in ' + spot[0].toLowerCase());
      var og = out.getContext('2d'); og.imageSmoothingQuality = 'high';
      og.drawImage(shrinkTo(feedSrc, out.width, out.height), 0, 0, out.width, out.height);
      var text = document.createElement('div'); text.className = 'feedtext';
      text.setAttribute('aria-hidden', 'true');
      text.appendChild(document.createElement('span')); text.appendChild(document.createElement('span'));
      var cap = document.createElement('figcaption');
      cap.textContent = spot[0] + ' · ' + cssW + ' × ' + cssH;
      fig.appendChild(out);
      if (cssW >= 120) fig.appendChild(text);
      fig.appendChild(cap);
      feedRow.appendChild(fig);
    });
  }

  // ---- size chart -------------------------------------------------------
  // Each platform is shown at its true proportion, so the shape of the tile is
  // the answer to "which one do I need" before the label is read.
  var GROUPS = [
    { name:'Wide',   test:function(a){ return a > 1.2; } },
    { name:'Tall',   test:function(a){ return a < 0.85; } },
    { name:'Square', test:function(a){ return a >= 0.85 && a <= 1.2; } }
  ];
  var CHIP_H = 40, CHIP_MIN = 18, CHIP_MAX = 84;
  function sizeChip(el, p){
    var w = Math.max(CHIP_MIN, Math.min(CHIP_MAX, CHIP_H * (p.w/p.h)));
    var h = CHIP_H;
    if (p.w/p.h > CHIP_MAX/CHIP_H) { w = CHIP_MAX; h = CHIP_MAX / (p.w/p.h); }
    el.style.width = w.toFixed(1) + 'px';
    el.style.height = h.toFixed(1) + 'px';
  }

  var sizesEl = document.getElementById('sizes'), customChip = null;
  var customRow, cwEl, chEl;
  var tileInputs = [];

  // The custom width/height pair lives beside its own tile, not in a far-off
  // panel, so the number you type sits next to the shape it changes.
  function buildCustomRow(){
    customRow = document.createElement('div');
    customRow.className = 'row'; customRow.id = 'customRow'; customRow.hidden = true;
    [['cw','Width',state.customW],['ch','Height',state.customH]].forEach(function(f){
      var field = document.createElement('div'); field.className = 'field';
      var lab = document.createElement('label'); lab.htmlFor = f[0]; lab.textContent = f[1];
      var inp = document.createElement('input');
      inp.type = 'number'; inp.id = f[0]; inp.min = '64'; inp.max = '8000'; inp.step = '1';
      inp.inputMode = 'numeric';
      inp.value = f[2];
      field.appendChild(lab); field.appendChild(inp); customRow.appendChild(field);
      if (f[0] === 'cw') cwEl = inp; else chEl = inp;
    });
    return customRow;
  }
  function buildTile(p, isCustom){
    var tile = document.createElement('label');
    tile.className = 'tile' + (isCustom ? ' custom' : '');
    var input = document.createElement('input');
    input.type = 'radio'; input.name = 'preset'; input.value = p.id;
    input.checked = (p.id === state.preset);
    // The label's own text runs the name and the pixels together
    // ("YouTube1280x720"), so state it properly for a screen reader.
    input.setAttribute('aria-label', isCustom ? p.label
      : p.label + ', ' + p.w + ' by ' + p.h + ' pixels');
    var box = document.createElement('span'); box.className = 'chipbox';
    var chip = document.createElement('span'); chip.className = 'chip';
    sizeChip(chip, p);
    if (isCustom) { chip.textContent = '+'; customChip = chip; }
    box.appendChild(chip);
    var name = document.createElement('span'); name.className = 'name'; name.textContent = p.short;
    tile.appendChild(input); tile.appendChild(box); tile.appendChild(name);
    if (!isCustom) {
      var size = document.createElement('span'); size.className = 'size';
      size.textContent = p.w + '×' + p.h;
      tile.appendChild(size);
    }
    input.addEventListener('change', function(){
      if (!input.checked) return;
      state.preset = p.id; state.panX = 0; state.panY = 0;
      syncPresetUI(); persist(); draw();
    });
    tileInputs.push(input);
    return tile;
  }
  GROUPS.concat([{ name:'Custom', test:null }]).forEach(function(g){
    var members = PRESETS.filter(function(p){
      return g.test ? (p.id !== 'custom' && g.test(p.w/p.h)) : p.id === 'custom';
    });
    if (!members.length) return;
    var sec = document.createElement('section'); sec.className = 'sizegroup';
    var h = document.createElement('h2'); h.textContent = g.name;
    sec.setAttribute('aria-labelledby', (h.id = 'sizegroup-' + g.name.toLowerCase()));
    var tiles = document.createElement('div'); tiles.className = 'tiles';
    members.forEach(function(p){ tiles.appendChild(buildTile(p, !g.test)); });
    sec.appendChild(h); sec.appendChild(tiles);
    if (!g.test) { sec.classList.add('customgroup'); sec.appendChild(buildCustomRow()); }
    sizesEl.appendChild(sec);
  });

  // ---- the panel, built from CONTROLS -----------------------------------
  var fieldsEl = document.getElementById('fields'), togglesEl = document.getElementById('toggles');
  var built = [];   // { ctl, el, input(s), label } for every control on the page
  function labelFor(ctl, t){
    if (!ctl.label || typeof ctl.label === 'string') return ctl.label || '';
    return ctl.label[t] || ctl.label._;
  }
  function el(tag, cls, text){
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text) e.textContent = text;
    return e;
  }
  function hintEl(text){ return el('p', 'hint', text); }

  // Range values on screen are whole numbers; state keeps fractions for '%'.
  function toSlider(ctl, v){ return ctl.unit === '%' ? Math.round(v / (ctl.scale || 1) * 100) : v; }
  function fromSlider(ctl, v){ return ctl.unit === '%' ? v / 100 * (ctl.scale || 1) : +v; }
  function sayRange(ctl, input){
    input.setAttribute('aria-valuetext', input.value + (ctl.unit === '%' ? '%' : ' degrees'));
  }

  // One change path for every control: set the value, run the control's own
  // extra step, bring every copy of the control up to date, save, redraw.
  function setControl(key, value){
    state[key] = value;
    CONTROLS.forEach(function(ctl){ if (ctl.key === key && ctl.change) ctl.change(value); });
    syncControls();
    persist(); draw();
  }

  function buildControl(ctl){
    var id = ctl.id || ctl.key, wrap, input, label;
    switch (ctl.type) {
      case 'text':
        wrap = el('div', 'field');
        label = el('label'); label.htmlFor = id; wrap.appendChild(label);
        input = el('input'); input.type = 'text'; input.id = id; input.autocomplete = 'off';
        if (ctl.maxlength) input.maxLength = ctl.maxlength;
        if (ctl.placeholder) input.placeholder = ctl.placeholder;
        input.addEventListener('input', function(){ setControl(ctl.key, input.value); });
        if (ctl.pair) {
          var line = el('div', 'inline'), sw = el('input');
          sw.type = 'color'; sw.id = ctl.pair.key; sw.setAttribute('aria-label', ctl.pair.aria);
          sw.addEventListener('input', function(){ setControl(ctl.pair.key, sw.value); });
          line.appendChild(input); line.appendChild(sw); wrap.appendChild(line);
          built.push({ ctl:controlByKey(ctl.pair.key), el:null, input:sw });
        } else wrap.appendChild(input);
        break;
      case 'color':
        wrap = el('div', 'field');
        label = el('label'); label.htmlFor = id; wrap.appendChild(label);
        input = el('input'); input.type = 'color'; input.id = id;
        input.addEventListener('input', function(){ setControl(ctl.key, input.value); });
        wrap.appendChild(input);
        break;
      case 'range':
        wrap = el('div', 'field');
        label = el('label'); label.htmlFor = id; wrap.appendChild(label);
        input = el('input'); input.type = 'range'; input.id = id; input.min = ctl.min; input.max = ctl.max;
        input.addEventListener('input', function(){ sayRange(ctl, input); setControl(ctl.key, fromSlider(ctl, input.value)); });
        wrap.appendChild(input);
        break;
      case 'choice':
        wrap = el('fieldset', 'field seg');
        label = el('legend', 'legend'); wrap.appendChild(label);
        var segs = el('div', 'segs');
        input = ctl.options.map(function(o){
          var lab = el('label'), r = el('input');
          r.type = 'radio'; r.name = id; r.value = o[0];
          r.addEventListener('change', function(){ if (r.checked) setControl(ctl.key, o[0]); });
          lab.appendChild(r); lab.appendChild(document.createTextNode(' ' + o[1]));
          segs.appendChild(lab);
          return r;
        });
        wrap.appendChild(segs);
        break;
      case 'toggle':
        wrap = el('label', 'tog');
        input = el('input'); input.type = 'checkbox'; input.id = id;
        input.addEventListener('change', function(){ setControl(ctl.key, input.checked); });
        label = el('span');
        wrap.appendChild(input); wrap.appendChild(label);
        break;
      case 'font':
        wrap = el('div', 'field');
        label = el('label'); label.htmlFor = id; wrap.appendChild(label);
        input = el('select'); input.id = id;
        input.addEventListener('change', function(){ setControl(ctl.key, input.value); });
        wrap.appendChild(input);
        break;
      case 'image':
        wrap = el('div', 'field');
        label = el('span', 'legend'); label.id = id + 'Label'; wrap.appendChild(label);
        var ids = ctl.ids || { pick:id + 'Pick', file:id + 'File' };
        var btns = el('div', ctl.big ? '' : 'logobtns');
        var pick = el('button', ctl.big ? 'btn' : 'btn btn-sm', ctl.button);
        pick.id = ids.pick; pick.setAttribute('aria-describedby', label.id);
        var file = el('input'); file.type = 'file'; file.accept = 'image/*'; file.hidden = true; file.id = ids.file;
        pick.addEventListener('click', function(){ file.click(); });
        file.addEventListener('change', function(){ if (file.files[0]) SLOTS[ctl.slot].load(file.files[0]); file.value = ''; });
        btns.appendChild(pick);
        if (ctl.reset) {
          var reset = el('button', 'btn btn-sm', ctl.reset);
          reset.addEventListener('click', function(){ SLOTS[ctl.slot].clear(); });
          btns.appendChild(reset);
          input = reset;   // synced: shown only while the slot holds a picture
        }
        wrap.appendChild(btns); wrap.appendChild(file);
        break;
      case 'custom':
        wrap = ctl.build(ctl);
        label = wrap.querySelector('[data-label]');
        break;
    }
    if (ctl.hint && ctl.type !== 'toggle') wrap.appendChild(hintEl(ctl.hint));
    built.push({ ctl:ctl, el:wrap, input:input, label:label });
    return wrap;
  }
  function controlByKey(key){
    for (var i = 0; i < CONTROLS.length; i++) if (CONTROLS[i].key === key) return CONTROLS[i];
  }

  // Lay the list out: top-level fields, then one folding panel per group in
  // the order the groups first appear, with rows for controls that share one.
  (function layOut(){
    var groups = {}, order = [], lastField = null, rows = {};
    CONTROLS.forEach(function(ctl){
      if (ctl.paired) return;   // drawn inside its text field
      var parent;
      if (!ctl.group) parent = fieldsEl;
      else if (ctl.group === 'toggles') parent = togglesEl;
      else {
        if (!groups[ctl.group]) {
          var d = el('details', 'group'); d.setAttribute('name', 'panel');
          d.appendChild(el('summary', null, ctl.group));
          groups[ctl.group] = d; order.push(d);
        }
        parent = groups[ctl.group];
      }
      var w = buildControl(ctl);
      if (ctl.join && lastField) { lastField.appendChild(w); return; }
      if (ctl.row) {
        var rk = (ctl.group || '') + '/' + ctl.row;
        if (!rows[rk]) { rows[rk] = el('div', 'row'); parent.appendChild(rows[rk]); }
        rows[rk].appendChild(w);
      } else if (parent === togglesEl) {
        parent.insertBefore(w, parent.firstChild);
      } else parent.appendChild(w);
      lastField = w;
    });
    order.forEach(function(d){ fieldsEl.appendChild(d); });
  })();

  // Brings every control on the page into line with state and the template:
  // visibility, labels that change per template, values, enabled state.
  function syncControls(){
    var t = templateById(state.layout).id;
    var groupSeen = {};
    built.forEach(function(b){
      var ctl = b.ctl;
      if (b.el) {
        var show = (!ctl.for || ctl.for.indexOf(t) >= 0) && (!ctl.when || ctl.when());
        b.el.hidden = !show;
        if (b.el.parentNode && b.el.parentNode.classList.contains('row')) {
          // a row shows while any of its fields does
          var row = b.el.parentNode;
          row.hidden = !Array.prototype.some.call(row.children, function(c){ return !c.hidden; });
        }
        var g = b.el.closest('details');
        if (g) groupSeen[g.querySelector('summary').textContent] = groupSeen[g.querySelector('summary').textContent] || { d:g, any:false };
        if (g && show) groupSeen[g.querySelector('summary').textContent].any = true;
        if (b.label && ctl.type !== 'custom') b.label.textContent = labelFor(ctl, t);
      }
      if (!ctl.key || b.input == null) return;
      var v = state[ctl.key];
      switch (ctl.type) {
        case 'text': case 'color':
          if (b.input.value !== v && document.activeElement !== b.input) b.input.value = v;
          break;
        case 'range':
          if (document.activeElement !== b.input) b.input.value = toSlider(ctl, v);
          sayRange(ctl, b.input);
          break;
        case 'choice':
          b.input.forEach(function(r){ r.checked = (r.value === v); });
          break;
        case 'toggle':
          b.input.checked = !!v;
          var on = !ctl.enabled || ctl.enabled();
          b.input.disabled = !on; b.el.classList.toggle('off', !on);
          break;
        case 'font':
          var list = ctl.list();
          if (b.input.options.length !== list.length) {
            b.input.textContent = '';
            list.forEach(function(f){ var o = el('option', null, f.name); o.value = f.id; b.input.appendChild(o); });
          }
          b.input.value = fontById(list, v).id;
          break;
        case 'image':
          b.input.hidden = !SLOTS[ctl.slot].has();
          break;
      }
    });
    // a panel with nothing for this template steps aside
    Object.keys(groupSeen).forEach(function(k){ groupSeen[k].d.hidden = !groupSeen[k].any; });
  }

  // ---- custom widgets the schema places ---------------------------------
  function buildTemplatePicker(){
    var f = el('fieldset', 'field seg');
    var lg = el('legend', 'legend', 'Template'); f.appendChild(lg);
    var box = el('div', 'tpls'); box.id = 'tpls'; f.appendChild(box);
    var hint = hintEl(''); hint.id = 'layoutHint'; f.appendChild(hint);
    return f;
  }
  function buildPaletteSlot(){
    var w = el('div');
    var pals = el('div', 'palettes'); pals.id = 'palettes';
    pals.setAttribute('role', 'radiogroup'); pals.setAttribute('aria-label', 'Bottom line colour');
    var stops = el('div', 'stops'); stops.id = 'stops'; stops.hidden = true;
    w.appendChild(pals); w.appendChild(stops);
    return w;
  }
  function buildFontUpload(){
    var w = el('div', 'field');
    var btns = el('div', 'logobtns');
    var b = el('button', 'btn btn-sm', 'Use your own font file'); b.id = 'fontPick';
    var f = el('input'); f.type = 'file'; f.id = 'fontFile'; f.hidden = true; f.accept = '.ttf,.otf,.woff,.woff2,font/*';
    btns.appendChild(b); w.appendChild(btns); w.appendChild(f);
    w.appendChild(hintEl('Stock fonts load from Google Fonts when you pick them. Your own file stays in this tab and is gone when you close it.'));
    return w;
  }
  function buildLogoSlot(){
    var row = el('div', 'logorow');
    var prev = el('span', 'logopreview'), img = el('img'); img.id = 'logoThumb'; img.alt = 'The logo on your thumbnail';
    prev.appendChild(img);
    var btns = el('div', 'logobtns');
    var pick = el('button', 'btn btn-sm', 'Replace'); pick.id = 'logoPick';
    var reset = el('button', 'btn btn-sm', 'Use default'); reset.id = 'logoReset'; reset.hidden = true;
    var file = el('input'); file.type = 'file'; file.id = 'logoFile'; file.accept = 'image/*'; file.hidden = true;
    btns.appendChild(pick); btns.appendChild(reset);
    row.appendChild(prev); row.appendChild(btns); row.appendChild(file);
    return row;
  }

  function bind(id, fn){ document.getElementById(id).addEventListener('input', fn); }

  // ---- brand: the logo and the headline colours -------------------------
  // The tool ships with the KreativeKorna mark and gradient. Both are the
  // starting point, not a fixture: anyone can put their own in their place.
  var palettesEl = document.getElementById('palettes');
  var stopsEl = document.getElementById('stops'), stopInputs = [];
  PALETTES.forEach(function(pal){
    var wrap = document.createElement('label');
    wrap.className = 'pal' + (pal.stops ? '' : ' customp');
    var input = document.createElement('input');
    input.type = 'radio'; input.name = 'pal'; input.value = pal.id;
    input.checked = (pal.id === state.palette);
    input.setAttribute('aria-label', pal.name);
    var chip = document.createElement('span');
    chip.className = 'palchip';
    if (pal.stops) chip.style.background = cssGradient(pal.stops);
    else if (!pal.from) chip.textContent = '+';
    wrap.title = pal.name;
    if (pal.from) { wrap.dataset.from = pal.from; wrap.hidden = true; }
    input.addEventListener('change', function(){
      if (!input.checked) return;
      state.palette = pal.id; syncPalette(); persist(); draw();
    });
    wrap.appendChild(input); wrap.appendChild(chip);
    palettesEl.appendChild(wrap);
  });
  state.customStops.forEach(function(hex, i){
    var inp = document.createElement('input');
    inp.type = 'color'; inp.value = hex;
    inp.setAttribute('aria-label', ['First','Middle','Last'][i] + ' colour');
    inp.addEventListener('input', function(){
      state.customStops[i] = inp.value; syncPalette(); persist(); draw();
    });
    stopInputs.push(inp); stopsEl.appendChild(inp);
  });
  function syncPalette(){
    var custom = (state.palette === 'custom');
    stopsEl.hidden = !custom;
    var chip = palettesEl.querySelector('.pal.customp .palchip');
    if (chip) {
      chip.textContent = custom ? '' : '+';
      chip.style.background = custom ? cssGradient(state.customStops) : '';
    }
  }

  // A swatch per uploaded asset, showing the colours read out of it.
  function updateDerivedChips(){
    ['frame','logo'].forEach(function(kind){
      var wrap = palettesEl.querySelector('.pal[data-from="' + kind + '"]');
      if (!wrap) return;
      var stops = state.derived[kind];
      wrap.hidden = !stops;
      if (stops) wrap.querySelector('.palchip').style.background = cssGradient(stops);
    });
  }
  function refreshDerived(kind, source){
    var stops = paletteFromImage(source);
    if (!stops) return;
    state.derived[kind] = stops;
    updateDerivedChips();
    persist();
    if (paletteById(state.palette).from === kind) draw();
  }

  var logoThumb = document.getElementById('logoThumb');
  var logoFile = document.getElementById('logoFile');
  var logoResetBtn = document.getElementById('logoReset');
  function updateLogoThumb(){
    logoThumb.src = state.logoSrc || DEFAULT_LOGO;
    logoResetBtn.hidden = !state.logoSrc;
  }
  document.getElementById('logoPick').addEventListener('click', function(){ logoFile.click(); });
  logoFile.addEventListener('change', function(){
    var f = logoFile.files[0];
    if (!f) return;
    var reader = new FileReader();
    reader.onload = function(){
      state.logoSrc = reader.result;
      logo = new Image();
      logo.onload = function(){
        ready.logo = true; updateLogoThumb(); refreshDerived('logo', logo); persist(); draw();
        setStatus('Logo replaced. Its colours are in the swatches under Bottom line.', 'ok');
      };
      logo.onerror = function(){ setStatus('That file could not be read as an image.', 'err'); };
      logo.src = state.logoSrc;
    };
    reader.onerror = function(){ setStatus('That file could not be read.', 'err'); };
    reader.readAsDataURL(f);
    logoFile.value = '';
  });
  logoResetBtn.addEventListener('click', function(){
    state.logoSrc = null;
    logo = new Image();
    logo.onload = function(){ ready.logo = true; updateLogoThumb(); refreshDerived('logo', logo); persist(); draw(); };
    logo.src = DEFAULT_LOGO;
    setStatus('Default logo restored.', 'ok');
  });


  function syncPresetUI(){
    var p = presetById(state.preset);
    customRow.hidden = (p.id !== 'custom');
    syncControls();   // the play badge follows the size
  }
  function clampCustom(el, fallback){
    var n = parseInt(el.value, 10);
    if (!isFinite(n)) return fallback;
    return Math.max(64, Math.min(8000, n));
  }
  bind('cw', function(){ state.customW = clampCustom(cwEl, state.customW); persist(); draw(); });
  bind('ch', function(){ state.customH = clampCustom(chEl, state.customH); persist(); draw(); });

  // ---- the template picker ----------------------------------------------
  // One live preview per template, drawn with your own content at the size
  // you picked, so choosing is comparing rather than imagining.
  var tplsEl = document.getElementById('tpls'), tplThumbs = [];
  TEMPLATES.forEach(function(t){
    var lab = document.createElement('label'); lab.className = 'tpl';
    var input = document.createElement('input');
    input.type = 'radio'; input.name = 'layout'; input.value = t.id;
    var thumb = document.createElement('canvas');
    thumb.width = 240; thumb.height = 135; thumb.setAttribute('aria-hidden', 'true');
    var name = document.createElement('span'); name.textContent = t.name;
    lab.appendChild(input); lab.appendChild(thumb); lab.appendChild(name);
    tplsEl.appendChild(lab);
    tplThumbs.push({ t:t, cv:thumb });
  });
  var thumbTimer = 0;
  function scheduleThumbs(){
    clearTimeout(thumbTimer);
    thumbTimer = setTimeout(renderThumbs, 250);
  }
  // Each preview borrows the state for one render, at a small copy of the
  // current size; k scales everything down with it.
  function renderThumbs(){
    var p = current(), keep = state.layout, tw = 240, th = Math.round(tw * p.h / p.w);
    var small = { id:p.id, w:tw, h:th, safe:p.safe, play:p.play };
    tplThumbs.forEach(function(e){
      if (e.cv.width !== tw || e.cv.height !== th) { e.cv.width = tw; e.cv.height = th; }
      state.layout = e.t.id;
      render(e.cv.getContext('2d'), small, { guides:false });
    });
    state.layout = keep;
  }


  var layoutEls = document.querySelectorAll('input[name="layout"]');
  function syncLayout(){
    var t = templateById(state.layout);
    for (var i = 0; i < layoutEls.length; i++) layoutEls[i].checked = (layoutEls[i].value === t.id);
    document.getElementById('layoutHint').textContent = t.hint;
    syncControls();
  }
  for (var li = 0; li < layoutEls.length; li++) {
    layoutEls[li].addEventListener('change', function(e){
      if (!e.target.checked) return;
      state.panX = 0; state.panY = 0;
      // A full picture wants a little zoom to crop; a window or card wants the
      // whole screenshot, edge to edge.
      state.zoom = e.target.value === 'bleed' ? 1.25 : 1;
      setControl('layout', e.target.value);
      syncLayout();
    });
  }

  // ---- fonts ------------------------------------------------------------
  // Your own font file: read in the browser, added for this tab only, and
  // offered in both lists. It never leaves the page, like the pictures.
  var fontFile = document.getElementById('fontFile'), ownFonts = 0;
  document.getElementById('fontPick').addEventListener('click', function(){ fontFile.click(); });
  fontFile.addEventListener('change', function(){
    var f = fontFile.files[0];
    fontFile.value = '';
    if (!f) return;
    if (typeof FontFace !== 'function') { setStatus('This browser cannot load a font file.', 'err'); return; }
    f.arrayBuffer().then(function(buf){
      var family = 'Your font ' + (++ownFonts), face = new FontFace(family, buf);
      return face.load().then(function(loaded){
        document.fonts.add(loaded);
        var label = f.name.replace(/\.(ttf|otf|woff2?)$/i, '') + ' (yours)';
        var id = 'own-' + ownFonts;
        HEAD_FONTS.push({ id:id, name:label, family:family, weight:400, track:-0.02 });
        MONO_FONTS.push({ id:id, name:label, family:family, weight:400 });
        setControl('headFont', id);
        setStatus(label.replace(' (yours)', '') + ' is now the headline font. It lasts until you close the tab.', 'ok');
      });
    }).catch(function(){ setStatus('That file could not be read as a font.', 'err'); });
  });
  ensureFont(headFace()); ensureFont(monoFace());

  // ---- picture slots ----------------------------------------------------
  // Three pictures a template can use: the main one, a second one (the
  // phone's, or the before card's), and the backdrop's glow. Image controls
  // in the schema name a slot; the slot knows how to fill and empty it.
  var SLOTS = {
    main:     { load:function(b){ loadBlob(b); },     clear:function(){},   has:function(){ return true; } },
    second:   { load:function(b){ loadPhone(b); },    clear:clearSecond,    has:function(){ return !!phoneImg; } },
    backdrop: { load:function(b){ loadBackdrop(b); }, clear:clearBackdrop,  has:function(){ return !!bgImg; } }
  };
  function clearSecond(){
    phoneImg = null; syncControls(); draw();
    setStatus('Picture removed.', 'ok');
  }
  function loadPhone(blob){
    var img = new Image();
    img.onload = function(){
      phoneImg = img; state.phonePanX = 0; state.phonePanY = 0;
      syncControls(); draw();
      setStatus(state.layout === 'versus' ? 'Before picture loaded. Drag it on the left card to reframe it.'
                                          : 'Phone picture loaded. Drag it on the phone to reframe it.', 'ok');
    };
    img.onerror = function(){ setStatus('That file could not be read as an image.', 'err'); };
    img.src = URL.createObjectURL(blob);
  }
  // The backdrop's picture only lights the glow, so a photo that would be
  // wrong in the window can still set the mood behind it.
  function loadBackdrop(f){
    var img = new Image();
    img.onload = function(){
      bgImg = img;
      if (state.glow !== 'image') setControl('glow', 'image'); else { syncControls(); draw(); }
      setStatus('Backdrop picture loaded.', 'ok');
    };
    img.onerror = function(){ setStatus('That file could not be read as an image.', 'err'); };
    img.src = URL.createObjectURL(f);
  }
  function clearBackdrop(){
    bgImg = null; syncControls(); draw();
    setStatus('The backdrop glows from the window picture again.', 'ok');
  }

  // ---- view options (not part of the thumbnail) -------------------------
  var safeNote = document.getElementById('safeNote');
  var showFeedEl = document.getElementById('showFeed');
  showFeedEl.checked = state.feed; feedEl.hidden = !state.feed;
  showFeedEl.addEventListener('change', function(){
    state.feed = showFeedEl.checked; feedEl.hidden = !state.feed;
    persist();
    if (state.feed) renderFeed();
  });
  document.getElementById('showSafe').addEventListener('change', function(e){
    state.safe = e.target.checked; safeNote.hidden = !state.safe; draw();
  });

  // Everything the schema marks as remembered, plus the few settings that
  // live outside it: the size, the palette, the logo and the feed strip.
  function persist(){
    var out = {
      preset:state.preset, customW:state.customW, customH:state.customH,
      palette:state.palette, customStops:state.customStops, logoSrc:state.logoSrc,
      derived:state.derived, feed:state.feed
    };
    remembered().forEach(function(ctl){ out[ctl.key] = state[ctl.key]; });
    try { localStorage.setItem('tf-state', JSON.stringify(out)); } catch(e) {
      // A big custom logo can blow the storage quota. Losing the saved copy is
      // survivable; the logo stays put for this session either way.
    }
  }

  // ---- image loading ----------------------------------------------------
  // The main picture's button and file input come from the schema (slot 'main').
  function loadBlob(blob){
    var url = URL.createObjectURL(blob);
    var img = new Image();
    img.onload = function(){
      frame = img; ready.frame = true; state.panX = 0; state.panY = 0;
      refreshDerived('frame', img); draw();
      setStatus('Image loaded. Its colours are in the swatches under Bottom line.', 'ok');
    };
    img.onerror = function(){ setStatus('That file could not be read as an image.', 'err'); };
    img.src = url;
  }
  var wrap = document.getElementById('wrap');
  ['dragenter','dragover'].forEach(function(ev){ wrap.addEventListener(ev, function(e){ e.preventDefault(); wrap.classList.add('dropping'); }); });
  ['dragleave','drop'].forEach(function(ev){ wrap.addEventListener(ev, function(e){ e.preventDefault(); wrap.classList.remove('dropping'); }); });
  // A file dropped on the second picture - the phone, or the before card -
  // goes there; anywhere else it becomes the main picture.
  // phoneHit is the phone's box before its tilt; at a few degrees the
  // corners it misses are too small to matter.
  function overPhone(e){
    // phoneHit is set by whichever template draws the second picture.
    if (!phoneHit) return false;
    var rect = cv.getBoundingClientRect();
    var x = (e.clientX - rect.left) * cv.width / (rect.width || 1);
    var y = (e.clientY - rect.top) * cv.height / (rect.height || 1);
    return x >= phoneHit.x && x <= phoneHit.x + phoneHit.w && y >= phoneHit.y && y <= phoneHit.y + phoneHit.h;
  }
  wrap.addEventListener('drop', function(e){
    var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (!f) return;
    if (overPhone(e)) loadPhone(f); else loadBlob(f);
  });
  document.addEventListener('paste', function(e){
    var items = e.clipboardData && e.clipboardData.items;
    if (!items) return;
    for (var i=0;i<items.length;i++){
      if (items[i].type.indexOf('image') === 0) { loadBlob(items[i].getAsFile()); return; }
    }
  });

  // ---- drag to pan (stored as a fraction, so it survives a size change) --
  // A full redraw costs ~22ms at 3000x3000, and pointermove fires faster than
  // the frame rate, so drawing per event overruns the budget and the drag
  // stutters. Coalesce to one redraw per frame. The displayed size cannot
  // change mid-drag, so the rect is read once instead of on every move.
  // A drag that starts on the phone reframes the phone's picture; anywhere
  // else it reframes the main one. Each keeps its own position.
  var dragging = false, onPhone = false, sx=0, sy=0, spx=0, spy=0, dragW=1, dragH=1, panRaf=0;
  cv.addEventListener('pointerdown', function(e){
    dragging = true; cv.classList.add('dragging'); cv.setPointerCapture(e.pointerId);
    onPhone = overPhone(e);
    sx = e.clientX; sy = e.clientY;
    draw();   // refresh shown: an export may have drawn at another size since
    var p = current();
    if (onPhone) { spx = shown.phone[0]/phoneHit.w; spy = shown.phone[1]/phoneHit.w; }
    else { spx = shown.win[0]/p.w; spy = shown.win[1]/p.h; }
    var rect = cv.getBoundingClientRect();
    dragW = rect.width || 1; dragH = rect.height || 1;
    // Phone framing is stored against the phone's width, so a drag moves the
    // picture exactly as far as the pointer on any size.
    if (onPhone) { dragW = dragH = (rect.width || 1) * phoneHit.w / cv.width; }
  });
  cv.addEventListener('pointermove', function(e){
    if (!dragging) return;
    if (onPhone) {
      state.phonePanX = spx + (e.clientX - sx) / dragW;
      state.phonePanY = spy + (e.clientY - sy) / dragH;
    } else {
      state.panX = spx + (e.clientX - sx) / dragW;
      state.panY = spy + (e.clientY - sy) / dragH;
    }
    if (panRaf) return;
    panRaf = requestAnimationFrame(function(){ panRaf = 0; draw(); });
  });

  // Dragging is the only way to reframe the image, so it needs a keyboard path.
  // Shift takes bigger steps, the way nudging works elsewhere.
  var PAN_KEYS = { ArrowLeft:[-1,0], ArrowRight:[1,0], ArrowUp:[0,-1], ArrowDown:[0,1] };
  cv.addEventListener('keydown', function(e){
    var d = PAN_KEYS[e.key];
    if (!d || e.metaKey || e.ctrlKey || e.altKey) return;
    e.preventDefault();
    var step = e.shiftKey ? 0.05 : 0.01, p = current();
    state.panX = shown.win[0]/p.w + d[0] * step;
    state.panY = shown.win[1]/p.h + d[1] * step;
    draw();
  });
  ['pointerup','pointercancel'].forEach(function(ev){
    cv.addEventListener(ev, function(){
      dragging = false; cv.classList.remove('dragging');
      if (panRaf) { cancelAnimationFrame(panRaf); panRaf = 0; }
      draw();   // land on the exact final position
    });
  });

  // ---- download ---------------------------------------------------------
  var statusEl = document.getElementById('status');
  function setStatus(msg, cls){ statusEl.textContent = msg; statusEl.className = 'status' + (cls ? ' '+cls : ''); }
  function slug(){
    return (state.line2 || state.line1 || 'frame').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') || 'frame';
  }
  function fileName(p){ return 'thumbnail-' + slug() + '-' + p.id + '-' + p.w + 'x' + p.h + '.png'; }

  var saveBtn = document.getElementById('save');
  saveBtn.addEventListener('click', function(){
    var p = current();
    saveBtn.disabled = true; setStatus('Rendering…');
    // re-render without the guides so they never land in the export
    render(ctx, p, { guides:false });
    cv.toBlob(function(blob){
      draw();
      if (!blob) { saveBtn.disabled = false; setStatus('Could not render the image. Try a smaller size.', 'err'); return; }
      offer(blob, fileName(p));
      track('thumbnail_downloaded', { preset:p.id, layout:state.layout });
    }, 'image/png');
  });

  // Renders one preset on an off-screen canvas so the preview is untouched.
  function renderOffscreen(p, cb){
    var oc = document.createElement('canvas');
    oc.width = p.w; oc.height = p.h;
    render(oc.getContext('2d'), p, { guides:false });
    oc.toBlob(cb, 'image/png');
  }

  var allBtn = document.getElementById('saveAll');
  var allList = PRESETS.filter(function(p){ return p.id !== 'custom'; });
  allBtn.textContent = 'Download all ' + allList.length + ' sizes';
  allBtn.addEventListener('click', function(){
    allBtn.disabled = true; saveBtn.disabled = true;
    track('all_sizes_downloaded', { layout:state.layout });
    var i = 0;
    (function step(){
      if (i >= allList.length) {
        allBtn.disabled = false; saveBtn.disabled = false;
        setStatus('Saved ' + allList.length + ' files. Allow multiple downloads if your browser asked.', 'ok');
        return;
      }
      var p = allList[i++];
      setStatus('Rendering ' + p.label + ', ' + i + ' of ' + allList.length + '…');
      renderOffscreen(p, function(blob){
        if (blob) offer(blob, fileName(p), true);
        setTimeout(step, 350);
      });
    })();
  });

  function offer(blob, name, quiet){
    try {
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      if (!quiet) setStatus('Saved as ' + name, 'ok');
    } catch(e) {
      showFallback(blob);
    }
    if (!quiet) saveBtn.disabled = false;
  }
  function showFallback(blob){
    document.getElementById('fallbackImg').src = URL.createObjectURL(blob);
    document.getElementById('fallback').hidden = false;
    setStatus('');
  }

  syncLayout();
  syncPalette();
  updateLogoThumb();
  refreshDerived('frame', frame);   // the painted backdrop counts as an image too
  updateDerivedChips();
  draw();
  track('app_opened', { preset:state.preset, layout:state.layout });
})();
</script>

</body>
</html>
