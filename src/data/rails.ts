// HIWIN profile rails, HIWIN Linear Guideway catalog G99TE24-2410
// (https://www.hiwin.com/wp-content/uploads/HIWIN-Linear-Guideway-Catalog.pdf).

export interface Rail {
  id: string;
  widthMm: number;
  heightMm: number;
  massKgM: number;
}

export const rails: Rail[] = [
  { id: "MGN12", widthMm: 12, heightMm: 8, massKgM: 0.65 },
  { id: "MGN15", widthMm: 15, heightMm: 10, massKgM: 1.06 },
  { id: "HGR15", widthMm: 15, heightMm: 15, massKgM: 1.45 },
  { id: "HGR20", widthMm: 20, heightMm: 17.5, massKgM: 2.21 },
  { id: "HGR25", widthMm: 23, heightMm: 22, massKgM: 3.21 },
  { id: "HGR30", widthMm: 28, heightMm: 26, massKgM: 4.47 },
];

export const getRail = (id: string) => rails.find((r) => r.id === id);
