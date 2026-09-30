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
    moves:{},   // where each element was dragged to: { 'layout.shape.element': [dx, dy] } as fractions of the frame
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
      if (saved.moves && typeof saved.moves === 'object') state.moves = saved.moves;
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
  // How tall the kicker stands, so the layout can make room before it draws.
  function kickerHeight(k){
    if (state.kick1.trim() || state.kick2.trim()) return 100*k;
    return (state.logo && ready.logo) ? 88*k*state.logoSize : 0;
  }
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
  // part: 'window' draws the window, 'sticker' only the sticker in its title
  // bar - the sticker moves on its own, so it is drawn as its own element.
  function drawLaunchWindow(c, x, y, w, h, deg, panX, panY, part){
    var A = accent(), bw = Math.max(3, w*LAUNCH_EDGE), r = w*0.035, bar = w*LAUNCH_BAR;
    c.save();
    c.translate(x + w/2, y + h/2); c.rotate(deg*Math.PI/180); c.translate(-w/2, -h/2);
    var ix = bw, iy = bw, iw = w - 2*bw, ih = h - 2*bw;
    var label = state.sticker.trim().toUpperCase();
    if (part === 'sticker') {
      if (label) {
        var sh = bar*0.62, fpx = sh*0.5;
        c.font = monoFont(fpx);
        var sw = c.measureText(label).width + fpx*0.1*label.length + sh*0.9;
        var sx = ix + iw - bar*0.25 - sw, sy = iy + (bar - sh)/2;
        roundRect(c, sx, sy, sw, sh, sh*0.14); c.fillStyle = state.stickerColor; c.fill();
        c.fillStyle = inkOn(state.stickerColor, 110); c.textBaseline = 'middle';
        spaced(c, label, sx + sh*0.45, sy + sh*0.55, fpx*0.1);
        c.textBaseline = 'alphabetic';
      }
      c.restore();
      return;
    }
    c.shadowColor = 'rgba(0,0,0,.55)'; c.shadowBlur = w*0.06; c.shadowOffsetY = w*0.02;
    roundRect(c, 0, 0, w, h, r); c.fillStyle = A; c.fill();
    noShadow(c);
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
    if (!label && state.winTitle) {
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

    var kh = kickerHeight(k);
    if (kh) place(c, g, opts, 'kicker', function(c){ drawKicker(c, g.left, g.top, k); });
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
    if (tagH) {
      var tagY = capTop;
      place(c, g, opts, 'tag', function(c){ drawTag(c, g.left, tagY, tagH); });
      capTop += tagH + 0.035*H;
    }
    var base1 = capTop + (l1 ? px1*0.74 : 0), base2 = base1 + (l2 ? (l1 ? px2*1.02 : px2*0.74) : 0);
    if (l1 || l2) place(c, g, opts, 'headline', function(c){
      if (l1) {
        tightFont(c, px1); c.fillStyle = state.line1Color;
        c.fillText(l1, g.left, base1);
        var after = c.measureText(l1).width;
        looseFont(c);
        drawArrow(c, g.left + after + px1*0.28, base1 - px1*0.36, px1, state.line1Color);
      }
      if (l2) {
        tightFont(c, px2);
        var st = activeStops(), lg = c.createLinearGradient(g.left, 0, g.left + Math.min(c.measureText(l2).width, maxW), 0);
        lg.addColorStop(0, st[0]); lg.addColorStop(0.45, st[1]); lg.addColorStop(1, st[2]);
        c.fillStyle = lg; c.fillText(l2, g.left, base2);
        looseFont(c);
      }
    });

    var a = shotAspect(frame);
    var winAspect = 1 / (1/a + LAUNCH_BAR + 2*LAUNCH_EDGE);
    var r = g.wide
      ? fitBox(g, g.left + (g.right - g.left)*0.54, g.top, g.right, g.bottom, winAspect, 0.94)
      : fitBox(g, g.left, textTop, g.right, capTop - (tagH ? tagH + 0.035*H : 0) - 0.05*H, winAspect, 0.94);
    if (!g.wide) r.x = g.left;   // stacked: on the words' edge, not centred
    if (r.w > 0) {
      place(c, g, opts, 'pic.main', function(c){ drawLaunchWindow(c, r.x, r.y, r.w, r.h, state.launchTilt, state.panX*W, state.panY*H, 'window'); },
            { slot:'main', hit:r });
      if (state.sticker.trim()) place(c, g, opts, 'sticker', function(c){ drawLaunchWindow(c, r.x, r.y, r.w, r.h, state.launchTilt, 0, 0, 'sticker'); },
            { parent:'pic.main' });
    }
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
  // A stand-in follows its picture's zoom like a photo would, so resizing an
  // empty picture from its corners visibly does something; below 100% the
  // room around it holds a darkened copy, as the blurred copy does for photos.
  function paintStandIn(c, x, y, w, h, after, st, zoom){
    if (!zoom || zoom === 1) return paintStandIn0(c, x, y, w, h, after, st);
    if (zoom < 1) { paintStandIn0(c, x, y, w, h, after, st); c.fillStyle = 'rgba(0,0,0,.4)'; c.fillRect(x, y, w, h); }
    c.save();
    c.translate(x + w/2, y + h/2); c.scale(zoom, zoom); c.translate(-(x + w/2), -(y + h/2));
    paintStandIn0(c, x, y, w, h, after, st);
    c.restore();
  }
  function paintStandIn0(c, x, y, w, h, after, st){
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
  // The box drawPicture fills, worked out before it draws.
  function pictureBox(cx, cy, d){
    var circle = state.vsShape !== 'card', w = circle ? d : d*1.18, h = circle ? d : d*0.86;
    return { x:cx - w/2, y:cy - h/2, w:w, h:h };
  }
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
      paintStandIn(c, x, y, w, h, after, st, which === 'win' ? state.zoom : state.phoneZoom);
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
    function fillHalf(c, poly, img, after, which){
      var xs = poly.map(function(q){ return q[0]; }), ys = poly.map(function(q){ return q[1]; });
      var x0 = Math.min.apply(null, xs), y0 = Math.min.apply(null, ys), bw = Math.max.apply(null, xs) - x0, bh = Math.max.apply(null, ys) - y0;
      c.save();
      c.beginPath(); poly.forEach(function(q, i){ i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]); }); c.closePath(); c.clip();
      if (img) shown[which] = cover(c, img, x0, y0, bw, bh, which === 'win' ? state.zoom : state.phoneZoom,
                                    which === 'win' ? state.panX*W : state.phonePanX*bw, which === 'win' ? state.panY*H : state.phonePanY*bw);
      else {
        paintStandIn(c, x0, y0, bw, bh, after, st, which === 'win' ? state.zoom : state.phoneZoom);
        if (opts.preview) placeholderLabel(c, x0, y0, bw, bh*0.8, after ? 'Drop the after picture' : 'Drop the before picture', 'rgba(255,255,255,.75)');
      }
      c.restore();
      return { x:x0, y:y0, w:bw, h:bh };
    }
    function bounds(poly){
      var xs = poly.map(function(q){ return q[0]; }), ys = poly.map(function(q){ return q[1]; });
      var x0 = Math.min.apply(null, xs), y0 = Math.min.apply(null, ys);
      return { x:x0, y:y0, w:Math.max.apply(null, xs) - x0, h:Math.max.apply(null, ys) - y0, poly:poly };
    }
    place(c, g, opts, 'pic.second', function(c){ fillHalf(c, A, phoneImg, false, 'phone'); }, { slot:'second', locked:true, hit:bounds(A) });
    place(c, g, opts, 'pic.main', function(c){ fillHalf(c, B, frame === paintedFrame ? null : frame, true, 'win'); }, { slot:'main', locked:true, hit:bounds(B) });
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
    var px = set.px, cap = px ? capOf(c, px) : 0, lead = cap*1.28, bottom = g.bottom;
    if (g.stamp && (g.left + g.right)/2 + maxW/2 > g.stampX) bottom = Math.min(bottom, g.stampY - 0.02*H);
    if (set.lines.length) place(c, g, opts, 'headline', function(c){
      var b = bottom;
      for (var i = set.lines.length - 1; i >= 0; i--) {
        slantedLine(c, [{ t:set.lines[i].t, color:set.lines[i].accent ? st[2] : state.line1Color }], (g.left + g.right)/2, b, px);
        b -= lead;
      }
    });
    report.headCap = cap / H;

    // logo, then each label at the top of its half
    var lh = 64*k*state.logoSize, labelH = Math.max(12*k, (tall ? 0.035 : 0.06)*H), y1 = g.top;
    if (state.logo && ready.logo) {
      place(c, g, opts, 'logo', function(c){ c.drawImage(logo, g.left, g.top, logo.width * lh / logo.height, lh); });
      y1 = g.top + lh + 0.02*H;
    }
    if (state.beforeLabel.trim()) place(c, g, opts, 'label.before', function(c){ drawLabel(c, state.beforeLabel, g.left, y1, labelH, false, st, true); });
    if (state.afterLabel.trim()) place(c, g, opts, 'label.after', function(c){
      if (tall) drawLabel(c, state.afterLabel, g.left, H*0.46 + lean*W/2 + 0.025*H, labelH, true, st, true);
      else drawLabel(c, state.afterLabel, W/2 + lean*H/2 + 0.03*W, g.top, labelH, true, st, true);
    });
  }

  function drawVersus(c, p, opts){
    var g = box(p), W = g.W, H = g.H, k = g.k, st = activeStops();
    var report = opts.report || {};
    drawField(c, W, H, k, st);
    if (!g.wide) return drawVersusHalves(c, g, opts, st, report);

    var l1 = state.line1.toUpperCase().trim(), l2 = state.line2.toUpperCase().trim();
    var accent = st[2], ink = state.line1Color;
    var lean = Math.tan(state.splitAngle * Math.PI/180), sl = lean*H/2;

    // the headline is sized first: it claims the bottom, the pictures get the rest
    var parts = [];
    if (l1) parts.push({ t:l1, color:ink });
    if (l2) parts.push({ t:l2, color:accent });
    var text = parts.map(function(q){ return q.t; }).join(' ');
    var maxW = (g.right - g.left) * 0.98;
    // starts where the capitals come to about 0.12 of the height (Anton's
    // capitals are 0.86 of its size) - the bar's aim - so a short headline
    // doesn't crowd out the pictures
    var px = text ? fitWith(c, text, maxW, 0.14*H*state.headScale, 14*k, function(q){ return q*0.2; }) : 0;
    var cap = text ? capOf(c, px) : 0;
    var base = g.bottom;
    // out of the timestamp corner: a centred line that reaches it rises
    if (g.stamp && (W/2 + maxW/2) > g.stampX) base = Math.min(base, g.stampY - 0.02*H);
    var headTop = base - cap;
    report.headCap = cap / H;

    // the logo gets its own row, so no picture covers it
    var top = g.top, labelH = Math.max(12*k, 0.06*H), lh = 0;
    if (state.logo && ready.logo) { lh = 64*k*state.logoSize; top = g.top + lh + 0.02*H; }

    // the pictures: as big as the room above the headline allows, each
    // whole shape - label, ring and shadow - inside the frame with a margin
    // to spare, never run to the edge
    var zoneTop = top + labelH*0.55, zoneBot = headTop - 0.035*H, zoneH = zoneBot - zoneTop;
    var card = state.vsShape === 'card', aspW = card ? 1.18 : 1, aspH = card ? 0.86 : 1;
    var m = 0.035*W, gapX = 0.05*W;
    var half = ((g.right - m) - (g.left + m) - gapX) / 2;
    var d = Math.max(0, Math.min(zoneH / aspH, half / aspW)), bw = d*aspW;
    var c1 = { x:W/2 - gapX/2 - bw/2, y:zoneTop + zoneH/2 };
    var c2 = { x:W/2 + gapX/2 + bw/2, y:zoneTop + zoneH/2 };

    // the divider, behind the pictures: a bright slash, or a split field
    if (state.vsDivider === 'split') {
      var fill = c.createLinearGradient(0, 0, W, H);
      fill.addColorStop(0, st[1]); fill.addColorStop(1, st[2]);
      c.save(); c.globalAlpha = 0.85; c.beginPath();
      c.moveTo(W/2 + sl, 0); c.lineTo(W, 0); c.lineTo(W, H); c.lineTo(W/2 - sl, H);
      c.closePath(); c.fillStyle = fill; c.fill(); c.restore();
    } else {
      var sw = Math.max(3, 0.014*Math.min(W, H) * 1.6);
      var sg = c.createLinearGradient(0, 0, 0, H);
      sg.addColorStop(0, 'rgba(255,255,255,.95)'); sg.addColorStop(0.75, 'rgba(255,255,255,.55)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
      c.save();
      c.beginPath(); c.moveTo(W/2 + sl - sw/2, 0); c.lineTo(W/2 + sl + sw/2, 0); c.lineTo(W/2 - sl + sw/2, H); c.lineTo(W/2 - sl - sw/2, H);
      c.closePath(); c.shadowColor = 'rgba(255,255,255,.35)'; c.shadowBlur = sw*2; c.fillStyle = sg; c.fill();
      c.restore();
    }

    if (d > 0) {
      var b1 = pictureBox(c1.x, c1.y, d), b2 = pictureBox(c2.x, c2.y, d);
      place(c, g, opts, 'pic.second', function(c){ drawPicture(c, c1.x, c1.y, d, phoneImg, false, 'phone', opts, k, st); },
            { slot:'second', hit:b1 });
      place(c, g, opts, 'pic.main', function(c){ drawPicture(c, c2.x, c2.y, d, frame === paintedFrame ? null : frame, true, 'win', opts, k, st); },
            { slot:'main', hit:b2 });
      report.pictures = (card ? 2*b1.w*b1.h : 2*Math.PI*d*d/4) / (W*H);
      if (state.arrow) place(c, g, opts, 'arrow', function(c){
        drawCurvedArrow(c, b1.x + b1.w*0.86, b1.y + b1.h*0.9, b2.x + b2.w*0.08, b2.y + b2.h*0.8, { x:0, y:d*0.28 }, k);
      });
      if (state.beforeLabel.trim()) place(c, g, opts, 'label.before', function(c){ drawLabel(c, state.beforeLabel, c1.x, b1.y, labelH, false, st); }, { parent:'pic.second' });
      if (state.afterLabel.trim()) place(c, g, opts, 'label.after', function(c){ drawLabel(c, state.afterLabel, c2.x, b2.y, labelH, true, st); }, { parent:'pic.main' });
    }

    if (lh) place(c, g, opts, 'logo', function(c){ c.drawImage(logo, g.left, g.top, logo.width * lh / logo.height, lh); });

    // Set last, so nothing paints over it. Over the split field the accent
    // would sit on its own colour, so the words are set twice, each clipped
    // to its side of the cut - the cut stays where it is when the words move
    // - as chosen on the dark, and with the accent turned to ink over the field.
    if (text) place(c, g, opts, 'headline', function(c){
      var set = function(q){ slantedLine(c, q, (g.left + g.right)/2, base, px); };
      if (state.vsDivider !== 'split') return set(parts);
      var m = xformOf('headline', W, H), inv = m.inverse(), onField = inkOn(st[2]);
      c.save(); applyM(c, inv);
      c.beginPath(); c.moveTo(0, 0); c.lineTo(W/2 + sl, 0); c.lineTo(W/2 - sl, H); c.lineTo(0, H); c.closePath();
      applyM(c, m); c.clip();
      set(parts); c.restore();
      c.save(); applyM(c, inv);
      c.beginPath(); c.moveTo(W/2 + sl, 0); c.lineTo(W, 0); c.lineTo(W, H); c.lineTo(W/2 - sl, H); c.closePath();
      applyM(c, m); c.clip();
      set(parts.map(function(q){ return { t:q.t, color:q.color === accent ? onField : q.color }; })); c.restore();
    });
  }

  // Collage, built to docs/quality-bar.md: a paper panel with brush bands
  // top and bottom, a stacked headline whose accent line runs in the
  // palette's colour, a brushed underline; then a leaning strip of three
  // pictures; then one big photo to the edge. Tall frames stack the three
  // bands top to bottom.
  var dropHits = [];   // preview only: [{ slot, x, y, w, h, poly? }] for routing a drop, drag or click

  // ---- movable elements -------------------------------------------------
  // Every element a person can move - headline, pictures, logo, arrows,
  // labels - is drawn through place(). It shifts the element by its saved
  // offset, a fraction of the frame kept per template and per shape of frame
  // (a stacked tall layout is not the wide one), so a move survives a change
  // of size, and it can be turned about its centre. An element can hang off
  // another (a label off its picture) and then moves and turns with it as
  // well as on its own. Pictures that tile the template's layout - Collage's
  // panels, Before -> After's full-bleed halves - are locked: a drag on one
  // moves its photo instead, and it has no turn handle. On the preview each placed
  // element is remembered, with its drawing, so the pointer can find it.
  var layers = [];     // preview only: [{ el, parent, slot, draw, m }] in drawing order
  function frameShape(W, H){ var a = W/H; return a < 0.85 ? 'tall' : a < 1.2 ? 'square' : 'wide'; }
  function moveKey(el, W, H){ return state.layout + '.' + frameShape(W, H) + '.' + el; }
  // A saved placement is [dx, dy, degrees, pivotX, pivotY, scale]: the
  // offset and the pivot as fractions of the frame, the pivot in the
  // element's own coordinates - its centre when it was first turned or
  // resized. Older saves hold only the offset, or no scale.
  function moveOf(el, W, H){ return state.moves[moveKey(el, W, H)] || [0, 0]; }
  // The element's transform on the frame: its parent's first, then its own.
  function xformOf(el, W, H, parent){
    var m = parent ? xformOf(parent, W, H) : new DOMMatrix();
    var v = moveOf(el, W, H);
    m = m.translate(v[0]*W, v[1]*H);
    var sc = v[5] || 1;
    if (v[2] || sc !== 1) { var px = v[3]*W, py = v[4]*H; m = m.translate(px, py).rotate(v[2] || 0).scale(sc).translate(-px, -py); }
    return m;
  }
  function applyM(c, m){ c.transform(m.a, m.b, m.c, m.d, m.e, m.f); }
  function place(c, g, opts, el, draw, o){
    o = o || {};
    // a locked element is part of the template's layout: it stays put
    var m = o.locked ? new DOMMatrix() : xformOf(el, g.W, g.H, o.parent);
    c.save(); applyM(c, m); draw(c); c.restore();
    // an off-screen render can ask where its pictures went, for framing
    if (opts.hits && o.hit) opts.hits.push({ slot:o.slot, bw:o.hit.w, bh:o.hit.h });
    if (opts.preview) {
      // a picture keeps its frame's own shape, for an outline that hugs it
      var shape = o.hit ? (o.hit.poly || [[o.hit.x, o.hit.y], [o.hit.x + o.hit.w, o.hit.y], [o.hit.x + o.hit.w, o.hit.y + o.hit.h], [o.hit.x, o.hit.y + o.hit.h]]) : null;
      layers.push({ el:el, parent:o.parent || null, slot:o.slot || null, draw:draw, m:m, shape:shape, locked:!!o.locked });
      // a picture's box goes where the picture went, turned with it, for
      // drops and framing; bw keeps its own width for framing's arithmetic
      if (o.hit) {
        var h = o.hit, poly = (h.poly || [[h.x, h.y], [h.x + h.w, h.y], [h.x + h.w, h.y + h.h], [h.x, h.y + h.h]])
          .map(function(q){ var t = m.transformPoint({ x:q[0], y:q[1] }); return [t.x, t.y]; });
        var xs = poly.map(function(q){ return q[0]; }), ys = poly.map(function(q){ return q[1]; });
        var x0 = Math.min.apply(null, xs), y0 = Math.min.apply(null, ys);
        dropHits.push({ slot:o.slot, x:x0, y:y0, w:Math.max.apply(null, xs) - x0, h:Math.max.apply(null, ys) - y0,
                        bw:h.w, bh:h.h, poly:poly, angle:Math.atan2(m.b, m.a), scale:Math.hypot(m.a, m.b) });
      }
    }
  }

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
      paintStandIn(c, x0, y0, bw, bh, after, st, state[FRAMING[which].zoom]);
      if (opts.preview && label) placeholderLabel(c, x0, y0, bw, bh, label, 'rgba(255,255,255,.8)');
    }
    c.restore();
    return { x:x0, y:y0, w:bw, h:bh, poly:quad };
  }

  // A picture panel as a movable element: its box is known before it draws.
  function placeQuad(c, g, opts, quad, s, after, st){
    var xs = quad.map(function(q){ return q[0]; }), ys = quad.map(function(q){ return q[1]; });
    var x0 = Math.min.apply(null, xs), y0 = Math.min.apply(null, ys);
    place(c, g, opts, 'pic.' + s.slot, function(c){ fillQuad(c, quad, s.img, after, s.slot, opts, st, s.label); },
          { slot:s.slot, locked:true, hit:{ x:x0, y:y0, w:Math.max.apply(null, xs) - x0, h:Math.max.apply(null, ys) - y0, poly:quad } });
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
          placeQuad(c, g, opts, q, slots[i], i === 1, st);
          picsArea += (sw - gap) * rh;
        }
      }
      var hx = xa + sw + gap;
      var hq = [[sx(hx, 0), 0], [W, 0], [W, H], [sx(hx, H), H]];
      placeQuad(c, g, opts, hq, { img:frame === paintedFrame ? null : frame, slot:'main', label:'Drop the main photo' }, true, st);
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
          placeQuad(c, g, opts, q2, slots[j], j === 1, st);
          picsArea += cw * (sh - gap);
        }
      }
      var hy = ya + sh + gap;
      placeQuad(c, g, opts, [[0, sy(hy, 0)], [W, sy(hy, W)], [W, H], [0, H]], { img:frame === paintedFrame ? null : frame, slot:'main', label:'Drop the main photo' }, true, st);
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
    report.headCap = cap / H;
    // The whole block - words and underline - turns about its centre, rising
    // to the right, as the reference's does (measured at -3.7 degrees).
    if (set.lines.length) place(c, g, opts, 'headline', function(c){
      var base = top + cap;
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
      if (state.brush) {
        tightFont(c, px); var widest = Math.max.apply(null, set.lines.map(function(l){ return c.measureText(l.t).width; })); looseFont(c);
        brushSwoosh(c, cx, base - lead + cap*0.62, widest*0.78, Math.max(3, cap*0.2), ink);
      }
      c.restore();
    });

    // the logo, small, in the photo's top corner - the paper belongs to the words
    if (state.logo && ready.logo) {
      var lh = 56*k*state.logoSize, lw = logo.width * lh / logo.height;
      var ly = tall ? H*0.5 + (state.strip ? H*0.12 : 0) + 0.03*H : g.top;
      place(c, g, opts, 'logo', function(c){
        c.save(); c.shadowColor = 'rgba(0,0,0,.5)'; c.shadowBlur = 16*k; c.shadowOffsetY = 4*k;
        c.drawImage(logo, g.right - lw, ly, lw, lh);
        c.restore();
      });
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
    // Big enough to beat the reference's share of the frame (0.25) and the
    // bar's 0.33, but never to the edge: a margin all round, and room on the
    // right for the arc outside the ring.
    if (!tall) {
      d = Math.min(H*0.9, W*(square ? 0.66 : 0.5));   // 5% clear top and bottom
      cx = W - Math.max(0.06*W, W - g.right) - d/2; cy = H/2;
    } else {
      d = Math.min(W*0.9, H*(shapeOf < 0.7 ? 0.5 : shapeOf < 0.9 ? 0.6 : 0.66));   // 9:16, 4:5, square
      cx = W/2; cy = Math.max(g.top*0.6, 0.02*H) + d/2;
    }
    hw = hh = d/2;
    if (!roundish) {
      var fa = Math.max(0.6, Math.min(2.2, pa)), mw, mh;
      // As big as the words allow - 58% of the width beside them, nearly the
      // full width above them in stacked sizes - with room left so the
      // tilted corners stay inside the frame.
      if (!tall) { mw = W*0.58; mh = H*0.8; }
      else { mw = W*0.92; mh = H*(shapeOf < 0.7 ? 0.46 : shapeOf < 0.9 ? 0.56 : 0.5); }
      var pw = Math.min(mw, mh*fa), ph = pw/fa;
      hw = pw/2; hh = ph/2;
      if (!tall) { cx = W - Math.max(0.05*W, W - g.right) - hw; cy = H/2; }
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

    // the photo, in a white ring (circle) or a white-edged frame turned a
    // touch; with a circle, a thin arc and its dot just outside the ring
    var ring = Math.max(2, Math.min(hw, hh)*0.028);
    place(c, g, opts, 'pic.main', function(c){
      if (roundish) {
        c.save();
        c.strokeStyle = ink; c.lineWidth = Math.max(1.5, 2.5*k);
        var ar = d/2 + Math.max(10*k, d*0.07), a0 = tall ? -0.35*Math.PI : -0.38*Math.PI, a1 = tall ? 0.05*Math.PI : 0.3*Math.PI;
        c.beginPath(); c.arc(cx, cy, ar, a0, a1); c.stroke();
        c.beginPath(); c.arc(cx + Math.cos(a0)*ar, cy + Math.sin(a0)*ar, Math.max(3, 5*k), 0, Math.PI*2); c.fillStyle = ink; c.fill();
        c.restore();
      }
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
        paintStandIn(c, cx - hw, cy - hh, 2*hw, 2*hh, true, st, state.zoom);
        if (opts.preview) placeholderLabel(c, cx - hw, cy - hh, 2*hw, 2*hh, 'Drop the photo', 'rgba(255,255,255,.8)');
      }
      c.restore();
      c.restore();
    }, { slot:'main', hit:{ x:cx - hw, y:cy - hh, w:2*hw, h:2*hh } });
    report.pictures = (roundish ? Math.PI*hw*hw : 4*hw*hh) / (W*H);

    // the words: main lines stacked and slanted, the accent line half again
    // as big, in the gradient
    // the frame's tilt drops one lower corner by about hw*sin(3 degrees)
    var sag = roundish ? 0 : hw*Math.sin(3*Math.PI/180);
    var tb = !tall ? { x0:g.left, x1:cx - hw - sag - 0.04*W, y0:g.top, y1:g.bottom }
                   : { x0:g.left, x1:g.right, y0:cy + hh + sag + 0.04*H, y1:g.bottom };
    // The logo never sits on the picture. Beside it, it takes a row above
    // the words. Stacked, it sits under the words, in the room their
    // centring leaves - taking none from them.
    if (state.logo && ready.logo && !tall) tb.y0 += 52*k*state.logoSize + 0.02*H;
    var main = state.line1.toUpperCase().trim().split(/\s+/).filter(Boolean);
    var accent = state.line2.toUpperCase().trim();
    var colW = tb.x1 - tb.x0, room = tb.y1 - tb.y0;
    // For each way of breaking the main words, size them to the width, then
    // give the key word whatever height is left - up to 2.6 times the main
    // size, so it leads without swallowing the rest. The key word's size
    // decides between arrangements first, the main lines' second.
    var big = 0.3*H*state.headScale;
    function fitWords(room){
    var best = null;
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
    return best;
    }
    var best = fitWords(room);
    // Stacked, the logo takes no room from the words where it can help it:
    // beside the last line when that line leaves space at its end, else
    // under the words in the room their centring leaves; only where neither
    // fits do the words give up a row for it.
    var llh = 52*k*state.logoSize, llw = (state.logo && ready.logo) ? logo.width * llh / logo.height : 0, logoGap = 0.03*H;
    var logoAt = null;
    function lastLineEnd(b){
      if (accent) {
        tightFont(c, b.apx); var aw = c.measureText(accent).width; looseFont(c);
        return tb.x0 + Math.min(b.capM*0.8, Math.max(0, colW - aw)) + b.capA*0.2 + aw;
      }
      tightFont(c, b.px); var lw0 = b.lines.length ? c.measureText(b.lines[b.lines.length - 1]).width : 0; looseFont(c);
      return tb.x0 + b.capM*0.2 + lw0;
    }
    if (tall && llw) {
      if (g.right - lastLineEnd(best) >= llw + 0.03*W) logoAt = 'beside';
      else if ((room - best.h)/2 >= llh + logoGap) logoAt = 'under';
      else { room -= llh + logoGap; best = fitWords(room); logoAt = 'under'; }
    }
    var y = tb.y0 + (room - best.h)/2;
    function slant(c, text, x, base, px, fill){
      c.save();
      c.translate(0, base); c.transform(1, 0, -0.2, 1, 0, 0); c.translate(0, -base);
      tightFont(c, px); c.fillStyle = fill; c.fillText(text, x, base);
      looseFont(c); c.restore();
    }
    // where the lines end, for the arrow, measured before anything is drawn
    var lastEnd = tb.x0, firstEnd = tb.x0, firstTop = y;
    tightFont(c, best.px);
    best.lines.forEach(function(t, i){
      var end = tb.x0 + best.capM*0.2 + c.measureText(t).width;
      lastEnd = Math.max(lastEnd, end); if (!i) firstEnd = end;
    });
    looseFont(c);
    place(c, g, opts, 'headline', function(c){
      best.lines.forEach(function(t, i){
        slant(c, t, tb.x0 + best.capM*0.2, y + best.capM + i*best.capM*1.2, best.px, ink);
      });
      if (accent) {
        var apx = best.apx;
        tightFont(c, apx); var aw = c.measureText(accent).width; looseFont(c);
        var ax = tb.x0 + Math.min(best.capM*0.8, Math.max(0, colW - aw));
        var ag = c.createLinearGradient(ax, 0, ax + aw, 0);
        ag.addColorStop(0, g0); ag.addColorStop(1, g1);
        slant(c, accent, ax + best.capA*0.2, y + best.h, apx, ag);
      }
    });
    report.headCap = Math.max(best.capM, best.capA) / H;

    // the arrow: from beside the circle, curling down onto the words
    if (state.arrow2 && best.lines.length) {
      var t = Math.max(4, 0.03*H);
      if (!tall) {
        // down from beside the circle's top onto the end of the first line,
        // above the longer lines that follow
        var hx = firstEnd + 0.025*W, hy = firstTop + best.capM*0.45;
        var tx = Math.min(cx - hw*0.84, hx + 0.16*W), ty = Math.max(g.top*0.5, firstTop - best.capM*0.9);
        if (tx - hx > 0.05*W) place(c, g, opts, 'arrow', function(c){ handArrow(c, tx, ty, tx - 0.01*W, hy, hx, hy, t, ink); });
      } else if (g.right - lastEnd > 0.16*W) {
        // only where the first line leaves room beside it
        var sx0 = g.right - 0.05*W, sy0 = firstTop + best.capM;
        place(c, g, opts, 'arrow', function(c){ handArrow(c, sx0, sy0, sx0 + 0.03*W, cy + hh + 0.02*H, cx + hw*0.5, cy + hh - hh*0.04, t, ink); });
      }
    }

    // the logo, small, in the row kept for it
    if (state.logo && ready.logo) {
      var lh = 52*k*state.logoSize, lw = logo.width * lh / logo.height;
      place(c, g, opts, 'logo', function(c){
        if (logoAt === 'beside') c.drawImage(logo, g.right - lw, y + best.h - lh, lw, lh);
        else if (logoAt === 'under') c.drawImage(logo, g.right - lw, y + best.h + logoGap, lw, lh);
        else c.drawImage(logo, g.left, g.top, lw, lh);
      });
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
      qualityAll:function(){ return PRESETS.filter(function(p){ return p.id !== 'custom'; }).map(measure); },
      // the movable elements on the preview, with the box each one paints
      layers:function(){ draw(); return layerMasks().map(function(m){ return { el:m.L.el, slot:m.L.slot, box:m.box, placed:placedBox(m) }; }); },
      frames:function(){ return Object.keys(framesFound).map(function(k){ var r = framesFound[k]; return { t:r.t, face:r.face, score:r.score }; }); },
      handle:function(){ var q = selGeom(); return q && { x:q.handle.x, y:q.handle.y, corners:q.corners.map(function(c){ return { x:c.x, y:c.y }; }) }; }
    };
  }

  function render(c, p, opts){
    opts = opts || {};
    if (opts.preview) { dropHits = []; layers = []; masks = null; }
    c.clearRect(0, 0, p.w, p.h);
    templateById(state.layout).draw(c, p, opts);
    if (opts.guides) drawGuides(c, p);
  }


  var firstDraw = true, lastScene = '', reframing = false;
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
    // a selection belongs to one template at one size
    var scene = state.layout + '|' + p.w + 'x' + p.h;
    if (scene !== lastScene) { selected = null; stopAdjusting(); lastScene = scene; }
    render(ctx, p, { guides: state.safe, preview: true });
    if (!reframing) { reframing = true; keepFaceFraming(); reframing = false; }
    drawSelection();
    var pre = state.layout + '.' + frameShape(p.w, p.h) + '.', resetBtn = document.getElementById('movesReset');
    if (resetBtn) resetBtn.hidden = !Object.keys(state.moves).some(function(key){ return key.indexOf(pre) === 0; });
    if (ideas && ideas.length) redrawIdeas();   // undefined until the video part of the script has run
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
  var CHIP_H = 24, CHIP_MIN = 12, CHIP_MAX = 40;
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
    customRow.className = 'row'; customRow.id = 'customRow'; customRow.hidden = state.preset !== 'custom';   // open at load if the saved size is custom
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
    // shown on hover when the rail is narrowed to shapes only
    tile.title = isCustom ? 'Custom size' : p.label + ', ' + p.w + '×' + p.h;
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
    // the number beside the slider, so a setting can be read and matched
    var out = input.nextElementSibling;
    if (out && out.tagName === 'OUTPUT') out.textContent = input.value + (ctl.unit === '%' ? '%' : '°');
  }

  // One change path for every control: set the value, run the control's own
  // extra step, bring every copy of the control up to date, save, redraw.
  function setControl(key, value){
    state[key] = value;
    // a zoom slider moved by hand ends that picture's face framing
    Object.keys(FRAMING).forEach(function(slot){ if (FRAMING[slot].zoom === key) handFramed(slot); });
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
        // one line: name, slider, value
        wrap = el('div', 'field slide');
        label = el('label'); label.htmlFor = id; wrap.appendChild(label);
        input = el('input'); input.type = 'range'; input.id = id; input.min = ctl.min; input.max = ctl.max;
        input.addEventListener('input', function(){ sayRange(ctl, input); setControl(ctl.key, fromSlider(ctl, input.value)); });
        wrap.appendChild(input);
        var out = el('output'); out.htmlFor = id; out.setAttribute('aria-hidden', 'true'); wrap.appendChild(out);
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
        // the picture's name and its buttons share a line; its zoom joins below
        wrap = el('div', 'field pic');
        var head = el('div', 'pichead'); wrap.appendChild(head);
        label = el('span', 'legend'); label.id = id + 'Label'; head.appendChild(label);
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
        head.appendChild(btns); wrap.appendChild(file);
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
    var p = hintEl('Click a picture on the preview to replace it; double-click to move the photo inside. Under 100% zoom shows it whole.');
    return p;
  }
  function buildTemplatePicker(){
    var f = el('fieldset', 'field seg');
    var lg = el('legend', 'legend', 'Template'); f.appendChild(lg);
    var box = el('div', 'tpls'); box.id = 'tpls'; f.appendChild(box);
    var hint = hintEl(''); hint.id = 'layoutHint'; f.appendChild(hint);
    // moving things is done on the preview; this only takes it back
    var row = el('div', 'moverow');
    row.appendChild(hintEl('On the preview: drag to move, handle to turn, corners to resize - on a picture, to zoom the photo inside.'));
    var reset = el('button', 'btn btn-sm', 'Reset positions'); reset.id = 'movesReset'; reset.type = 'button'; reset.hidden = true;
    reset.addEventListener('click', function(){
      var p = current(), pre = state.layout + '.' + frameShape(p.w, p.h) + '.';
      Object.keys(state.moves).forEach(function(key){ if (key.indexOf(pre) === 0) delete state.moves[key]; });
      selected = null; stopAdjusting(); persist(); draw();
    });
    row.appendChild(reset); f.appendChild(row);
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
    main:     { load:function(b, done){ loadBlob(b, done); },     clear:function(){ frame = paintedFrame; state.panX = state.panY = 0; handFramed('main'); syncControls(); draw(); setStatus('Picture removed.', 'ok'); },
                has:function(){ return frame !== paintedFrame; } },
    second:   { load:function(b, done){ loadPhone(b, done); },    clear:clearSecond,    has:function(){ return !!phoneImg; } },
    backdrop: { load:function(b){ loadBackdrop(b); }, clear:clearBackdrop,  has:function(){ return !!bgImg; } },
    third:    { load:function(b, done){ loadInto('img3', b, done); }, clear:function(){ img3 = null; handFramed('third'); syncControls(); draw(); }, has:function(){ return !!img3; } },
    fourth:   { load:function(b, done){ loadInto('img4', b, done); }, clear:function(){ img4 = null; handFramed('fourth'); syncControls(); draw(); }, has:function(){ return !!img4; } }
  };
  // The Collage strip's other two panels: plain pictures, no framing of
  // their own to remember.
  function loadInto(which, blob, done){
    var img = new Image();
    img.onload = function(){
      if (which === 'img3') { img3 = img; state.pan3X = state.pan3Y = 0; handFramed('third'); } else { img4 = img; state.pan4X = state.pan4Y = 0; handFramed('fourth'); }
      syncControls(); draw(); setStatus('Picture loaded.', 'ok');
      if (done) done();
    };
    img.onerror = function(){ setStatus('That file could not be read as an image.', 'err'); };
    img.src = URL.createObjectURL(blob);
  }
  function clearSecond(){
    phoneImg = null; handFramed('second'); syncControls(); draw();
    setStatus('Picture removed.', 'ok');
  }
  function loadPhone(blob, done){
    var img = new Image();
    img.onload = function(){
      phoneImg = img; state.phonePanX = 0; state.phonePanY = 0; handFramed('second');
      syncControls(); draw();
      setStatus(state.layout === 'versus' ? 'Before picture loaded. Drag it on the before picture to reframe it.'
                                          : 'Picture loaded.', 'ok');
      if (done) done();
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
      derived:state.derived, feed:state.feed, moves:state.moves
    };
    remembered().forEach(function(ctl){ out[ctl.key] = state[ctl.key]; });
    try { localStorage.setItem('tf-state', JSON.stringify(out)); } catch(e) {
      // A big custom logo can blow the storage quota. Losing the saved copy is
      // survivable; the logo stays put for this session either way.
    }
  }

  // ---- image loading ----------------------------------------------------
  // The main picture's button and file input come from the schema (slot 'main').
  function loadBlob(blob, done){
    var url = URL.createObjectURL(blob);
    var img = new Image();
    img.onload = function(){
      frame = img; ready.frame = true; state.panX = 0; state.panY = 0; handFramed('main');
      refreshDerived('frame', img); draw();
      setStatus('Image loaded. Its colours are in the palette swatches.', 'ok');
      if (done) done();
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
      if (x < h.x || x > h.x + h.w || y < h.y || y > h.y + h.h) continue;
      if (!h.poly || inPoly(h.poly, x, y)) return h;
    }
    return null;
  }
  // Even-odd point in polygon, for the slanted halves and panels.
  function inPoly(poly, x, y){
    var inside = false;
    for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      var a = poly[i], b = poly[j];
      if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
    }
    return inside;
  }
  function dropSlot(e){ var h = hitAt(e); return h ? h.slot : 'main'; }
  wrap.addEventListener('drop', function(e){
    // a frame dragged from the video strip goes into the picture it lands on
    var ft = e.dataTransfer && e.dataTransfer.getData('application/x-tf-frame');
    if (ft && vid) { useFrame(+ft, dropSlot(e)); return; }
    var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (!f) return;
    if (isVideo(f)) { startVideo(f); return; }
    SLOTS[dropSlot(e)].load(f);
  });

  // ---- frames from a video -----------------------------------------------
  // A video chosen or dropped here is played inside the page and never sent
  // anywhere. The tool asks for its title, then scans 48 moments spread
  // across it - skipping the first and last 3%, where titles and end cards
  // sit - scoring each on a small copy for sharpness (the variance of its
  // Laplacian, which motion blur flattens), exposure and contrast. It offers
  // the six best that differ from each other, in time order. A frame is
  // grabbed again at the video's full size only when it is used: a click
  // puts it in the main picture, a drag onto the preview puts it in the
  // picture it lands on.
  var framesEl = document.getElementById('frames'), frameRow = document.getElementById('frameRow');
  var framesStatus = document.getElementById('framesStatus'), titleEl = document.getElementById('videoTitle');
  var videoFile = document.getElementById('videoFile');
  var vid = null, vidUrl = null, scanId = 0, grabChain = Promise.resolve(), framesFound = {};
  var ideaRow = document.getElementById('ideaRow'), ideasHead = document.getElementById('ideasHead'), framesHead = document.getElementById('framesHead'), ideas = [];
  var SAMPLES = 48, SMALL = 256, PICKS = 6;
  function isVideo(f){ return /^video\//.test(f.type || '') || /\.(mp4|m4v|mov|webm|mkv)$/i.test(f.name || ''); }
  document.getElementById('videoPick').addEventListener('click', function(){ videoFile.click(); });
  videoFile.addEventListener('change', function(){ if (videoFile.files[0]) startVideo(videoFile.files[0]); videoFile.value = ''; });
  document.getElementById('framesClose').addEventListener('click', function(){ closeFrames(); draw(); });
  document.getElementById('titleUse').addEventListener('click', useTitle);
  titleEl.addEventListener('keydown', function(e){ if (e.key === 'Enter') { e.preventDefault(); useTitle(); } });
  function closeFrames(){
    scanId++;
    framesEl.hidden = true; frameRow.textContent = ''; framesStatus.textContent = ''; framesFound = {};
    ideaRow.textContent = ''; ideasHead.hidden = framesHead.hidden = true; ideas = [];
    if (vidUrl) URL.revokeObjectURL(vidUrl);
    vid = null; vidUrl = null;
  }
  // Camera and screen-recorder names say nothing about the video, so they
  // leave the title empty for the person to fill in.
  function titleFromName(name){
    var t = name.replace(/\.[^.]+$/, '').replace(/[_\-.]+/g, ' ').replace(/\s+/g, ' ').trim();
    if (/^(img|vid|mov|mvi|pxl|dsc|dji|gopr|gh\d|screen ?recording|screenshot|video|clip|untitled)\b/i.test(t)) return '';
    if (!/[a-z]{3}/i.test(t)) return '';
    return t;
  }
  // The title becomes the headline: its last word the accent, the rest the
  // main line, within each line's length.
  function useTitle(){
    var words = titleEl.value.trim().split(/\s+/).filter(Boolean);
    if (!words.length) { titleEl.focus({ preventScroll:true }); return; }
    var l2 = words.length > 1 ? words[words.length - 1] : '';
    var l1 = (words.length > 1 ? words.slice(0, -1) : words).join(' ');
    setControl('line1', l1.slice(0, 32)); setControl('line2', l2.slice(0, 24));
    framesStatus.textContent = 'The title is the headline now. Shorten it under Headline if it runs small.';
  }
  function clock(t){ var m = Math.floor(t / 60), s = Math.floor(t % 60); return m + ':' + (s < 10 ? '0' : '') + s; }

  function startVideo(file){
    closeFrames();
    var my = ++scanId;
    framesEl.hidden = false;
    titleEl.value = titleFromName(file.name || '');
    framesStatus.textContent = 'Opening the video…';
    draw();
    // the editor fits the window; focusing mustn't scroll the page under it
    titleEl.focus({ preventScroll:true });
    vid = document.createElement('video');
    vid.muted = true; vid.preload = 'auto'; vid.playsInline = true;
    vidUrl = URL.createObjectURL(file);
    vid.addEventListener('error', function(){
      if (my !== scanId) return;
      framesStatus.textContent = "This browser can't play that file. iPhone videos (.mov in HEVC) often can't be read in Chrome: export it as MP4, or drop a screenshot instead.";
    });
    vid.addEventListener('loadeddata', function(){ if (my === scanId) scan(my); }, { once:true });
    vid.src = vidUrl;
  }
  // Seeking settles on 'seeked'; a seek to where the video already is may
  // not fire it, so a timer lets the scan go on regardless.
  function seekTo(t){
    return new Promise(function(done){
      var timer = setTimeout(finish, 3000);
      function finish(){ clearTimeout(timer); vid.removeEventListener('seeked', finish); done(); }
      vid.addEventListener('seeked', finish);
      vid.currentTime = t;
    });
  }
  function scoreFrame(c, w, h, t){
    var d = c.getImageData(0, 0, w, h).data, n = w*h, g = new Float32Array(n), sum = 0, sq = 0;
    for (var i = 0; i < n; i++) {
      var y = (0.299*d[i*4] + 0.587*d[i*4 + 1] + 0.114*d[i*4 + 2]) / 255;
      g[i] = y; sum += y; sq += y*y;
    }
    var mean = sum/n, std = Math.sqrt(Math.max(0, sq/n - mean*mean));
    var ls = 0, ls2 = 0, m = 0;
    for (var yy = 1; yy < h - 1; yy++) for (var x = 1; x < w - 1; x++) {
      var k = yy*w + x, L = 4*g[k] - g[k - 1] - g[k + 1] - g[k - w] - g[k + w];
      ls += L; ls2 += L*L; m++;
    }
    // a 16 x 9 grid of average brightness, for telling frames apart
    var sig = new Float32Array(144);
    for (var gy = 0; gy < 9; gy++) for (var gx = 0; gx < 16; gx++) {
      var a = 0, cnt = 0;
      for (var py = Math.floor(gy*h/9); py < Math.floor((gy + 1)*h/9); py++)
        for (var px = Math.floor(gx*w/16); px < Math.floor((gx + 1)*w/16); px++) { a += g[py*w + px]; cnt++; }
      sig[gy*16 + gx] = cnt ? a/cnt : 0;
    }
    return { t:t, mean:mean, std:std, sharp:ls2/m - (ls/m)*(ls/m), sig:sig, thumb:c.canvas.toDataURL('image/jpeg', 0.82) };
  }
  // ---- faces --------------------------------------------------------------
  // Google's MediaPipe face detector, run on this device. Its code comes from
  // jsDelivr and its model (224 KB) ships with the site, both fetched only
  // the first time a video is scanned; the frames themselves never leave the
  // page. Where it can't load, the scan goes on without faces.
  var MP = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1';
  var faceDetector = null, facePromise = null;
  function loadFaces(){
    if (facePromise) return facePromise;
    facePromise = import(MP + '/vision_bundle.mjs').then(function(v){
      return v.FilesetResolver.forVisionTasks(MP + '/wasm').then(function(files){
        var opts = function(delegate){
          return { baseOptions:{ modelAssetPath:'models/blaze_face_short_range.tflite', delegate:delegate },
                   runningMode:'IMAGE', minDetectionConfidence:0.5 };
        };
        return v.FaceDetector.createFromOptions(files, opts('GPU')).catch(function(){
          return v.FaceDetector.createFromOptions(files, opts('CPU'));
        });
      });
    }).then(function(d){ faceDetector = d; return d; }).catch(function(){ faceDetector = null; return null; });
    return facePromise;
  }
  // The best face in a frame, as fractions of the frame: its box and score.
  // A face cut by the frame's edge is passed over - it can't be framed.
  function findFace(canvas){
    if (!faceDetector) return null;
    var res; try { res = faceDetector.detect(canvas); } catch(e){ return null; }
    var W = canvas.width, H = canvas.height, best = null;
    (res && res.detections || []).forEach(function(d){
      var b = d.boundingBox, sc = d.categories && d.categories[0] ? d.categories[0].score : 0;
      if (!b) return;
      var f = { x:b.originX / W, y:b.originY / H, w:b.width / W, h:b.height / H, score:sc };
      if (f.x < 0.01 || f.y < 0.01 || f.x + f.w > 0.99 || f.y + f.h > 0.99) return;
      if (!best || f.w*f.h*f.score > best.w*best.h*best.score) best = f;
    });
    return best;
  }
  // A detection is kept when it is confident, or when the sample before or
  // after finds a face in the same place: a real face stays put for a moment,
  // a pattern that happens to look like one for a single frame doesn't.
  function confirmFaces(results){
    var near = function(a, b){
      return a && b && Math.hypot((a.x + a.w/2) - (b.x + b.w/2), (a.y + a.h/2) - (b.y + b.h/2)) < Math.max(a.w, b.w);
    };
    var keep = results.map(function(r, i){
      var f = r.face; if (!f) return null;
      if (f.score >= 0.75) return f;
      return (near(f, results[i - 1] && results[i - 1].face) || near(f, results[i + 1] && results[i + 1].face)) ? f : null;
    });
    results.forEach(function(r, i){ r.face = keep[i]; });
  }
  // A frame with a clear face ranks up, more for a bigger face, up to about
  // a tenth of the frame; beyond that bigger doesn't help.
  function faceBonus(f){ return f ? 1 + 0.9 * Math.min(1, (f.w*f.h) / 0.1) * f.score : 1; }

  // Frames the face inside a picture: zoomed so the face takes about 40% of
  // the picture's height (never below 100%, so nothing new shows around the
  // photo), and moved so it sits centred, eyes a little above the middle.
  // The pan is worked the way cover() draws: an offset of the photo's
  // centre, in the canvas's width and height for the main picture and in
  // the picture's own width for the rest.
  // A picture framed this way remembers its face, and frames itself again
  // when its frame changes shape or size - another template, shape or size -
  // until the person reframes it by hand; from then on their framing stands.
  var faceFor = {};   // slot: { face, key } while the framing is automatic
  function frameKey(h){ return Math.round(h.bw) + 'x' + Math.round(h.bh || h.h); }
  function keepFaceFraming(){
    if (!faceFor) return;   // a draw before this part of the script has run
    Object.keys(faceFor).forEach(function(slot){
      var ff = faceFor[slot], h = null;
      for (var i = 0; i < dropHits.length; i++) if (dropHits[i].slot === slot) h = dropHits[i];
      if (h && frameKey(h) !== ff.key) frameOnFace(slot, ff.face);
    });
  }
  function handFramed(slot){ if (slot && faceFor) delete faceFor[slot]; }
  function frameOnFace(slot, face){
    var img = { main:frame, second:phoneImg, third:img3, fourth:img4 }[slot];
    var h = null, p = current();
    for (var i = 0; i < dropHits.length; i++) if (dropHits[i].slot === slot) h = dropHits[i];
    if (!img || !h || !face) return;
    faceFor[slot] = { face:face, key:frameKey(h) };
    setFaceFraming(slot, face, img, h, p);
    syncControls(); draw();
  }
  function setFaceFraming(slot, face, img, h, p){
    var bw = h.bw, bh = h.bh || h.h, f = FRAMING[slot];
    var fit = Math.max(bw / img.width, bh / img.height);
    var z = Math.max(1, Math.min(ZOOM_MAX, 0.4 * bh / (face.h * img.height * fit)));
    var iw = img.width * fit * z, ih = img.height * fit * z;
    var cxF = face.x + face.w/2, cyF = face.y + face.h/2;
    // the face's centre to the middle across and 44% of the way down
    var dx = (0.5 - cxF) * iw, dy = (0.44 - 0.5) * bh + (0.5 - cyF) * ih;
    state[f.zoom] = Math.round(z * 100) / 100;
    if (slot === 'main') { state.panX = dx / p.w; state.panY = dy / p.h; }
    else { state[f.x] = dx / bw; state[f.y] = dy / bw; }
  }

  function sigDist(a, b){ var s = 0; for (var i = 0; i < 144; i++) s += Math.abs(a[i] - b[i]); return s/144; }
  // Good frames: sharp, neither dark nor blown out, with some contrast.
  // Flat frames - black, a fade, a plain title card - are left out.
  // Sharpness is judged within a scene, not across the video: a busy scene
  // would otherwise outscore every calm one and take all six places. So the
  // samples are split into scenes where the picture jumps, each scene's best
  // frame is offered first, best scenes first, then the next best of each,
  // skipping any frame too like one already offered.
  function choose(results, d){
    var scenes = [], cur = null;
    results.forEach(function(r, i){
      if (!cur || sigDist(results[i - 1].sig, r.sig) > 0.1) { cur = []; scenes.push(cur); }
      cur.push(r);
    });
    var good = function(r){ return r.std > 0.04 && r.mean > 0.06 && r.mean < 0.94; };
    scenes = scenes.map(function(sc){
      var pool = sc.filter(good);
      var maxSharp = Math.max.apply(null, pool.map(function(r){ return r.sharp; }).concat([1e-9]));
      pool.forEach(function(r){
        var expo = Math.max(0, 1 - Math.abs(r.mean - 0.48) / 0.42), con = Math.min(1, r.std / 0.22);
        r.local = Math.pow(r.sharp / maxSharp, 0.7);   // against its own scene
        r.score = (0.35 + 0.65*expo) * (0.4 + 0.6*con) * faceBonus(r.face);
      });
      return pool.sort(function(a, b){ return b.local*b.score - a.local*a.score; });
    }).filter(function(sc){ return sc.length; });
    if (!scenes.length) scenes = [results.slice()];
    // a scene's standing: its best frame, less for a blurred stretch
    var globalSharp = Math.max.apply(null, results.map(function(r){ return r.sharp; })) || 1;
    scenes.sort(function(a, b){
      var sa = (a[0].score || 0) * Math.pow(a[0].sharp / globalSharp, 0.25), sb = (b[0].score || 0) * Math.pow(b[0].sharp / globalSharp, 0.25);
      return sb - sa;
    });
    var out = [], need = 0.05, gap = d/40;
    for (var round = 0; out.length < PICKS && round < SAMPLES; round++) {
      var any = false;
      scenes.forEach(function(sc){
        if (out.length >= PICKS) return;
        for (var j = 0; j < sc.length; j++) {
          var r = sc[j];
          if (out.indexOf(r) >= 0) continue;
          if (out.every(function(o){ return sigDist(o.sig, r.sig) > need && Math.abs(o.t - r.t) > gap; })) { out.push(r); any = true; return; }
        }
      });
      if (!any) { need /= 2; gap /= 2; if (need < 0.002) break; }   // a short or static video: relax
    }
    return out.sort(function(a, b){ return a.t - b.t; });
  }
  function scan(my){
    var d = vid.duration, vw = vid.videoWidth, vh = vid.videoHeight;
    if (!isFinite(d) || d <= 0 || !vw) {
      framesStatus.textContent = "The browser can't read this video's length or picture. Try it as an MP4.";
      return;
    }
    var sw = SMALL, sh = Math.max(1, Math.round(SMALL * vh / vw));
    var c = document.createElement('canvas'); c.width = sw; c.height = sh;
    var cx = c.getContext('2d', { willReadFrequently:true });
    // faces are looked for on a larger copy: at 256 wide a face across the
    // room is a few pixels
    var fc = document.createElement('canvas'); fc.width = 640; fc.height = Math.max(1, Math.round(640 * vh / vw));
    var fcx = fc.getContext('2d');
    var n = Math.max(PICKS, Math.min(SAMPLES, Math.floor(d * 4))), t0 = d*0.03, t1 = d*0.97, results = [], i = 0;
    function next(){
      if (my !== scanId) return;
      if (i >= n) {
        confirmFaces(results);
        var best = choose(results, d);
        framesStatus.textContent = 'Click a frame to use it as the ' + labelFor(controlByKey('main'), state.layout).toLowerCase() +
          ', or drag it onto any picture in the preview.';
        best.forEach(addTile);
        framesHead.hidden = false;
        showIdeas(best, my);
        if (!faceDetector) framesStatus.textContent += ' (Face detection could not load, so frames are picked without it.)';
        draw();
        return;
      }
      var t = t0 + (t1 - t0) * (n === 1 ? 0.5 : i / (n - 1));
      framesStatus.textContent = 'Looking through the video… ' + Math.round(i / n * 100) + '%';
      seekTo(t).then(function(){
        if (my !== scanId) return;
        cx.drawImage(vid, 0, 0, sw, sh);
        var r = scoreFrame(cx, sw, sh, t);
        if (faceDetector) { fcx.drawImage(vid, 0, 0, fc.width, fc.height); r.face = findFace(fc); }
        results.push(r);
        i++; next();
      });
    }
    // Face detection loads first - a few seconds the first time, cached
    // after - and a scan without it beats waiting forever for it.
    framesStatus.textContent = 'Getting face detection ready…';
    Promise.race([loadFaces(), new Promise(function(done){ setTimeout(done, 20000); })]).then(function(){
      if (my !== scanId) return;
      next();
    });
  }
  function addTile(r){
    var b = el('button', 'frametile'); b.type = 'button'; b.draggable = true;
    b.setAttribute('aria-label', 'Use the frame at ' + clock(r.t));
    var im = el('img'); im.src = r.thumb; im.alt = ''; b.appendChild(im);
    b.appendChild(el('span', null, clock(r.t)));
    b.addEventListener('click', function(){ useFrame(r.t, 'main', b); });
    b.addEventListener('dragstart', function(e){
      e.dataTransfer.setData('application/x-tf-frame', String(r.t));
      e.dataTransfer.effectAllowed = 'copy';
    });
    b.dataset.t = r.t;
    if (r.face) { b.classList.add('hasface'); b.title = 'A face is in this frame; it will be framed on it.'; }
    framesFound[r.t] = r;
    frameRow.appendChild(b);
  }
  // ---- ideas: finished thumbnails built from the video --------------------
  // Up to six, each a template with its pictures, shape and palette, chosen
  // from what the scan found. With a face: Talking point on the best face,
  // a Collage of different moments, Before -> After from the start and end.
  // Without one - a screen recording, say - Launch leads. Each is drawn from
  // the scan's small copies, so nothing more is read from the video until
  // one is applied; then its frames are taken at full size and framed on
  // their faces, and everything stays editable.
  var IDEA_PALETTES = ['fromFrame', 'kk', 'ember', 'mint', 'signal', 'ice'];
  function buildIdeas(best){
    var byScore = best.slice().sort(function(a, b){ return b.score - a.score; });
    var faces = best.filter(function(r){ return r.face; }).sort(function(a, b){ return b.face.w*b.face.h*b.face.score - a.face.w*a.face.h*a.face.score; });
    var plain = byScore.filter(function(r){ return !r.face; });
    var first = best[0], last = best[best.length - 1], top = faces[0] || byScore[0];
    var others = function(not){ return byScore.filter(function(r){ return not.indexOf(r) < 0; }); };
    var strip = others([top]);
    var collage = { layout:'collage', pics:{ main:top, second:strip[0], third:strip[1], fourth:strip[2] } };
    var talking = { layout:'talking', tpShape:'circle', pics:{ main:top } };
    var talking2 = { layout:'talking', tpShape:'frame', pics:{ main:faces[1] || plain[0] || byScore[1] || top } };
    var versus = { layout:'versus', vsShape:faces.length > 1 ? 'circle' : 'card', pics:{ second:first, main:last } };
    var versus2 = { layout:'versus', vsShape:'card', pics:{ second:byScore[1] || first, main:top } };
    var launch = { layout:'launch', pics:{ main:plain[0] || byScore[0] } };
    var launch2 = { layout:'launch', pics:{ main:plain[1] || byScore[1] || byScore[0] } };
    var list = faces.length ? [talking, collage, versus, launch, talking2, versus2]
                            : [launch, collage, versus, launch2, talking2, versus2];
    if (best.length < 2) list = list.filter(function(i){ return i.layout !== 'versus'; });
    return list.slice(0, 6).map(function(idea, i){ idea.palette = IDEA_PALETTES[i % IDEA_PALETTES.length]; return idea; });
  }
  // The scan's small copies as pictures, for drawing ideas.
  function smallImage(r){
    if (r.img) return Promise.resolve(r.img);
    return new Promise(function(done){ var im = new Image(); im.onload = function(){ r.img = im; done(im); }; im.onerror = function(){ done(null); }; im.src = r.thumb; });
  }
  var IDEA_KEYS = ['layout', 'vsShape', 'tpShape', 'palette', 'strip', 'zoom', 'panX', 'panY', 'phoneZoom', 'phonePanX', 'phonePanY', 'zoom3', 'pan3X', 'pan3Y', 'zoom4', 'pan4X', 'pan4Y'];
  var IDEA_IMAGE = { main:'frame', second:'phoneImg', third:'img3', fourth:'img4' };
  // Draws an idea by borrowing the state and pictures for the moment it
  // takes, the way the template picker's previews do, then puts them back.
  // It draws twice: once to learn where its pictures land, then framed on
  // their faces.
  function drawIdea(idea, cvs){
    var p = current(), tw = cvs.width, th = cvs.height;
    var small = { id:p.id, w:tw, h:th, safe:p.safe, play:p.play };
    var keep = {}; IDEA_KEYS.forEach(function(k){ keep[k] = state[k]; });
    var keepImgs = { frame:frame, phoneImg:phoneImg, img3:img3, img4:img4 }, keepShown = JSON.stringify(shown), keepDerived = state.derived.frame, keepMoves = state.moves;
    try {
      state.layout = idea.layout; state.strip = true;
      if (idea.vsShape) state.vsShape = idea.vsShape;
      if (idea.tpShape) state.tpShape = idea.tpShape;
      state.palette = idea.palette; state.moves = {};
      Object.keys(FRAMING).forEach(function(slot){ var f = FRAMING[slot]; state[f.zoom] = 1; state[f.x] = 0; state[f.y] = 0; });
      frame = paintedFrame; phoneImg = img3 = img4 = null;
      Object.keys(idea.pics).forEach(function(slot){
        var r = idea.pics[slot]; if (!r || !r.img) return;
        if (slot === 'main') frame = r.img; else if (slot === 'second') phoneImg = r.img; else if (slot === 'third') img3 = r.img; else img4 = r.img;
      });
      if (idea.palette === 'fromFrame') state.derived.frame = (idea.pics.main && idea.pics.main.img && paletteFromImage(idea.pics.main.img)) || state.derived.frame;
      var c = cvs.getContext('2d'), hits = [];
      render(c, small, { guides:false, hits:hits });
      Object.keys(idea.pics).forEach(function(slot){
        var r = idea.pics[slot], h = null;
        hits.forEach(function(x){ if (x.slot === slot) h = x; });
        if (r && r.face && r.img && h) setFaceFraming(slot, r.face, r.img, h, small);
      });
      render(c, small, { guides:false });
    } finally {
      IDEA_KEYS.forEach(function(k){ state[k] = keep[k]; });
      frame = keepImgs.frame; phoneImg = keepImgs.phoneImg; img3 = keepImgs.img3; img4 = keepImgs.img4;
      shown = JSON.parse(keepShown); state.derived.frame = keepDerived; state.moves = keepMoves;
    }
  }
  // Ideas are drawn at the size being made; a new size draws them again.
  var ideaSize = '';
  function redrawIdeas(){
    var p = current(), key = p.w + 'x' + p.h;
    if (!ideas.length || key === ideaSize) return;
    ideaSize = key;
    var tw = 360, th = Math.round(tw * p.h / p.w), a = p.w / p.h;
    ideaRow.style.setProperty('--idea-cols', a < 0.85 ? 6 : a < 1.2 ? 4 : 3);
    Array.prototype.forEach.call(ideaRow.children, function(b, i){
      var cvs = b.querySelector('canvas'); cvs.width = tw; cvs.height = th; drawIdea(ideas[i], cvs);
    });
  }
  function ideaName(idea){
    var t = templateById(idea.layout).name, sh = idea.tpShape || (idea.layout === 'versus' ? idea.vsShape : '');
    var pal = idea.palette === 'fromFrame' ? 'picture colours' : paletteById(idea.palette).name.toLowerCase();
    return t + (sh ? ', ' + sh : '') + ' · ' + pal;
  }
  function showIdeas(best, my){
    var list = buildIdeas(best), need = [];
    list.forEach(function(idea){ Object.keys(idea.pics).forEach(function(k){ if (idea.pics[k] && need.indexOf(idea.pics[k]) < 0) need.push(idea.pics[k]); }); });
    Promise.all(need.map(smallImage)).then(function(){
      if (my !== scanId) return;
      ideas = list;
      var p = current(), tw = 360, th = Math.round(tw * p.h / p.w), a = p.w / p.h;
      // a row of tall ideas stays short: more of them across
      ideaRow.style.setProperty('--idea-cols', a < 0.85 ? 6 : a < 1.2 ? 4 : 3);
      list.forEach(function(idea){
        var b = el('button', 'idea'); b.type = 'button';
        var cvs = el('canvas'); cvs.width = tw; cvs.height = th; cvs.setAttribute('aria-hidden', 'true');
        drawIdea(idea, cvs);
        b.appendChild(cvs); b.appendChild(el('span', null, ideaName(idea)));
        b.setAttribute('aria-label', 'Use this idea: ' + ideaName(idea));
        b.addEventListener('click', function(){
          Array.prototype.forEach.call(ideaRow.children, function(x){ x.classList.remove('on'); });
          b.classList.add('on');
          applyIdea(idea);
        });
        ideaRow.appendChild(b);
      });
      ideasHead.hidden = false; ideaSize = p.w + 'x' + p.h;
      framesStatus.textContent = 'Pick an idea to start from, or a single frame below. Everything stays editable.';
      draw();
    });
  }
  // An idea, for real: template, shape and palette set the ordinary way,
  // then each picture's frame taken at full size and framed on its face.
  function applyIdea(idea){
    if (idea.layout !== state.layout) { state.panX = state.panY = 0; state.zoom = 1; setControl('layout', idea.layout); syncLayout(); }
    if (idea.vsShape) setControl('vsShape', idea.vsShape);
    if (idea.tpShape) setControl('tpShape', idea.tpShape);
    if (idea.layout === 'collage' && !state.strip) setControl('strip', true);
    if (state.palette !== idea.palette) { state.palette = idea.palette; syncPalette(); persist(); }
    ['main', 'second', 'third', 'fourth'].forEach(function(slot){
      var r = idea.pics[slot]; if (r) useFrame(r.t, slot);
    });
  }

  // The frame at its full size, into a picture slot, through the same path a
  // chosen file takes. Grabs queue, so quick clicks land in order.
  function useFrame(t, slot, tile){
    var v = vid, my = scanId;
    grabChain = grabChain.then(function(){
      if (!v || my !== scanId) return;
      return seekTo(t).then(function(){
        if (my !== scanId) return;
        var big = document.createElement('canvas'); big.width = v.videoWidth; big.height = v.videoHeight;
        big.getContext('2d').drawImage(v, 0, 0);
        return new Promise(function(done){
          big.toBlob(function(blob){
            if (blob && my === scanId) {
              var found = framesFound[t];
              SLOTS[slot].load(blob, function(){ if (found && found.face) frameOnFace(slot, found.face); });
              var ctl = CONTROLS.filter(function(q){ return q.type === 'image' && q.slot === slot; })[0];
              framesStatus.textContent = 'The frame at ' + clock(t) + ' is the ' + (ctl ? labelFor(ctl, state.layout).toLowerCase() : 'picture') + ' now.';
              Array.prototype.forEach.call(frameRow.children, function(x){ if (+x.dataset.t === t) x.classList.add('used'); });
            }
            done();
          }, 'image/jpeg', 0.92);
        });
      });
    });
  }
  document.addEventListener('paste', function(e){
    var items = e.clipboardData && e.clipboardData.items;
    if (!items) return;
    for (var i=0;i<items.length;i++){
      if (items[i].type.indexOf('image') === 0) { loadBlob(items[i].getAsFile()); return; }
    }
  });

  // ---- finding what is under the pointer --------------------------------
  // Each element placed on the preview is drawn again, small and on its own,
  // into a mask, and the pointer takes the topmost element with paint under
  // it - so a click lands on the letters or the ring, not on a box around
  // them. Soft shadows stay below the cut-off, so they are not grabbed. The
  // masks are made on the first pointer event after a redraw.
  var masks = null;
  function layerMasks(){
    if (masks) return masks;
    var s = Math.min(1, 480 / Math.max(cv.width, cv.height));
    var w = Math.max(1, Math.round(cv.width*s)), h = Math.max(1, Math.round(cv.height*s));
    var keep = JSON.stringify(shown);   // drawing a picture again rewrites its framing
    // painted into one scratch canvas at a time: as placed, for the hit
    // test, and untransformed, for the element's own box - the outline and
    // the pivot are worked out in the element's own coordinates
    var m = document.createElement('canvas'); m.width = w; m.height = h;
    var mc = m.getContext('2d', { willReadFrequently:true });
    function paint(L, placed){
      mc.setTransform(1, 0, 0, 1, 0, 0); mc.clearRect(0, 0, w, h);
      mc.setTransform(s, 0, 0, s, 0, 0);
      if (placed) applyM(mc, L.m);
      mc.save(); try { L.draw(mc); } catch(e){} mc.restore();
      return mc.getImageData(0, 0, w, h).data;
    }
    masks = layers.map(function(L){
      var d = paint(L, true), own = paint(L, false), x0 = w, y0 = h, x1 = -1, y1 = -1;
      for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
        if (own[(y*w + x)*4 + 3] > 160) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      }
      return { L:L, d:d, w:w, h:h, s:s, box: x1 < 0 ? null : { x:x0/s, y:y0/s, w:(x1 - x0 + 1)/s, h:(y1 - y0 + 1)/s } };
    });
    shown = JSON.parse(keep);
    return masks;
  }
  // where an element's paint sits on the frame, from its placed mask
  function placedBox(m){
    var x0 = m.w, y0 = m.h, x1 = -1, y1 = -1;
    for (var y = 0; y < m.h; y++) for (var x = 0; x < m.w; x++) {
      if (m.d[(y*m.w + x)*4 + 3] > 160) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    }
    return x1 < 0 ? null : { x:x0/m.s, y:y0/m.s, w:(x1 - x0 + 1)/m.s, h:(y1 - y0 + 1)/m.s };
  }
  function canvasPoint(e){
    var rect = cv.getBoundingClientRect();
    return [(e.clientX - rect.left) * cv.width / (rect.width || 1), (e.clientY - rect.top) * cv.height / (rect.height || 1)];
  }
  // topmost first; a couple of pixels of slack so a thin arrow is easy to catch
  function layerAt(e){
    var ms = layerMasks(), pt = canvasPoint(e);
    for (var i = ms.length - 1; i >= 0; i--) {
      var m = ms[i], mx = Math.round(pt[0]*m.s), my = Math.round(pt[1]*m.s);
      for (var dy = -2; dy <= 2; dy++) for (var dx = -2; dx <= 2; dx++) {
        var x = mx + dx, y = my + dy;
        if (x >= 0 && y >= 0 && x < m.w && y < m.h && m.d[(y*m.w + x)*4 + 3] > 160) return m;
      }
    }
    return null;
  }

  // ---- moving elements, and adjusting a photo inside its frame ----------
  // A drag moves whatever it starts on. A double-click on a picture that
  // holds a photo switches to adjusting the photo instead: drags then move
  // the photo inside its frame until a click lands elsewhere or Esc is
  // pressed. A click that doesn't move on a picture opens its file picker -
  // after a moment, when the picture holds a photo, so a double-click can
  // claim it first. Positions are fractions of the frame, so they survive a
  // change of size. A full redraw costs ~22ms at 3000x3000 and pointermove
  // fires faster than that, so redraws are coalesced to one per frame.
  var drag = null, selected = null, adjusting = null, panRaf = 0, hoverRaf = 0, pickTimer = 0;
  function redrawSoon(){ if (!panRaf) panRaf = requestAnimationFrame(function(){ panRaf = 0; draw(); }); }
  function stopAdjusting(){
    if (!adjusting) return;
    adjusting = null; setStatus('');
  }
  // The selection outline, drawn on the preview only - downloads re-render
  // without it - turned with the element, with the rotate handle standing
  // off its top edge.
  function selLayer(){
    if (!selected) return null;
    for (var i = layers.length - 1; i >= 0; i--) if (layers[i].el === selected.el) return layers[i];
    return null;
  }
  // The outline, its four corner handles and the rotate handle, worked out
  // on the frame so their size doesn't grow or shrink with the element.
  function selGeom(){
    var L = selLayer(); if (!L || !selected.box) return null;
    var m = L.m, sc = Math.hypot(m.a, m.b) || 1, ang = Math.atan2(m.b, m.a);
    var k = Math.sqrt(cv.width*cv.height / (1280*720)), pad = 6*k / sc, b = selected.box;
    var r = { x:b.x - pad, y:b.y - pad, w:b.w + 2*pad, h:b.h + 2*pad };
    // a picture's outline is its frame - the slanted panel, the card, the
    // half - so it reads as one self-contained piece; anything else gets a
    // box around its paint
    var pts = L.shape && L.shape.length === 4 ? L.shape : [[r.x, r.y], [r.x + r.w, r.y], [r.x + r.w, r.y + r.h], [r.x, r.y + r.h]];
    var corners = pts.map(function(q){ var t = m.transformPoint({ x:q[0], y:q[1] }); return { x:t.x, y:t.y, lx:q[0], ly:q[1] }; });
    var topL = { x:(pts[0][0] + pts[1][0])/2, y:(pts[0][1] + pts[1][1])/2 };
    var top = m.transformPoint(topL), stem = 26*k, knob = 9*k;
    // the stem stands off the top edge, square to it whichever way it is turned
    var handle = { x:top.x + Math.sin(ang)*stem, y:top.y - Math.cos(ang)*stem };
    return { L:L, k:k, r:r, corners:corners, top:top, handle:handle, knob:knob, ang:ang, sq:7*k, locked:L.locked };
  }
  function drawSelection(){
    var q = selGeom(); if (!q) return;
    var k = q.k, c4 = q.corners;
    function outline(){ ctx.beginPath(); c4.forEach(function(p, i){ ctx[i ? 'lineTo' : 'moveTo'](p.x, p.y); }); ctx.closePath(); }
    ctx.save();
    ctx.lineWidth = Math.max(1.5, 2.5*k);
    ctx.translate(1, 1); outline(); ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.stroke(); ctx.translate(-1, -1);
    ctx.strokeStyle = '#ee7b58';
    if (adjusting) ctx.setLineDash([10*k, 7*k]);
    outline(); ctx.stroke();
    ctx.setLineDash([]);
    if (!adjusting) {
      ctx.fillStyle = '#ffffff';
      if (!q.locked) {
        ctx.beginPath(); ctx.moveTo(q.top.x, q.top.y); ctx.lineTo(q.handle.x, q.handle.y); ctx.stroke();
        ctx.beginPath(); ctx.arc(q.handle.x, q.handle.y, q.knob, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      }
      c4.forEach(function(p){
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(q.ang);
        ctx.fillRect(-q.sq, -q.sq, 2*q.sq, 2*q.sq); ctx.strokeRect(-q.sq, -q.sq, 2*q.sq, 2*q.sq);
        ctx.restore();
      });
    }
    ctx.restore();
  }
  function select(m){
    selected = m ? { el:m.L.el, box:m.box } : null;
  }
  // Which handle is under a point: 'turn', a corner's index, or null.
  function handleAt(q, pt){
    if (!q.locked && Math.hypot(pt[0] - q.handle.x, pt[1] - q.handle.y) <= q.knob*2.2) return 'turn';
    for (var i = 0; i < 4; i++) if (Math.hypot(pt[0] - q.corners[i].x, pt[1] - q.corners[i].y) <= q.sq*2.4) return i;
    return null;
  }
  // The placement to change, with its pivot fixed at the element's centre
  // the first time it is turned or resized, so later changes don't shift it.
  function placement(q, p){
    var key = moveKey(q.L.el, p.w, p.h), v = (state.moves[key] || [0, 0]).slice();
    while (v.length < 6) v.push(v.length === 5 ? 1 : 0);
    if (!v[3] && !v[4]) {
      var b = selected.box;
      v[3] = (b.x + b.w/2) / p.w; v[4] = (b.y + b.h/2) / p.h;
    }
    state.moves[key] = v;
    return { key:key, v:v, pivot:xformOf(q.L.el, p.w, p.h, q.L.parent).transformPoint({ x:v[3]*p.w, y:v[4]*p.h }) };
  }
  // Turning: about the element's centre. Shift snaps to 15 degrees.
  function startTurn(q, e, p){
    var pl = placement(q, p), pt = canvasPoint(e);
    return { mode:'turn', key:pl.key, pivot:pl.pivot, a0:Math.atan2(pt[1] - pl.pivot.y, pt[0] - pl.pivot.x), deg0:pl.v[2], moved:false, sx:e.clientX, sy:e.clientY };
  }
  // Resizing from a corner: evenly, with the opposite corner held still, or
  // about the centre with Alt (Option).
  function startScale(q, i, e, p){
    var pl = placement(q, p), opp = q.corners[(i + 2) % 4];
    return { mode:'scale', key:pl.key, el:q.L.el, parent:q.L.parent, p:p, s0:pl.v[5], pivot:pl.pivot,
             anchor:{ lx:opp.lx, ly:opp.ly, x:opp.x, y:opp.y }, start:canvasPoint(e), moved:false, sx:e.clientX, sy:e.clientY };
  }
  // On a picture the corners scale the photo inside its frame instead - the
  // same setting as its Zoom slider - and the frame stays where it is.
  function startZoom(q, e){
    var f = FRAMING[q.L.slot], c4 = q.corners;
    var cx = (c4[0].x + c4[1].x + c4[2].x + c4[3].x)/4, cy = (c4[0].y + c4[1].y + c4[2].y + c4[3].y)/4;
    return { mode:'zoom', slot:q.L.slot, zkey:f.zoom, z0:state[f.zoom], centre:{ x:cx, y:cy }, start:canvasPoint(e), moved:false, sx:e.clientX, sy:e.clientY };
  }
  var ZOOM_MIN = 0.4, ZOOM_MAX = 2.5;
  var SCALE_MIN = 0.2, SCALE_MAX = 5;
  function doScale(d, e){
    var pt = canvasPoint(e), from = e.altKey ? d.pivot : d.anchor;
    var s = d.s0 * Math.hypot(pt[0] - from.x, pt[1] - from.y) / (Math.hypot(d.start[0] - from.x, d.start[1] - from.y) || 1);
    s = Math.max(SCALE_MIN, Math.min(SCALE_MAX, s));
    var v = state.moves[d.key], W = d.p.w, H = d.p.h;
    v[5] = s;
    if (!e.altKey) {
      // put the held corner back where it was: the shift is worked out on the
      // frame and carried back into the parent's coordinates
      var now = xformOf(d.el, W, H, d.parent).transformPoint({ x:d.anchor.lx, y:d.anchor.ly });
      var ddx = d.anchor.x - now.x, ddy = d.anchor.y - now.y;
      if (d.parent) {
        var inv = xformOf(d.parent, W, H).inverse();
        var a = inv.transformPoint({ x:0, y:0 }), b2 = inv.transformPoint({ x:ddx, y:ddy });
        ddx = b2.x - a.x; ddy = b2.y - a.y;
      }
      v[0] += ddx / W; v[1] += ddy / H;
    }
  }

  cv.addEventListener('pointerdown', function(e){
    draw();   // refresh shown, dropHits and layers: an export may have drawn at another size since
    var m = layerAt(e), p = current(), rect = cv.getBoundingClientRect();
    // pan a photo inside its frame, each picture by its own framing
    function startPan(slot, h){
      var f = FRAMING[slot], spx, spy, dw, dh;
      if (slot === 'main') { spx = shown.win[0]/p.w; spy = shown.win[1]/p.h; dw = rect.width || 1; dh = rect.height || 1; }
      else { spx = shown[f.shown][0]/h.bw; spy = shown[f.shown][1]/h.bw; dw = dh = (rect.width || 1) * h.bw / cv.width; }
      return { mode:'pan', slot:slot, f:f, angle:h.angle || 0, scale:h.scale || 1, sx:e.clientX, sy:e.clientY, spx:spx, spy:spy, dw:dw, dh:dh, moved:false };
    }
    if (adjusting) {
      var h = hitAt(e);
      if (h && h.slot === adjusting) {
        drag = startPan(adjusting, h);
        cv.setPointerCapture(e.pointerId); cv.classList.add('dragging');
        return;
      }
      stopAdjusting();
    }
    // the current selection's handles come first
    var q = !adjusting && selGeom(), hd = q ? handleAt(q, canvasPoint(e)) : null;
    if (hd !== null) {
      drag = hd === 'turn' ? startTurn(q, e, p) : q.L.slot ? startZoom(q, e) : startScale(q, hd, e, p);
      cv.setPointerCapture(e.pointerId); cv.classList.add('dragging');
      return;
    }
    select(m);
    if (m && m.L.locked) {
      // a locked picture stays put: a drag moves its photo, a click picks a file
      var hl = null;
      for (var i = 0; i < dropHits.length; i++) if (dropHits[i].slot === m.L.slot) hl = dropHits[i];
      if (hl) {
        drag = startPan(m.L.slot, hl); drag.click = true;
        cv.setPointerCapture(e.pointerId); cv.classList.add('dragging');
      }
      draw();
      return;
    }
    if (m) {
      var key = moveKey(m.L.el, p.w, p.h), start = state.moves[key] || [0, 0];
      drag = { mode:'move', key:key, slot:m.L.slot, sx:e.clientX, sy:e.clientY, start:start.slice(),
               rw:rect.width || 1, rh:rect.height || 1, moved:false };
      cv.setPointerCapture(e.pointerId); cv.classList.add('dragging');
    }
    draw();
  });
  cv.addEventListener('pointermove', function(e){
    if (!drag) {
      // the cursor says what a drag would do
      if (hoverRaf) return;
      var ev = e;
      hoverRaf = requestAnimationFrame(function(){
        hoverRaf = 0;
        var lm, h = adjusting && hitAt(ev), q = !adjusting && selGeom(), hd = q ? handleAt(q, canvasPoint(ev)) : null;
        // a corner's resize cursor follows the diagonal it sits on, as turned
        var diag = hd !== null && hd !== 'turn' && ((((hd % 2) ? -45 : 45) + q.ang*180/Math.PI) % 180 + 180) % 180;
        cv.style.cursor = hd === 'turn' ? 'alias' : hd !== null ? (diag < 90 ? 'nwse-resize' : 'nesw-resize')
          : (h && h.slot === adjusting) ? 'grab' : (lm = layerAt(ev)) ? (lm.L.locked ? 'grab' : 'move') : 'default';
      });
      return;
    }
    if (applyDrag(e)) redrawSoon();
  });
  // One step of a drag, from wherever the pointer is now. Called on every
  // move and once more on release, so a quick flick lands where it ended
  // rather than at the last move event the browser happened to send.
  function applyDrag(e){
    // past a few pixels it is a drag, not a click
    if (!drag.moved && Math.abs(e.clientX - drag.sx) + Math.abs(e.clientY - drag.sy) > 4) drag.moved = true;
    if (!drag.moved) return false;
    if (drag.mode === 'pan') {
      handFramed(drag.slot);
      // a turned picture's photo moves along the picture's own axes
      var ddx = (e.clientX - drag.sx) / drag.scale, ddy = (e.clientY - drag.sy) / drag.scale, ca = Math.cos(-drag.angle), sa = Math.sin(-drag.angle);
      state[drag.f.x] = drag.spx + (ddx*ca - ddy*sa) / drag.dw;
      state[drag.f.y] = drag.spy + (ddx*sa + ddy*ca) / drag.dh;
    } else if (drag.mode === 'scale') {
      doScale(drag, e);
    } else if (drag.mode === 'zoom') {
      handFramed(drag.slot);
      var zp = canvasPoint(e), c0 = drag.centre;
      var z = drag.z0 * Math.hypot(zp[0] - c0.x, zp[1] - c0.y) / (Math.hypot(drag.start[0] - c0.x, drag.start[1] - c0.y) || 1);
      state[drag.zkey] = Math.round(Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, z)) * 100) / 100;
      syncControls();
    } else if (drag.mode === 'turn') {
      var pt = canvasPoint(e), a = Math.atan2(pt[1] - drag.pivot.y, pt[0] - drag.pivot.x);
      var deg = drag.deg0 + (a - drag.a0) * 180/Math.PI;
      deg = ((deg + 180) % 360 + 360) % 360 - 180;
      if (e.shiftKey) deg = Math.round(deg / 15) * 15;
      else if (Math.abs(deg) < 1.5) deg = 0;   // a small pull toward straight
      state.moves[drag.key][2] = deg;
    } else {
      state.moves[drag.key] = [drag.start[0] + (e.clientX - drag.sx) / drag.rw, drag.start[1] + (e.clientY - drag.sy) / drag.rh].concat(drag.start.slice(2));
    }
    return true;
  }
  ['pointerup','pointercancel'].forEach(function(evName){
    cv.addEventListener(evName, function(e){
      if (!drag) return;
      if (evName === 'pointerup') applyDrag(e);
      var d = drag; drag = null;
      cv.classList.remove('dragging');
      if (panRaf) { cancelAnimationFrame(panRaf); panRaf = 0; }
      if (d.moved && d.mode !== 'pan') { persist(); syncControls(); }
      draw();   // land on the exact final position
      // a click that didn't move on a picture opens its file picker
      if (evName === 'pointerup' && !d.moved && (d.mode === 'move' || d.click) && d.slot) {
        clearTimeout(pickTimer);
        if (!SLOTS[d.slot].has()) pickFor(d.slot);
        else pickTimer = setTimeout(function(){ pickFor(d.slot); }, 300);
      }
    });
  });
  cv.addEventListener('dblclick', function(e){
    var m = layerAt(e);
    if (!m || !m.L.slot || !SLOTS[m.L.slot].has()) return;
    clearTimeout(pickTimer);
    adjusting = m.L.slot; select(m);
    setStatus('Adjusting the photo: drag it inside its frame, or use Zoom. Click outside or press Esc when done.');
    draw();
  });

  // The keyboard path for all of it. Arrows nudge the selected element, or
  // the photo being adjusted; Shift takes bigger steps. Esc lets go.
  var PAN_KEYS = { ArrowLeft:[-1,0], ArrowRight:[1,0], ArrowUp:[0,-1], ArrowDown:[0,1] };
  cv.addEventListener('keydown', function(e){
    if (e.key === 'Escape' && (adjusting || selected)) { stopAdjusting(); selected = null; draw(); return; }
    // a locked picture's arrows move its photo, and it doesn't turn
    var selL = selected && selLayer(), lockedSlot = selL && selL.locked ? selL.slot : null;
    // [ and ] turn the selection a degree at a time, Shift 15
    if ((e.key === '[' || e.key === ']' || e.key === '{' || e.key === '}') && selected && !adjusting && !lockedSlot && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      var q = selGeom(), pp = current(); if (!q) return;
      var v = placement(q, pp).v, step2 = e.shiftKey ? 15 : 1;
      v[2] = Math.round((v[2] + ((e.key === '[' || e.key === '{') ? -step2 : step2)) * 10) / 10;
      persist(); syncControls(); draw();
      return;
    }
    // - and = resize it about its centre, 5% a step, Shift 20%
    if (['-', '=', '_', '+'].indexOf(e.key) >= 0 && selected && !adjusting && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      var q2 = selGeom(), pp2 = current(); if (!q2) return;
      var f2 = e.shiftKey ? 1.2 : 1.05, grow = !(e.key === '-' || e.key === '_');
      if (q2.L.slot) {
        handFramed(q2.L.slot);
        var zk = FRAMING[q2.L.slot].zoom;
        state[zk] = Math.round(Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, grow ? state[zk] * f2 : state[zk] / f2)) * 100) / 100;
        syncControls(); draw();
        return;
      }
      var v2 = placement(q2, pp2).v;
      v2[5] = Math.max(SCALE_MIN, Math.min(SCALE_MAX, (e.key === '-' || e.key === '_') ? v2[5] / f2 : v2[5] * f2));
      persist(); syncControls(); draw();
      return;
    }
    var d = PAN_KEYS[e.key];
    if (!d || e.metaKey || e.ctrlKey || e.altKey) return;
    var step = e.shiftKey ? 0.05 : 0.01, p = current();
    var panSlot = adjusting || lockedSlot;
    if (panSlot) {
      e.preventDefault();
      handFramed(panSlot);
      var f = FRAMING[panSlot], h = null;
      if (panSlot === 'main') { state.panX = shown.win[0]/p.w + d[0]*step; state.panY = shown.win[1]/p.h + d[1]*step; }
      else {
        for (var i = 0; i < dropHits.length; i++) if (dropHits[i].slot === panSlot) h = dropHits[i];
        if (h) { state[f.x] = shown[f.shown][0]/h.bw + d[0]*step; state[f.y] = shown[f.shown][1]/h.bw + d[1]*step; }
      }
      draw();
    } else if (selected) {
      e.preventDefault();
      var key = moveKey(selected.el, p.w, p.h), o = state.moves[key] || [0, 0];
      state.moves[key] = [o[0] + d[0]*step, o[1] + d[1]*step].concat(o.slice(2));
      persist(); syncControls(); draw();
    }
  });
  // The same file input the slot's Choose button opens, so a picture
  // chosen either way loads the same way.
  function pickFor(slot){
    var ctl = CONTROLS.filter(function(q){ return q.type === 'image' && q.slot === slot; })[0];
    var input = ctl && document.getElementById((ctl.ids && ctl.ids.file) || ((ctl.id || ctl.key) + 'File'));
    if (input) input.click();
  }
  // Enter on the focused preview picks the main picture.
  cv.addEventListener('keydown', function(e){
    if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey && !e.altKey) { e.preventDefault(); pickFor('main'); }
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
