// Marker drawings on a 330 × 125 coordinate grid.
const sketches = [
  ['M55 101 58 24 193 24 193 101Z M78 84 104 59 126 73 159 43 M144 44 160 43 158 58 M231 74 279 27 286 34 240 83 226 87Z', 'M79 94 171 94 M139 45 160 45 159 65 153 53Z'],
  ['M109 101 Q111 77 135 74 Q162 74 165 101 M136 62 A14 14 0 1 0 136 34 A14 14 0 1 0 136 62 M176 99 Q177 80 199 76 Q221 77 226 100 M201 65 A12 12 0 1 0 201 41 A12 12 0 1 0 201 65 M46 80 Q48 64 66 61 Q84 62 89 80 M67 50 A10 10 0 1 0 67 30 A10 10 0 1 0 67 50 M236 36 248 27 M240 49 257 47', 'M109 100 Q112 77 135 75 Q157 74 164 100Z'],
  ['M136 82 A32 32 0 1 1 136 18 A32 32 0 1 1 136 82 M158 73 186 100 M88 23 77 14 M87 58 71 61 M108 41 Q116 29 132 31 M218 36 Q227 20 242 28 Q255 35 242 47 Q231 54 231 63 M231 75 232 76', 'M169 65 196 96 185 109 157 77Z'],
  ['M149 58 95 58 95 27 58 27 M149 58 58 58 M149 58 95 58 95 89 58 89 M45 27 50 27 M45 58 50 58 M45 89 50 89 M166 41 Q180 20 199 32 Q218 45 196 57 Q185 65 184 75 M183 88 185 90 M226 56 270 56', 'M164 37 Q176 13 200 24 Q225 38 206 57 L185 75 176 70 Q177 55 194 47 Q203 37 188 35 175 43Z'],
  ['M72 28 219 27 219 101 73 102Z M121 28 122 17 171 16 174 28 M91 43 103 43 103 55 91 55Z M92 47 97 52 107 39 M117 49 194 49 M92 68 103 68 103 80 92 80Z M117 74 180 74 M244 79 272 45 280 51 251 86 239 91Z', 'M72 28 219 27 219 35 73 36Z'],
  ['M74 70 110 52 231 53 251 72 112 72Z M74 70 78 101 112 117 250 115 251 72 M112 72 112 117 M118 80 244 79 M78 78 108 91 M167 77 191 77 191 94 167 94Z M179 83 179 88 M109 52 91 27 Q91 16 112 14 L217 13 Q225 14 231 24 L232 53 M100 28 227 27 M145 61 145 46 159 46 159 61 M169 62 169 36 183 36 183 62 M192 62 192 41 206 41 206 62 M256 35 270 26 M261 48 280 47 M64 40 50 30 M60 54 43 52', 'M76 74 112 75 250 73 248 113 112 115 79 100Z M99 28 226 28 230 51 111 51Z'],
  ['M64 23 64 100 260 100 M94 96 94 69 124 69 124 96 M141 96 141 52 171 52 171 96 M188 96 188 31 218 31 218 96 M84 44 126 31 168 18', 'M189 32 217 32 217 97 189 97Z'],
  ['M104 20 C96 39 72 51 76 67 C79 82 101 84 104 108 C108 84 130 82 133 67 C137 51 112 39 104 20Z M104 43 104 91 M97 65 111 65 M215 17 C207 36 190 38 185 57 C178 79 207 86 215 109 C223 86 252 79 245 57 C240 38 223 36 215 17Z M215 38 215 90 M208 61 222 61', 'M215 17 C207 36 190 38 185 57 C178 79 207 86 215 109 C223 86 252 79 245 57 C240 38 223 36 215 17Z'],
  ['M70 79 Q112 18 147 58 T224 44 M213 44 224 44 222 54 M70 100 249 100 M88 91 88 83 M141 91 141 78 M194 91 194 71 M245 91 245 59 M249 25 259 17 M254 35 270 32', 'M150 60 A11 11 0 1 0 150 38 A11 11 0 1 0 150 60Z'],
  ['M161 27 161 96 M132 99 191 99 M103 40 222 39 M115 42 97 72 135 72Z M210 42 191 72 229 72Z M97 73 Q116 91 135 73 M191 73 Q210 91 229 73 M155 27 A6 6 0 1 1 167 27 A6 6 0 1 1 155 27', 'M97 73 Q116 91 135 73Z M191 73 Q210 91 229 73Z'],
  ['M80 64 108 91 175 29 M67 65 Q74 57 81 61 M197 24 Q226 23 246 33 M197 47 242 49 M196 71 225 71 M257 53 261 41 M269 61 280 56', 'M77 63 105 83 173 25 179 33 109 99Z']
];

export function drawWhiteboardSketches(track) {
  track.querySelectorAll('.board-sketch').forEach((canvas, index) => {
    const drawing = sketches[index];
    const ink = canvas.getContext('2d');
    if (!drawing || !ink) return;
    const color = getComputedStyle(canvas).getPropertyValue('--board-marker').trim();
    ink.scale(2, 2);
    ink.globalAlpha = .19;
    ink.fillStyle = color;
    ink.fill(new Path2D(drawing[1]));
    ink.globalAlpha = 1;
    ink.strokeStyle = color;
    ink.lineWidth = 2.6;
    ink.lineCap = 'round';
    ink.lineJoin = 'round';
    ink.stroke(new Path2D(drawing[0]));
  });

  if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('board-sketch-reveal');
      observer.unobserve(entry.target);
    }
  }, { root: track, threshold: .35 });
  for (const sketch of track.querySelectorAll('.board-sketch')) observer.observe(sketch);
}

