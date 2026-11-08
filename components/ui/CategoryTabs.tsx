"use client";

type CategoryTabsProps = {
  categories: string[];
  activeCategory: string;
  onCategoryChange: (category: string) => void;
};

const CategoryTabs = ({ categories, activeCategory, onCategoryChange }: CategoryTabsProps) => (
  <div className="mb-7 flex gap-2 overflow-x-auto pb-2">
    {categories.map((category) => (
      <button
        key={category}
        type="button"
        aria-pressed={activeCategory === category}
        onClick={() => onCategoryChange(category)}
        className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${
          activeCategory === category
            ? "bg-indigo-600 text-white shadow-sm shadow-indigo-200"
            : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-indigo-50 hover:text-indigo-700"
        }`}
      >
        {category}
      </button>
    ))}
  </div>
);

export default CategoryTabs;
