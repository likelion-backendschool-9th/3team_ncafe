const originalCoffeeImage = "/images/menus/coffee.jpg";
const brighterCoffeeImage = "/images/menus/coffee-v3.jpg";

export function visibleMenuImage(imageUrl: string) {
  const isCoffee = imageUrl === originalCoffeeImage;
  return {
    src: isCoffee ? brighterCoffeeImage : imageUrl,
    brighten: !isCoffee && imageUrl !== "/images/menus/placeholder.svg",
  };
}
