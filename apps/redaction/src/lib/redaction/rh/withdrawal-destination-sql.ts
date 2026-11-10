/** Only append this projection for an authenticated finance manager. Never use it for collaborator/viewer lists. */
export const adminPayoutDestinationSql = `,(SELECT json_build_object('kind',p.kind,'provider',p.provider,'accountName',p.account_name,'accountNumber',p.account_number,'currency',p.currency)
  FROM redaction_rh.payout_methods p WHERE p.id=w.payout_method_id AND p.collaborator_id=w.collaborator_id
    AND p.currency=w.currency AND ((w.method='mobile_money' AND p.kind='mobile_money') OR (w.method='virement' AND p.kind='bank'))
  ) AS "payoutDestination"`;
