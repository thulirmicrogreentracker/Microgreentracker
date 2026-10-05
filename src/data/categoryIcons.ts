import {
  Apple, Bean, Carrot, Cherry, Citrus, Clover, Droplet, Feather, Flower, Flower2, Grape, Heart, Hop, Leaf,
  LeafyGreen, Nut, Popcorn, Salad, Shrub, Sparkles, Sprout, Star, Sun, Tag, TreeDeciduous, Vegan, Wheat,
} from 'lucide-react';

type Icon = typeof Sprout;

// Icons a crop category can use, in the order the picker shows them.
export const categoryIconOptions: { key: string; label: string; icon: Icon }[] = [
  { key: 'sprout', label: 'Sprout', icon: Sprout },
  { key: 'leafy-green', label: 'Leafy green', icon: LeafyGreen },
  { key: 'leaf', label: 'Leaf', icon: Leaf },
  { key: 'salad', label: 'Salad', icon: Salad },
  { key: 'bean', label: 'Bean / pulse', icon: Bean },
  { key: 'wheat', label: 'Grain', icon: Wheat },
  { key: 'popcorn', label: 'Corn', icon: Popcorn },
  { key: 'nut', label: 'Seed / nut', icon: Nut },
  { key: 'carrot', label: 'Root', icon: Carrot },
  { key: 'feather', label: 'Blades (allium)', icon: Feather },
  { key: 'hop', label: 'Hop', icon: Hop },
  { key: 'clover', label: 'Clover', icon: Clover },
  { key: 'shrub', label: 'Shrub', icon: Shrub },
  { key: 'flower', label: 'Flower', icon: Flower },
  { key: 'flower-2', label: 'Blossom', icon: Flower2 },
  { key: 'sun', label: 'Sunflower', icon: Sun },
  { key: 'vegan', label: 'Plant', icon: Vegan },
  { key: 'tree', label: 'Tree', icon: TreeDeciduous },
  { key: 'cherry', label: 'Cherry', icon: Cherry },
  { key: 'grape', label: 'Grape', icon: Grape },
  { key: 'citrus', label: 'Citrus', icon: Citrus },
  { key: 'apple', label: 'Apple', icon: Apple },
  { key: 'droplet', label: 'Droplet', icon: Droplet },
  { key: 'sparkles', label: 'Sparkles', icon: Sparkles },
  { key: 'star', label: 'Star', icon: Star },
  { key: 'heart', label: 'Heart', icon: Heart },
  { key: 'tag', label: 'Tag', icon: Tag },
];

export const categoryIcon = (key: string | undefined): Icon =>
  categoryIconOptions.find(o => o.key === key)?.icon ?? Tag;