export function fitWhiteboardText(track) {
  const presentation = track.closest('.presentation');
  const slides = [...track.querySelectorAll('.presentation-slide')];
  let lastSize = '';

  function fit() {
    if (!track.isConnected) {
      observer.disconnect();
      window.removeEventListener('resize', fit);
      return;
    }
    const trackStyle = getComputedStyle(track);
    const presentationStyle = getComputedStyle(presentation);
    const available = Math.floor(window.innerHeight - track.getBoundingClientRect().top - window.scrollY
      - parseFloat(trackStyle.paddingTop) - parseFloat(trackStyle.paddingBottom)
      - parseFloat(presentationStyle.paddingBottom));
    const rootSize = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const size = [track.clientWidth, available, rootSize].join(':');
    if (size === lastSize) return;
    lastSize = size;

    track.style.removeProperty('--board-stage-height');
    const bounds = slides.map(() => ({ min: rootSize, max: 2.5 * rootSize }));
    // Apply each round together so the browser measures a single layout.
    for (let round = 0; round < 7; round++) {
      slides.forEach((slide, i) => {
        const { min, max } = bounds[i];
        slide.style.fontSize = `${(min + max) / 2}px`;
      });
      const heights = slides.map(slide => slide.getBoundingClientRect().height);
      bounds.forEach((bound, i) => {
        const middle = (bound.min + bound.max) / 2;
        if (heights[i] <= available) bound.min = middle;
        else bound.max = middle;
      });
    }
    slides.forEach((slide, i) => { slide.style.fontSize = `${bounds[i].min}px`; });
    track.style.setProperty('--board-stage-height', `${Math.max(0, available)}px`);
  }
  const observer = new ResizeObserver(fit);
  observer.observe(presentation);
  observer.observe(track);
  window.addEventListener('resize', fit);
}

export function drawWhiteboardConnections(track) {
  const outlines = [...track.querySelectorAll('.board-outline')];
  const stages = outlines.map(canvas => canvas.parentElement);
  const observer = new ResizeObserver(entries => {
    if (!track.isConnected) {
      observer.disconnect();
      return;
    }
    const trackStyle = getComputedStyle(track);
    const availableWidth = track.clientWidth - parseFloat(trackStyle.paddingLeft) - parseFloat(trackStyle.paddingRight);
    const slides = entries.some(({ target }) => target === track)
      ? stages
      : new Set(entries.map(({ target }) => target.closest('.presentation-slide')));
    for (const slide of slides) {
      const contentWidth = slide.querySelector('.board-content').offsetWidth;
      const stageWidth = `${Math.round((availableWidth + contentWidth) / 2)}px`;
      if (slide.style.width !== stageWidth) slide.style.width = stageWidth;
    }
    for (const slide of slides) {
      const content = slide.querySelector('.board-content');
      const canvas = slide.querySelector('.board-outline');
      const width = slide.clientWidth;
      const height = slide.clientHeight;
      if (!width || !height) continue;

      const scale = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.ceil(width * scale);
      canvas.height = Math.ceil(height * scale);
      const ink = canvas.getContext('2d');
      if (!ink) continue;
      ink.scale(scale, scale);
      ink.strokeStyle = getComputedStyle(slide).getPropertyValue('--board-marker').trim();
      ink.lineWidth = 2.5;
      ink.lineCap = 'round';
      ink.lineJoin = 'round';

      const left = 5;
      const top = 5;
      const right = content.offsetWidth - 4;
      const bottom = content.offsetHeight - 5;
      const span = right - left;
      const side = Math.min(30, span * .1);
      const middle = (left + right) / 2;
      ink.beginPath();
      ink.moveTo(middle, top + 2);
      ink.bezierCurveTo(right - side, top - 5, right + 4, top + 2, right - 2, top + side);
      ink.bezierCurveTo(right + 2, bottom - side * 2, right - 1, bottom - 8, right - side, bottom - 3);
      ink.bezierCurveTo(middle, bottom + 3, left + side, bottom + 3, left + 8, bottom - side);
      ink.bezierCurveTo(left - 1, bottom - side * 1.6, left - 1, top + side * 1.4, left + 9, top + side);
      ink.bezierCurveTo(left + side * 1.4, top - 2, middle - side, top + 5, middle, top + 2);
      ink.stroke();

      const start = right;
      const end = width - 5;
      const run = end - start;
      if (!slide.nextElementSibling || run < 18) continue;

      // Mirror the curve on alternating steps, keeping a slight wave in each direction.
      const descends = slide.matches(':nth-child(even)');
      const y = fraction => top + (bottom - top) * (descends ? 1 - fraction : fraction);
      const tip = y(.24);
      const lastX = start + run * .92;
      const lastY = y(.34);
      ink.beginPath();
      ink.moveTo(start, y(.76));
      ink.bezierCurveTo(start + run * .26, y(.91), start + run * .35, y(.84), start + run * .50, y(.48));
      ink.bezierCurveTo(start + run * .67, y(.10), lastX, lastY, end, tip);
      const angle = Math.atan2(tip - lastY, end - lastX);
      const size = Math.min(19, run * .24);
      ink.moveTo(end - size * Math.cos(angle - .56), tip - size * Math.sin(angle - .56));
      ink.lineTo(end, tip);
      ink.lineTo(end - size * Math.cos(angle + .56), tip - size * Math.sin(angle + .56));
      ink.stroke();
    }
  });
  observer.observe(track);
  for (const canvas of outlines) {
    observer.observe(canvas.parentElement);
    observer.observe(canvas.nextElementSibling);
  }
}
