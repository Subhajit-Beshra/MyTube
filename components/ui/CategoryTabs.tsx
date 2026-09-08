"use client";

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import React from 'react'

const CategoryTabs = () => {
   const categories = [
    "All",
    "Music",
    "Gaming",
    "Movies",
    "News",
    "Sports",
    "Technology",
    "Comedy",
    "Education",
    "Science",
    "Travel",
    "Food",
    "Fashion",
    ];
    
    const [activeCategory, setactiveCategory] = useState('All');
  return (
    <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {categories.map((category) => (
            <Button
            key={category}
            variant={activeCategory === category ? "default" : "secondary"}
            className="whitespace-nowrap"
            onClick={() => setactiveCategory(category)}
            >
            {category}
            </Button>
        ))}
    </div>
  )
}

export default CategoryTabs