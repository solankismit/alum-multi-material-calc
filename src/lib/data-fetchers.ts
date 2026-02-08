import { db } from "@/lib/db";
import { unstable_cache } from "next/cache";

export const getSectionTypes = unstable_cache(
    async () => {
        return await db.sectionType.findMany({
            where: { isActive: true },
            include: {
                configurations: true,
                stockLengths: {
                    where: { isActive: true },
                },
            },
        });
    },
    ["sections-list"], // key parts
    {
        revalidate: 3600, // revalidate every hour or on demand
        tags: ["sections"],
    }
);
