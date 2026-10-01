/* =========================================================
   ANIMAUX QUI CIRCULENT SUR LA PAGE
   - entrent par un bord au hasard (haut, bas, gauche, droite)
   - se promènent parfois sur l'écran (points de passage)
   - sortent par un bord au hasard, attendent, puis reviennent
========================================================= */
(() => {
    const critters = [...document.querySelectorAll('.critter')];

    // Respect du réglage "réduire les animations"
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        critters.forEach(c => c.remove());
        return;
    }

    const rand = (a, b) => a + Math.random() * (b - a);
    const pick = arr => arr[Math.floor(Math.random() * arr.length)];
    const EDGES = ['top', 'bottom', 'left', 'right'];
    const OPPOSITE = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' };

    // Point juste en dehors de l'écran, sur le bord demandé
    function edgePoint(edge, size, w, h) {
        switch (edge) {
            case 'top':    return { x: rand(0, w), y: -size };
            case 'bottom': return { x: rand(0, w), y: h + size };
            case 'left':   return { x: -size,      y: rand(0, h) };
            default:       return { x: w + size,   y: rand(0, h) };
        }
    }

    // Point au hasard bien visible sur l'écran
    function screenPoint(size, w, h) {
        return { x: rand(size * 0.2, w - size * 1.2), y: rand(size * 0.2, h - size * 1.2) };
    }

    function buildPath(size) {
        const w = window.innerWidth, h = window.innerHeight;
        const from = pick(EDGES);
        const to = pick(EDGES.filter(e => e !== from));
        const path = [edgePoint(from, size, w, h)];

        // Traversée directe seulement si les bords sont opposés,
        // sinon on ajoute au moins un point visible sur l'écran
        const direct = to === OPPOSITE[from] && Math.random() < 0.35;
        if (!direct) {
            const stops = pick([1, 1, 2, 3, 4, 5]);   // plus ou moins de balade
            for (let i = 0; i < stops; i++) path.push(screenPoint(size, w, h));
        }
        path.push(edgePoint(to, size, w, h));
        return path;
    }

    critters.forEach(el => {
        const body = el.querySelector('.critter-body');
        const img = el.querySelector('img');
        const hops = el.dataset.move === 'hop';            // lapin = il saute
        const facesLeft = el.dataset.faces === 'left';     // photo orientée vers la gauche ?
        const baseSpeed = parseFloat(el.dataset.speed) || 130;

        // Si l'image est introuvable : on affiche un emoji à la place
        const useFallback = () => {
            const s = document.createElement('span');
            s.className = 'fallback';
            s.textContent = el.dataset.emoji || '🐾';
            img.replaceWith(s);
        };
        if (img.complete && !img.naturalWidth) useFallback();
        else img.addEventListener('error', useFallback, { once: true });

        let path = [], idx = 1;
        let x = -999, y = -999;
        let waitLeft = rand(0.5, 5);        // départ décalé pour chaque animal
        let speed = baseSpeed;
        let dir = 1, tilt = 0, phase = rand(0, 6);

        function start() {
            const size = el.offsetWidth;
            path = buildPath(size);
            x = path[0].x; y = path[0].y;
            idx = 1;
            speed = baseSpeed * rand(0.8, 1.3);
        }

        el._tick = dt => {
            if (waitLeft > 0) {
                waitLeft -= dt;
                if (waitLeft <= 0) start();
                else { el.style.transform = 'translate(-999px,-999px)'; return; }
            }

            const target = path[idx];
            const dx = target.x - x, dy = target.y - y;
            const dist = Math.hypot(dx, dy);

            // Rythme de marche / de saut
            phase += dt * (hops ? 7 : 9);
            const hop = Math.max(0, Math.sin(phase));
            const factor = hops ? 0.25 + 0.75 * hop : 1;
            const step = speed * factor * dt;

            if (dist <= step) {
                x = target.x; y = target.y; idx++;
                if (idx >= path.length) {            // sorti de l'écran → pause
                    waitLeft = rand(1.5, 8);
                    return;
                }
            } else {
                x += (dx / dist) * step;
                y += (dy / dist) * step;
            }

            // Orientation : regarde dans le sens de la marche
            if (Math.abs(dx) > 2) dir = dx > 0 ? 1 : -1;
            const flip = facesLeft ? -dir : dir;
            const wantedTilt = Math.max(-35, Math.min(35,
                Math.atan2(dy, Math.max(Math.abs(dx), 1)) * (180 / Math.PI) * dir));
            tilt += (wantedTilt - tilt) * Math.min(1, dt * 4);

            const bob = hops ? -hop * 18 : -Math.abs(Math.sin(phase)) * 4;
            el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
            body.style.transform = `translateY(${bob.toFixed(1)}px) rotate(${tilt.toFixed(1)}deg) scaleX(${flip})`;
        };
    });

    let last = performance.now();
    function loop(now) {
        const dt = Math.min(0.05, (now - last) / 1000);   // évite les sauts après un changement d'onglet
        last = now;
        critters.forEach(c => c._tick && c._tick(dt));
        requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
})();