"use client";

import { Input } from "@base-ui/react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Bell, Menu, Mic, Search, VideoIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Header = () => {
  const user = {
    id: '1',
    name: "Subhajit Beshra",
    gmail: "subhajitbeshra21@gmail.com",
    image: '/LUFFY.jpg'
  }
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <header className="sticky top-0 z-50 flex  w-full items-center justify-between border-b bg-white p-2">
      
      {/* Left Section */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-gray-100"
        >
          <Menu className="h-6 w-6" />
        </button>

        <Link href="/" className="flex items-center gap-1">
          <Image
            src="/YouTube.jpg"
            alt="MyTube logo"
            width={40}
            height={30}
            className="object-contain"
          />

          <span className="text-xl font-semibold tracking-tight">
            MyTube
          </span>

          <span className="ml-1 text-xs text-gray-500">
            IN
          </span>
        </Link>
      </div>

      {/* Search Section */}
      <form className="mx-6 flex max-w-2xl flex-1 items-center gap-3">
        <div className="flex flex-1">
          <Input
            type="search"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 flex-1 rounded-l-full border border-gray-300 px-5 outline-none focus-visible:ring-0"
          />

          <button
            type="submit"
            className="flex h-10 w-16 items-center justify-center rounded-r-full border border-l-0 border-gray-300 bg-gray-50 hover:bg-gray-100"
          >
            <Search className="h-5 w-5 text-gray-700" />
          </button>
        </div>

        {/* Microphone */}
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200"
        >
          <Mic className="h-5 w-5" />
        </button>
      </form>

      {/* Right Section */}
      <div className="flex flex-row items-center gap-3">
        
        {user ?
        (<>
            <button className="pointer-cursor"><VideoIcon /></button>
            <button className="pointer-cursor"><Bell /></button>
            <DropdownMenu>
                <DropdownMenuTrigger>
                        <Avatar className=''>
                            <AvatarImage src={user.image} alt={user.name}/>
                            <AvatarFallback>
                                {user.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuItem>
                        <Link href={`/channel/${user.id}`}>My Channel</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                        <Link href="/history">History</Link>
                    </DropdownMenuItem> 
                    <DropdownMenuItem>
                        <Link href="/liked">Liked</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                        <Link href="/watch-later">Watch Later</Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                        Signout
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </>): 
        (<>
            <button>Sign In</button>
        </>)}
       </div>
    </header>
  );
};

export default Header;