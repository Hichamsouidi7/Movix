import { useEffect } from 'react';

/**
 * Glisser-défiler global (drag-to-scroll).
 *
 * Movix est pensé pour un usage tactile / kiosque : les seuls périphériques
 * disponibles sont le doigt et la souris (pas de clavier, parfois pas de
 * molette). Le doigt scrolle déjà nativement (Lenis `syncTouch` dans
 * SmoothScroll.tsx), mais la souris n'a aucun équivalent : sans molette on ne
 * peut pas descendre la page d'accueil.
 *
 * Ce composant comble ce trou : on maintient le bouton gauche (ou le stylet)
 * et on tire vers le haut → la page suit le pointeur, avec inertie au relâché.
 * Le tactile n'est PAS intercepté (`pointerType === 'touch'` est ignoré) pour
 * ne pas doubler le scroll natif.
 *
 * Points délicats :
 *
 * - **Carousels Embla** : ils occupent l'essentiel de la page d'accueil et
 *   captent eux aussi le drag souris (axe X). On verrouille donc l'axe au
 *   premier mouvement significatif : si le geste est majoritairement vertical,
 *   on `stopPropagation()` les `pointermove` en phase capture sur `window`,
 *   ce qui coupe le handler d'Embla (branché sur `document`) avant qu'il
 *   n'atteigne son propre seuil de drag (10px). Un geste horizontal, lui,
 *   n'est jamais intercepté : le carousel garde son comportement.
 *
 * - **Conteneurs scrollables imbriqués** (modales, popups, panneaux) : on
 *   remonte au premier ancêtre réellement scrollable verticalement et c'est
 *   lui qu'on déplace, pas la page.
 *
 * - **Clics** : tant que le seuil d'engagement n'est pas franchi, rien n'est
 *   modifié, un clic reste un clic. Dès qu'on scrolle, le `click` qui suit le
 *   relâché est avalé en capture pour ne pas ouvrir la fiche film sous le
 *   curseur.
 *
 * Opt-out : `data-drag-scroll="off"` sur un élément (ou un de ses parents).
 */

/** Déplacement (px) à franchir avant d'engager le drag. Doit rester sous le
 *  seuil de drag d'Embla (10px) pour pouvoir le court-circuiter à temps. */
const ENGAGE_THRESHOLD_PX = 8;

/** Le geste doit être ce facteur plus vertical qu'horizontal pour engager. */
const AXIS_LOCK_RATIO = 1.2;

/** Décroissance de la vélocité par frame de 16.67ms pendant l'inertie. */
const FRICTION_PER_FRAME = 0.94;

/** En dessous (px/ms), l'inertie s'arrête. */
const MIN_FLING_VELOCITY = 0.02;

/** Au delà (px/ms), la vélocité est écrêtée — évite les flings incontrôlables. */
const MAX_FLING_VELOCITY = 4;

/** Un relâché plus vieux que ça après le dernier mouvement = pas d'inertie. */
const FLING_IDLE_TIMEOUT_MS = 90;

const IGNORE_SELECTOR = [
  'input',
  'textarea',
  'select',
  'option',
  'video',
  'audio',
  'canvas',
  'iframe',
  'webview',
  '[contenteditable=""]',
  '[contenteditable="true"]',
  '[role="slider"]',
  '[draggable="true"]',
  '[data-drag-scroll="off"]',
].join(', ');

type LenisLike = {
  scrollTo: (
    target: number,
    options?: { immediate?: boolean; force?: boolean; lock?: boolean },
  ) => void;
};

const getLenis = (): LenisLike | null =>
  (window as typeof window & { lenis?: LenisLike }).lenis ?? null;

const hasScrollableOverflow = (value: string) =>
  value === 'auto' || value === 'scroll' || value === 'overlay';

/**
 * Premier ancêtre qui scrolle verticalement pour de vrai. `null` = la page.
 */
const findScrollTarget = (from: Element | null): HTMLElement | null => {
  let node: Element | null = from;

  while (node && node !== document.body && node !== document.documentElement) {
    if (node instanceof HTMLElement) {
      const style = window.getComputedStyle(node);

      if (
        hasScrollableOverflow(style.overflowY)
        && node.scrollHeight - node.clientHeight > 1
      ) {
        return node;
      }
    }

    node = node.parentElement;
  }

  return null;
};

const getMaxScroll = (el: HTMLElement | null) =>
  el
    ? el.scrollHeight - el.clientHeight
    : Math.max(
      0,
      document.documentElement.scrollHeight - window.innerHeight,
    );

