import { Clock, Compass, History, Home, PlaySquare, ThumbsUp, User } from 'lucide-react'
import Link from 'next/link'
import React from 'react'

const Sidebar = () => {
    const user = {
    id: '1',
    name: "Subhajit Beshra",
    gmail: "subhajitbeshra21@gmail.com",
    image: '/LUFFY.jpg'
    } 
  return (
    <aside className='w-50 border-r min-h-screen p-2'>
        <nav className='flex flex-col gap-4'>
            <Link href="/" className='flex flex-row items-center gap-3 cursor-pointer'>
                <Home />Home
            </Link>
            <Link href="/explore" className='flex flex-row items-center gap-3 cursor-pointer'>
                <Compass />Explore
            </Link>
            <Link href="/subscription" className='flex flex-row items-center gap-3 cursor-pointer'>
                <PlaySquare />Subscription
            </Link>
            {user && (
                <>
                    <div className='flex flex-col mt-3 border-t gap-4 pt-4'>
                        <Link href='/history' className='flex flex-row items-center gap-3 cursor-pointer'>
                            <History />History
                        </Link>
                        <Link href='/liked' className='flex flex-row items-center gap-3 cursor-pointer'>
                            <ThumbsUp />Liked videos
                        </Link>
                        <Link href='/watch-later' className='flex flex-row items-center gap-3 cursor-pointer'>
                            <Clock />Watch later
                        </Link>
                        <Link href={`/channel/${user.id}`} className='flex flex-row items-center gap-3 cursor-pointer'>
                            <User />Your channel
                        </Link>
                    </div>
                </>
            )}
        </nav>
    </aside>
  )
}

export default Sidebar