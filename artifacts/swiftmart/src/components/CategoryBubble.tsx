import { Category } from "@/data/categories";
import { Link } from "wouter";
import { useState } from "react";

export function CategoryBubble({ category }: { category: Category }) {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <Link href={`/category/${category.id}`} className="flex flex-col items-center gap-2 group min-w-[72px]">
      <div className="w-16 h-16 rounded-2xl bg-card neu-card flex items-center justify-center p-2 relative overflow-hidden group-hover:scale-105 transition-transform duration-300">
        <div
          className="absolute inset-0 opacity-20"
          style={{ backgroundColor: category.color }}
        />
        {category.image && !imgFailed ? (
          <img
            src={category.image}
            alt={category.name}
            className="w-full h-full object-contain relative z-10"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <span className="text-2xl relative z-10 leading-none select-none">{category.emoji}</span>
        )}
      </div>
      <span className="text-[10px] font-medium text-center leading-tight group-hover:text-primary transition-colors w-[72px] line-clamp-2">
        {category.name}
      </span>
    </Link>
  );
}
