import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const data = [
    {
        "id": "921599ae-4986-478d-9189-9970884b4d60",
        "name": "27mm Domal",
        "isActive": true,
        "systemType": "sliding",
        "trackTypes": [
            "2-track",
            "3-track"
        ],
        "configs": [
            "all-glass",
            "glass-mosquito"
        ],
        "configurations": [
            {
                "id": "597e5f1e-2185-4db2-9cc9-2df06af25285",
                "sectionTypeId": "921599ae-4986-478d-9189-9970884b4d60",
                "trackType": "2-track",
                "configuration": "all-glass",
                "shutterWidthDeduction": 3.175,
                "heightDeduction": 66.675,
                "threeTrackWidthAddition": 63.5,
                "glassWidthDeduction": 104.775,
                "glassHeightDeduction": 104.775,
                "trackRailDeduction": 0,
                "hasTrackRail": true,
                "outerFrameWidthDeduction": null,
                "outerFrameHeightDeduction": null,
                "mullionWidthDeduction": null,
                "mullionLengthDeduction": null,
                "separateMosquitoNet": false,
                "differentFrameMaterials": false,
                "frameMultiplierW": 2,
                "frameMultiplierH": 2,
                "createdAt": "2026-08-08T17:43:19.436Z",
                "updatedAt": "2026-08-08T17:43:19.436Z"
            },
            {
                "id": "e7bd4482-2c5a-4626-8913-52d9d21efed2",
                "sectionTypeId": "921599ae-4986-478d-9189-9970884b4d60",
                "trackType": "3-track",
                "configuration": "all-glass",
                "shutterWidthDeduction": 3.175,
                "heightDeduction": 66.675,
                "threeTrackWidthAddition": 63.5,
                "glassWidthDeduction": 104.775,
                "glassHeightDeduction": 104.775,
                "trackRailDeduction": 0,
                "hasTrackRail": true,
                "outerFrameWidthDeduction": null,
                "outerFrameHeightDeduction": null,
                "mullionWidthDeduction": null,
                "mullionLengthDeduction": null,
                "separateMosquitoNet": false,
                "differentFrameMaterials": false,
                "frameMultiplierW": 2,
                "frameMultiplierH": 2,
                "createdAt": "2026-08-08T17:43:19.858Z",
                "updatedAt": "2026-08-08T17:43:19.858Z"
            },
            {
                "id": "945ae04c-4f98-4667-915c-362032fd614d",
                "sectionTypeId": "921599ae-4986-478d-9189-9970884b4d60",
                "trackType": "3-track",
                "configuration": "glass-mosquito",
                "shutterWidthDeduction": 3.175,
                "heightDeduction": 66.675,
                "threeTrackWidthAddition": 63.5,
                "glassWidthDeduction": 104.775,
                "glassHeightDeduction": 104.775,
                "trackRailDeduction": 0,
                "hasTrackRail": true,
                "outerFrameWidthDeduction": null,
                "outerFrameHeightDeduction": null,
                "mullionWidthDeduction": null,
                "mullionLengthDeduction": null,
                "separateMosquitoNet": false,
                "differentFrameMaterials": false,
                "frameMultiplierW": 2,
                "frameMultiplierH": 2,
                "createdAt": "2026-08-08T17:43:20.258Z",
                "updatedAt": "2026-08-08T17:43:20.258Z"
            }
        ]
    },
    {
        "id": "268fbfe0-59f5-40ba-bd7f-fc0c3e4fa612",
        "name": "29mm series",
        "isActive": true,
        "systemType": "sliding",
        "trackTypes": [
            "3-track"
        ],
        "configs": [
            "glass-mosquito"
        ],
        "configurations": [
            {
                "id": "2a02e17e-c914-4e1c-9664-2b12ae33adcd",
                "sectionTypeId": "268fbfe0-59f5-40ba-bd7f-fc0c3e4fa612",
                "trackType": "3-track",
                "configuration": "glass-mosquito",
                "shutterWidthDeduction": 0,
                "heightDeduction": 68,
                "threeTrackWidthAddition": 0,
                "glassWidthDeduction": 107,
                "glassHeightDeduction": 104,
                "trackRailDeduction": 50,
                "hasTrackRail": true,
                "outerFrameWidthDeduction": null,
                "outerFrameHeightDeduction": null,
                "mullionWidthDeduction": null,
                "mullionLengthDeduction": null,
                "separateMosquitoNet": true,
                "differentFrameMaterials": false,
                "frameMultiplierW": 2,
                "frameMultiplierH": 2,
                "createdAt": "2026-08-08T17:43:21.264Z",
                "updatedAt": "2026-08-08T17:43:21.264Z"
            }
        ]
    },
    {
        "id": "a38ef4f5-4786-4d49-8d46-cf700949a73a",
        "name": "R40 Small (Grill + Glass) Standard Mullion",
        "isActive": true,
        "systemType": "openable",
        "trackTypes": [
            "2-track"
        ],
        "configs": [
            "all-glass"
        ],
        "configurations": [
            {
                "id": "42287f82-8d1d-45c1-84c6-0768b7a2b930",
                "sectionTypeId": "a38ef4f5-4786-4d49-8d46-cf700949a73a",
                "trackType": "2-track",
                "configuration": "all-glass",
                "shutterWidthDeduction": 0,
                "heightDeduction": 0,
                "threeTrackWidthAddition": 0,
                "glassWidthDeduction": 79.375,
                "glassHeightDeduction": 79.375,
                "trackRailDeduction": 0,
                "hasTrackRail": true,
                "outerFrameWidthDeduction": 47.625,
                "outerFrameHeightDeduction": 57.15,
                "mullionWidthDeduction": 38.1,
                "mullionLengthDeduction": 63.5,
                "separateMosquitoNet": false,
                "differentFrameMaterials": false,
                "frameMultiplierW": 2,
                "frameMultiplierH": 2,
                "createdAt": "2026-08-08T17:43:22.582Z",
                "updatedAt": "2026-08-08T17:43:22.582Z"
            }
        ]
    },
    {
        "id": "e00d9f04-f579-49c8-a390-bd3fbb7958b7",
        "name": "R40 Small (Glass Only) Big Mullion",
        "isActive": true,
        "systemType": "openable",
        "trackTypes": [
            "2-track"
        ],
        "configs": [
            "all-glass"
        ],
        "configurations": [
            {
                "id": "f42b95c0-440a-4d6e-8ae0-a397e1411a4f",
                "sectionTypeId": "e00d9f04-f579-49c8-a390-bd3fbb7958b7",
                "trackType": "2-track",
                "configuration": "all-glass",
                "shutterWidthDeduction": 0,
                "heightDeduction": 0,
                "threeTrackWidthAddition": 0,
                "glassWidthDeduction": 79.375,
                "glassHeightDeduction": 82.55,
                "trackRailDeduction": 0,
                "hasTrackRail": true,
                "outerFrameWidthDeduction": 47.625,
                "outerFrameHeightDeduction": 38.1,
                "mullionWidthDeduction": 28.575,
                "mullionLengthDeduction": 25.4,
                "separateMosquitoNet": false,
                "differentFrameMaterials": false,
                "frameMultiplierW": 2,
                "frameMultiplierH": 2,
                "createdAt": "2026-08-08T17:43:23.487Z",
                "updatedAt": "2026-08-08T17:43:23.487Z"
            }
        ]
    },
    {
        "id": "f81fff51-c47e-4b12-a795-8178b65c0dde",
        "name": "R40 Single Section (No Mullions)",
        "isActive": true,
        "systemType": "openable",
        "trackTypes": [
            "2-track"
        ],
        "configs": [
            "all-glass"
        ],
        "configurations": [
            {
                "id": "98071f7e-ab39-4293-be18-63a4048af3e4",
                "sectionTypeId": "f81fff51-c47e-4b12-a795-8178b65c0dde",
                "trackType": "2-track",
                "configuration": "all-glass",
                "shutterWidthDeduction": 0,
                "heightDeduction": 0,
                "threeTrackWidthAddition": 0,
                "glassWidthDeduction": 85,
                "glassHeightDeduction": 84,
                "trackRailDeduction": 0,
                "hasTrackRail": true,
                "outerFrameWidthDeduction": 38,
                "outerFrameHeightDeduction": 37,
                "mullionWidthDeduction": null,
                "mullionLengthDeduction": null,
                "separateMosquitoNet": false,
                "differentFrameMaterials": false,
                "frameMultiplierW": 2,
                "frameMultiplierH": 2,
                "createdAt": "2026-08-08T17:43:24.679Z",
                "updatedAt": "2026-08-08T17:43:24.679Z"
            }
        ]
    },
    {
        "id": "cf2e5b8d-9a06-49e9-95e8-be8e4295b625",
        "name": "Regular Window",
        "isActive": true,
        "systemType": "sliding",
        "trackTypes": [
            "3-track",
            "2-track"
        ],
        "configs": [
            "glass-mosquito",
            "all-glass"
        ],
        "configurations": [
            {
                "id": "6e9b342d-b3d7-4781-baac-97522b919322",
                "sectionTypeId": "cf2e5b8d-9a06-49e9-95e8-be8e4295b625",
                "trackType": "3-track",
                "configuration": "glass-mosquito",
                "shutterWidthDeduction": 79.38,
                "heightDeduction": 38.1,
                "threeTrackWidthAddition": -8.439,
                "glassWidthDeduction": 66.68,
                "glassHeightDeduction": 101.6,
                "trackRailDeduction": 0,
                "hasTrackRail": true,
                "outerFrameWidthDeduction": null,
                "outerFrameHeightDeduction": null,
                "mullionWidthDeduction": null,
                "mullionLengthDeduction": null,
                "separateMosquitoNet": false,
                "differentFrameMaterials": false,
                "frameMultiplierW": 2,
                "frameMultiplierH": 2,
                "createdAt": "2026-08-08T17:43:25.534Z",
                "updatedAt": "2026-08-08T17:43:25.534Z"
            },
            {
                "id": "8bfb1aec-f600-41f1-a211-9de748af0aed",
                "sectionTypeId": "cf2e5b8d-9a06-49e9-95e8-be8e4295b625",
                "trackType": "3-track",
                "configuration": "all-glass",
                "shutterWidthDeduction": 76.38,
                "heightDeduction": 38.1,
                "threeTrackWidthAddition": -8.439,
                "glassWidthDeduction": 66.68,
                "glassHeightDeduction": 101.6,
                "trackRailDeduction": 0,
                "hasTrackRail": true,
                "outerFrameWidthDeduction": null,
                "outerFrameHeightDeduction": null,
                "mullionWidthDeduction": null,
                "mullionLengthDeduction": null,
                "separateMosquitoNet": false,
                "differentFrameMaterials": false,
                "frameMultiplierW": 2,
                "frameMultiplierH": 2,
                "createdAt": "2026-08-08T17:43:25.977Z",
                "updatedAt": "2026-08-08T17:43:25.977Z"
            },
            {
                "id": "0e99f712-7e96-41b4-8406-81880ede2e51",
                "sectionTypeId": "cf2e5b8d-9a06-49e9-95e8-be8e4295b625",
                "trackType": "2-track",
                "configuration": "all-glass",
                "shutterWidthDeduction": 76.38,
                "heightDeduction": 38.1,
                "threeTrackWidthAddition": -8.439,
                "glassWidthDeduction": 66.68,
                "glassHeightDeduction": 101.6,
                "trackRailDeduction": 0,
                "hasTrackRail": true,
                "outerFrameWidthDeduction": null,
                "outerFrameHeightDeduction": null,
                "mullionWidthDeduction": null,
                "mullionLengthDeduction": null,
                "separateMosquitoNet": false,
                "differentFrameMaterials": false,
                "frameMultiplierW": 2,
                "frameMultiplierH": 2,
                "createdAt": "2026-08-08T17:43:26.938Z",
                "updatedAt": "2026-08-08T17:43:26.938Z"
            }
        ]
    }
];

