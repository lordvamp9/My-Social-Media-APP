// Crypto module — AES-GCM E2E encryption using native Web Crypto API
// Both peers derive the same key from the Room ID (host's peer ID)

let cryptoKey = null;

export const initCrypto = async (roomId) => {
  try {
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(roomId),
      'PBKDF2',
      false,
      ['deriveKey']
    );
    cryptoKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: new TextEncoder().encode('MySocialDesktop-vamp9'),
        iterations: 100_000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
    console.log('[Crypto] AES-GCM key initialized from room ID.');
  } catch (e) {
    console.error('[Crypto] Failed to init key:', e);
    cryptoKey = null;
  }
};

export const encryptMessage = async (text) => {
  if (!cryptoKey) return { plain: text };
  try {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      new TextEncoder().encode(text)
    );
    return {
      encrypted: true,
      iv: Array.from(iv),
      data: Array.from(new Uint8Array(encrypted)),
    };
  } catch (e) {
    console.error('[Crypto] Encryption failed:', e);
    return { plain: text };
  }
};

export const decryptMessage = async (payload) => {
  // Legacy plain string (shouldn't happen after this update)
  if (typeof payload === 'string') return payload;
  // Fallback unencrypted
  if (payload.plain !== undefined) return payload.plain;
  if (!cryptoKey || !payload.encrypted) return '🔒 [mensaje cifrado — sin clave]';
  try {
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(payload.iv) },
      cryptoKey,
      new Uint8Array(payload.data)
    );
    return new TextDecoder().decode(decrypted);
  } catch (e) {
    console.error('[Crypto] Decryption failed:', e);
    return '⚠️ [error al descifrar]';
  }
};
