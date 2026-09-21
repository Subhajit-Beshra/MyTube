import { Suspense } from 'react'
import HistoryContent from '@/components/ui/HistoryContent'

export default function HistoryPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Watch History</h1>
      <Suspense fallback={<div>Loading history...</div>}>
        <HistoryContent />
      </Suspense>
    </div>
  )
}
