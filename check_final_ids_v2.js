const fs = require('fs');
const path = require('path');

const mockDataPath = 'c:/Users/aadit/OneDrive/Desktop/planpro/data/mockData.ts';
const planProDataPath = 'c:/Users/aadit/OneDrive/Desktop/planpro/real_compare/real_compare/planpro_data_2.json';

try {
    const mockContent = fs.readFileSync(mockDataPath, 'utf8');
    const planProData = JSON.parse(fs.readFileSync(planProDataPath, 'utf8'));

    // Extract IDs from mockData.ts using regex
    const mockIds = [];
    const idRegex = /id:\s*'([^']+)'/g;
    let match;
    while ((match = idRegex.exec(mockContent)) !== null) {
        mockIds.push(match[1]);
    }

    const planProIds = planProData.map(p => p.ID);

    const missingInPlanPro = mockIds.filter(id => !planProIds.includes(id));
    const extraInPlanPro = planProIds.filter(id => !mockIds.includes(id));

    console.log('--- ID Consistency Check ---');
    console.log('Total Mock IDs:', mockIds.length);
    console.log('Total PlanPro IDs:', planProIds.length);
    console.log('Missing in PlanPro (ID from Mock):', missingInPlanPro.length);
    if (missingInPlanPro.length > 0) {
        console.log('Missing IDs (first 10):', missingInPlanPro.slice(0, 10));
    }
    console.log('Extra in PlanPro (ID not in Mock):', extraInPlanPro.length);
    if (extraInPlanPro.length > 0) {
        console.log('Extra IDs (first 10):', extraInPlanPro.slice(0, 10));
    }

    if (missingInPlanPro.length === 0 && extraInPlanPro.length === 0) {
        console.log('SUCCESS: All IDs match!');
    }
} catch (err) {
    console.error('Error:', err.message);
}
