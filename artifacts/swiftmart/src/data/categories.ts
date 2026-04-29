import { CategoryId } from "@/types";

export interface Category {
  id: CategoryId;
  name: string;
  image: string;
  color: string;
  icon: string;
}

export const categories: Category[] = [
  {
    id: "groceries",
    name: "Groceries",
    image: "/assets/cat-groceries.png",
    color: "hsl(35, 90%, 55%)",
    icon: "shopping-basket"
  },
  {
    id: "vegetables",
    name: "Vegetables",
    image: "/assets/cat-vegetables.png",
    color: "hsl(140, 60%, 45%)",
    icon: "leaf"
  },
  {
    id: "personal-care",
    name: "Personal Care",
    image: "/assets/cat-personal-care.png",
    color: "hsl(280, 60%, 65%)",
    icon: "sparkles"
  },
  {
    id: "books",
    name: "Books",
    image: "/assets/cat-books.png",
    color: "hsl(200, 80%, 55%)",
    icon: "book-open"
  },
  {
    id: "clothing",
    name: "Clothing",
    image: "/assets/cat-clothing.png",
    color: "hsl(340, 70%, 60%)",
    icon: "shirt"
  }
];
