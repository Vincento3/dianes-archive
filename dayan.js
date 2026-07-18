(function(){
  const grid = document.getElementById('pins-grid');
  const board = document.querySelector('.board');

  function hashOf(id){
    let hash = 0;
    for(let i=0;i<id.length;i++){ hash = (hash*31 + id.charCodeAt(i)) % 100000; }
    return hash;
  }

  function rotationFor(id){
    const h = hashOf(id);
    return ((h % 13) - 6) + 'deg'; // -6deg to 6deg
  }

  function formatDate(iso){
    if(!iso) return '';
    try{
      const d = new Date(iso + 'T00:00:00');
      if(isNaN(d.getTime())) return '';
      return d.toLocaleDateString(undefined, {month:'long', day:'numeric', year:'numeric'});
    }catch(e){ return ''; }
  }

  // MEMORIES / STICKERS come from memories.js, loaded before this file.
  const memories = (typeof MEMORIES !== 'undefined' ? MEMORIES : []).map((m, i) => ({
    id: 'm' + i,
    photo: m.file,
    note: m.note || '',
    date: m.date || ''
  }));
  const stickers = (typeof STICKERS !== 'undefined' ? STICKERS : []);

  let viewMode = 'pile';

  /* ---------- Stickers ---------- */
  function loadStickers(){
    [1,2].forEach((num, idx) => {
      const slot = document.getElementById('sticker-' + num);
      const src = stickers[idx];
      if(src){
        const img = document.createElement('img');
        img.src = src;
        img.alt = 'sticker';
        img.onerror = () => { slot.style.display = 'none'; };
        slot.innerHTML = '';
        slot.appendChild(img);
      } else {
        slot.style.display = 'none';
      }
    });
  }

  /* ---------- Rendering ---------- */
  function render(){
    grid.innerHTML = '';
    grid.className = 'pins-grid ' + viewMode;
    grid.style.height = ''; // clear any height left over from the other view

    if(memories.length === 0){
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.style.width = '100%';
      empty.innerHTML = '<span class="card-icon">🎀</span><h2>The wall is empty, for now</h2><p>Add photos to memories.js to fill this wall with your moments together.</p>';
      grid.appendChild(empty);
    } else {
      memories.forEach((m) => grid.appendChild(buildCard(m)));
    }

    if(viewMode === 'pile') positionPile();
  }

  function positionPile(){
    // arrange cards in a loose overlapping pile, sized to fit whatever
    // the board's actual width is and however many photos there are
    const cards = Array.from(grid.querySelectorAll('.polaroid'));
    if(cards.length === 0){ grid.style.height = ''; return; }

    const boardWidth = board.clientWidth - 40; // leave a little breathing room on each side
    const cardWidth = cards[0].offsetWidth;
    const cardHeight = cards[0].offsetHeight;

    // step = how far apart cards sit; a fraction less than full size gives
    // the overlapping "pile" look while still guaranteeing they fit
    const stepX = Math.max(cardWidth * 0.62, 90);
    const stepY = Math.max(cardHeight * 0.5, 80);
    const jitterRange = Math.min(stepX, stepY) * 0.3;

    const cols = Math.max(1, Math.floor((boardWidth - cardWidth) / stepX) + 1);

    cards.forEach((card, i) => {
      const h = hashOf(memories[i] ? memories[i].id : ('x'+i));
      const col = i % cols;
      const row = Math.floor(i / cols);
      const jitterX = (h % Math.round(jitterRange * 2)) - jitterRange;
      const jitterY = ((h >> 3) % Math.round(jitterRange * 2)) - jitterRange;
      const x = Math.max(0, col * stepX + jitterX + 10);
      const y = row * stepY + jitterY + 10;
      card.style.left = x + 'px';
      card.style.top = y + 'px';
      card.style.zIndex = 10 + i;
    });

    const rowsTotal = Math.ceil(cards.length / cols);
    grid.style.height = ((rowsTotal - 1) * stepY + cardHeight + 40) + 'px';
  }

  window.addEventListener('resize', () => { if(viewMode === 'pile') positionPile(); });

  document.getElementById('btn-pile').addEventListener('click', () => setView('pile'));
  document.getElementById('btn-lined').addEventListener('click', () => setView('lined'));
  function setView(mode){
    viewMode = mode;
    document.getElementById('btn-pile').classList.toggle('active', mode === 'pile');
    document.getElementById('btn-lined').classList.toggle('active', mode === 'lined');
    render();
  }

  function buildCard(m){
    const el = document.createElement('div');
    el.className = 'polaroid';
    el.style.setProperty('--rot', rotationFor(m.id));
    el.tabIndex = 0;
    el.setAttribute('role','button');
    el.setAttribute('aria-label', 'Open memory: ' + (m.note ? m.note.slice(0,40) : 'photo'));

    const heart = document.createElement('div');
    heart.className = 'heart-pin';
    const hearts = ['💗','💕','💖','⭐','✨'];
    heart.textContent = hearts[hashOf(m.id) % hearts.length];
    el.appendChild(heart);

    const img = document.createElement('img');
    img.src = m.photo;
    img.alt = m.note ? m.note.slice(0,60) : 'A pinned memory';
    img.onerror = () => { img.alt = 'Photo not found — check the file path in memories.js'; };
    el.appendChild(img);

    const cap = document.createElement('div');
    cap.className = 'caption';
    cap.textContent = m.note || '';
    el.appendChild(cap);

    el.addEventListener('click', () => openLightbox(m.id));
    el.addEventListener('keydown', (e) => { if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); openLightbox(m.id); } });

    return el;
  }

  /* ---------- Lightbox (view only) ---------- */
  const lbBackdrop = document.getElementById('lb-backdrop');
  const lbPhoto = document.getElementById('lb-photo');
  const lbDate = document.getElementById('lb-date');
  const lbNoteText = document.getElementById('lb-note-text');
  const lbClose = document.getElementById('lb-close');

  function openLightbox(id){
    const m = memories.find(x => x.id === id);
    if(!m) return;
    lbPhoto.src = m.photo;
    lbPhoto.alt = m.note || 'Pinned memory';
    lbDate.textContent = formatDate(m.date);
    lbNoteText.textContent = m.note || '';
    lbBackdrop.classList.add('open');
  }
  function closeLightbox(){ lbBackdrop.classList.remove('open'); }

  lbClose.addEventListener('click', closeLightbox);
  lbBackdrop.addEventListener('click', (e)=>{ if(e.target === lbBackdrop) closeLightbox(); });
  document.addEventListener('keydown', (e) => { if(e.key === 'Escape') closeLightbox(); });

  render();
  loadStickers();
})();