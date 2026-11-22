import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '../hooks'
import { notifications_slice, type Toast } from '../slices/notifications_slice'

const TOAST_MS = 4000

function ToastView({ toast }: { toast: Toast }) {
  const dispatch = useAppDispatch()
  const dismiss = () => dispatch(notifications_slice.actions.toast_dismissed(toast.id))

  useEffect(() => {
    const timer = setTimeout(dismiss, TOAST_MS)
    return () => clearTimeout(timer)
  }, [toast.id])   // eslint-disable-line react-hooks/exhaustive-deps

  return <div className={`toast ${toast.level}`} onClick={dismiss}>{toast.text}</div>
}

// Rejected commands and finished rounds both end up here as toast_added events
export default function Toasts() {
  const toasts = useAppSelector(state => state.notifications.toasts)
  return <div className="toasts">{toasts.map(toast => <ToastView key={toast.id} toast={toast} />)}</div>
}
