const fs = require('fs');
const path = require('path');

const mockDataPath = 'c:/Users/aadit/OneDrive/Desktop/planpro/data/mockData.ts';
const planProDataPath = 'c:/Users/aadit/OneDrive/Desktop/planpro/real_compare/real_compare/planpro_data_2.json';

const mockContent = fs.readFileSync(mockDataPath, 'utf8');
const planProContent = fs.readFileSync(planProDataPath, 'utf8');

const mockIds = [...mockContent.matchAll(/id:\s*'([^']+)'/g)].map(m => m[1]);
const planProIds = JSON.parse(planProContent).map(p => p.ID);

const missingInPlanPro = mockIds.filter(id => !planProIds.includes(id));
const extraInPlanPro = planProIds.filter(id => !mockIds.includes(id));

console.log('Total Mock IDs:', mockIds.length);
console.log('Total PlanPro IDs:', planProIds.length);
console.log('Missing in PlanPro (ID from Mock):', missingInPlanPro.length);
console.log('Missing IDs:', missingInPlanPro);
console.log('Extra in PlanPro (ID not in Mock):', extraInPlanPro.length);
console.log('Extra IDs:', extraInPlanPro);
