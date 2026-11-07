import * as ImagePicker from 'expo-image-picker'
import { api } from '@/lib/api'
import { ENDPOINTS } from '@/lib/endpoints'

/** `POST /api/media` : le BFF normalise (JPEG/PNG, 5 Mo au plus) et renvoie l'URL publique. */
export interface MediaView {
  id: string
  url: string
  contentType: string
  sizeBytes: number
  width: number
  height: number
}

/**
 * Choisit une image dans la photothèque (recadrage au ratio demandé) ; `null` si le joueur annule. Aucune
 * permission demandée : le sélecteur système n'en exige pas.
 */
export async function pickImage(aspect: [number, number]): Promise<ImagePicker.ImagePickerAsset | null> {
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect, quality: 0.85 })
  return result.canceled ? null : (result.assets[0] ?? null)
}

/** Envoie une image choisie ; renvoie son URL publique (`media.joutio.com`). */
export async function uploadImage(asset: ImagePicker.ImagePickerAsset): Promise<MediaView> {
  const form = new FormData()
  const type = asset.mimeType ?? 'image/jpeg'
  // Le transport multipart XHR de notre client lit les fichiers locaux RN.
  // expo/fetch refuse ce descripteur URI : ne pas repasser cet upload au fetch global.
  form.append('file', { uri: asset.uri, name: asset.fileName ?? `image.${type === 'image/png' ? 'png' : 'jpg'}`, type } as unknown as Blob)
  return api.post<MediaView>(ENDPOINTS.media, form)
}
