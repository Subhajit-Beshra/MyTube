'use client'

import Link from 'next/link';
import Image from 'next/image';
import { formatDistanceToNow } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreVertical, X, Clock } from "lucide-react";
import React, { useEffect, useState } from 'react';

interface HistoryItem {
  _id: string
  videoid: string
  viewer: string
  watchedon: string
  video: {
    _id: string
    videotitle: string
    videochannel: string
    views: number | string
    createdAt: string
  }
}

const user = {
  id: '1',
  name: 'Subhajit Beshra',
  gmail: 'subhajitbeshra21@gmail.com',
  image: '/LUFFY.jpg',
}

const HistoryContent = () => {
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const historyData: HistoryItem[] = [
          {
            _id: 'h1',
            videoid: '1',
            viewer: user.id,
            watchedon: new Date(Date.now() - 3600000).toISOString(),
            video: {
              _id: '1',
              videotitle: "Teacher's Day Celebration",
              videochannel: 'La Familia',
              views: 1250,
              createdAt: new Date().toISOString(),
            },
          },
          {
            _id: 'h2',
            videoid: '2',
            viewer: user.id,
            watchedon: new Date(Date.now() - 7200000).toISOString(),
            video: {
              _id: '2',
              videotitle: 'Creating an AI Powered Healthcare App',
              videochannel: "Developer's Development",
              views: '4.6 M',
              createdAt: new Date(Date.now() - 86400000).toISOString(),
            },
          },
        ]

        setHistory(historyData)
      } catch (error) {
        console.error('Failed to load history:', error)
      } finally {
        setLoading(false)
      }
    }

    loadHistory()
  }, [])

  if (loading) {
    return <div>Loading history...</div>
  }

  const handleRemovedHistory = async (historyId: string) => {
    try {
      console.log('Removing from history: ', historyId)
      setHistory((currentHistory) => currentHistory.filter((item) => item._id !== historyId))
    } catch (error) {
      console.error('Error removing from history: ', error)
    }
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <Clock className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Keep track of what you watch</h2>
        <p className="text-gray-600">Watch history isn't viewable when signed out.</p>
      </div>
    )
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-12">
        <Clock className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold mb-2">No watch history yet</h2>
        <p className="text-gray-600">Videos you watch will appear here.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600">{history.length} videos</p>
      </div>

      <div className="space-y-4">
        {history.map((item) => (
          <div key={item._id} className="flex gap-4 group">
            <Link href={`/watch/${item.video._id}`} className="flex-shrink-0">
              <div className="relative w-40 aspect-video bg-gray-100 rounded overflow-hidden">
                <video
                  src={item.video._id ? `/Video/Video.mp4` : undefined}
                  className="object-cover group-hover:scale-105 transition-transform duration-200"
                />
              </div>
            </Link>

            <div className="flex-1 min-w-0">
              <Link href={`/watch/${item.video._id}`}>
                <h3 className="font-medium text-sm line-clamp-2 group-hover:text-blue-600 mb-1">
                  {item.video.videotitle}
                </h3>
              </Link>
              <p className="text-sm text-gray-600">{item.video.videochannel}</p>
              <p className="text-sm text-gray-600">
                {typeof item.video.views === 'number' ? item.video.views.toLocaleString() : item.video.views} views •{' '}
                {formatDistanceToNow(new Date(item.watchedon))} ago
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Added {formatDistanceToNow(new Date(item.video.createdAt))} ago
              </p>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger
                className="flex h-8 w-8 items-center justify-center rounded-md opacity-0 transition-opacity group-hover:opacity-100 hover:bg-gray-100"
              >
                <MoreVertical className="w-4 h-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleRemovedHistory(item._id)}>
                  <X className="w-4 h-4 mr-2" />
                  Remove from watch history
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}
      </div>
    </div>
  )
}

export default HistoryContent