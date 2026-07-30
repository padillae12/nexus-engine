// components/PinModal.jsx
// ══════════════════════════════════════════════════════════════════
//  Modal de Autenticación de PIN — Diseño Profesional (Zero Emojis)
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

const PIN_LENGTH = 4;

export default function PinModal({ visible, onClose, onSubmit, loading, error }) {
  const [pin, setPin] = useState('');

  useEffect(() => {
    if (!visible) setPin('');
  }, [visible]);

  useEffect(() => {
    if (pin.length === PIN_LENGTH) {
      onSubmit(pin);
    }
  }, [pin]);

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
          <Text style={styles.badgeLabel}>SEGURIDAD</Text>
          <Text style={styles.title}>Autenticación de Administrador</Text>
          <Text style={styles.subtitle}>Ingrese su PIN de 4 dígitos para continuar</Text>

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
          {loading && <ActivityIndicator color="#6366F1" style={{ marginBottom: 16 }} />}

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
                    activeOpacity={0.7}
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
    backgroundColor: 'rgba(3, 7, 18, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  card: {
    width: 320,
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  badgeLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6366F1',
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#F9FAFB',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: '#374151',
    backgroundColor: 'transparent',
  },
  dotFilled: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  error: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  keypad: {
    width: '100%',
    gap: 10,
    marginTop: 4,
  },
  keyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  key: {
    flex: 1,
    height: 52,
    backgroundColor: '#1F2937',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151',
  },
  keyEmpty: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  keyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#F9FAFB',
  },
  cancelBtn: {
    marginTop: 20,
    paddingVertical: 8,
    paddingHorizontal: 24,
  },
  cancelText: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '500',
  },
});
