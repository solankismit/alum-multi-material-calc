
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    console.log("Seeding database...");

    // 1. Create the SectionType "27mm Domal"
    const domal27 = await prisma.sectionType.upsert({
        where: { name: "27mm Domal" },
        update: {},
        create: {
            name: "27mm Domal",
            isActive: true,
            trackTypes: ["2-track", "3-track"],
            configs: ["all-glass", "glass-mosquito"],
        },
    });

    console.log(`Created/Found SectionType: ${domal27.name}`);

    // 2. Create Stock Lengths
    const lengths = [12, 15, 16]; // feet
    for (const feet of lengths) {
        const mm = feet * 304.8; // Approximate conversion for storing
        await prisma.stockLength.upsert({
            where: {
                sectionTypeId_length: {
                    sectionTypeId: domal27.id,
                    length: mm
                }
            },
            update: {},
            create: {
                sectionTypeId: domal27.id,
                length: mm,
                lengthFeet: feet,
                isActive: true,
            },
        });
    }
    console.log("Seeded Stock Lengths");

    // 3. Create Configurations
    // We need configs for:
    // - 2-track + all-glass
    // - 2-track + glass-mosquito
    // - 3-track + all-glass
    // - 3-track + glass-mosquito

    const configs = [
        { track: "2-track", config: "all-glass" },
        { track: "2-track", config: "glass-mosquito" },
        { track: "3-track", config: "all-glass" },
        { track: "3-track", config: "glass-mosquito" },
    ];

    // Logic from existing code:
    // x: 3.175, y: 66.675, z: 63.5, a: 104.775, b: 104.775
    const configValues = {
        shutterWidthDeduction: 3.175,
        heightDeduction: 66.675,
        threeTrackWidthAddition: 63.5,
        glassWidthDeduction: 104.775,
        glassHeightDeduction: 104.775,
        frameMultiplierW: 2,
        frameMultiplierH: 2
    };

    for (const c of configs) {
        await prisma.sectionConfiguration.upsert({
            where: {
                sectionTypeId_trackType_configuration: {
                    sectionTypeId: domal27.id,
                    trackType: c.track,
                    configuration: c.config
                }
            },
            update: {
                ...configValues
            },
            create: {
                sectionTypeId: domal27.id,
                trackType: c.track,
                configuration: c.config,
                ...configValues
            },
        });
    }

    console.log("Seeded Section Configurations");
    console.log("Database seeded successfully.");
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
