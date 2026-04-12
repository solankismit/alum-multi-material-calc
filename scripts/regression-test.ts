
import { getSectionConfig, TrackType, Configuration } from "../src/utils/sectionConfig";
import { SectionConfiguration } from "@prisma/client";

/**
 * Regression Test Suite for Aluminum Material Calculations
 * This script tests all currently available section types and configurations.
 * Run this after any code update to ensure calculation logic remains correct.
 */

interface TestCase {
    name: string;
    track: TrackType;
    config: Configuration;
    width: number;
    height: number;
    expected: {
        shutterWidth: number;
        shutterHeight: number;
        glassWidth: number;
        glassHeight: number;
        glassArea: number;
    };
}

const testCases: TestCase[] = [
    {
        name: "2-Track All Glass",
        track: "2-track",
        config: "all-glass",
        width: 1000,
        height: 1000,
        expected: {
            shutterWidth: 496.8250, // (1000/2) - 3.175
            shutterHeight: 933.3250, // 1000 - 66.675
            glassWidth: 392.0500, // 496.825 - 104.775
            glassHeight: 828.5500, // 933.325 - 104.775
            glassArea: 324833.0275 // 392.05 * 828.55
        }
    },
    {
        name: "2-Track Glass + Mosquito",
        track: "2-track",
        config: "glass-mosquito",
        width: 1000,
        height: 1000,
        expected: {
            shutterWidth: 496.8250,
            shutterHeight: 933.3250,
            glassWidth: 392.0500,
            glassHeight: 828.5500,
            glassArea: 324833.0275
        }
    },
    {
        name: "3-Track All Glass",
        track: "3-track",
        config: "all-glass",
        width: 1500,
        height: 1500,
        expected: {
            shutterWidth: 521.1667, // (1500 + 63.5) / 3
            shutterHeight: 1433.3250, // 1500 - 66.675
            glassWidth: 416.3917, // 521.1667 - 104.775
            glassHeight: 1328.5500, // 1433.325 - 104.775
            glassArea: 553197.1487
        }
    },
    {
        name: "3-Track Glass + Mosquito",
        track: "3-track",
        config: "glass-mosquito",
        width: 1500,
        height: 1500,
        expected: {
            shutterWidth: 746.8250, // (1500/2) - 3.175
            shutterHeight: 1433.3250,
            glassWidth: 642.0500,
            glassHeight: 1328.5500,
            glassArea: 852995.5275
        }
    }
];

// Mock database configuration constants
const MOCK_DEDUCTIONS = {
    shutterWidthDeduction: 3.175,
    heightDeduction: 66.675,
    threeTrackWidthAddition: 63.5,
    glassWidthDeduction: 104.775,
    glassHeightDeduction: 104.775,
};

console.log("🚀 Starting Regression Tests for Material Calculations...\n");

let failedTests = 0;
const tolerance = 0.0001;

testCases.forEach((test) => {
    const mockDbConfig: SectionConfiguration = {
        id: "mock-id",
        sectionTypeId: "mock-section-id",
        trackType: test.track,
        configuration: test.config,
        ...MOCK_DEDUCTIONS,
        trackRailDeduction: 0,
        separateMosquitoNet: false,
        differentFrameMaterials: false,
        frameMultiplierW: 2,
        frameMultiplierH: 2,
        createdAt: new Date(),
        updatedAt: new Date()
    } as SectionConfiguration;

    const sectionConfig = getSectionConfig(mockDbConfig);
    const dims = sectionConfig.calculateFinalDimensions(test.width, test.height);
    const glass = sectionConfig.calculateGlassSize(test.width, test.height, 1);

    const checks = [
        { name: "Shutter Width", actual: dims.shutterWidth, expected: test.expected.shutterWidth },
        { name: "Shutter Height", actual: dims.height, expected: test.expected.shutterHeight },
        { name: "Glass Width", actual: glass.width, expected: test.expected.glassWidth },
        { name: "Glass Height", actual: glass.height, expected: test.expected.glassHeight },
        { name: "Glass Area", actual: glass.area, expected: test.expected.glassArea },
    ];

    let passed = true;
    const errors: string[] = [];

    checks.forEach(check => {
        if (Math.abs(check.actual - check.expected) > tolerance) {
            passed = false;
            errors.push(`${check.name}: expected ${check.expected.toFixed(4)}, got ${check.actual.toFixed(4)}`);
        }
    });

    if (passed) {
        console.log(`✅ ${test.name}: PASSED`);
    } else {
        console.log(`❌ ${test.name}: FAILED`);
        errors.forEach(err => console.log(`   - ${err}`));
        failedTests++;
    }
});

console.log(`\nSummary: ${testCases.length - failedTests}/${testCases.length} tests passed.`);

if (failedTests > 0) {
    process.exit(1);
} else {
    process.exit(0);
}
