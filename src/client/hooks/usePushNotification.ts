import { useState, useEffect, useCallback } from 'react'

type PushPermissionState = 'prompt' | 'granted' | 'denied' | 'unsupported'

interface VapidKeyResponse {
  success: boolean
  data?: { publicKey: string }
}

interface ApiResponse {
  success: boolean
  error?: string
}

interface UsePushNotificationResult {
  /** Whether the browser supports push notifications */
  isSupported: boolean
  /** Current permission state */
  permission: PushPermissionState
  /** Whether the user is currently subscribed */
  isSubscribed: boolean
  /** Loading state during subscription operations */
  isLoading: boolean
  /** Error message if any */
  error: string | null
  /** Subscribe to push notifications */
  subscribe: () => Promise<boolean>
  /** Unsubscribe from push notifications */
  unsubscribe: () => Promise<boolean>
}

/**
 * Hook for managing Web Push notification subscriptions.
 * Handles browser compatibility, permission requests, and server registration.
 */
export function usePushNotification(): UsePushNotificationResult {
  const [isSupported, setIsSupported] = useState(false)
  const [permission, setPermission] = useState<PushPermissionState>('unsupported')
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Check browser support and current subscription status
  useEffect(() => {
    async function checkStatus() {
      // Check if Push API is supported
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        setIsSupported(false)
        setPermission('unsupported')
        setIsLoading(false)
        return
      }

      setIsSupported(true)

      // Check current permission
      const currentPermission = Notification.permission
      setPermission(currentPermission === 'default' ? 'prompt' : (currentPermission as PushPermissionState))

      // Check if already subscribed
      try {
        const registration = await navigator.serviceWorker.ready
        const subscription = await registration.pushManager.getSubscription()
        setIsSubscribed(subscription !== null)
      } catch (err) {
        console.error('Error checking push subscription:', err)
      }

      setIsLoading(false)
    }

    checkStatus()
  }, [])

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      setError('このブラウザはプッシュ通知に対応していません')
      return false
    }

    setIsLoading(true)
    setError(null)

    try {
      // Request notification permission
      const permissionResult = await Notification.requestPermission()
      setPermission(permissionResult === 'default' ? 'prompt' : (permissionResult as PushPermissionState))

      if (permissionResult !== 'granted') {
        setError('通知の許可が必要です')
        setIsLoading(false)
        return false
      }

      // Get VAPID public key from server
      const vapidRes = await fetch('/api/settings/vapid-key')
      const vapidData: VapidKeyResponse = await vapidRes.json()

      if (!vapidData.success || !vapidData.data?.publicKey) {
        throw new Error('VAPID key not configured')
      }

      // Convert VAPID public key from base64url to Uint8Array
      const vapidPublicKey = urlBase64ToUint8Array(vapidData.data.publicKey)

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready

      // Subscribe to push notifications
      // Cast to BufferSource to satisfy TypeScript (Uint8Array is a valid BufferSource)
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidPublicKey as BufferSource
      })

      // Send subscription to server
      const subscriptionJson = subscription.toJSON()
      const registerRes = await fetch('/api/settings/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: subscriptionJson.endpoint,
          p256dh: subscriptionJson.keys?.p256dh,
          auth: subscriptionJson.keys?.auth
        })
      })

      const registerData: ApiResponse = await registerRes.json()

      if (!registerData.success) {
        throw new Error(registerData.error || 'Failed to register subscription')
      }

      setIsSubscribed(true)
      setIsLoading(false)
      return true
    } catch (err) {
      console.error('Error subscribing to push notifications:', err)
      setError(err instanceof Error ? err.message : '登録に失敗しました')
      setIsLoading(false)
      return false
    }
  }, [isSupported])

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    setIsLoading(true)
    setError(null)

    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()

      if (subscription) {
        // Unsubscribe from push manager
        await subscription.unsubscribe()

        // Remove from server
        const subscriptionJson = subscription.toJSON()
        await fetch('/api/settings/push', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            endpoint: subscriptionJson.endpoint
          })
        })
      }

      setIsSubscribed(false)
      setIsLoading(false)
      return true
    } catch (err) {
      console.error('Error unsubscribing from push notifications:', err)
      setError(err instanceof Error ? err.message : '解除に失敗しました')
      setIsLoading(false)
      return false
    }
  }, [])

  return {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    error,
    subscribe,
    unsubscribe
  }
}

/**
 * Convert a base64url-encoded string to a Uint8Array.
 * Used for converting VAPID public keys.
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')

  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }

  return outputArray
}
