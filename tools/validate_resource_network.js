const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '..', 'src', 'resources.schema.json');

console.log('=== Checking Curio App Resource Network Schemas ===');

try {
  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
  if (schema.title === 'QPIOResource' && schema.properties.temporal_status) {
    console.log('✓ curio/src/resources.schema.json is valid and contains temporal states');
  } else {
    throw new Error('Schema missing required title or temporal_status field');
  }
} catch (err) {
  console.error('✗ Failed to validate resources.schema.json:', err.message);
  process.exit(1);
}