async function main() {
    console.log("Seeding database with window sections and configurations...");

    // Clear existing configurations and section types first
    await prisma.sectionConfiguration.deleteMany({});
    await prisma.sectionType.deleteMany({});

    for (const st of data) {
        console.log(`Inserting SectionType: ${st.name} (${st.id})`);
        await prisma.sectionType.create({
            data: {
                id: st.id,
                name: st.name,
                isActive: st.isActive,
                systemType: st.systemType,
                trackTypes: st.trackTypes,
                configs: st.configs,
            }
        });

        for (const config of st.configurations) {
            console.log(`- Inserting Configuration for track ${config.trackType} / config ${config.configuration} (${config.id})`);
            await prisma.sectionConfiguration.create({
                data: {
                    id: config.id,
                    sectionTypeId: config.sectionTypeId,
                    trackType: config.trackType,
                    configuration: config.configuration,
                    shutterWidthDeduction: config.shutterWidthDeduction,
                    heightDeduction: config.heightDeduction,
                    threeTrackWidthAddition: config.threeTrackWidthAddition,
                    glassWidthDeduction: config.glassWidthDeduction,
                    glassHeightDeduction: config.glassHeightDeduction,
                    trackRailDeduction: config.trackRailDeduction,
                    hasTrackRail: config.hasTrackRail,
                    outerFrameWidthDeduction: config.outerFrameWidthDeduction,
                    outerFrameHeightDeduction: config.outerFrameHeightDeduction,
                    mullionWidthDeduction: config.mullionWidthDeduction,
                    mullionLengthDeduction: config.mullionLengthDeduction,
                    separateMosquitoNet: config.separateMosquitoNet,
                    differentFrameMaterials: config.differentFrameMaterials,
                    frameMultiplierW: config.frameMultiplierW,
                    frameMultiplierH: config.frameMultiplierH,
                    createdAt: new Date(config.createdAt),
                    updatedAt: new Date(config.updatedAt),
                }
            });
        }
    }

    console.log("Database seeded successfully.");
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error("Seeding failed:", e);
        await prisma.$disconnect();
        process.exit(1);
    });
