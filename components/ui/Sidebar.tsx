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
            <Link href="/">
                <button className='flex flex-row items-center gap-3 cursor-pointer'><Home />Home</button>
            </Link>
            <Link href="/explore">
                <button className='flex flex-row items-center gap-3 cursor-pointer'><Compass />Explore</button>
            </Link>
            <Link href="/subscription">
                <button className='flex flex-row items-center gap-3 cursor-pointer'><PlaySquare />Subscription</button>
            </Link>
            {user && (
                <>
                    <div className='flex flex-col mt-3 border-t gap-4 pt-4'>
                        <Link href='/history'>
                            <button className='flex flex-row items-center gap-3 cursor-pointer'><History />History</button>
                        </Link>
                        <Link href='/liked-videos'>
                            <button className='flex flex-row items-center gap-3 cursor-pointer'><ThumbsUp />Liked videos</button>
                        </Link>
                        <Link href='/watch-later'>
                            <button className='flex flex-row items-center gap-3 cursor-pointer'><Clock />Watch later</button>
                        </Link>
                        <Link href='/channel/${user.id}'>
                            <button className='flex flex-row items-center gap-3 cursor-pointer'><User />Your channel</button>
                        </Link>
                    </div>
                </>
            )}
        </nav>
    </aside>
  )
}

export default Sidebar