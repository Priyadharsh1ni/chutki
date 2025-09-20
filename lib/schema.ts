import { z } from "zod";


export const MenuItemSchema = z.object({
  name: z.string().min(1, "name required"),
  category: z.string().optional(),
  description: z.string().optional(),
  price: z.union([z.number(), z.string()]).optional(),
  options: z
    .array(
      z.object({
        label: z.string(),
        price: z.union([z.number(), z.string()]).optional(),
      })
    )
    .optional(),
});

export const MenuSchema = z.object({
  vendor: z.string().optional(),
  currency: z.string().optional(),
  items: z.array(MenuItemSchema).min(1, "at least one item expected"),
});

export type MenuItem = z.infer<typeof MenuItemSchema>;
export type Menu = z.infer<typeof MenuSchema>;