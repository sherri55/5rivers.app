#!/usr/bin/env node
// Script to update all job property mappings to include weight parsing

const fs = require('fs');
const path = require('path');

const resolversPath = path.join(__dirname, '../schema/resolvers.ts');
let content = fs.readFileSync(resolversPath, 'utf8');

// Pattern to find places where we map job properties with ticketIds parsing
const pattern = /(\s+)\.\.\.record\.j\.properties,(\s+)ticketIds: parseTicketIds\(record\.j\.properties\.ticketIds\), \/\/ Convert string to array/g;

// Replace with both weight and ticketIds parsing
const replacement = '$1...record.j.properties,$2weight: parseWeights(record.j.properties.weight), // Convert string/mixed to array$2ticketIds: parseTicketIds(record.j.properties.ticketIds), // Convert string to array';

const updatedContent = content.replace(pattern, replacement);

// Also handle single job cases
const singleJobPattern = /(\s+)\.\.\.result\[0\]\.j\.properties,(\s+)ticketIds: parseTicketIds\(result\[0\]\.j\.properties\.ticketIds\), \/\/ Convert string to array/g;
const singleJobReplacement = '$1...result[0].j.properties,$2weight: parseWeights(result[0].j.properties.weight), // Convert string/mixed to array$2ticketIds: parseTicketIds(result[0].j.properties.ticketIds), // Convert string to array';

const finalContent = updatedContent.replace(singleJobPattern, singleJobReplacement);

fs.writeFileSync(resolversPath, finalContent);
console.log('✅ Updated resolvers.ts to include weight parsing in all job mappings');
