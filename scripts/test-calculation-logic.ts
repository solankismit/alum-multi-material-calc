
import { getSectionConfig, TrackType, Configuration } from "../src/utils/sectionConfig";
import { SectionConfiguration } from "@prisma/client";

const testCases = [
    {
        track: "2-track" as TrackType, config: "all-glass" as Configuration, width: 1000, height: 1000,
        expected: { sw: 496.8250, sh: 933.3250, gw: 392.0500, gh: 828.5500, ga: 324833.0275 }
    },
    {
        track: "2-track" as TrackType, config: "glass-mosquito" as Configuration, width: 1000, height: 1000,
        expected: { sw: 496.8250, sh: 933.3250, gw: 392.0500, gh: 828.5500, ga: 324833.0275 }
    },
    {
        track: "3-track" as TrackType, config: "all-glass" as Configuration, width: 1500, height: 1500,
        expected: { sw: 521.1667, sh: 1433.3250, gw: 416.3917, gh: 1328.5500, ga: 553197.1487 }
    },
    {
        track: "3-track" as TrackType, config: "glass-mosquito" as Configuration, width: 1500, height: 1500,
        expected: { sw: 746.8250, sh: 1433.3250, gw: 642.0500, gh: 1328.5500, ga: 852995.5275 }
    },
];

console.log("Running Calculation Regression Tests with Assertions...\n");

let failedDetails: string[] = [];

testCases.forEach((test, index) => {
    const mockConfig: SectionConfiguration = {
        id: "mock-id",
        sectionTypeId: "mock-section-id",
        trackType: test.track,
        configuration: test.config,
        shutterWidthDeduction: 3.175,
        heightDeduction: 66.675,
        threeTrackWidthAddition: 63.5,
        glassWidthDeduction: 104.775,
        glassHeightDeduction: 104.775,
        frameMultiplierW: 2,
        frameMultiplierH: 2,
        createdAt: new Date(),
        updatedAt: new Date()
    };

    const sectionConfig = getSectionConfig(mockConfig);
    const dims = sectionConfig.calculateFinalDimensions(test.width, test.height);
    const glass = sectionConfig.calculateGlassSize(test.width, test.height, 1);

    const tolerance = 0.0001;
    const checks = [
        { name: "Shutter Width", actual: dims.shutterWidth, expected: test.expected.sw },
        { name: "Shutter Height", actual: dims.height, expected: test.expected.sh },
        { name: "Glass Width", actual: glass.width, expected: test.expected.gw },
        { name: "Glass Height", actual: glass.height, expected: test.expected.gh },
        { name: "Glass Area", actual: glass.area, expected: test.expected.ga },
    ];

    let casePassed = true;
    checks.forEach(check => {
        if (Math.abs(check.actual - check.expected) > tolerance) {
            casePassed = false;
            failedDetails.push(`Case ${index + 1} (${test.track} ${test.config}): ${check.name} mismatch. Expected ${check.expected}, got ${check.actual}`);
        }
    });

    if (casePassed) {
        console.log(`✅ Case ${index + 1}: Passed`);
    } else {
        console.log(`❌ Case ${index + 1}: Failed`);
    }
});

if (failedDetails.length > 0) {
    console.error("\nFailures:");
    failedDetails.forEach(f => console.error(f));
    process.exit(1);
} else {
    console.log("\nAll tests passed successfully!");
}
