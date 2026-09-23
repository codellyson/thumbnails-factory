
  // ---- platform presets -------------------------------------------------
  // safe: fractions of the canvas kept clear of headline/logo/badge, so the
  // artwork survives each platform's own UI chrome (captions, action rails,
  // duration badges, profile avatars).
  var PRESETS = [
    { id:'youtube',        short:'YouTube',      label:'YouTube thumbnail',      w:1280, h:720,  play:true,  safe:{t:.055,r:.05,b:.07,l:.05} },
    { id:'youtube-shorts', short:'Shorts',       label:'YouTube Shorts cover',   w:1080, h:1920, play:true,  safe:{t:.08,r:.17,b:.20,l:.06} },
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
    derived:{ frame:null, logo:null }   // colours read out of each uploaded asset
  };

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
  var logo = new Image(), frame = makeDefaultFrame();
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

  // ---- renderer ---------------------------------------------------------
  // Every measurement is derived from the target size, so one routine covers
  // 1280x720 and 1080x1920 alike. k is the geometric-mean scale against the
  // original 1280x720 design.
  function render(c, p, opts){
    opts = opts || {};
    var W = p.w, H = p.h;
    var k = Math.sqrt((W*H)/(1280*720));
    var s = p.safe;
    var left = W*s.l, right = W*(1-s.r), top = H*s.t, bottom = H*(1-s.b);
    var portrait = (W/H) < 1.2;

    c.clearRect(0,0,W,H);
    c.fillStyle = '#0b0e14'; c.fillRect(0,0,W,H);

    if (ready.frame) {
      var cover = Math.max(W/frame.width, H/frame.height) * state.zoom;
      var fw = frame.width*cover, fh = frame.height*cover;
      var fx = (W-fw)/2 + state.panX*W, fy = (H-fh)/2 + state.panY*H;
      c.drawImage(frame, fx, fy, fw, fh);
    }

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

    // headline metrics
    var badge = state.play && p.play;
    var r = 75*k;
    var maxW = right - left;
    if (badge && !portrait) maxW -= (2*r + 0.02*W);
    var l1 = state.line1.toUpperCase(), l2 = state.line2.toUpperCase();
    c.textBaseline = 'alphabetic';
    var px2 = l2 ? fitSize(c, l2, maxW, 88*k, 28*k) : 0;
    var px1 = l1 ? fitSize(c, l1, maxW, 88*k, 28*k) : 0;
    var blockH = (px2 ? px2*1.06 : 0) + (px1 ? px1*1.06 : 0);

    // play badge: beside the headline in landscape, above it in portrait
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
      c.shadowColor='transparent'; c.shadowBlur=0; c.shadowOffsetY=0;
      yBottom -= px2*1.06;
    }
    if (l1) {
      c.font = headlineFont(px1);
      c.shadowColor='rgba(0,0,0,.9)'; c.shadowBlur=22*k; c.shadowOffsetY=5*k;
      c.fillStyle = state.line1Color;
      c.fillText(l1, left, yBottom);
      c.shadowColor='transparent'; c.shadowBlur=0; c.shadowOffsetY=0;
    }

    // logo
    if (state.logo && ready.logo) {
      var lh = 88*k, lw = logo.width * (lh/logo.height);
      c.shadowColor='rgba(0,0,0,.6)'; c.shadowBlur=20*k; c.shadowOffsetY=8*k;
      c.drawImage(logo, left, top, lw, lh);
      c.shadowColor='transparent'; c.shadowBlur=0; c.shadowOffsetY=0;
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
    render(ctx, p, { guides: state.safe });
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
    playEl.disabled = !p.play;
    playTog.classList.toggle('off', !p.play);
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
  // Without this both sliders announce a bare number; they are percentages.
  var zoomEl = document.getElementById('zoom'), vigEl = document.getElementById('vig');
  function sayPercent(el){ el.setAttribute('aria-valuetext', el.value + '%'); }
  sayPercent(zoomEl); sayPercent(vigEl);
  bind('zoom', function(e){ state.zoom = e.target.value/100; sayPercent(e.target); draw(); });
  bind('vig', function(e){ state.vig = (e.target.value/100)*0.7; sayPercent(e.target); draw(); });
  document.getElementById('showLogo').addEventListener('change', function(e){ state.logo = e.target.checked; draw(); });
  playEl.addEventListener('change', function(e){ state.play = e.target.checked; draw(); });
  var safeNote = document.getElementById('safeNote');
  document.getElementById('showSafe').addEventListener('change', function(e){
    state.safe = e.target.checked; safeNote.hidden = !state.safe; draw();
  });
  function persist(){
    try{ localStorage.setItem('tf-state', JSON.stringify({
      line1:state.line1, line2:state.line2, preset:state.preset,
      customW:state.customW, customH:state.customH,
      line1Color:state.line1Color, palette:state.palette,
      customStops:state.customStops, logoSrc:state.logoSrc, derived:state.derived
    })); }catch(e){
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
  wrap.addEventListener('drop', function(e){
    var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) loadBlob(f);
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

  syncPresetUI();
  syncPalette();
  updateLogoThumb();
  refreshDerived('frame', frame);   // the painted backdrop counts as an image too
  updateDerivedChips();
  draw();
})();
</script>

</body>
</html>
