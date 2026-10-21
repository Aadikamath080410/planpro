
const fs = require('fs');
const path = require('path');

const dataPath = path.resolve(process.cwd(), 'real_compare/real_compare/planpro_data_2.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

const mapping = {
    'chair': {
        'casual_chair': 'c-casual',
        'office_chair': 'c-office',
        'dining_chair': 'c-dining',
        'dinning_chair': 'c-dining',
        'gaming_chair': 'c-gaming',
        'rocking_chair': 'c-rocking'
    },
    'table': {
        'coffee_table': 't-coffee',
        'dining_table': 't-dining',
        'dinning_table': 't-dining',
        'study_table': 't-study'
    },
    'sofa': {
        'recliner': 's-recliner',
        'sofaset': 's-sofaset',
        'sofacumbed': 's-sofacumbed'
    },
    'storage': {
        'shoerack': 'st-shoerack',
        'cupboard': 'st-cupboard'
    },
    'bed': {
        'single_bed': 'b-single',
        'double_bed': 'b-double',
        'queen_bed': 'b-queen',
        'king_bed': 'b-king'
    }
};

const counts = {};

const updatedData = data.map(p => {
    const type = p.Type?.trim();
    const subType = p.SubType?.trim();
    const prefix = mapping[type]?.[subType];
    
    if (prefix) {
        if (!counts[prefix]) counts[prefix] = 0;
        counts[prefix]++;
        p.ID = `${prefix}-${counts[prefix]}`;
    }
    return p;
});

fs.writeFileSync(dataPath, JSON.stringify(updatedData, null, 2));
console.log('Successfully updated IDs in planpro_data_2.json');
console.log('Counts:', counts);
