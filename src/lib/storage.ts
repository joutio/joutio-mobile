import * as SecureStore from 'expo-secure-store'

/** Stockage chiffré (Keychain, Keystore). Une erreur de plateforme ne casse jamais le démarrage. */
export async function getItem(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key)
  } catch {
    return null
  }
}

export async function setItem(key: string, value: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(key, value)
  } catch {
    // Session non persistée : elle reste valable jusqu'à la fermeture de l'app.
  }
}

export async function deleteItem(key: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(key)
  } catch {
    // Sans effet.
  }
}
