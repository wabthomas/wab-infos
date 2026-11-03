import fs from 'node:fs';

let audit = fs.readFileSync('apps/redaction/src/app/api/redaction/rh/audit/route.ts', 'utf8');
audit = audit.replace("requireRhPermission('access_manage')", "requireRhPermission('hr_manage')");
fs.writeFileSync('apps/redaction/src/app/api/redaction/rh/audit/route.ts', audit, 'utf8');
console.log('AUDIT_PERM', audit.includes("requireRhPermission('hr_manage')") ? 'OK' : 'MISS');

let reports = fs.readFileSync('apps/redaction/src/app/(editor)/rh/rapports/page.tsx', 'utf8');
reports = reports.replace(
  '{capabilities.accessManage && <AuditJournal />}',
  '{(capabilities.hrManage || capabilities.accessManage) && <AuditJournal />}',
);
fs.writeFileSync('apps/redaction/src/app/(editor)/rh/rapports/page.tsx', reports, 'utf8');
console.log('REPORTS_GUARD', reports.includes('capabilities.hrManage || capabilities.accessManage') ? 'OK' : 'MISS');

let assets = fs.readFileSync('apps/redaction/src/app/api/redaction/rh/organisation/assets/[key]/route.ts', 'utf8');
assets = assets.replace(/Formats autorisés : JPG, PNG \(transparence acceptée\) ou WebP\./, 'Formats autorisés : JPG, PNG ou WebP.');
fs.writeFileSync('apps/redaction/src/app/api/redaction/rh/organisation/assets/[key]/route.ts', assets, 'utf8');
console.log('ASSET_MSG', assets.includes('transparence acceptée') ? 'STILL' : 'OK');

let test = fs.readFileSync('tests/rh-audit-pagination.test.mjs', 'utf8');
test = test.replace(/requireRhPermission\('access_manage'\)/, "requireRhPermission('hr_manage')");
test = test.replace("route.indexOf(\"requireRhPermission('access_manage')\")", "route.indexOf(\"requireRhPermission('hr_manage')\")");
test = test.replace('/capabilities\\.accessManage && <AuditJournal/', '/(capabilities\\.hrManage \\|\\| capabilities\\.accessManage) && <AuditJournal/');
fs.writeFileSync('tests/rh-audit-pagination.test.mjs', test, 'utf8');
console.log('TEST_UPDATED', test.includes("hr_manage") ? 'OK' : 'MISS');
