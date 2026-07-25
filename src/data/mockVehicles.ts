export type VehicleCardModel = {
  id: string;
  name: string;
  category: string;
  location: string;
  pricePerDay: number;
  rating: number;
  reviewCount: number;
  hostLabel: string;
  accent: string;
};

export const mockVehicles: VehicleCardModel[] = [
  {
    id: "1",
    name: "Toyota RAV4 2023",
    category: "SUV",
    location: "Kingston, JA",
    pricePerDay: 18500,
    rating: 4.9,
    reviewCount: 48,
    hostLabel: "Hosted by Andre",
    accent: "#D7F2EC",
  },
  {
    id: "2",
    name: "Honda CR-V 2022",
    category: "SUV",
    location: "Montego Bay, JA",
    pricePerDay: 17200,
    rating: 4.7,
    reviewCount: 32,
    hostLabel: "Hosted by Simone",
    accent: "#FBE8C0",
  },
  {
    id: "3",
    name: "BMW 3 Series 2023",
    category: "Sedan",
    location: "Kingston, JA",
    pricePerDay: 28000,
    rating: 4.9,
    reviewCount: 15,
    hostLabel: "Hosted by Marcus",
    accent: "#DBEAFE",
  },
  {
    id: "4",
    name: "Toyota Hiace 2021",
    category: "Van",
    location: "Ocho Rios, JA",
    pricePerDay: 22000,
    rating: 4.5,
    reviewCount: 28,
    hostLabel: "Hosted by Kwame",
    accent: "#F5D9D0",
  },
];
