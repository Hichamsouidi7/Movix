import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Keyboard, X, Delete, CornerDownLeft, ArrowUp } from 'lucide-react';
import { isElectronApp } from '../utils/desktopEnv';

// Layout AZERTY (Standard Français)
const AZERTY_LOWER = [
  ['a', 'z', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['q', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm'],
  ['w', 'x', 'c', 'v', 'b', 'n', ',', '.', "'", '-'],
];

const AZERTY_UPPER = [
  ['A', 'Z', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['Q', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'M'],
  ['W', 'X', 'C', 'V', 'B', 'N', '?', '!', ':', '/'],
];

const NUMBERS_SYMBOLS = [
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
  ['@', '#', '€', '$', '%', '&', '*', '(', ')', '_'],
  ['+', '=', '<', '>', '[', ']', '{', '}', ';', '"'],
];

/**
 * Écrit dans un champ en passant par le setter `value` du prototype.
 *
 * Un simple `input.value = x` ne suffit pas : React installe sur *l'instance*
 * un descripteur `value` (le « value tracker ») qui mémorise la dernière
 * valeur connue. Une écriture directe passe par ce setter, met le tracker à
 * jour, et quand l'événement `input` remonte, React compare tracker et DOM,
 * les trouve identiques, et conclut qu'il n'y a rien de neuf : `onChange` ne
 * part jamais et l'état du composant reste vide.
 *
 * Le champ affichait donc bien le texte tapé au clavier virtuel, mais
 * `headerQuery` restait `''` côté React — d'où la recherche qui ne partait pas
 * en validant : `handleSearchSubmit` testait une chaîne vide.
 *
 * Appeler le setter du prototype court-circuite le tracker : il reste sur son
 * ancienne valeur, la comparaison détecte l'écart et React émet `onChange`.
 */
const setNativeValue = (
  element: HTMLInputElement | HTMLTextAreaElement,
  value: string,
) => {
  const prototype = element instanceof HTMLTextAreaElement
    ? HTMLTextAreaElement.prototype
    : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;

  if (setter) {
    setter.call(element, value);
  } else {
    element.value = value;
  }
};

// Un champ dans lequel on peut réellement taper du texte
const isTextInput = (node: Element | null): node is HTMLElement => {
  if (!node) return false;
  const el = node as HTMLElement;

  return (
    (el.tagName === 'INPUT' &&
      !['checkbox', 'radio', 'button', 'submit', 'range', 'color', 'file'].includes(
        (el as HTMLInputElement).type
      )) ||
    el.tagName === 'TEXTAREA' ||
    el.isContentEditable ||
    el.tagName === 'WEBVIEW' ||
    el.getAttribute('role') === 'textbox'
  );
};

export const VirtualTouchKeyboard: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [layoutMode, setLayoutMode] = useState<'lower' | 'upper' | 'symbols'>('lower');
  const activeElementRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  // Un champ texte est-il en cours d'édition ? Conditionne l'affichage du bouton flottant.
  const [isEditingText, setIsEditingText] = useState(false);
  const closeTimerRef = useRef<number | null>(null);

  // Empêche la perte de focus de l'input quand on touche n'importe quel bouton du clavier
  const preventFocusLoss = (e: React.SyntheticEvent) => {
    e.preventDefault();
  };

  // Suivre le champ texte actif sur tout le document
  useEffect(() => {
    const handleFocusIn = (e: FocusEvent | MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!isTextInput(target)) return;

      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }

      activeElementRef.current = target as HTMLInputElement | HTMLTextAreaElement;
      setIsEditingText(true);
      setIsOpen(true);
    };

    // Le focus quitte le champ : on referme, sauf s'il passe simplement sur un autre champ
    const handleFocusOut = () => {
      if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);

      closeTimerRef.current = window.setTimeout(() => {
        closeTimerRef.current = null;
        if (isTextInput(document.activeElement)) return;

        activeElementRef.current = null;
        setIsEditingText(false);
        setIsOpen(false);
      }, 150);
    };

    document.addEventListener('focusin', handleFocusIn, true);
    document.addEventListener('click', handleFocusIn, true);
    document.addEventListener('focusout', handleFocusOut, true);

    return () => {
      document.removeEventListener('focusin', handleFocusIn, true);
      document.removeEventListener('click', handleFocusIn, true);
      document.removeEventListener('focusout', handleFocusOut, true);
      if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
    };
  }, []);

  // Insertion d'un caractère dans l'ordre chronologique exact sans perdre le curseur
  const insertText = useCallback((char: string) => {
    const target = activeElementRef.current || (document.activeElement as HTMLInputElement | HTMLTextAreaElement);

    if (target && 'value' in target && typeof target.focus === 'function') {
      target.focus();

      const start = target.selectionStart ?? target.value.length;
      const end = target.selectionEnd ?? target.value.length;
      const value = target.value;

      const newValue = value.slice(0, start) + char + value.slice(end);
      setNativeValue(target, newValue);

      const newPos = start + char.length;
      try {
        target.setSelectionRange(newPos, newPos);
      } catch (_) {}

      // Événements React / HTML
      target.dispatchEvent(new Event('input', { bubbles: true }));
      target.dispatchEvent(new Event('change', { bubbles: true }));
    } else if (isElectronApp()) {
      // Envoi de la touche dans Electron (pour <webview> ou YouTube)
      try {
        const webview = document.querySelector('webview') as any;
        if (webview && typeof webview.sendInputEvent === 'function') {
          webview.sendInputEvent({ type: 'char', keyCode: char });
        }
      } catch (_) {}
    }
  }, []);

  // Supprimer un caractère (Backspace continu sans quitter le champ)
  const handleBackspace = useCallback(() => {
    const target = activeElementRef.current || (document.activeElement as HTMLInputElement | HTMLTextAreaElement);

    if (target && 'value' in target && typeof target.focus === 'function') {
      target.focus();

      const start = target.selectionStart ?? target.value.length;
      const end = target.selectionEnd ?? target.value.length;
      const value = target.value;

      let newValue = value;
      let newPos = start;

      if (start !== end) {
        newValue = value.slice(0, start) + value.slice(end);
      } else if (start > 0) {
        newValue = value.slice(0, start - 1) + value.slice(start);
        newPos = start - 1;
      }

      setNativeValue(target, newValue);
      try {
        target.setSelectionRange(newPos, newPos);
      } catch (_) {}

      target.dispatchEvent(new Event('input', { bubbles: true }));
      target.dispatchEvent(new Event('change', { bubbles: true }));
    } else if (isElectronApp()) {
      try {
        const webview = document.querySelector('webview') as any;
        if (webview && typeof webview.sendInputEvent === 'function') {
          webview.sendInputEvent({ type: 'keyDown', keyCode: 'Backspace' });
          webview.sendInputEvent({ type: 'keyUp', keyCode: 'Backspace' });
        }
      } catch (_) {}
    }
  }, []);

  // Valider / Soumettre la recherche
  const handleEnter = useCallback(() => {
    const target = activeElementRef.current || (document.activeElement as HTMLInputElement | HTMLTextAreaElement);

    if (target) {
      target.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
      target.dispatchEvent(new KeyboardEvent('keypress', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));

      const form = target.form;
      if (form && typeof form.requestSubmit === 'function') {
        form.requestSubmit();
      }
    } else if (isElectronApp()) {
      try {
        const webview = document.querySelector('webview') as any;
        if (webview && typeof webview.sendInputEvent === 'function') {
          webview.sendInputEvent({ type: 'keyDown', keyCode: 'Return' });
          webview.sendInputEvent({ type: 'keyUp', keyCode: 'Return' });
        }
      } catch (_) {}
    }

    setIsOpen(false);
  }, []);

  const keys = layoutMode === 'symbols' ? NUMBERS_SYMBOLS : layoutMode === 'upper' ? AZERTY_UPPER : AZERTY_LOWER;

  return (
    <>
      {/* Clavier Virtuel Tactile Bas d'Écran - S'affiche uniquement lors de l'édition d'un champ texte */}

      {/* Clavier Virtuel Tactile Bas d'Écran */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-[9998] p-3 md:p-5 bg-neutral-950/95 border-t border-white/15 backdrop-blur-2xl shadow-[0_-10px_40px_rgba(0,0,0,0.8)] select-none"
            onMouseDown={preventFocusLoss}
            onTouchStart={preventFocusLoss}
          >
            <div className="max-w-4xl mx-auto flex flex-col gap-2">
              {/* Barre de titre et fermeture */}
              <div className="flex items-center justify-between pb-1 px-1">
                <div className="flex items-center gap-2 text-xs font-semibold text-gray-400">
                  <Keyboard className="w-4 h-4 text-red-500" />
                  <span>Clavier Tactile H-Flix</span>
                </div>
                <button
                  type="button"
                  onMouseDown={preventFocusLoss}
                  onTouchStart={preventFocusLoss}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-1 px-3 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-gray-300 text-xs font-semibold transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  Fermer
                </button>
              </div>

              {/* Lignes de touches */}
              {keys.map((row, rowIdx) => (
                <div key={rowIdx} className="flex justify-center gap-1.5 md:gap-2">
                  {/* Touche Majuscule au début de la 3e ligne */}
                  {rowIdx === 2 && (
                    <button
                      type="button"
                      onMouseDown={preventFocusLoss}
                      onTouchStart={preventFocusLoss}
                      onClick={() => setLayoutMode((m) => (m === 'upper' ? 'lower' : 'upper'))}
                      className={`px-3 md:px-4 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center min-w-[50px] ${
                        layoutMode === 'upper'
                          ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                          : 'bg-neutral-800 text-gray-300 hover:bg-neutral-700'
                      }`}
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                  )}

                  {/* Touches standards */}
                  {row.map((char) => (
                    <button
                      key={char}
                      type="button"
                      onMouseDown={preventFocusLoss}
                      onTouchStart={preventFocusLoss}
                      onClick={() => insertText(char)}
                      className="flex-1 max-w-[65px] py-3.5 rounded-xl bg-neutral-800/90 hover:bg-neutral-700 active:bg-red-600 text-white font-semibold text-base md:text-lg border border-white/10 shadow-md transition-all duration-150 active:scale-95"
                    >
                      {char}
                    </button>
                  ))}

                  {/* Touche Effacer à la fin de la 3e ligne */}
                  {rowIdx === 2 && (
                    <button
                      type="button"
                      onMouseDown={preventFocusLoss}
                      onTouchStart={preventFocusLoss}
                      onClick={handleBackspace}
                      className="px-3 md:px-4 py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 active:bg-red-700 text-red-400 font-bold text-sm transition-all flex items-center justify-center min-w-[55px]"
                    >
                      <Delete className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}

              {/* Ligne inférieure : Chiffres/Symboles, Espace, Entrée */}
              <div className="flex justify-center gap-2 pt-1">
                <button
                  type="button"
                  onMouseDown={preventFocusLoss}
                  onTouchStart={preventFocusLoss}
                  onClick={() => setLayoutMode((m) => (m === 'symbols' ? 'lower' : 'symbols'))}
                  className={`px-4 py-3.5 rounded-xl font-bold text-xs md:text-sm transition-all flex items-center justify-center min-w-[70px] ${
                    layoutMode === 'symbols'
                      ? 'bg-red-600 text-white'
                      : 'bg-neutral-800 text-gray-300 hover:bg-neutral-700'
                  }`}
                >
                  {layoutMode === 'symbols' ? 'ABC' : '?123'}
                </button>

                <button
                  type="button"
                  onMouseDown={preventFocusLoss}
                  onTouchStart={preventFocusLoss}
                  onClick={() => insertText(' ')}
                  className="flex-1 max-w-[420px] py-3.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-600 text-gray-400 font-semibold text-sm border border-white/10 shadow-md transition-all active:scale-95"
                >
                  Espace
                </button>

                <button
                  type="button"
                  onMouseDown={preventFocusLoss}
                  onTouchStart={preventFocusLoss}
                  onClick={handleEnter}
                  className="px-5 py-3.5 rounded-xl bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-bold text-sm shadow-lg shadow-red-600/30 transition-all flex items-center gap-1.5"
                >
                  <span>Recherche</span>
                  <CornerDownLeft className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default VirtualTouchKeyboard;
