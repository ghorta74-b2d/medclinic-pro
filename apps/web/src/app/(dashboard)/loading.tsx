import { EcgLoader } from '@/components/ui/ecg-loader'

/**
 * Route-group loading fallback: shown during navigation between dashboard
 * pages. Centered in the browser viewport with the brand ECG wave.
 */
export default function DashboardLoading() {
  return <EcgLoader viewport />
}
