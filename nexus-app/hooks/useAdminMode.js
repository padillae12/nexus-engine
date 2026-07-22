// hooks/useAdminMode.js
// ══════════════════════════════════════════════════════════════════
//  Hook que gestiona el Modo Admin de la app.
//
//  - isAdmin: si el dueño está autenticado con PIN
//  - enterAdmin(pin): valida el PIN y activa modo admin
//  - exitAdmin(): vuelve al modo recepcionista
//  - Timer de 5 min: regresa automáticamente a modo recepcionista
//    si no hay actividad del usuario.
// ══════════════════════════════════════════════════════════════════

import { useState, useRef, useCallback } from 'react';
import { verifyPin } from '../services/api';

// Minutos de inactividad antes de salir del modo admin
const ADMIN_TIMEOUT_MINUTES = 5;
const ADMIN_TIMEOUT_MS = ADMIN_TIMEOUT_MINUTES * 60 * 1000;

export function useAdminMode() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const timerRef = useRef(null);

  // ── Resetear el timer de inactividad ─────────────────────────────
  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setIsAdmin(false);
      console.log('[AdminMode] Sesión expirada por inactividad.');
    }, ADMIN_TIMEOUT_MS);
  }, []);

  // ── Entrar al modo Admin con PIN ──────────────────────────────────
  const enterAdmin = useCallback(async (pin) => {
    setLoading(true);
    setError(null);
    try {
      const ok = await verifyPin(pin);
      if (ok) {
        setIsAdmin(true);
        resetTimer();
        return true;
      } else {
        setError('PIN incorrecto. Intenta de nuevo.');
        return false;
      }
    } catch (err) {
      setError('No se pudo conectar al servidor.');
      return false;
    } finally {
      setLoading(false);
    }
  }, [resetTimer]);

  // ── Salir del modo Admin manualmente ─────────────────────────────
  const exitAdmin = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsAdmin(false);
    setError(null);
  }, []);

  // ── Registrar actividad (llamar desde pantallas admin) ───────────
  // Reinicia el timer cada vez que el usuario interactúa
  const registerActivity = useCallback(() => {
    if (isAdmin) resetTimer();
  }, [isAdmin, resetTimer]);

  return {
    isAdmin,
    loading,
    error,
    enterAdmin,
    exitAdmin,
    registerActivity,
  };
}
