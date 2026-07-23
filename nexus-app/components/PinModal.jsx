// components/PinModal.jsx
// ══════════════════════════════════════════════════════════════════
//  Modal de ingreso del PIN secreto del dueño.
//  Se activa tocando el logo 5 veces (gesto discreto).
//  Muestra 6 círculos rellenos conforme se digita el PIN.
// ══════════════════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Vibration,
} from 'react-native';

const PIN_LENGTH = 5;

export default function PinModal({ visible, onClose, onSubmit, loading, error }) {
  const [pin, setPin] = useState('');

  // Limpiar PIN al abrir/cerrar
  useEffect(() => {
    if (!visible) setPin('');
  }, [visible]);

  // Cuando se completa el PIN, enviarlo automáticamente
  useEffect(() => {
    if (pin.length === PIN_LENGTH) {
      onSubmit(pin);
    }
  }, [pin]);

  // Vibración en error
  useEffect(() => {
    if (error) {
      Vibration.vibrate([0, 100, 100, 100]);
      setPin('');
    }
  }, [error]);

  const handleDigit = (digit) => {
    if (pin.length < PIN_LENGTH) setPin(prev => prev + digit);
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Header */}
          <Text style={styles.title}>Acceso Admin</Text>
          <Text style={styles.subtitle}>Ingresa el PIN del dueño</Text>

          {/* Indicadores de PIN */}
          <View style={styles.dotsRow}>
            {Array.from({ length: PIN_LENGTH }).map((_, i) => (
              <View
                key={i}
                style={[styles.dot, i < pin.length && styles.dotFilled]}
              />
            ))}
          </View>

          {/* Error */}
          {error ? <Text style={styles.error}>{error}</Text> : null}

          {/* Loading */}
          {loading && <ActivityIndicator color="#6c5ce7" style={{ marginBottom: 12 }} />}

          {/* Teclado numérico */}
          <View style={styles.keypad}>
            {[['1','2','3'],['4','5','6'],['7','8','9'],['','0','⌫']].map((row, ri) => (
              <View key={ri} style={styles.keyRow}>
                {row.map((key, ki) => (
                  <TouchableOpacity
                    key={ki}
                    style={[styles.key, key === '' && styles.keyEmpty]}
                    onPress={() => {
                      if (key === '⌫') handleDelete();
                      else if (key !== '') handleDigit(key);
                    }}
                    disabled={loading || key === ''}
                  >
                    <Text style={styles.keyText}>{key}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </View>

          {/* Cancelar */}
          <TouchableOpacity onPress={onClose} style={styles.cancelBtn} disabled={loading}>
            <Text style={styles.cancelText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: 320,
    backgroundColor: '#1a1a2e',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(108,92,231,0.3)',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 28,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#6c5ce7',
    backgroundColor: 'transparent',
  },
  dotFilled: {
    backgroundColor: '#6c5ce7',
  },
  error: {
    color: '#ff7675',
    fontSize: 13,
    marginBottom: 12,
    textAlign: 'center',
  },
  keypad: {
    width: '100%',
    gap: 12,
    marginTop: 8,
  },
  keyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  key: {
    flex: 1,
    height: 56,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyEmpty: {
    backgroundColor: 'transparent',
  },
  keyText: {
    fontSize: 22,
    fontWeight: '600',
    color: '#fff',
  },
  cancelBtn: {
    marginTop: 20,
    paddingVertical: 8,
    paddingHorizontal: 24,
  },
  cancelText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
  },
});
