import { Suspense } from 'react'
import HistoryContent from '@/components/ui/HistoryContent'


const HistoryPage = () => {
  return (
    <div>
      <div>
        <h1>Watch History</h1>
        <Suspense fallback={<div>Loading history...</div>}>
          <HistoryContent />
        </Suspense>
      </div>
    </div>
  )
}

export default HistoryPage