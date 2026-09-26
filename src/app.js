
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
    zoom:1.25, panX:0, panY:0, vig:0.7,
    line1:'BUILDING', line2:'SHORTS FACTORY', logo:true, play:true, safe:false,
    line1Color:'#ffffff', palette:'kk', customStops:['#b9a4ff','#d9a2ff','#ffb27a'],
    logoSrc:null,  // null means the logo this tool ships with
    // Showcase layout: the image sits in a window on a dark backdrop, with an
    // optional phone beside it, instead of filling the frame.
    layout:'bleed', series:'', episode:'', winTitle:'',
    phone:true, cap1:'', cap2:'', handle:'', dots:true,
    pillStyle:'light', pillSize:1, pillPos:'logo',
    winStyle:'dark', winTurn:17, winTilt:-4,
    phoneSide:'right', phoneSize:1, phoneTilt:6,
    glow:'image', glowAmt:0.6,
    derived:{ frame:null, logo:null }   // colours read out of each uploaded asset
  };

  // The showcase settings, saved as they are. Kept as lists so persist() and
  // the restore below cannot drift apart.
  var STR_KEYS = ['layout','series','episode','winTitle','cap1','cap2','handle',
                  'pillStyle','pillPos','winStyle','phoneSide','glow'];
  var NUM_KEYS = ['pillSize','winTurn','winTilt','phoneSize','phoneTilt','glowAmt'];
  try {
    var saved = JSON.parse(localStorage.getItem('tf-state') || 'null');
    if (saved) {
      state.line1 = saved.line1 || state.line1;
      state.line2 = saved.line2 || state.line2;
      if (saved.preset) state.preset = saved.preset;
      if (saved.customW) state.customW = saved.customW;
      if (saved.customH) state.customH = saved.customH;
      if (saved.line1Color) state.line1Color = saved.line1Color;
      if (saved.palette) state.palette = saved.palette;
      if (saved.customStops && saved.customStops.length === 3) state.customStops = saved.customStops;
      if (saved.logoSrc) state.logoSrc = saved.logoSrc;
      if (saved.derived) state.derived = saved.derived;
      STR_KEYS.forEach(function(key){
        if (typeof saved[key] === 'string') state[key] = saved[key];
      });
      NUM_KEYS.forEach(function(key){
        if (typeof saved[key] === 'number' && isFinite(saved[key])) state[key] = saved[key];
      });
      if (typeof saved.phone === 'boolean') state.phone = saved.phone;
      if (typeof saved.dots === 'boolean') state.dots = saved.dots;
      if (state.layout === 'showcase') state.zoom = 1;
    }
  } catch(e){}

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
  var logo = new Image(), frame = makeDefaultFrame(), phoneImg = null;
  var ready = { logo:false, frame:true, font:false };
  logo.onload = function(){ ready.logo = true; updateLogoThumb(); refreshDerived('logo', logo); draw(); };
  logo.onerror = function(){ setStatus('That file could not be read as an image.', 'err'); };
  logo.src = state.logoSrc || DEFAULT_LOGO;
  if (document.fonts && document.fonts.ready) {
    document.fonts.load('88px "Archivo Black"').then(function(){ ready.font = true; draw(); });
    document.fonts.ready.then(function(){ ready.font = true; draw(); });
  } else { ready.font = true; }

  function headlineFont(px){ return px + 'px "Archivo Black", Helvetica, Arial, sans-serif'; }

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

  // Draws img to cover the box, the way CSS object-fit: cover does.
  function cover(c, img, x, y, w, h, zoom, dx, dy){
    var s = Math.max(w/img.width, h/img.height) * (zoom || 1);
    var iw = img.width*s, ih = img.height*s;
    c.drawImage(img, x + (w-iw)/2 + (dx||0), y + (h-ih)/2 + (dy||0), iw, ih);
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
      cover(c, glowFor(frame), -0.05*W, -0.05*H, 1.1*W, 1.1*H);
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
    var r = (plain ? 0.03 : 0.022)*w, bar = plain ? 0 : Math.max(10, 0.058*w);
    c.save();
    roundRect(c, 0, 0, w, h, r); c.clip();
    c.fillStyle = light ? '#f2f2f4' : '#1b1c21'; c.fillRect(0, 0, w, h);
    cover(c, frame, 0, bar, w, h - bar, state.zoom, panX, panY);
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
  function drawPhone(c, x, y, w, h, deg){
    var img = phoneImg || frame;
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
    cover(c, img, bez, bez, sw, sh);
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
        c.fillStyle = i ? '#ffd23f' : '#ffffff';
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

  // The series tag beside the logo: "SHORTS FACTORY · EP 3". An episode typed
  // as a bare number gets its EP prefix; anything else is used as written.
  function pillText(){
    var s = state.series.trim().toUpperCase(), e = state.episode.trim().toUpperCase();
    if (/^\d+$/.test(e)) e = 'EP ' + e;
    return s && e ? s + '  ·  ' + e : (s || e);
  }
  function pillWidth(c, h){
    var t = pillText();
    if (!t) return 0;
    c.font = headlineFont(h*0.44);
    return c.measureText(t).width + h*0.84;
  }
  // Light and Brand are solid, so they hold up on any backdrop. Dark and
  // Outline are quieter and lean on the backdrop being dark.
  function drawPill(c, x, cy, h){
    var t = pillText();
    if (!t) return 0;
    var fpx = h*0.44, w = pillWidth(c, h), pad = h*0.42, style = state.pillStyle, ink = '#121316';
    c.font = headlineFont(fpx);
    roundRect(c, x, cy - h/2, w, h, h/2);
    if (style === 'outline') {
      c.lineWidth = Math.max(1.5, h*0.055); c.strokeStyle = 'rgba(255,255,255,.92)'; c.stroke();
      ink = '#ffffff';
    } else {
      c.shadowColor = 'rgba(0,0,0,.5)'; c.shadowBlur = h*0.3; c.shadowOffsetY = h*0.08;
      if (style === 'dark') { c.fillStyle = 'rgba(18,19,24,.88)'; ink = '#ffffff'; }
      else if (style === 'brand') {
        var st = activeStops(), g = c.createLinearGradient(x, 0, x + w, 0);
        g.addColorStop(0, st[0]); g.addColorStop(0.45, st[1]); g.addColorStop(1, st[2]);
        c.fillStyle = g;
      } else c.fillStyle = '#ffffff';
      c.fill();
      noShadow(c);
      if (style === 'dark') {
        c.lineWidth = Math.max(1, h*0.03); c.strokeStyle = 'rgba(255,255,255,.18)'; c.stroke();
      }
    }
    c.fillStyle = ink; c.textBaseline = 'middle';
    c.fillText(t, x + pad, cy + fpx*0.04);
    c.textBaseline = 'alphabetic';
    return w;
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
  function arrange(l){
    var win = { x:l.win.x, y:l.win.y, w:l.win.w, h:l.win.h }, ph = null;
    if (l.phone) {
      var sz = state.phoneSize, p = l.phone;
      // grow or shrink about the corner that overlaps the window
      ph = { w:p.w*sz, h:p.h*sz, x:p.x, y:p.y + p.h*(1-sz)/2 };
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

  // ---- renderer ---------------------------------------------------------
  // Every measurement is derived from the target size, so one routine covers
  // 1280x720 and 1080x1920 alike. k is the geometric-mean scale against the
  // original 1280x720 design.
  var phoneHit = null;   // the phone's box on the preview, for routing a drop
  function render(c, p, opts){
    opts = opts || {};
    var W = p.w, H = p.h;
    var k = Math.sqrt((W*H)/(1280*720));
    var s = p.safe;
    var left = W*s.l, right = W*(1-s.r), top = H*s.t, bottom = H*(1-s.b);
    var portrait = (W/H) < 1.2;
    var show = state.layout === 'showcase';
    if (opts.preview) phoneHit = null;

    c.clearRect(0,0,W,H);
    c.fillStyle = '#0b0e14'; c.fillRect(0,0,W,H);

    if (show) {
      drawBackdrop(c, W, H, k);
    } else {
      if (ready.frame) cover(c, frame, 0, 0, W, H, state.zoom, state.panX*W, state.panY*H);

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
    var maxW = right - left, startPx = 88*k;
    var cardsX = left + (right - left)*0.46;
    if (show) {
      // Tall covers are width-starved: every pixel of headline height is taken
      // from the cards, so the words come down a size there.
      startPx = (W/H) < 0.85 ? 100*k : portrait ? 130*k : 150*k;
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
      else { pcx = right - r; pcy = bottom - r; }
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

    // logo row. The series tag sits beside the logo, at the top right, or
    // just above the headline.
    var lh = 88*k, pillX = left, pillH = lh*0.56*state.pillSize, gap = 0.022*W;
    var hasPill = !!pillText();
    if (state.logo && ready.logo) {
      var lw = logo.width * (lh/logo.height);
      c.shadowColor='rgba(0,0,0,.6)'; c.shadowBlur=20*k; c.shadowOffsetY=8*k;
      c.drawImage(logo, left, top, lw, lh);
      noShadow(c);
      pillX = left + lw + gap;
    }
    // Measured to the top of the capitals, not the line box, so the gap
    // above the headline is the gap you see.
    var capTop = bottom - (l1 ? (px2 ? px2*1.06 : 0) + px1*0.74 : px2*0.74);
    var wordsTop = capTop;
    if (hasPill) {
      if (state.pillPos === 'right') {
        drawPill(c, right - pillWidth(c, pillH), top + lh/2, pillH);
      } else if (state.pillPos === 'headline') {
        drawPill(c, left, capTop - 0.03*H - pillH/2, pillH);
        wordsTop = capTop - 0.03*H - pillH;
      } else {
        drawPill(c, pillX, top + lh/2, pillH);
      }
    }
    var hasRow = (state.logo && ready.logo) || (hasPill && state.pillPos !== 'headline');
    var pillTopRight = hasPill && state.pillPos === 'right';

    // the window and phone, fitted into whatever room the words leave
    if (show) {
      var rx0, rx1, ry0, ry1;
      if (portrait) {
        rx0 = left; rx1 = right;
        ry0 = top + (hasRow ? Math.max(lh, pillH) + 0.03*H : 0);
        ry1 = wordsTop - 0.035*H;
      } else {
        rx0 = cardsX; rx1 = right; ry1 = bottom;
        ry0 = top + (pillTopRight ? Math.max(lh, pillH) + 0.02*H : 0);
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
        var wb = lay.win;
        drawWindow(c, ox + wb.x*u, oy + wb.y*u, wb.w*u, wb.h*u, state.winTilt,
                   state.panX*W, state.panY*H);
        if (lay.phone) {
          var ph = lay.phone;
          drawPhone(c, ox + ph.x*u, oy + ph.y*u, ph.w*u, ph.h*u, state.phoneTilt);
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

    // safe-area guides: preview only, never exported
    if (opts.guides) {
      c.save();
      c.strokeStyle = 'rgba(255,196,0,.95)';
      c.lineWidth = Math.max(2, 3*k);
      c.setLineDash([14*k, 10*k]);
      c.strokeRect(left, top, right-left, bottom-top);
      c.restore();
    }
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
    document.getElementById('what').textContent = p.label;
    document.getElementById('dims').innerHTML = p.w + ' &times; ' + p.h;
    if (customChip) sizeChip(customChip, p.id === 'custom' ? p : presetById('custom'));
    firstDraw = false;
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

  // ---- controls ---------------------------------------------------------
  function bind(id, fn){ document.getElementById(id).addEventListener('input', fn); }
  var line1El = document.getElementById('line1'), line2El = document.getElementById('line2');
  line1El.value = state.line1; line2El.value = state.line2;

  // ---- brand: the logo and the headline colours -------------------------
  // The tool ships with the KreativeKorna mark and gradient. Both are the
  // starting point, not a fixture: anyone can put their own in their place.
  var line1ColorEl = document.getElementById('line1Color');
  line1ColorEl.value = state.line1Color;
  line1ColorEl.addEventListener('input', function(e){
    state.line1Color = e.target.value; persist(); draw();
  });

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

  var playTog = document.getElementById('playTog'), playEl = document.getElementById('showPlay');
  function syncPresetUI(){
    var p = presetById(state.preset);
    customRow.hidden = (p.id !== 'custom');
    // The badge sits where the showcase puts its cards, so it is full-picture only.
    var canPlay = p.play && state.layout !== 'showcase';
    playEl.disabled = !canPlay;
    playTog.classList.toggle('off', !canPlay);
  }
  function clampCustom(el, fallback){
    var n = parseInt(el.value, 10);
    if (!isFinite(n)) return fallback;
    return Math.max(64, Math.min(8000, n));
  }
  bind('cw', function(){ state.customW = clampCustom(cwEl, state.customW); persist(); draw(); });
  bind('ch', function(){ state.customH = clampCustom(chEl, state.customH); persist(); draw(); });

  bind('line1', function(e){ state.line1 = e.target.value; persist(); draw(); });
  bind('line2', function(e){ state.line2 = e.target.value; persist(); draw(); });

  // ---- layout, series tag and the showcase cards ------------------------
  var LAYOUT_HINTS = {
    bleed: 'The image fills the frame.',
    showcase: 'The image sits in a window on a dark backdrop, with a phone beside it.'
  };
  var layoutEls = document.querySelectorAll('input[name="layout"]');
  var showcaseFields = document.getElementById('showcaseFields');
  var phoneBits = document.getElementById('phoneBits');
  function syncLayout(){
    var show = state.layout === 'showcase';
    for (var i = 0; i < layoutEls.length; i++) layoutEls[i].checked = (layoutEls[i].value === state.layout);
    showcaseFields.hidden = !show;
    phoneBits.hidden = !state.phone;
    // Shading darkens a full picture; the showcase backdrop has its own glow.
    document.getElementById('vigField').hidden = show;
    document.getElementById('layoutHint').textContent = LAYOUT_HINTS[state.layout];
    document.getElementById('imgLabel').textContent = show ? 'Window picture' : 'Image';
    syncPresetUI();
  }
  for (var li = 0; li < layoutEls.length; li++) {
    layoutEls[li].addEventListener('change', function(e){
      if (!e.target.checked) return;
      state.layout = e.target.value; state.panX = 0; state.panY = 0;
      // A full picture wants a little zoom to crop; a window wants the whole
      // screenshot, edge to edge.
      state.zoom = state.layout === 'showcase' ? 1 : 1.25;
      zoomEl.value = Math.round(state.zoom*100); sayPercent(zoomEl);
      syncLayout(); persist(); draw();
    });
  }
  ['series','episode','winTitle','cap1','cap2','handle'].forEach(function(id){
    var el = document.getElementById(id);
    el.value = state[id];
    el.addEventListener('input', function(){ state[id] = el.value; persist(); draw(); });
  });
  // Every segmented choice and every slider in the grouped panels maps
  // straight onto one state key: the radio group's name, or the slider's
  // data-key. Sliders marked % store a fraction; the rest store degrees.
  ['pillStyle','pillPos','winStyle','phoneSide','glow'].forEach(function(key){
    var radios = document.querySelectorAll('input[name="' + key + '"]');
    for (var i = 0; i < radios.length; i++) {
      radios[i].checked = (radios[i].value === state[key]);
      radios[i].addEventListener('change', function(e){
        if (!e.target.checked) return;
        state[key] = e.target.value; persist(); draw();
      });
    }
  });
  var sliders = document.querySelectorAll('input[type=range][data-key]');
  for (var si = 0; si < sliders.length; si++) (function(el){
    var key = el.dataset.key, pct = el.dataset.unit === '%';
    function say(){ el.setAttribute('aria-valuetext', el.value + (pct ? '%' : ' degrees')); }
    el.value = Math.round(pct ? state[key]*100 : state[key]); say();
    el.addEventListener('input', function(){
      state[key] = pct ? el.value/100 : +el.value; say(); persist(); draw();
    });
  })(sliders[si]);

  var showPhoneEl = document.getElementById('showPhone'), showDotsEl = document.getElementById('showDots');
  showPhoneEl.checked = state.phone; showDotsEl.checked = state.dots;
  showPhoneEl.addEventListener('change', function(){ state.phone = showPhoneEl.checked; syncLayout(); persist(); draw(); });
  showDotsEl.addEventListener('change', function(){ state.dots = showDotsEl.checked; persist(); draw(); });

  // The phone's picture is its own image, kept for this session only, like the
  // main one. Without it the phone shows the main image.
  var phoneFile = document.getElementById('phoneFile'), phoneResetBtn = document.getElementById('phoneReset');
  document.getElementById('phonePick').addEventListener('click', function(){ phoneFile.click(); });
  phoneFile.addEventListener('change', function(){ if (phoneFile.files[0]) loadPhone(phoneFile.files[0]); phoneFile.value = ''; });
  phoneResetBtn.addEventListener('click', function(){
    phoneImg = null; phoneResetBtn.hidden = true; draw();
    setStatus('The phone shows the main image again.', 'ok');
  });
  function loadPhone(blob){
    var img = new Image();
    img.onload = function(){
      phoneImg = img; phoneResetBtn.hidden = false; draw();
      setStatus('Phone picture loaded.', 'ok');
    };
    img.onerror = function(){ setStatus('That file could not be read as an image.', 'err'); };
    img.src = URL.createObjectURL(blob);
  }
  // Without this both sliders announce a bare number; they are percentages.
  var zoomEl = document.getElementById('zoom'), vigEl = document.getElementById('vig');
  function sayPercent(el){ el.setAttribute('aria-valuetext', el.value + '%'); }
  zoomEl.value = Math.round(state.zoom*100);
  sayPercent(zoomEl); sayPercent(vigEl);
  bind('zoom', function(e){ state.zoom = e.target.value/100; sayPercent(e.target); draw(); });
  bind('vig', function(e){ state.vig = (e.target.value/100)*0.7; sayPercent(e.target); draw(); });
  document.getElementById('showLogo').addEventListener('change', function(e){ state.logo = e.target.checked; draw(); });
  playEl.addEventListener('change', function(e){ state.play = e.target.checked; draw(); });
  var safeNote = document.getElementById('safeNote');
  document.getElementById('showSafe').addEventListener('change', function(e){
    state.safe = e.target.checked; safeNote.hidden = !state.safe; draw();
  });
  function pick(keys){
    var o = {};
    keys.forEach(function(key){ o[key] = state[key]; });
    return o;
  }
  function persist(){
    try{ localStorage.setItem('tf-state', JSON.stringify(Object.assign({
      line1:state.line1, line2:state.line2, preset:state.preset,
      customW:state.customW, customH:state.customH,
      line1Color:state.line1Color, palette:state.palette,
      customStops:state.customStops, logoSrc:state.logoSrc, derived:state.derived,
      phone:state.phone, dots:state.dots
    }, pick(STR_KEYS.concat(NUM_KEYS))))); }catch(e){
      // A big custom logo can blow the storage quota. Losing the saved copy is
      // survivable; the logo stays put for this session either way.
    }
  }

  // ---- image loading ----------------------------------------------------
  var fileEl = document.getElementById('file');
  document.getElementById('pick').addEventListener('click', function(){ fileEl.click(); });
  fileEl.addEventListener('change', function(){ if (fileEl.files[0]) loadBlob(fileEl.files[0]); });
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
  // In the showcase, a file dropped on the phone goes to the phone.
  function overPhone(e){
    if (state.layout !== 'showcase' || !state.phone || !phoneHit) return false;
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
  var dragging = false, sx=0, sy=0, spx=0, spy=0, dragW=1, dragH=1, panRaf=0;
  cv.addEventListener('pointerdown', function(e){
    dragging = true; cv.classList.add('dragging'); cv.setPointerCapture(e.pointerId);
    sx = e.clientX; sy = e.clientY; spx = state.panX; spy = state.panY;
    var rect = cv.getBoundingClientRect();
    dragW = rect.width || 1; dragH = rect.height || 1;
  });
  cv.addEventListener('pointermove', function(e){
    if (!dragging) return;
    state.panX = spx + (e.clientX - sx) / dragW;
    state.panY = spy + (e.clientY - sy) / dragH;
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
    var step = e.shiftKey ? 0.05 : 0.01;
    state.panX += d[0] * step;
    state.panY += d[1] * step;
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
})();
</script>

</body>
</html>
