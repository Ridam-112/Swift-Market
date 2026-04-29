import { Category } from "@/data/categories";
import { Link } from "wouter";

export function CategoryBubble({ category }: { category: Category }) {
  return (
    <Link href={`/category/${category.id}`} className="flex flex-col items-center gap-2 group min-w-[72px]">
      <div className="w-16 h-16 rounded-2xl bg-card neu-card flex items-center justify-center p-3 relative overflow-hidden group-hover:scale-105 transition-transform duration-300">
        <div 
          className="absolute inset-0 opacity-20"
          style={{ backgroundColor: category.color }}
        />
        <img 
          src={category.image} 
          alt={category.name} 
          className="w-full h-full object-contain relative z-10"
        />
      </div>
      <span className="text-[11px] font-medium text-center leading-tight group-hover:text-primary transition-colors">
        {category.name}
      </span>
    </Link>
  );
}
