import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import pg from 'pg';
import { randomUUID } from 'node:crypto';

// Test destructif refusé par défaut : exige une base locale dédiée et vide.
const url = process.env.RH_TEST_POSTGRES_URL;
test('PostgreSQL réel : transactions et coupure financière', { skip: !url && 'Définir RH_TEST_POSTGRES_URL pour une base locale dédiée vide' }, async () => {
  const parsed = new URL(url);
  assert.equal(parsed.protocol, 'postgres:');
  assert.ok(['127.0.0.1', 'localhost', '::1', '[::1]'].includes(parsed.hostname), 'La base de test doit être locale');
  assert.equal(parsed.pathname, '/rh_integration_test', 'Utiliser exclusivement une base rh_integration_test vide');
  assert.ok(process.execArgv.includes('--conditions=react-server'), 'Lancer Node avec --conditions=react-server');
  process.env.REDACTION_RH_DATABASE_URL = url;
  process.env.REDACTION_RH_WITHDRAWALS_ENABLED = 'false';
  process.env.REDACTION_RH_NOTIFICATIONS_ENABLED = 'false';
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    const schema = await client.query("SELECT 1 FROM pg_namespace WHERE nspname='redaction_rh'");
    assert.equal(schema.rowCount, 0, 'Base non vide : aucune donnée existante ne sera modifiée');
    const migrate = async (name) => client.query(await readFile(new URL(`../docs/sql/rh-${name}.sql`, import.meta.url), 'utf8'));
    for (const name of ['initial','prestations','absences','account-links','declarations','remunerations']) await migrate(name);
    const rh = await import('../apps/redaction/src/lib/redaction/rh/database.ts');
    const id = randomUUID(), person2 = randomUUID();
    for (const person of [id,person2]) await client.query(`INSERT INTO redaction_rh.collaborators (id,first_name,last_name,job_title,team,contract_status) VALUES ($1,'A','B','Monteur','Production','Salarié')`, [person]);
    await client.query(`INSERT INTO redaction_rh.account_links (collaborator_id,account_id,account_email) VALUES ($1,1,'alice@example.test'),($2,2,'bob@example.test')`, [id,person2]);
    // Sans migration d'ouverture, la paie seule continue de fonctionner.
    const draft = await rh.createRemuneration({ collaboratorId:id, currency:'CDF', month:'2026-01', amountMinor:'1000' }, 'admin@example.test');
    assert.ok(draft);
    for (const name of ['retraits','roles','rapports','notifications','documents','soldes-initiaux','ajustements']) await migrate(name);
    assert.equal(await rh.createOpeningBalance({ collaboratorId:id, currency:'CDF', throughMonth:'2026-01', amountMinor:'10000' }, 'alice@example.test'), false);
    assert.equal(await rh.createOpeningBalance({ collaboratorId:id, currency:'CDF', throughMonth:'2026-01', amountMinor:'10000' }, 'admin@example.test'), true);
    // La coupure reste applicable si les retraits sont ensuite désactivés.
    assert.equal(await rh.decideRemuneration(draft.id,draft.version,'validate','admin@example.test'), false);
    assert.equal(await rh.createRemuneration({ collaboratorId:id, currency:'CDF', month:'2025-12', amountMinor:'1000' }, 'admin@example.test'), null);
    assert.ok(await rh.createRemuneration({ collaboratorId:id, currency:'CDF', month:'2026-02', amountMinor:'1000' }, 'admin@example.test'));
    process.env.REDACTION_RH_WITHDRAWALS_ENABLED = 'true';
    const alice = { id:1,email:'alice@example.test' };
    const bob = { id:2,email:'bob@example.test' };
    assert.equal((await rh.myWithdrawalView(bob)).balances[0].available, null);
    const request = () => ({key:randomUUID(),currency:'CDF',amountMinor:'7000',method:'especes'});
    const [first,second] = await Promise.all([rh.createMyWithdrawal(alice,request()),rh.createMyWithdrawal(alice,request())]);
    assert.equal([first,second].filter(Boolean).length,1, 'Une seule réservation simultanée doit réussir');
    const winner = first || second;
    assert.equal((await rh.myWithdrawalView(alice)).balances[0].available,'3000');
    assert.equal(await rh.decideWithdrawal(winner.id,winner.version,{action:'approve',note:'',paymentDate:null,paymentReference:null},alice.email),false);
    assert.equal(await rh.cancelMyWithdrawal(bob,winner.id,winner.version),false);
    const adj = {collaboratorId:id,currency:'CDF',direction:'debit',amountMinor:'2000',reason:'Correction'};
    assert.equal(await rh.createAdjustment(adj,'admin@example.test'),true);
    assert.equal(await rh.createAdjustment(adj,'admin@example.test'),true);
    const drafts = await rh.listAdjustments(id);
    assert.equal(await rh.decideAdjustment(drafts[0].id,1,'validate',alice.email),false);
    const decisions = await Promise.all(drafts.map((d) => rh.decideAdjustment(d.id,1,'validate','admin@example.test')));
    assert.equal(decisions.filter(Boolean).length,1, 'Une seule diminution simultanée doit réussir');
    assert.equal((await rh.myWithdrawalView(alice)).balances[0].available,'1000');
    assert.equal((await rh.listMyAdjustments(alice)).length,1);
    assert.equal((await rh.listMyAdjustments(bob)).length,0);
    assert.equal(await rh.cancelMyWithdrawal(alice,winner.id,winner.version),true);
    assert.equal((await rh.myWithdrawalView(alice)).balances[0].available,'8000');
    // Un échec d'audit annule toute la mutation, même après insertion de la demande.
    await client.query(`CREATE FUNCTION redaction_rh.test_fail_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action='withdrawal_create' THEN RAISE EXCEPTION 'audit unavailable'; END IF; RETURN NEW; END $$`);
    await client.query('CREATE TRIGGER test_fail_audit BEFORE INSERT ON redaction_rh.audit_log FOR EACH ROW EXECUTE FUNCTION redaction_rh.test_fail_audit()');
    const before = (await client.query('SELECT count(*)::int AS n FROM redaction_rh.withdrawals')).rows[0].n;
    await assert.rejects(rh.createMyWithdrawal(alice,{...request(),amountMinor:'100'}));
    assert.equal((await client.query('SELECT count(*)::int AS n FROM redaction_rh.withdrawals')).rows[0].n,before);
    assert.equal((await rh.myWithdrawalView(alice)).balances[0].available,'8000');
    await client.query('DROP TRIGGER test_fail_audit ON redaction_rh.audit_log');
    await client.query(`INSERT INTO redaction_rh.role_grants (collaborator_id,account_id,account_email,role) SELECT collaborator_id,account_id,account_email,'finance_manager' FROM redaction_rh.account_links WHERE account_id=2`);
  } finally { await client.end(); }
});
