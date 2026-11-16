import * as ImagePicker from 'expo-image-picker'
import { api } from '@/lib/api'
import { showDialog } from '@/design-system'
import { ENDPOINTS } from '@/lib/endpoints'
import { t } from '@/lib/i18n'

/** Version des CGU dont relève la déclaration de droits (`joutio-landing/src/data/legal.ts`). */
export const TERMS_VERSION = '2026-11-15'

/** Déclaration faite pendant cette session de l'app : demandée une seule fois. */
let rightsDeclared = false

/** Déclaration en cours : un second toucher attend la même réponse au lieu d'ouvrir un autre dialog. */
let pendingDeclaration: Promise<boolean> | null = null

/**
 * Déclaration de droits avant le choix d'une image (CGU, cadre LCEN/DSA) ; `false` si le joueur renonce. La réponse
 * n'est rendue qu'une fois le dialog **retiré de l'écran** (`onDismissed`, `Modal.onDismiss` natif sur iOS) : le
 * sélecteur système se présente alors sur l'écran, jamais sur une modale en train de partir (il disparaissait avec
 * elle, 2026-11-16).
 */
function declareImageRights(): Promise<boolean> {
  if (rightsDeclared) return Promise.resolve(true)
  pendingDeclaration ??= new Promise<boolean>((resolve) => {
    let accepted = false
    let answered = false
    const answer = (value: boolean) => {
      if (answered) return
      answered = true
      pendingDeclaration = null
      rightsDeclared = rightsDeclared || value
      resolve(value)
    }
    showDialog({
      title: t('rights.required'),
      message: t('rights.declaration'),
      actions: [
        {
          label: t('rights.confirm'),
          onPress: () => {
            accepted = true
          },
        },
        { label: t('common.cancel'), tone: 'neutral' },
      ],
      // Remplacé par un autre dialog : jamais retiré par lui-même, la réponse est un refus.
      onClose: () => answer(false),
      onDismissed: () => answer(accepted),
    })
  })
  return pendingDeclaration
}

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
 * permission demandée : le sélecteur système n'en exige pas. `crop: false` garde le fichier d'origine : le recadrage
 * système réencode en JPEG et perdrait la transparence d'un PNG (pictogramme).
 */
export async function pickImage(aspect: [number, number], { crop = true }: { crop?: boolean } = {}): Promise<ImagePicker.ImagePickerAsset | null> {
  if (!(await declareImageRights())) return null
  const result = await ImagePicker.launchImageLibraryAsync(
    crop ? { mediaTypes: ['images'], allowsEditing: true, aspect, quality: 0.85 } : { mediaTypes: ['images'], quality: 1 },
  )
  return result.canceled ? null : (result.assets[0] ?? null)
}

/**
 * Envoie une image choisie ; renvoie son URL publique (`media.joutio.com`). `onProgress` reçoit l'avancement de l'envoi,
 * de 0 à 100.
 */
export async function uploadImage(asset: ImagePicker.ImagePickerAsset, onProgress?: (percent: number) => void): Promise<MediaView> {
  const form = new FormData()
  const type = asset.mimeType ?? 'image/jpeg'
  // Le transport multipart XHR de notre client lit les fichiers locaux RN.
  // expo/fetch refuse ce descripteur URI : ne pas repasser cet upload au fetch global.
  form.append('file', { uri: asset.uri, name: asset.fileName ?? `image.${type === 'image/png' ? 'png' : 'jpg'}`, type } as unknown as Blob)
  // Déclaration faite dans `pickImage` : le BFF la conserve avec l'image.
  form.append('rightsDeclared', 'true')
  form.append('termsVersion', TERMS_VERSION)
  return api.post<MediaView>(ENDPOINTS.media, form, onProgress ? { onUploadProgress: (fraction) => onProgress(Math.round(fraction * 100)) } : undefined)
}
