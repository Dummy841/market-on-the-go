import { Button } from "@/components/ui/button";

export const CuisineCategories = () => {
  const categories = [
    { name: "Pizza", emoji: "🍕", color: "bg-red-100 text-red-800" },
    { name: "Burgers", emoji: "🍔", color: "bg-yellow-100 text-yellow-800" },
    { name: "Sushi", emoji: "🍣", color: "bg-blue-100 text-blue-800" },
    { name: "Indian", emoji: "🍛", color: "bg-orange-100 text-orange-800" },
    { name: "Chinese", emoji: "🥢", color: "bg-green-100 text-green-800" },
    { name: "Italian", emoji: "🍝", color: "bg-purple-100 text-purple-800" },
    { name: "Mexican", emoji: "🌮", color: "bg-pink-100 text-pink-800" },
    { name: "Desserts", emoji: "🍰", color: "bg-indigo-100 text-indigo-800" }
  ];

  return (
    <section className="py-8 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-foreground mb-2">
            What's on your mind?
          </h2>
          <p className="text-muted-foreground">
            Browse by your favorite cuisine
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-4">
          {categories.map((category) => (
            <Button
              key={category.name}
              variant="ghost"
              className={`flex flex-col items-center space-y-2 h-auto py-4 px-6 ${category.color} hover:scale-105 transition-transform duration-200`}
            >
              <span className="text-2xl">{category.emoji}</span>
              <span className="text-sm font-medium">{category.name}</span>
            </Button>
          ))}
        </div>
      </div>
    </section>
  );
};