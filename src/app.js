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
    phonePanX:0, phonePanY:0, pan3X:0, pan3Y:0, pan4X:0, pan4Y:0,   // framing of the extra pictures, as fractions of their box
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
  var CONTROLS = [
    { key:'layout', type:'custom', label:'Template', def:'collage', build:buildTemplatePicker,
      change:function(){ ensureFont(headFace()); } },
    // Pictures. Every picture a template uses gets the same four things, in
    // the same place: Choose, Remove, Zoom (40-250%), and a drag on the
    // preview to move it. The template's shape choice, where it has one,
    // sits right under them.
    { key:'main', type:'image', slot:'main', persist:false, button:'Choose', reset:'Remove',
      label:{ _:'Picture', launch:'Window picture', versus:'After picture', collage:'Main photo', talking:'Photo' },
      ids:{ pick:'pick', file:'file' } },
    { key:'zoom', type:'range', join:true, label:'Zoom', min:40, max:250, unit:'%', def:1, persist:false },
    { key:'second', type:'image', slot:'second', persist:false, for:['versus', 'collage'], when:secondInUse,
      label:{ _:'Picture', versus:'Before picture', collage:'Strip, top' }, button:'Choose', reset:'Remove' },
    { key:'phoneZoom', type:'range', join:true, label:'Zoom', min:40, max:250, unit:'%', def:1, persist:false,
      for:['versus', 'collage'], when:secondInUse },
    { key:'third', type:'image', slot:'third', persist:false, for:['collage'], when:hasStrip,
      label:'Strip, middle', button:'Choose', reset:'Remove' },
    { key:'zoom3', type:'range', join:true, label:'Zoom', min:40, max:250, unit:'%', def:1, persist:false, for:['collage'], when:hasStrip },
    { key:'fourth', type:'image', slot:'fourth', persist:false, for:['collage'], when:hasStrip,
      label:'Strip, bottom', button:'Choose', reset:'Remove' },
    { key:'zoom4', type:'range', join:true, label:'Zoom', min:40, max:250, unit:'%', def:1, persist:false, for:['collage'], when:hasStrip },
    { key:'vsShape', type:'choice', for:['versus'], label:'Picture shape', def:'circle',
      options:[['circle','Circle'], ['card','Card']] },
    { key:'tpShape', type:'choice', for:['talking'], label:'Picture shape', def:'auto',
      options:[['auto','Auto'], ['circle','Circle'], ['frame','Frame']],
      hint:'Auto uses a circle for a photo and a frame in the picture\u2019s own shape for a screenshot, so none of it is cropped away.' },
    { id:'pictureHint', type:'custom', build:buildPictureHint },
    { key:'line1', type:'text', label:{ _:'Top line', versus:'Headline', collage:'Headline', talking:'Headline' }, def:'TYPE YOUR', maxlength:32,
      pair:{ key:'line1Color', aria:'Headline colour' } },
    { key:'line1Color', type:'color', def:'#ffffff', paired:true },
    { key:'line2', type:'text', label:{ _:'Bottom line', versus:'Accent words', collage:'Accent words', talking:'Key word' }, def:'HEADLINE HERE', maxlength:24 },
    { id:'palette', type:'custom', build:buildPaletteSlot, join:true },

    // Launch's own label above its headline
    { key:'badge', type:'text', group:'Project tag', for:['launch'], label:'Text', def:'', maxlength:32,
      placeholder:'JUSTDB', hint:'An outlined label above the headline. Leave it empty for none.' },
    { key:'pillSize', type:'range', group:'Project tag', for:['launch'], label:'Size', min:70, max:160, unit:'%', def:1 },

    { key:'kick1', type:'text', group:'Kicker', for:['launch'], label:'First line', def:'YOUR CHANNEL', maxlength:32, placeholder:'YOUR CHANNEL' },
    { key:'kick2', type:'text', group:'Kicker', for:['launch'], label:'Accent line', def:'EPISODE 01', maxlength:24, placeholder:'EPISODE 01',
      hint:'Two short lines in a corner bracket. Leave both empty to show the logo instead.' },

    // Collage: the strip of three pictures between the words and the photo
    { key:'strip', type:'toggle', group:'Strip', for:['collage'], label:'Strip of three pictures', def:true },

    { key:'headFont', type:'font', group:'Text', label:'Headline font', def:'auto', list:function(){ return HEAD_FONTS; },
      change:function(){ ensureFont(headFace()); } },
    { key:'headScale', type:'range', group:'Text', label:'Headline size', min:60, max:140, unit:'%', def:1,
      hint:'The headline still shrinks to fit its space; this sets how big it starts.' },
    { key:'monoFont', type:'font', group:'Text', for:['launch'], label:'Kicker and labels font', def:'jetbrains',
      list:function(){ return MONO_FONTS; }, change:function(){ ensureFont(monoFace()); } },
    { id:'fontUpload', type:'custom', group:'Text', build:buildFontUpload },

    { key:'winTitle', type:'text', group:'Window', for:['launch'], label:'Title', def:'', maxlength:40, placeholder:'index.html' },
    { key:'sticker', type:'text', group:'Window', for:['launch'], label:'Sticker', def:'', maxlength:28,
      placeholder:'IT BROKE. I LEFT IT IN.', hint:'A label in the title bar. It takes the title’s place.',
      pair:{ key:'stickerColor', aria:'Sticker colour' } },
    { key:'stickerColor', type:'color', def:'#ff5b3a', paired:true },
    { key:'launchTilt', type:'range', group:'Window', for:['launch'], label:'Tilt', min:-12, max:12, unit:'°', def:-2 },

    { key:'tone', type:'choice', group:'Background', for:['launch', 'versus'], label:'Base colour', def:'neutral',
      options:[['neutral','Neutral'], ['palette','From colours'], ['custom','Custom']],
      hint:'The dark behind everything. From colours takes a deep shade of the palette.' },
    { key:'toneColor', type:'color', group:'Background', for:['launch', 'versus'], when:function(){ return state.tone === 'custom'; },
      label:'Colour', def:'#18171d' },
    { key:'dotGrid', type:'toggle', group:'Background', for:['launch'], label:'Dot grid', def:true },
    { key:'paper', type:'color', group:'Background', for:['collage'], label:'Paper', def:'#f6f3ec' },
    { key:'brush', type:'toggle', group:'Background', for:['collage'], label:'Brush bands and underline', def:true },
    { key:'paper2', type:'color', group:'Background', for:['talking'], label:'Paper', def:'#ecebe8' },
    { key:'arrow2', type:'toggle', group:'Background', for:['talking'], label:'Hand-drawn arrow', def:true },

    { key:'beforeLabel', type:'text', group:'Details', for:['versus'], label:'Before label', def:'BEFORE', maxlength:16, row:'labels' },
    { key:'afterLabel', type:'text', group:'Details', for:['versus'], label:'After label', def:'AFTER', maxlength:16, row:'labels' },
    { key:'vsDivider', type:'choice', group:'Details', for:['versus'], label:'Between them', def:'slash',
      options:[['slash','Slash'], ['split','Split field']] },
    { key:'splitAngle', type:'range', group:'Details', for:['versus'], label:'Lean', min:0, max:20, unit:'°', def:8 },
    // measured off the reference: its strip and photo lean about 16 degrees
    { key:'collageLean', type:'range', group:'Strip', for:['collage'], label:'Lean', min:0, max:24, unit:'°', def:16 },
    // the reference's headline is turned too: -3.7 degrees, measured off ILLEGAL
    { key:'collageTilt', type:'range', group:'Text', for:['collage'], label:'Headline tilt', min:-10, max:10, unit:'°', def:-4 },
    { key:'arrow', type:'toggle', group:'Details', for:['versus'], label:'Curved arrow from one to the other', def:true },
    { key:'backdrop', type:'image', slot:'backdrop', persist:false, group:'Background', for:['versus'], label:'Background picture',
      button:'Choose background picture', reset:'Remove', id:'vsBackdrop',
      hint:'Replaces the textured field, darkened so the pictures stay in front.' },

    { id:'logoSlot', type:'custom', group:'Logo', build:buildLogoSlot },
    { key:'logo', type:'toggle', group:'Logo', label:'Show it on the thumbnail', def:true, persist:false },
    { key:'logoSize', type:'range', group:'Logo', label:'Size', min:50, max:160, unit:'%', def:1 }
  ];
  function hasStrip(){ return state.strip; }
  function secondInUse(){ return state.layout !== 'collage' || state.strip; }

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
  // phoneImg is the second picture (Before -> After's before, the Collage
  // strip's top panel); img3 and img4 are the strip's other two.
  var logo = new Image(), frame = makeDefaultFrame(), phoneImg = null, bgImg = null, img3 = null, img4 = null;
  var paintedFrame = frame;   // the stand-in until a picture is dropped
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
    { id:'auto', name:'The template\u2019s own' },   // each template names the face it was designed with
    { id:'archivo-black', name:'Archivo Black', family:'Archivo Black', weight:400, track:-0.045, css:'Archivo+Black' },
    { id:'anton',         name:'Anton',         family:'Anton',         weight:400, track:-0.01,  css:'Anton' },
    { id:'league-gothic', name:'League Gothic', family:'League Gothic', weight:400, track:0,      css:'League+Gothic' },
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
  var headFace = function(){
    var id = state.headFont === 'auto' ? (templateById(state.layout).font || 'archivo-black') : state.headFont;
    return fontById(HEAD_FONTS.slice(1), id);
  };
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

  // ---- drawing helpers --------------------------------------------------
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
  // Below 100% zoom the picture shrinks inside its box so all of it shows;
  // the room around it is filled with a blurred, darkened copy of the same
  // picture, never empty bars.
  function cover(c, img, x, y, w, h, zoom, dx, dy){
    var s = Math.max(w/img.width, h/img.height) * (zoom || 1);
    var iw = img.width*s, ih = img.height*s;
    if (iw < w - 0.5 || ih < h - 0.5) {
      var full = Math.max(w/img.width, h/img.height);
      c.save();
      c.beginPath(); c.rect(x, y, w, h); c.clip();
      if (typeof c.filter === 'string') c.filter = 'blur(' + Math.round(Math.max(w, h)*0.03) + 'px) brightness(.6)';
      c.drawImage(img, x + (w - img.width*full)/2, y + (h - img.height*full)/2, img.width*full, img.height*full);
      c.restore();
      if (typeof c.filter !== 'string') { c.fillStyle = 'rgba(0,0,0,.4)'; c.fillRect(x, y, w, h); }
    }
    var mx = Math.max(0, (iw-w)/2), my = Math.max(0, (ih-h)/2);
    dx = Math.max(-mx, Math.min(mx, dx || 0));
    dy = Math.max(-my, Math.min(my, dy || 0));
    c.drawImage(img, x + (w-iw)/2 + dx, y + (h-ih)/2 + dy, iw, ih);
    return [dx, dy];
  }

  // The backdrop glow: the image shrunk to a few dozen pixels, then stretched
  // back up, is a blur every browser can draw. Browsers with canvas filters
  // get a smoother one on top of that.
  // Launch's project tag, the outlined label above its headline. A dot typed
  // between words gets room to breathe.
  function pillText(){
    return state.badge.trim().toUpperCase().replace(/\s*·\s*/g, '  ·  ');
  }
  // Pictures are shown in their own shape, held between 1.2:1 and 2.2:1 so a
  // very tall or very wide one is cropped to something a frame can carry.
  var WIN_ASPECT = { min:1.2, max:2.2 };

  // ---- sizes and corners -------------------------------------------------
  // Every measurement is derived from the target size, so one routine covers
  // 1280x720 and 1080x1920 alike. k is the geometric-mean scale against the
  // original 1280x720 design.
  // Corners a platform prints over. YouTube puts the video's length in the
  // bottom right; templates keep their words and frames out of it. Sizes are
  // fractions of the canvas, measured from that corner.
  var STAMPS = { youtube:{ w:0.14, h:0.12 } };

  // The pan each picture was actually drawn at, after cover() stopped it at
  // the edge. A drag starts from here, so pulling past the edge and back
  // does not leave a dead zone to cross first.
  var shown = { win:[0,0], phone:[0,0], third:[0,0], fourth:[0,0] };
  // Every picture keeps its own framing: a zoom, and a pan offset. The main
  // picture's pan is a fraction of the canvas; the others' a fraction of
  // their own box's width, so a drag moves them as far as the pointer.
  var FRAMING = {
    main:   { zoom:'zoom',      x:'panX',      y:'panY',      shown:'win' },
    second: { zoom:'phoneZoom', x:'phonePanX', y:'phonePanY', shown:'phone' },
    third:  { zoom:'zoom3',     x:'pan3X',     y:'pan3Y',     shown:'third' },
    fourth: { zoom:'zoom4',     x:'pan4X',     y:'pan4Y',     shown:'fourth' }
  };
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
  // The stand-in backdrop is square, but it stands in for a screenshot, so
  // until a real picture arrives windows and cards take a screen's 16:10.
  function shotAspect(img){
    if (img === paintedFrame) return 1.6;
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
    var colR = g.wide ? g.left + (g.right - g.left)*0.5 : g.right;
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
      ? fitBox(g, g.left + (g.right - g.left)*0.54, g.top, g.right, g.bottom, winAspect, 0.94)
      : fitBox(g, g.left, textTop, g.right, capTop - (tagH ? tagH + 0.035*H : 0) - 0.05*H, winAspect, 0.94);
    if (!g.wide) r.x = g.left;   // stacked: on the words' edge, not centred
    if (r.w > 0) drawLaunchWindow(c, r.x, r.y, r.w, r.h, state.launchTilt, state.panX*W, state.panY*H);
  }

  // Before -> After, built to docs/quality-bar.md. Two big pictures -
  // circles by default - on a textured field in the palette's colours, a
  // bright slash between them, a curved dashed arrow from one to the other,
  // small BEFORE / AFTER labels, and one heavy headline across the bottom
  // with the second line as its accent. Tall frames stack the pictures and
  // give the headline two lines.
  function deepShade(hex, l){
    var n = parseInt(hex.slice(1), 16), hsl = rgbToHsl(n>>16&255, n>>8&255, n&255);
    return hslToHex(hsl[0], Math.min(1, hsl[1]*1.1), l);
  }

  // The field: the palette's first colour deepened, lit from the top, with a
  // few soft marbled streaks for texture and a darker floor for the words.
  function drawField(c, W, H, k, st){
    if (bgImg && state.layout === 'versus') {
      cover(c, bgImg, 0, 0, W, H);
      c.fillStyle = 'rgba(0,0,0,.45)'; c.fillRect(0, 0, W, H);
    } else {
      var base = baseTone(deepShade(st[0], 0.2));
      c.fillStyle = base; c.fillRect(0, 0, W, H);
      var R = Math.max(W, H);
      var lit = c.createRadialGradient(W*0.5, -H*0.1, 0, W*0.5, -H*0.1, R*0.9);
      lit.addColorStop(0, deepShade(st[0], 0.42)); lit.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = lit; c.fillRect(0, 0, W, H);
      // marbling: long soft curves, drawn wide and faint
      c.save();
      c.lineCap = 'round';
      var streaks = [[0.05, 0.3, 0.4, 0.05, 0.7, 0.45, 1.05, 0.15], [-0.05, 0.75, 0.3, 0.45, 0.65, 0.9, 1.05, 0.6],
                     [0.1, 1.05, 0.35, 0.7, 0.6, 1.0, 0.95, 0.8], [0.3, -0.05, 0.45, 0.4, 0.55, 0.2, 0.75, 0.55]];
      streaks.forEach(function(s, i){
        c.beginPath();
        c.moveTo(s[0]*W, s[1]*H); c.bezierCurveTo(s[2]*W, s[3]*H, s[4]*W, s[5]*H, s[6]*W, s[7]*H);
        c.strokeStyle = 'rgba(255,255,255,' + (i % 2 ? 0.05 : 0.08) + ')';
        c.lineWidth = (18 + i*10) * k; c.stroke();
        c.strokeStyle = 'rgba(255,255,255,.12)'; c.lineWidth = 2*k; c.stroke();
      });
      c.restore();
    }
    var floor = c.createLinearGradient(0, H*0.55, 0, H);
    floor.addColorStop(0, 'rgba(0,0,0,0)'); floor.addColorStop(1, 'rgba(0,0,0,.72)');
    c.fillStyle = floor; c.fillRect(0, 0, W, H);
  }

  // Stand-ins that look like pictures, so the template reads as finished
  // before anything is dropped: a flat, cool, washed-out before and a lit,
  // saturated after in the palette's colours.
  function paintStandIn(c, x, y, w, h, after, st){
    var g = c.createLinearGradient(x, y, x + w, y + h);
    if (after) { g.addColorStop(0, st[0]); g.addColorStop(0.55, st[1]); g.addColorStop(1, st[2]); }
    else { g.addColorStop(0, '#6e7278'); g.addColorStop(1, '#3d4046'); }
    c.fillStyle = g; c.fillRect(x, y, w, h);
    var glow = c.createRadialGradient(x + w*0.35, y + h*0.3, 0, x + w*0.35, y + h*0.3, w*0.7);
    glow.addColorStop(0, after ? 'rgba(255,255,255,.55)' : 'rgba(255,255,255,.12)'); glow.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = glow; c.fillRect(x, y, w, h);
    // a soft figure, so the shape reads as a photo of something
    c.fillStyle = after ? 'rgba(0,0,0,.28)' : 'rgba(0,0,0,.35)';
    c.beginPath(); c.ellipse(x + w*0.5, y + h*0.98, w*0.34, h*0.42, 0, 0, Math.PI*2); c.fill();
    c.beginPath(); c.arc(x + w*0.5, y + h*0.38, w*0.14, 0, Math.PI*2); c.fill();
  }

  // One picture, as a circle or a card, ringed in white and lifted off the
  // field. Returns its bounding box.
  function drawPicture(c, cx, cy, d, img, after, which, opts, k, st){
    var circle = state.vsShape !== 'card';
    var w = circle ? d : d*1.18, h = circle ? d : d*0.86, x = cx - w/2, y = cy - h/2, r = circle ? d/2 : d*0.07;
    var ring = Math.max(2, d*0.016);
    function shape(pad){
      if (circle) { c.beginPath(); c.arc(cx, cy, d/2 - pad, 0, Math.PI*2); }
      else roundRect(c, x + pad, y + pad, w - 2*pad, h - 2*pad, Math.max(0, r - pad));
    }
    c.save();
    c.shadowColor = 'rgba(0,0,0,.55)'; c.shadowBlur = d*0.12; c.shadowOffsetY = d*0.04;
    shape(0); c.fillStyle = '#ffffff'; c.fill();
    c.restore();
    c.save(); shape(ring); c.clip();
    if (img) shown[which] = cover(c, img, x + ring, y + ring, w - 2*ring, h - 2*ring,
                                  which === 'win' ? state.zoom : state.phoneZoom,
                                  which === 'win' ? state.panX*c.canvas.width : state.phonePanX*w,
                                  which === 'win' ? state.panY*c.canvas.height : state.phonePanY*w);
    else {
      paintStandIn(c, x, y, w, h, after, st);
      if (opts.preview) placeholderLabel(c, x, y, w, h, after ? 'Drop the after picture' : 'Drop the before picture', 'rgba(255,255,255,.75)');
    }
    c.restore();
    return { x:x, y:y, w:w, h:h };
  }

  // A small label centred on a picture's top edge: dark for before, the
  // accent for after, set straight so it reads at feed size.
  function drawLabel(c, text, cx, edgeY, h, after, st, fromLeft){
    text = text.trim().toUpperCase(); if (!text) return;
    tightFont(c, h*0.56);
    var w = c.measureText(text).width + h*0.9, x = fromLeft ? cx : cx - w/2, y = fromLeft ? edgeY : edgeY - h*0.55;
    c.save();
    c.shadowColor = 'rgba(0,0,0,.4)'; c.shadowBlur = h*0.4; c.shadowOffsetY = h*0.1;
    roundRect(c, x, y, w, h, h*0.22); c.fillStyle = after ? st[2] : '#16151a'; c.fill();
    c.restore();
    c.fillStyle = after ? inkOn(st[2]) : '#ffffff'; c.textBaseline = 'middle';
    c.fillText(text, x + h*0.45, y + h*0.55);
    c.textBaseline = 'alphabetic'; looseFont(c);
  }

  // The dashed, curved arrow from one picture to the next.
  function drawCurvedArrow(c, x0, y0, x1, y1, bend, k){
    var mx = (x0 + x1)/2 + bend.x, my = (y0 + y1)/2 + bend.y;
    c.save();
    c.strokeStyle = '#ffffff'; c.lineWidth = Math.max(2, 4*k); c.lineCap = 'round';
    c.setLineDash([10*k, 9*k]);
    c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo(mx, my, x1, y1); c.stroke();
    c.setLineDash([]);
    // the head points along the curve's last stretch
    var a = Math.atan2(y1 - my, x1 - mx), hl = 18*k;
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.moveTo(x1 + Math.cos(a)*hl*0.3, y1 + Math.sin(a)*hl*0.3);
    c.lineTo(x1 - Math.cos(a - 0.5)*hl, y1 - Math.sin(a - 0.5)*hl);
    c.lineTo(x1 - Math.cos(a + 0.5)*hl, y1 - Math.sin(a + 0.5)*hl);
    c.closePath(); c.fill();
    c.restore();
  }

  // The headline: a heavy line, slanted like a sports headline, with the
  // second line as the accent. Returns the capital height it drew at.
  function slantedLine(c, parts, cx, base, px){
    tightFont(c, px);
    var widths = parts.map(function(p){ return c.measureText(p.t).width; });
    var space = c.measureText(' ').width, total = widths.reduce(function(a, b){ return a + b; }, 0) + space*(parts.length - 1);
    var x = cx - total/2;
    c.save();
    c.translate(0, base); c.transform(1, 0, -0.18, 1, 0, 0); c.translate(0, -base);
    c.shadowColor = 'rgba(0,0,0,.6)'; c.shadowBlur = px*0.18; c.shadowOffsetY = px*0.04;
    parts.forEach(function(p, i){
      c.fillStyle = p.color; c.fillText(p.t, x, base);
      x += widths[i] + space;
    });
    c.restore(); looseFont(c);
    return total;
  }
  // Tries every way of breaking each part of the headline into lines - up
  // to four for the main words, two for the accent - and keeps the one that
  // sets the words biggest while the block still fits the height it is
  // given. Headlines are a handful of words, so trying them all is cheap;
  // the answer is cached, since the same words are set on every redraw.
  var breakCache = {};
  // A break worked out while a face was still loading was measured in the
  // fallback, so every finished font load throws the cached answers away.
  if (document.fonts && document.fonts.addEventListener) {
    document.fonts.addEventListener('loadingdone', function(){ breakCache = {}; draw(); });
  }
  function splits(words, most){
    var out = [];
    (function walk(start, acc){
      if (start === words.length) { out.push(acc); return; }
      if (acc.length === most) return;
      for (var end = start + 1; end <= words.length; end++) walk(end, acc.concat([words.slice(start, end).join(' ')]));
    })(0, []);
    return out;
  }
  function bestBreak(c, main, accent, maxW, startPx, minPx, maxH, leadF){
    leadF = leadF || 1.28;
    var key = [leadF, main, accent, Math.round(maxW), Math.round(startPx), Math.round(minPx), Math.round(maxH), c.font && headlineFont(10), state.headFont, state.layout].join('|');
    if (breakCache[key]) return breakCache[key];
    var w1 = main.toUpperCase().trim().split(/\s+/).filter(Boolean), w2 = accent.toUpperCase().trim().split(/\s+/).filter(Boolean);
    var fitCache = {};
    function fit(t){ return fitCache[t] || (fitCache[t] = fitWith(c, t, maxW, startPx, minPx, function(q){ return q*0.2; })); }
    var mains = w1.length ? splits(w1, 4) : [[]], accs = w2.length ? splits(w2, 2) : [[]];
    var best = { px:0, lines:[] };
    mains.forEach(function(m){ accs.forEach(function(a){
      var lines = m.map(function(t){ return { t:t, accent:false }; }).concat(a.map(function(t){ return { t:t, accent:true }; }));
      if (!lines.length) return;
      var px = Math.min.apply(null, lines.map(function(l){ return fit(l.t); }));
      var cap = capOf(c, px), h = cap + (lines.length - 1)*cap*leadF;
      if (h > maxH) px *= maxH / h;
      // fewer lines win a tie, so words are only broken when it pays
      if (px > best.px + 0.5 || (Math.abs(px - best.px) <= 0.5 && lines.length < best.lines.length)) best = { px:px, lines:lines };
    }); });
    if (Object.keys(breakCache).length > 200) breakCache = {};
    return (breakCache[key] = best);
  }
  function capOf(c, px){ tightFont(c, px); var m = c.measureText('H'); looseFont(c); return m.actualBoundingBoxAscent || px*0.72; }

  // Tall and square frames can't hold two big circles, so there the
  // pictures go full bleed: before on top (or left), after below (or
  // right), cut by the slash, with the headline over a darkened floor. This
  // is how tall before/after covers are actually made.
  function drawVersusHalves(c, g, opts, st, report){
    var W = g.W, H = g.H, k = g.k, tall = (W/H) < 0.85;
    var lean = Math.tan(state.splitAngle * Math.PI/180);
    // the split runs through the middle of the room above the words
    var A, B, line;
    if (tall) {
      var mid = H*0.46, t = lean*W/2;
      A = [[0,0],[W,0],[W,mid - t],[0,mid + t]];
      B = [[0,mid + t],[W,mid - t],[W,H],[0,H]];
      line = [[0, mid + t], [W, mid - t]];
    } else {
      var s2 = lean*H/2;
      A = [[0,0],[W/2 + s2,0],[W/2 - s2,H],[0,H]];
      B = [[W/2 + s2,0],[W,0],[W,H],[W/2 - s2,H]];
      line = [[W/2 + s2, 0], [W/2 - s2, H]];
    }
    function fillHalf(poly, img, after, which){
      var xs = poly.map(function(q){ return q[0]; }), ys = poly.map(function(q){ return q[1]; });
      var x0 = Math.min.apply(null, xs), y0 = Math.min.apply(null, ys), bw = Math.max.apply(null, xs) - x0, bh = Math.max.apply(null, ys) - y0;
      c.save();
      c.beginPath(); poly.forEach(function(q, i){ i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]); }); c.closePath(); c.clip();
      if (img) shown[which] = cover(c, img, x0, y0, bw, bh, which === 'win' ? state.zoom : state.phoneZoom,
                                    which === 'win' ? state.panX*W : state.phonePanX*bw, which === 'win' ? state.panY*H : state.phonePanY*bw);
      else {
        paintStandIn(c, x0, y0, bw, bh, after, st);
        if (opts.preview) placeholderLabel(c, x0, y0, bw, bh*0.8, after ? 'Drop the after picture' : 'Drop the before picture', 'rgba(255,255,255,.75)');
      }
      c.restore();
      return { x:x0, y:y0, w:bw, h:bh };
    }
    var ra = fillHalf(A, phoneImg, false, 'phone');
    fillHalf(B, frame === paintedFrame ? null : frame, true, 'win');
    if (opts.preview) dropHits.push({ slot:'second', x:ra.x, y:ra.y, w:ra.w, h:ra.h });
    report.pictures = 1;

    // the slash along the cut
    var sw = Math.max(3, 0.022*Math.min(W, H));
    c.save();
    c.beginPath(); c.moveTo(line[0][0], line[0][1]); c.lineTo(line[1][0], line[1][1]);
    c.lineWidth = sw; c.strokeStyle = '#ffffff'; c.shadowColor = 'rgba(0,0,0,.5)'; c.shadowBlur = sw*2; c.stroke();
    c.restore();

    // a darker floor under the words
    var floor = c.createLinearGradient(0, H*0.5, 0, H);
    floor.addColorStop(0, 'rgba(0,0,0,0)'); floor.addColorStop(1, 'rgba(0,0,0,.8)');
    c.fillStyle = floor; c.fillRect(0, 0, W, H);

    // The words, centred on the safe area, broken over as many lines as makes
    // them biggest - a narrow frame wants short lines - within a third of
    // the height. The accent words keep their own line(s).
    var maxW = (g.right - g.left)*0.96, start = (tall ? 0.12 : 0.14)*H*state.headScale;
    // the block stays below the after label, which sits just under the cut
    var labelRoom = Math.max(12*k, (tall ? 0.035 : 0.06)*H) + 0.05*H;
    var room = tall ? g.bottom - (H*0.46 + lean*W/2 + labelRoom) : H*0.4;
    var set = bestBreak(c, state.line1, state.line2, maxW, start, 12*k, Math.min(H*(tall ? 0.34 : 0.4), room));
    var px = set.px, cap = px ? capOf(c, px) : 0, lead = cap*1.28, b = g.bottom;
    if (g.stamp && (g.left + g.right)/2 + maxW/2 > g.stampX) b = Math.min(b, g.stampY - 0.02*H);
    for (var i = set.lines.length - 1; i >= 0; i--) {
      slantedLine(c, [{ t:set.lines[i].t, color:set.lines[i].accent ? st[2] : state.line1Color }], (g.left + g.right)/2, b, px);
      b -= lead;
    }
    report.headCap = cap / H;

    // logo, then each label at the top of its half
    var lh = 64*k*state.logoSize, labelH = Math.max(12*k, (tall ? 0.035 : 0.06)*H), y1 = g.top;
    if (state.logo && ready.logo) { c.drawImage(logo, g.left, g.top, logo.width * lh / logo.height, lh); y1 = g.top + lh + 0.02*H; }
    drawLabel(c, state.beforeLabel, g.left, y1, labelH, false, st, true);
    if (tall) drawLabel(c, state.afterLabel, g.left, H*0.46 + lean*W/2 + 0.025*H, labelH, true, st, true);
    else drawLabel(c, state.afterLabel, W/2 + lean*H/2 + 0.03*W, g.top, labelH, true, st, true);
  }

  function drawVersus(c, p, opts){
    var g = box(p), W = g.W, H = g.H, k = g.k, st = activeStops();
    var report = opts.report || {};
    drawField(c, W, H, k, st);
    if (!g.wide) return drawVersusHalves(c, g, opts, st, report);

    var l1 = state.line1.toUpperCase().trim(), l2 = state.line2.toUpperCase().trim();
    var accent = st[2], ink = state.line1Color;

    // the headline first: it claims the bottom, the pictures get the rest
    var headTop, cap = 0;
    if (g.wide) {
      var parts = [];
      if (l1) parts.push({ t:l1, color:ink });
      if (l2) parts.push({ t:l2, color:accent });
      var text = parts.map(function(q){ return q.t; }).join(' ');
      var maxW = (g.right - g.left) * 0.98;
      // starts where the capitals come to about 0.12 of the height (Anton's
      // capitals are 0.86 of its size) - the bar's aim - so a short headline
      // doesn't crowd out the pictures
      var px = text ? fitWith(c, text, maxW, 0.14*H*state.headScale, 14*k, function(q){ return q*0.2; }) : 0;
      cap = text ? capOf(c, px) : 0;
      var base = g.bottom;
      // out of the timestamp corner: a centred line that reaches it rises
      if (g.stamp && (W/2 + maxW/2) > g.stampX) base = Math.min(base, g.stampY - 0.02*H);
      headTop = base - cap;
      if (text) slantedLine(c, parts, (g.left + g.right)/2, base, px);
    } else {
      var lines = [l1, l2].filter(Boolean), pxs = lines.map(function(t){
        return fitWith(c, t, (g.right - g.left)*0.96, 0.12*H*state.headScale, 12*k, function(q){ return q*0.2; });
      });
      var pxT = pxs.length ? Math.min.apply(null, pxs) : 0;
      cap = pxT ? capOf(c, pxT) : 0;
      var lead = cap * 1.28, b = g.bottom;
      headTop = b - cap - (lines.length - 1)*lead;
      for (var li = lines.length - 1; li >= 0; li--) {
        slantedLine(c, [{ t:lines[li], color: (li === lines.length - 1 && l2) ? accent : ink }], (g.left + g.right)/2, b, pxT);
        b -= lead;
      }
    }
    report.headCap = cap / H;

    // the logo, small, top left, when on
    var top = g.top;
    if (state.logo && ready.logo) {
      var lh = 64*k*state.logoSize;
      c.drawImage(logo, g.left, g.top, logo.width * lh / logo.height, lh);
    }

    // the pictures: as big as the room above the headline allows
    var zoneTop = top, zoneBot = headTop - 0.035*H, zoneH = zoneBot - zoneTop;
    var lean = Math.tan(state.splitAngle * Math.PI/180);
    var d, c1, c2, labelH = Math.max(12*k, 0.06*H);
    if (g.wide) {
      var half = (g.right - g.left) / 2, gapX = 0.05*W;
      d = Math.max(0, Math.min(zoneH, half - gapX));
      c1 = { x:W/2 - gapX/2 - d/2 - (state.vsShape === 'card' ? d*0.09 : 0), y:zoneTop + zoneH/2 };
      c2 = { x:W/2 + gapX/2 + d/2 + (state.vsShape === 'card' ? d*0.09 : 0), y:zoneTop + zoneH/2 };
    } else {
      var gapY = 0.03*H;
      d = Math.max(0, Math.min((zoneH - gapY)/2, (g.right - g.left) * 0.78));
      var cxT = (g.left + g.right)/2;
      c1 = { x:cxT, y:zoneTop + zoneH/2 - gapY/2 - d/2 };
      c2 = { x:cxT, y:zoneTop + zoneH/2 + gapY/2 + d/2 };
    }

    // the divider, behind the pictures: a bright slash, or a split field
    if (state.vsDivider === 'split') {
      var fill = c.createLinearGradient(0, 0, W, H);
      fill.addColorStop(0, st[1]); fill.addColorStop(1, st[2]);
      c.save(); c.globalAlpha = 0.85; c.beginPath();
      if (g.wide) { var sl = lean*H/2; c.moveTo(W/2 + sl, 0); c.lineTo(W, 0); c.lineTo(W, H); c.lineTo(W/2 - sl, H); }
      else { var my = (c1.y + c2.y)/2, tl = lean*W/2; c.moveTo(0, my + tl); c.lineTo(W, my - tl); c.lineTo(W, H); c.lineTo(0, H); }
      c.closePath(); c.fillStyle = fill; c.fill(); c.restore();
    } else {
      var sw = Math.max(3, 0.014*Math.min(W, H) * 1.6);
      c.save();
      var sg;
      if (g.wide) {
        var sx = lean*H/2;
        sg = c.createLinearGradient(0, 0, 0, H);
        sg.addColorStop(0, 'rgba(255,255,255,.95)'); sg.addColorStop(0.75, 'rgba(255,255,255,.55)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
        c.beginPath(); c.moveTo(W/2 + sx - sw/2, 0); c.lineTo(W/2 + sx + sw/2, 0); c.lineTo(W/2 - sx + sw/2, H); c.lineTo(W/2 - sx - sw/2, H);
      } else {
        var yy = (c1.y + c2.y)/2, ty = lean*W/2;
        sg = c.createLinearGradient(0, 0, W, 0);
        sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(0.2, 'rgba(255,255,255,.8)'); sg.addColorStop(0.8, 'rgba(255,255,255,.8)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
        c.beginPath(); c.moveTo(0, yy + ty - sw/2); c.lineTo(W, yy - ty - sw/2); c.lineTo(W, yy - ty + sw/2); c.lineTo(0, yy + ty + sw/2);
      }
      c.closePath(); c.shadowColor = 'rgba(255,255,255,.35)'; c.shadowBlur = sw*2; c.fillStyle = sg; c.fill();
      c.restore();
    }

    var b1 = null, b2 = null;
    if (d > 0) {
      b1 = drawPicture(c, c1.x, c1.y, d, phoneImg, false, 'phone', opts, k, st);
      b2 = drawPicture(c, c2.x, c2.y, d, frame === paintedFrame ? null : frame, true, 'win', opts, k, st);
      if (opts.preview) dropHits.push({ slot:'second', x:b1.x, y:b1.y, w:b1.w, h:b1.h });
      report.pictures = (state.vsShape === 'card' ? 2*b1.w*b1.h : 2*Math.PI*d*d/4) / (W*H);

      if (state.arrow) {
        if (g.wide) {
          drawCurvedArrow(c, b1.x + b1.w*0.86, b1.y + b1.h*0.9, b2.x + b2.w*0.08, b2.y + b2.h*0.8, { x:0, y:d*0.28 }, k);
        } else {
          drawCurvedArrow(c, b1.x + b1.w*0.95, b1.y + b1.h*0.72, b2.x + b2.w*0.95, b2.y + b2.h*0.28, { x:d*0.3, y:0 }, k);
        }
      }
      drawLabel(c, state.beforeLabel, c1.x, b1.y, labelH, false, st);
      drawLabel(c, state.afterLabel,  c2.x, b2.y, labelH, true, st);
    }
  }

  // Collage, built to docs/quality-bar.md: a paper panel with brush bands
  // top and bottom, a stacked headline whose accent line runs in the
  // palette's colour, a brushed underline; then a leaning strip of three
  // pictures; then one big photo to the edge. Tall frames stack the three
  // bands top to bottom.
  var dropHits = [];   // preview only: [{ slot, x, y, w, h }] for routing a drop

  // A rough band with a brushed edge. The wobble is a sum of sines, so it is
  // the same on every render and every size.
  function brushBand(c, x0, x1, y, h, edgeDown, color, k){
    var amp = h*0.22, step = Math.max(2, 6*k);
    function wob(x){ return amp*(Math.sin(x/(37*k)) + 0.5*Math.sin(x/(13*k) + 1.7) + 0.3*Math.sin(x/(5*k) + 0.4)) / 1.8; }
    c.beginPath();
    if (edgeDown) {
      c.moveTo(x0, y);
      c.lineTo(x1, y);
      for (var x = x1; x >= x0; x -= step) c.lineTo(x, y + h + wob(x));
    } else {
      c.moveTo(x0, y + h);
      c.lineTo(x1, y + h);
      for (var x2 = x1; x2 >= x0; x2 -= step) c.lineTo(x2, y + wob(x2));
    }
    c.closePath(); c.fillStyle = color; c.fill();
  }

  // The brushed underline: a stroke that swells in the middle and tapers to
  // points, rising slightly to the right.
  function brushSwoosh(c, cx, y, w, t, color){
    // thickest just left of centre, a point at the start, a blunt tail
    var x0 = cx - w/2, x1 = cx + w/2, rise = t*2.2, n = 32, i, u, yy, half;
    function width(u){ return t*(Math.pow(Math.sin(Math.PI*Math.min(1, u*1.15)), 0.7)*0.95 + 0.05); }
    function mid(u){ return y + rise*(0.5 - u) - Math.sin(Math.PI*u)*t*0.9; }
    c.beginPath();
    for (i = 0; i <= n; i++) { u = i/n; half = width(u)/2; yy = mid(u); c[i ? 'lineTo' : 'moveTo'](x0 + u*(x1 - x0), yy - half); }
    for (i = n; i >= 0; i--) { u = i/n; half = width(u)/2; yy = mid(u); c.lineTo(x0 + u*(x1 - x0), yy + half); }
    c.closePath(); c.fillStyle = color; c.fill();
  }

  // Fills a four-cornered shape with a picture (or its stand-in), clipped.
  function fillQuad(c, quad, img, after, which, opts, st, label){
    var xs = quad.map(function(q){ return q[0]; }), ys = quad.map(function(q){ return q[1]; });
    var x0 = Math.min.apply(null, xs), y0 = Math.min.apply(null, ys);
    var bw = Math.max.apply(null, xs) - x0, bh = Math.max.apply(null, ys) - y0;
    c.save();
    c.beginPath(); quad.forEach(function(q, i){ c[i ? 'lineTo' : 'moveTo'](q[0], q[1]); }); c.closePath(); c.clip();
    if (img) {
      var f = FRAMING[which], main = which === 'main';
      shown[f.shown] = cover(c, img, x0, y0, bw, bh, state[f.zoom],
                             main ? state.panX*c.canvas.width : state[f.x]*bw, main ? state.panY*c.canvas.height : state[f.y]*bw);
    } else {
      paintStandIn(c, x0, y0, bw, bh, after, st);
      if (opts.preview && label) placeholderLabel(c, x0, y0, bw, bh, label, 'rgba(255,255,255,.8)');
    }
    c.restore();
    return { x:x0, y:y0, w:bw, h:bh };
  }

  // Luminance contrast between two colours, for choosing an ink that reads.
  function contrast(a, b){
    function lum(hex){
      var n = parseInt(hex.slice(1), 16);
      return [n>>16&255, n>>8&255, n&255].map(function(v){ v /= 255; return v <= 0.03928 ? v/12.92 : Math.pow((v + 0.055)/1.055, 2.4); })
        .reduce(function(s, v, i){ return s + v*[0.2126, 0.7152, 0.0722][i]; }, 0);
    }
    var x = lum(a), y = lum(b);
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  }

  function drawCollage(c, p, opts){
    var g = box(p), W = g.W, H = g.H, k = g.k, st = activeStops();
    var report = opts.report || {};
    var paper = state.paper, lean = Math.tan(state.collageLean * Math.PI/180);
    // words on paper: the headline colour if it reads there, else near-black
    var ink = contrast(state.line1Color, paper) >= 3 ? state.line1Color : '#1b1a1f';
    // the accent must read on paper too: the palette's first colour, deepened
    var acc = deepShade(st[0], 0.42);
    if (opts.preview) dropHits = [];
    c.fillStyle = paper; c.fillRect(0, 0, W, H);

    var tall = (W/H) < 0.85, gap = Math.max(3, 0.015*W);   // the reference's gutter: 1.5% of the width
    if (tall) lean *= 0.5;   // across a narrow frame the full lean reads as a tilt, not a lean
    var slots = [
      { img:phoneImg, slot:'second', label:'Top picture' },
      { img:img3, slot:'third', label:'Middle picture' },
      { img:img4, slot:'fourth', label:'Bottom picture' }
    ];
    var picsArea = 0, textBox;

    if (!tall) {
      var square = (W/H) < 1.2;
      // three columns leaning together: paper, strip, photo
      // Proportions measured off the reference at mid-height: paper to 44%,
      // strip 18%, photo from 64%. Square frames give the paper a little more.
      var xa = W*(square ? 0.48 : 0.44), sw = state.strip ? W*(square ? 0.17 : 0.18) : 0;
      var sx = function(x, y){ return x + lean*(y - H/2); };
      // The bands belong to the paper: clipped to its leaning edge, they stop
      // where the strip begins, so every gutter stays plain paper.
      if (state.brush) {
        c.save();
        c.beginPath(); c.moveTo(0, 0); c.lineTo(sx(xa, 0), 0); c.lineTo(sx(xa, H), H); c.lineTo(0, H); c.closePath(); c.clip();
        brushBand(c, 0, W, 0, H*0.075, true, acc, k);
        brushBand(c, 0, W, H*0.925, H*0.075, false, acc, k);
        c.restore();
      }
      if (state.strip) {
        var rows = 3, rg = gap, rh = (H - rg*(rows - 1)) / rows;
        for (var i = 0; i < rows; i++) {
          var y0 = i*(rh + rg), y1 = y0 + rh;
          var q = [[sx(xa + gap, y0), y0], [sx(xa + sw, y0), y0], [sx(xa + sw, y1), y1], [sx(xa + gap, y1), y1]];
          var bx = fillQuad(c, q, slots[i].img, i === 1, slots[i].slot, opts, st, slots[i].label);
          if (opts.preview) dropHits.push({ slot:slots[i].slot, x:bx.x, y:bx.y, w:bx.w, h:bx.h });
          picsArea += (sw - gap) * rh;
        }
      }
      var hx = xa + sw + gap;
      var hq = [[sx(hx, 0), 0], [W, 0], [W, H], [sx(hx, H), H]];
      fillQuad(c, hq, frame === paintedFrame ? null : frame, true, 'main', opts, st, 'Drop the main photo');
      picsArea += (W - hx) * H;
      // the words sit in the paper, clear of the leaning edge at its narrowest
      // The paper's right edge leans, so the room for a line depends on its
      // height: lower lines get more, as in the reference.
      var edgeAt = function(y){ return sx(xa, y) - 0.025*W; };
      // The reference keeps its words between 0.13 and 0.83 of the height and
      // its underline just below; this band leaves room for the tilt to lift
      // one end without touching the brushed bands.
      textBox = { x0:g.left, x1:edgeAt(H*0.5), y0:H*0.12, y1:H*0.86, edge:edgeAt };
    } else {
      // tall: paper on top, the strip across, the photo below
      var ya = H*0.5, sh = state.strip ? H*0.12 : 0;
      var sy = function(y, x){ return y - lean*(x - W/2); };
      if (state.brush) brushBand(c, 0, W, 0, H*0.045, true, acc, k);
      if (state.strip) {
        var cols = 3, cg = gap, cw = (W - cg*(cols - 1)) / cols;
        for (var j = 0; j < cols; j++) {
          var x0 = j*(cw + cg), x1 = x0 + cw;
          var q2 = [[x0, sy(ya + gap, x0)], [x1, sy(ya + gap, x1)], [x1, sy(ya + sh, x1)], [x0, sy(ya + sh, x0)]];
          var bx2 = fillQuad(c, q2, slots[j].img, j === 1, slots[j].slot, opts, st, slots[j].label);
          if (opts.preview) dropHits.push({ slot:slots[j].slot, x:bx2.x, y:bx2.y, w:bx2.w, h:bx2.h });
          picsArea += cw * (sh - gap);
        }
      }
      var hy = ya + sh + gap;
      fillQuad(c, [[0, sy(hy, 0)], [W, sy(hy, W)], [W, H], [0, H]], frame === paintedFrame ? null : frame, true, 'main', opts, st, 'Drop the main photo');
      picsArea += W * (H - hy);
      textBox = { x0:g.left, x1:g.right, y0:Math.max(g.top, H*0.06), y1:ya - lean*W/2 - 0.03*H };
    }
    report.pictures = picsArea / (W*H);

    // the headline, stacked as tight as sets it biggest, centred in the paper
    var colW = textBox.x1 - textBox.x0, room = textBox.y1 - textBox.y0;
    // lines packed as tight as the reference's: 1.12 times the capital height
    var LEAD = 1.12, swooshRoom = state.brush ? room*0.08 : 0;
    var set = bestBreak(c, state.line1, state.line2, colW*0.98, 0.3*H*state.headScale, 12*k, room - swooshRoom, LEAD);
    var px = set.px, cap = px ? capOf(c, px) : 0, lead = cap*LEAD;
    var blockH = cap + (set.lines.length - 1)*lead, top = textBox.y0 + (room - swooshRoom - blockH)/2;
    var cx = (textBox.x0 + textBox.x1)/2;
    // Sized to the paper's width at mid-height; any line whose top would then
    // cross the leaning edge brings the whole block down to fit.
    if (textBox.edge && set.lines.length) {
      tightFont(c, px);
      var worst = 1;
      set.lines.forEach(function(l, i){
        var w = c.measureText(l.t).width, lineTop = top + i*lead;
        var room2 = (textBox.edge(lineTop) - cx) * 2;
        if (w > room2) worst = Math.min(worst, room2 / w);
      });
      looseFont(c);
      if (worst < 1) {
        px *= worst; cap = capOf(c, px); lead = cap*LEAD;
        blockH = cap + (set.lines.length - 1)*lead; top = textBox.y0 + (room - swooshRoom - blockH)/2;
      }
    }
    var base = top + cap;
    // The whole block - words and underline - turns about its centre, rising
    // to the right, as the reference's does (measured at -3.7 degrees).
    c.save();
    var pivotY = top + blockH/2;
    c.translate(cx, pivotY); c.rotate(state.collageTilt * Math.PI/180); c.translate(-cx, -pivotY);
    c.textAlign = 'center';
    set.lines.forEach(function(l){
      tightFont(c, px); c.fillStyle = l.accent ? acc : ink;
      c.fillText(l.t, cx, base);
      base += lead;
    });
    looseFont(c); c.textAlign = 'left';
    report.headCap = cap / H;
    if (state.brush && set.lines.length) {
      tightFont(c, px); var widest = Math.max.apply(null, set.lines.map(function(l){ return c.measureText(l.t).width; })); looseFont(c);
      brushSwoosh(c, cx, base - lead + cap*0.62, widest*0.78, Math.max(3, cap*0.2), ink);
    }
    c.restore();

    // the logo, small, in the photo's top corner - the paper belongs to the words
    if (state.logo && ready.logo) {
      var lh = 56*k*state.logoSize, lw = logo.width * lh / logo.height;
      var ly = tall ? H*0.5 + (state.strip ? H*0.12 : 0) + 0.03*H : g.top + (state.brush ? 0 : 0);
      c.save(); c.shadowColor = 'rgba(0,0,0,.5)'; c.shadowBlur = 16*k; c.shadowOffsetY = 4*k;
      c.drawImage(logo, g.right - lw, ly, lw, lh);
      c.restore();
    }
  }

  // Talking point, built to docs/quality-bar.md: light textured paper, a
  // stacked slanted headline whose accent word takes its own line at half
  // again the size in the palette's gradient, a thick hand-drawn arrow
  // pointing at the words, and one big circular photo over a bow-tie of two
  // gradient triangles, with a thin arc and dot beside it.

  // Paper grain: speckles and a few scratches from a fixed hash, so the
  // texture is the same on every render and scales with the frame.
  function paperGrain(c, W, H, k, paper){
    c.fillStyle = paper; c.fillRect(0, 0, W, H);
    function h(i){ var x = Math.sin(i*127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
    var n = Math.round(W*H / (700*k*k));
    for (var i = 0; i < n; i++) {
      c.fillStyle = h(i*3) < 0.5 ? 'rgba(0,0,0,.05)' : 'rgba(255,255,255,.6)';
      var r = (0.6 + h(i*3 + 2)*1.1) * k;
      c.fillRect(h(i*3 + 1)*W, h(i*3 + 7)*H, r, r);
    }
    c.save(); c.strokeStyle = 'rgba(0,0,0,.05)'; c.lineWidth = Math.max(1, k);
    for (var j = 0; j < 14; j++) {
      var x0 = h(j + 900)*W, y0 = h(j + 950)*H, len = (40 + h(j + 990)*120)*k, a = h(j + 1030)*Math.PI;
      c.beginPath(); c.moveTo(x0, y0); c.lineTo(x0 + Math.cos(a)*len, y0 + Math.sin(a)*len); c.stroke();
    }
    c.restore();
  }

  // A thick, hand-drawn arrow along a curve: it swells from a thin tail and
  // ends in a solid head.
  function handArrow(c, x0, y0, cx, cy, x1, y1, t, color){
    var n = 30, pts = [];
    for (var i = 0; i <= n; i++) {
      var u = i/n, v = 1 - u;
      pts.push([v*v*x0 + 2*v*u*cx + u*u*x1, v*v*y0 + 2*v*u*cy + u*u*y1]);
    }
    var head = t*2.6, cut = Math.max(2, Math.round(n * 0.12));
    function normal(i){
      var a = pts[Math.max(0, i - 1)], b = pts[Math.min(n, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
      return [-dy/l, dx/l];
    }
    c.beginPath();
    var side = [];
    for (var s = 0; s <= n - cut; s++) { var w = t*(0.25 + 0.75*Math.sin(Math.PI/2 * s/(n - cut))), nn = normal(s); side.push([pts[s][0] + nn[0]*w/2, pts[s][1] + nn[1]*w/2, pts[s][0] - nn[0]*w/2, pts[s][1] - nn[1]*w/2]); }
    side.forEach(function(q, i){ c[i ? 'lineTo' : 'moveTo'](q[0], q[1]); });
    // the head: a wide triangle on the last stretch
    var base = pts[n - cut], nb = normal(n - cut);
    c.lineTo(base[0] + nb[0]*head/2, base[1] + nb[1]*head/2);
    c.lineTo(x1, y1);
    c.lineTo(base[0] - nb[0]*head/2, base[1] - nb[1]*head/2);
    for (var r = side.length - 1; r >= 0; r--) c.lineTo(side[r][2], side[r][3]);
    c.closePath(); c.fillStyle = color; c.fill();
  }

  function drawTalking(c, p, opts){
    var g = box(p), W = g.W, H = g.H, k = g.k, st = activeStops();
    var report = opts.report || {};
    var paper = state.paper2;
    paperGrain(c, W, H, k, paper);
    var ink = contrast(state.line1Color, paper) >= 3 ? state.line1Color : '#2a292e';
    var tall = (W/H) < 0.85, square = !tall && (W/H) < 1.2;
    var g0 = deepShade(st[0], 0.46), g1 = deepShade(st[2], 0.5);

    // The photo is a circle for a photo and a frame in its own proportions
    // for a screenshot, so a wide picture is shown whole rather than cropped
    // to a round middle. Auto decides from the picture's shape.
    var has = frame !== paintedFrame, pa = frame.width / frame.height;
    var shape = state.tpShape === 'auto' ? ((!has || (pa > 0.8 && pa < 1.25)) ? 'circle' : 'frame') : state.tpShape;
    var roundish = shape === 'circle';
    // Square sizes stack too - photo on top, words across the full width
    // below - since beside each other neither gets enough room.
    if (square) { tall = true; square = false; }
    var shapeOf = W/H;
    // the photo claims its side first; the words get the rest
    var d, cx, cy, hw, hh, tilt = roundish ? 0 : -3*Math.PI/180;
    // Big enough to beat the reference's share of the frame (0.25): a photo
    // may run under a platform's buttons, since only words must stay clear.
    if (!tall) {
      d = Math.min(H*0.96, W*(square ? 0.66 : 0.5));
      cx = W - Math.max(0.01*W, (W - g.right)*0.5) - d/2; cy = H/2;
    } else {
      d = Math.min(W*0.98, H*(shapeOf < 0.7 ? 0.5 : shapeOf < 0.9 ? 0.6 : 0.66));   // 9:16, 4:5, square
      cx = W/2; cy = Math.max(g.top*0.6, 0.02*H) + d/2;
    }
    hw = hh = d/2;
    if (!roundish) {
      var fa = Math.max(0.6, Math.min(2.2, pa)), mw, mh;
      // As big as the words allow: 60% of the width beside them; edge to
      // edge above them in stacked sizes, where the photo may run under a
      // platform's buttons and only the words must stay clear.
      if (!tall) { mw = W*0.6; mh = H*0.86; }
      else { mw = W; mh = H*(shapeOf < 0.7 ? 0.46 : shapeOf < 0.9 ? 0.56 : 0.5); }
      var pw = Math.min(mw, mh*fa), ph = pw/fa;
      hw = pw/2; hh = ph/2;
      if (!tall) { cx = W - Math.max(0.02*W, (W - g.right)*0.6) - hw; cy = H/2; }
      else { cx = W/2; cy = Math.max(g.top*0.6, 0.03*H) + hh; }
      d = Math.max(pw, ph);
    }

    // the bow-tie behind it, pointing at the circle's centre
    var grad = c.createLinearGradient(cx - d/2, 0, cx + d/2, H);
    grad.addColorStop(0, g0); grad.addColorStop(1, g1);
    c.fillStyle = grad;
    var bw = d*0.62;
    c.beginPath();
    if (!tall) {
      c.moveTo(cx - bw, 0); c.lineTo(cx + bw, 0); c.lineTo(cx, cy); c.closePath();
      c.moveTo(cx - bw*0.9, H); c.lineTo(cx + bw*1.1, H); c.lineTo(cx, cy); c.closePath();
    } else {
      c.moveTo(0, cy - bw*0.8); c.lineTo(0, cy + bw*0.8); c.lineTo(cx, cy); c.closePath();
      c.moveTo(W, cy - bw*0.8); c.lineTo(W, cy + bw*0.8); c.lineTo(cx, cy); c.closePath();
    }
    c.fill();

    // the arc and its dot, just outside the ring on the open side (circles only)
    c.save();
    if (roundish) {
    c.strokeStyle = ink; c.lineWidth = Math.max(1.5, 2.5*k);
    var ar = d/2 + Math.max(10*k, d*0.07), a0 = tall ? -0.35*Math.PI : -0.38*Math.PI, a1 = tall ? 0.05*Math.PI : 0.3*Math.PI;
    c.beginPath(); c.arc(cx, cy, ar, a0, a1); c.stroke();
    c.beginPath(); c.arc(cx + Math.cos(a0)*ar, cy + Math.sin(a0)*ar, Math.max(3, 5*k), 0, Math.PI*2); c.fillStyle = ink; c.fill();
    }
    c.restore();

    // the photo, in a white ring (circle) or a white-edged frame turned a touch
    var ring = Math.max(2, Math.min(hw, hh)*0.028);
    function outline(pad){
      c.beginPath();
      if (roundish) c.arc(cx, cy, hw - pad, 0, Math.PI*2);
      else roundRect(c, cx - hw + pad, cy - hh + pad, 2*(hw - pad), 2*(hh - pad), Math.max(0, Math.min(hw, hh)*0.08 - pad));
    }
    c.save();
    c.translate(cx, cy); c.rotate(tilt); c.translate(-cx, -cy);
    c.save();
    c.shadowColor = 'rgba(0,0,0,.35)'; c.shadowBlur = d*0.08; c.shadowOffsetY = d*0.03;
    outline(0); c.fillStyle = '#ffffff'; c.fill();
    c.restore();
    c.save(); outline(ring); c.clip();
    if (has) shown.win = cover(c, frame, cx - hw, cy - hh, 2*hw, 2*hh, state.zoom, state.panX*W, state.panY*H);
    else {
      paintStandIn(c, cx - hw, cy - hh, 2*hw, 2*hh, true, st);
      if (opts.preview) placeholderLabel(c, cx - hw, cy - hh, 2*hw, 2*hh, 'Drop the photo', 'rgba(255,255,255,.8)');
    }
    c.restore();
    c.restore();
    report.pictures = (roundish ? Math.PI*hw*hw : 4*hw*hh) / (W*H);

    // the words: main lines stacked and slanted, the accent line half again
    // as big, in the gradient
    // the frame's tilt drops one lower corner by about hw*sin(3 degrees)
    var sag = roundish ? 0 : hw*Math.sin(3*Math.PI/180);
    var tb = !tall ? { x0:g.left, x1:cx - hw - sag - 0.04*W, y0:g.top, y1:g.bottom }
                   : { x0:g.left, x1:g.right, y0:cy + hh + sag + 0.04*H, y1:g.bottom };
    // stacked with a frame, the logo gets its own row under the words
    var logoRow = (tall && !roundish && state.logo && ready.logo) ? 52*k*state.logoSize + 0.02*H : 0;
    tb.y1 -= logoRow;
    var main = state.line1.toUpperCase().trim().split(/\s+/).filter(Boolean);
    var accent = state.line2.toUpperCase().trim();
    var colW = tb.x1 - tb.x0, room = tb.y1 - tb.y0;
    // For each way of breaking the main words, size them to the width, then
    // give the key word whatever height is left - up to 2.6 times the main
    // size, so it leads without swallowing the rest. The key word's size
    // decides between arrangements first, the main lines' second.
    var best = null, big = 0.3*H*state.headScale;
    for (var n = 1; n <= Math.min(4, Math.max(1, main.length)); n++) {
      var per = Math.ceil(main.length / n), lines = [];
      for (var i = 0; i < main.length; i += per) lines.push(main.slice(i, i + per).join(' '));
      var fits = lines.map(function(t){ return fitWith(c, t, colW, big, 10*k, function(q){ return q*0.2; }); });
      var px = fits.length ? Math.min.apply(null, fits) : big;
      var capM = lines.length ? capOf(c, px) : 0, mainH = lines.length ? capM + (lines.length - 1)*capM*1.2 : 0;
      if (mainH > room*0.6) { px *= room*0.6 / mainH; capM = capOf(c, px); mainH = room*0.6; }
      var apx = 0, capA = 0;
      if (accent) {
        var left = room - mainH - (lines.length ? capM*0.35 : 0);
        apx = Math.min(fitWith(c, accent, colW, big*1.6, 10*k, function(q){ return q*0.2; }), px*2.6);
        capA = capOf(c, apx);
        if (capA > left) { apx *= left / capA; capA = capOf(c, apx); }
      }
      // The key word leads: at least 1.25 times the lead-in. Where the
      // height is tight, the lead-in gives way until it does.
      if (accent && lines.length && capA < capM*1.25) {
        var mf = 1 + (lines.length - 1)*1.2, fitCap = room / (mf + 0.35 + 1.25);
        if (fitCap < capM) { px *= fitCap / capM; capM = capOf(c, px); mainH = capM*mf; }
        var left2 = room - mainH - capM*0.35, want = fitWith(c, accent, colW, big*1.6, 10*k, function(q){ return q*0.2; });
        apx = want; capA = capOf(c, apx);
        if (capA > left2) { apx *= left2 / capA; capA = capOf(c, apx); }
      }
      var hgt = mainH + (accent ? (lines.length ? capM*0.35 : 0) + capA : 0);
      // weigh both: a big key word over a readable lead-in beats a huge key
      // word over words too small to read
      var score = capA*2 + capM;
      if (!best || score > best.score) best = { px:px, apx:apx, lines:lines, capM:capM, capA:capA, h:hgt, score:score };
    }
    var y = tb.y0 + (room - best.h)/2;
    function slant(text, x, base, px, fill){
      c.save();
      c.translate(0, base); c.transform(1, 0, -0.2, 1, 0, 0); c.translate(0, -base);
      tightFont(c, px); c.fillStyle = fill; c.fillText(text, x, base);
      looseFont(c); c.restore();
    }
    var lastEnd = tb.x0, firstEnd = tb.x0, firstTop = y;
    best.lines.forEach(function(t, i){
      var base = y + best.capM + i*best.capM*1.2;
      slant(t, tb.x0 + best.capM*0.2, base, best.px, ink);
      tightFont(c, best.px);
      var end = tb.x0 + best.capM*0.2 + c.measureText(t).width;
      looseFont(c);
      lastEnd = Math.max(lastEnd, end); if (!i) firstEnd = end;
    });
    if (accent) {
      var abase = y + best.h;
      var apx = best.apx;
      tightFont(c, apx); var aw = c.measureText(accent).width; looseFont(c);
      var ax = tb.x0 + Math.min(best.capM*0.8, Math.max(0, colW - aw));
      var ag = c.createLinearGradient(ax, 0, ax + aw, 0);
      ag.addColorStop(0, g0); ag.addColorStop(1, g1);
      slant(accent, ax + best.capA*0.2, abase, apx, ag);
    }
    report.headCap = Math.max(best.capM, best.capA) / H;

    // the arrow: from beside the circle, curling down onto the words
    if (state.arrow2 && best.lines.length) {
      var t = Math.max(4, 0.03*H);
      if (!tall) {
        // down from beside the circle's top onto the end of the first line,
        // above the longer lines that follow
        var hx = firstEnd + 0.025*W, hy = firstTop + best.capM*0.45;
        var tx = Math.min(cx - hw*0.84, hx + 0.16*W), ty = Math.max(g.top*0.5, firstTop - best.capM*0.9);
        if (tx - hx > 0.05*W) handArrow(c, tx, ty, tx - 0.01*W, hy, hx, hy, t, ink);
      } else if (g.right - lastEnd > 0.16*W) {
        // only where the first line leaves room beside it
        var sx0 = g.right - 0.05*W, sy0 = firstTop + best.capM;
        handArrow(c, sx0, sy0, sx0 + 0.03*W, cy + hh + 0.02*H, cx + hw*0.5, cy + hh - hh*0.04, t, ink);
      }
    }

    // the logo, small, in the top corner over the photo's side
    if (state.logo && ready.logo) {
      var lh = 52*k*state.logoSize, lw = logo.width * lh / logo.height;
      // stacked with a frame, the top belongs to the picture (which may carry
      // its own logo), so ours goes under the words instead
      if (tall && !roundish) c.drawImage(logo, g.right - lw, tb.y1 + 0.02*H, lw, lh);
      else c.drawImage(logo, tall ? g.left : g.right - lw, g.top, lw, lh);
    }
  }

  var TEMPLATES = [
    { id:'collage', name:'Collage', hint:'A stacked headline on paper, a leaning strip of three pictures, and one big photo to the edge.',
      labels:{}, font:'league-gothic', draw:drawCollage },
    { id:'talking', name:'Talking point', hint:'A stacked headline with one big key word, an arrow at the words, and a circular photo over a bow-tie of colour.',
      labels:{}, font:'anton', draw:drawTalking },
    { id:'versus', name:'Before → After', hint:'Two big pictures, a slash and an arrow between them, and one loud headline across the bottom.',
      labels:{}, font:'anton', draw:drawVersus },
    { id:'launch', name:'Launch', hint:'A big two-line headline with an arrow, and the screenshot in a framed window.',
      labels:{}, draw:drawLaunch }
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
  // ---- the quality bar, measured (docs/quality-bar.md) ------------------
  // On a local server only: renders the current template at the current
  // size, off screen, and returns rules 1-3 of the bar with pass or fail.
  function measure(p){
    var oc = document.createElement('canvas'); oc.width = p.w; oc.height = p.h;
    var c = oc.getContext('2d', { willReadFrequently:true }), rep = {};
    render(c, p, { guides:false, report:rep });
    var tall = (p.w / p.h) < 1.2, dead = 0, cw = p.w/4, ch = p.h/4;
    for (var gy = 0; gy < 4; gy++) for (var gx = 0; gx < 4; gx++) {
      var d = c.getImageData(Math.round(gx*cw), Math.round(gy*ch), Math.round(cw), Math.round(ch)).data;
      var n = 0, sum = 0, sq = 0;
      for (var i = 0; i < d.length; i += 16) { var l = 0.299*d[i] + 0.587*d[i+1] + 0.114*d[i+2]; sum += l; sq += l*l; n++; }
      var mean = sum/n; if (Math.sqrt(Math.max(0, sq/n - mean*mean)) < 6) dead++;
    }
    var head = rep.headCap, pics = rep.pictures;
    return {
      size:p.id, headline: head == null ? 'n/a' : +head.toFixed(3), headlinePass: head == null ? null : head >= (tall ? 0.06 : 0.09),
      pictures: pics == null ? 'n/a' : +pics.toFixed(3), picturesPass: pics == null ? null : pics >= 0.33,
      deadCells:dead, deadPass: dead <= 2
    };
  }
  if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) {
    window.TF = {
      quality:function(){ return measure(current()); },
      qualityAll:function(){ return PRESETS.filter(function(p){ return p.id !== 'custom'; }).map(measure); }
    };
  }

  function render(c, p, opts){
    opts = opts || {};
    if (opts.preview) dropHits = [];
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
          // Chrome wraps a <details> element's content in its own box, which
          // eats any gap set on the <details>; the controls go in a plain
          // container so the spacing is ours.
          var body = el('div', 'gbody'); d.appendChild(body);
          groups[ctl.group] = body; order.push(d);
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
  function buildPictureHint(){
    var p = hintEl('Drag a picture on the preview to move it, or drop a file on it to replace it. Below 100% zoom the whole picture shows, with a blurred copy around it.');
    p.style.marginTop = '-8px';
    return p;
  }
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
  // Pictures are listed in the order the template shows them: Before ->
  // After puts its before picture first, everything else leads with the main.
  function orderPictures(){
    function field(key){
      for (var i = 0; i < built.length; i++) if (built[i].ctl.key === key && !built[i].ctl.group && built[i].el) return built[i].el;
    }
    // each picture's zoom sits inside its picture's block, so it moves with it
    var mainEl = field('main'), secEl = field('second');
    if (!mainEl || !secEl) return;
    if (state.layout === 'versus') fieldsEl.insertBefore(secEl, mainEl);
    else fieldsEl.insertBefore(mainEl, secEl);
  }
  function syncLayout(){
    var t = templateById(state.layout);
    orderPictures();
    for (var i = 0; i < layoutEls.length; i++) layoutEls[i].checked = (layoutEls[i].value === t.id);
    document.getElementById('layoutHint').textContent = t.hint;
    syncControls();
  }
  for (var li = 0; li < layoutEls.length; li++) {
    layoutEls[li].addEventListener('change', function(e){
      if (!e.target.checked) return;
      state.panX = 0; state.panY = 0;
      state.zoom = 1;
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
  // each template's own face, so the picker's previews draw in it too
  TEMPLATES.forEach(function(t){ if (t.font) ensureFont(fontById(HEAD_FONTS, t.font)); });

  // ---- picture slots ----------------------------------------------------
  // Three pictures a template can use: the main one, a second one (the
  // phone's, or the before card's), and the backdrop's glow. Image controls
  // in the schema name a slot; the slot knows how to fill and empty it.
  var SLOTS = {
    main:     { load:function(b){ loadBlob(b); },     clear:function(){ frame = paintedFrame; state.panX = state.panY = 0; syncControls(); draw(); setStatus('Picture removed.', 'ok'); },
                has:function(){ return frame !== paintedFrame; } },
    second:   { load:function(b){ loadPhone(b); },    clear:clearSecond,    has:function(){ return !!phoneImg; } },
    backdrop: { load:function(b){ loadBackdrop(b); }, clear:clearBackdrop,  has:function(){ return !!bgImg; } },
    third:    { load:function(b){ loadInto('img3', b); }, clear:function(){ img3 = null; syncControls(); draw(); }, has:function(){ return !!img3; } },
    fourth:   { load:function(b){ loadInto('img4', b); }, clear:function(){ img4 = null; syncControls(); draw(); }, has:function(){ return !!img4; } }
  };
  // The Collage strip's other two panels: plain pictures, no framing of
  // their own to remember.
  function loadInto(which, blob){
    var img = new Image();
    img.onload = function(){
      if (which === 'img3') { img3 = img; state.pan3X = state.pan3Y = 0; } else { img4 = img; state.pan4X = state.pan4Y = 0; }
      syncControls(); draw(); setStatus('Picture loaded.', 'ok');
    };
    img.onerror = function(){ setStatus('That file could not be read as an image.', 'err'); };
    img.src = URL.createObjectURL(blob);
  }
  function clearSecond(){
    phoneImg = null; syncControls(); draw();
    setStatus('Picture removed.', 'ok');
  }
  function loadPhone(blob){
    var img = new Image();
    img.onload = function(){
      phoneImg = img; state.phonePanX = 0; state.phonePanY = 0;
      syncControls(); draw();
      setStatus(state.layout === 'versus' ? 'Before picture loaded. Drag it on the before picture to reframe it.'
                                          : 'Picture loaded.', 'ok');
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
      syncControls(); draw();
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
  // Which picture is under the pointer: the templates list their extra
  // pictures' boxes in dropHits as they draw; anywhere else is the main one.
  // Boxes are the shapes' bounds before any tilt; at a few degrees the
  // corners they miss are too small to matter.
  function hitAt(e){
    var rect = cv.getBoundingClientRect();
    var x = (e.clientX - rect.left) * cv.width / (rect.width || 1);
    var y = (e.clientY - rect.top) * cv.height / (rect.height || 1);
    for (var i = 0; i < dropHits.length; i++) {
      var h = dropHits[i];
      if (x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h) return h;
    }
    return null;
  }
  function dropSlot(e){ var h = hitAt(e); return h ? h.slot : 'main'; }
  wrap.addEventListener('drop', function(e){
    var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (!f) return;
    SLOTS[dropSlot(e)].load(f);
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
  // A drag moves whichever picture it starts on, each by its own framing.
  var dragging = false, dragSlot = 'main', sx=0, sy=0, spx=0, spy=0, dragW=1, dragH=1, panRaf=0;
  cv.addEventListener('pointerdown', function(e){
    dragging = true; cv.classList.add('dragging'); cv.setPointerCapture(e.pointerId);
    draw();   // refresh shown and dropHits: an export may have drawn at another size since
    var hit = hitAt(e), p = current(), rect = cv.getBoundingClientRect(), f;
    dragSlot = hit ? hit.slot : 'main'; f = FRAMING[dragSlot];
    sx = e.clientX; sy = e.clientY;
    if (dragSlot === 'main') {
      spx = shown.win[0]/p.w; spy = shown.win[1]/p.h;
      dragW = rect.width || 1; dragH = rect.height || 1;
    } else {
      spx = shown[f.shown][0]/hit.w; spy = shown[f.shown][1]/hit.w;
      dragW = dragH = (rect.width || 1) * hit.w / cv.width;
    }
  });
  cv.addEventListener('pointermove', function(e){
    if (!dragging) return;
    var f = FRAMING[dragSlot];
    state[f.x] = spx + (e.clientX - sx) / dragW;
    state[f.y] = spy + (e.clientY - sy) / dragH;
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