const getScrollPosition = (el: HTMLElement | null) =>
  el ? el.scrollTop : window.scrollY;

const setScrollPosition = (el: HTMLElement | null, value: number) => {
  const clamped = Math.max(0, Math.min(value, getMaxScroll(el)));

  if (el) {
    el.scrollTop = clamped;
    return clamped;
  }

  // Passer par Lenis quand il est actif : écrire directement dans
  // window.scrollTo laisserait son `animatedScroll` désynchronisé, et la
  // frame suivante il ramènerait la page à sa position d'avant.
  const lenis = getLenis();

  if (lenis) {
    lenis.scrollTo(clamped, { immediate: true, force: true, lock: false });
  } else {
    window.scrollTo(0, clamped);
  }

  return clamped;
};

const DragScroll = () => {
  useEffect(() => {
    // Pointeur suivi (souris/stylet) — null quand aucun drag n'est en cours.
    let pointerId: number | null = null;
    let startX = 0;
    let startY = 0;
    let lastY = 0;
    let lastMoveAt = 0;
    let velocity = 0;
    let engaged = false;
    let abandoned = false;
    let scrollTarget: HTMLElement | null = null;
    let scrollAtStart = 0;
    let flingRaf = 0;

    // Armé au relâché d'un drag effectif, désarmé par le clic qu'il avale ou
    // par le pointerdown suivant. Un listener permanent (plutôt qu'un `once`
    // posé à la volée) évite qu'un drag finissant hors d'une cible cliquable
    // laisse un piège armé qui mangerait le clic légitime d'après.
    let swallowClick = false;

    const stopFling = () => {
      if (flingRaf) {
        cancelAnimationFrame(flingRaf);
        flingRaf = 0;
      }
    };

    const releaseVisualState = () => {
      document.body.style.removeProperty('cursor');
      document.body.style.removeProperty('user-select');
      document.body.style.removeProperty('-webkit-user-select');
    };

    const resetPointer = () => {
      pointerId = null;
      engaged = false;
      abandoned = false;
      scrollTarget = null;
      velocity = 0;
    };

    const startFling = () => {
      const target = scrollTarget;
      let v = Math.max(-MAX_FLING_VELOCITY, Math.min(velocity, MAX_FLING_VELOCITY));

      if (Math.abs(v) < MIN_FLING_VELOCITY) return;

      let previous = performance.now();

      const step = (now: number) => {
        const dt = Math.min(now - previous, 50);
        previous = now;

        const position = getScrollPosition(target);
        const applied = setScrollPosition(target, position + v * dt);

        v *= Math.pow(FRICTION_PER_FRAME, dt / 16.67);

        // Arrêt net en butée haute/basse : continuer ne ferait qu'accumuler.
        const hitEdge = applied <= 0 || applied >= getMaxScroll(target) - 0.5;

        if (Math.abs(v) < MIN_FLING_VELOCITY || hitEdge) {
          flingRaf = 0;
          return;
        }

        flingRaf = requestAnimationFrame(step);
      };

      flingRaf = requestAnimationFrame(step);
    };

    const onPointerDown = (e: PointerEvent) => {
      // Le doigt scrolle déjà nativement (Lenis syncTouch) — ne pas doubler.
      if (e.pointerType === 'touch') return;
      if (e.button !== 0 || pointerId !== null) return;

      const target = e.target instanceof Element ? e.target : null;

      if (!target || target.closest(IGNORE_SELECTOR)) return;

      // Une sélection de texte en cours veut probablement être étendue.
      const selection = window.getSelection();
      if (selection && !selection.isCollapsed) return;

      stopFling();
      swallowClick = false;

      pointerId = e.pointerId;
      startX = e.clientX;
      startY = e.clientY;
      lastY = e.clientY;
      lastMoveAt = e.timeStamp;
      velocity = 0;
      engaged = false;
      abandoned = false;
      scrollTarget = findScrollTarget(target);
      scrollAtStart = getScrollPosition(scrollTarget);

      // Rien à scroller ici : on laisse le geste à Embla / au reste de l'UI.
      if (getMaxScroll(scrollTarget) <= 0) {
        resetPointer();
      }
    };

    const engage = () => {
      engaged = true;
      document.body.style.setProperty('cursor', 'grabbing', 'important');
      document.body.style.setProperty('user-select', 'none');
      document.body.style.setProperty('-webkit-user-select', 'none');
    };

    const onPointerMove = (e: PointerEvent) => {
      if (pointerId === null || e.pointerId !== pointerId || abandoned) return;

      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      if (!engaged) {
        const absX = Math.abs(dx);
        const absY = Math.abs(dy);

        if (Math.max(absX, absY) < ENGAGE_THRESHOLD_PX) return;

        // Geste horizontal : c'est pour un carousel, on se retire définitivement
        // jusqu'au prochain pointerdown.
        if (absY < absX * AXIS_LOCK_RATIO) {
          abandoned = true;
          return;
        }

        engage();
      }

      // Verrou d'axe — voir aussi onMouseMoveCapture, qui coupe la vraie
      // source d'Embla. Ici on protège surtout les handlers React onPointerMove.
      e.stopPropagation();

      const dt = e.timeStamp - lastMoveAt;

      if (dt > 0) {
        const instant = (lastY - e.clientY) / dt;
        // Lissage : une seule frame erratique ne doit pas dicter l'inertie.
        velocity = velocity * 0.7 + instant * 0.3;
        lastMoveAt = e.timeStamp;
        lastY = e.clientY;
      }

      // On repart toujours de la position initiale : le contenu colle au
      // pointeur même si une frame a été sautée.
      setScrollPosition(scrollTarget, scrollAtStart - dy);
    };

    // Verrou d'axe vis-à-vis d'Embla. Le carousel ne travaille PAS en
    // `pointer*` mais en `mousedown`/`mousemove`/`mouseup` (mousemove branché
    // sur `document`). Couper `mousemove` en capture sur `window` — qui passe
    // avant `document` — l'empêche donc de dériver horizontalement pendant
    // qu'on tire la page verticalement. `mouseup` reste intact : c'est lui qui
    // sort Embla de son état de drag, le bloquer le figerait définitivement.
    const onMouseMoveCapture = (e: MouseEvent) => {
      if (engaged) e.stopPropagation();
    };

    const onClickCapture = (e: MouseEvent) => {
      if (!swallowClick) return;

      swallowClick = false;
      e.preventDefault();
      e.stopPropagation();
    };

    const onPointerUp = (e: PointerEvent) => {
      if (pointerId === null || e.pointerId !== pointerId) return;

      const wasEngaged = engaged;
      const idle = e.timeStamp - lastMoveAt;

      if (wasEngaged) {
        // Pas de stopPropagation ici : Embla attend son pointerup sur
        // `document` pour sortir de son état de drag. Le lui couper le
        // laisserait bloqué et casserait le carousel pour de bon.
        releaseVisualState();
        swallowClick = true;

        if (idle < FLING_IDLE_TIMEOUT_MS) {
          startFling();
        }
      }

      resetPointer();
    };

    const onPointerCancel = (e: PointerEvent) => {
      if (pointerId === null || e.pointerId !== pointerId) return;

      if (engaged) releaseVisualState();

      resetPointer();
    };

    // Images et liens sont nativement draggables : sans ça, tirer sur une
    // affiche déclenche le drag & drop du navigateur au lieu de scroller.
    const onDragStart = (e: DragEvent) => {
      if (engaged) e.preventDefault();
    };

    const onSelectStart = (e: Event) => {
      if (engaged) e.preventDefault();
    };

    // Capture partout : il faut passer avant Embla (document) et avant React
    // (root container) pour pouvoir verrouiller l'axe.
    window.addEventListener('pointerdown', onPointerDown, { capture: true });
    window.addEventListener('pointermove', onPointerMove, { capture: true });
    window.addEventListener('pointerup', onPointerUp, { capture: true });
    window.addEventListener('pointercancel', onPointerCancel, { capture: true });
    window.addEventListener('mousemove', onMouseMoveCapture, { capture: true });
    window.addEventListener('click', onClickCapture, { capture: true });
    window.addEventListener('dragstart', onDragStart, { capture: true });
    document.addEventListener('selectstart', onSelectStart, { capture: true });

    return () => {
      stopFling();
      releaseVisualState();

      window.removeEventListener('pointerdown', onPointerDown, { capture: true });
      window.removeEventListener('pointermove', onPointerMove, { capture: true });
      window.removeEventListener('pointerup', onPointerUp, { capture: true });
      window.removeEventListener('pointercancel', onPointerCancel, { capture: true });
      window.removeEventListener('mousemove', onMouseMoveCapture, { capture: true });
      window.removeEventListener('click', onClickCapture, { capture: true });
      window.removeEventListener('dragstart', onDragStart, { capture: true });
      document.removeEventListener('selectstart', onSelectStart, { capture: true });
    };
  }, []);

  return null;
};

export default DragScroll;
