I found the latest assessment did call Langfuse twice and the function logged `Langfuse ingestion ok: 207`, so the issue is no longer that the function is missing credentials or failing to call Langfuse.

The likely problem is that `207` is a multi-status response: Langfuse can accept the HTTP request while rejecting individual events in the response body. The current code logs only the status and discards that body, so we cannot see whether `trace-create` or `generation-create` is being rejected.

Plan:
1. Update `supabase/functions/_shared/claude.ts` to log the Langfuse ingestion response body for `207` responses, without exposing secret values.
2. Add clearer trace metadata:
   - pass `functionName` from `assess-job` for both Claude calls
   - name the traces/generations distinctly, e.g. `assess-job.fit-assessment` and `assess-job.company-intel`
3. If the response body shows schema errors, adjust the payload to Langfuse’s expected ingestion format.
4. Redeploy the affected Edge Functions.
5. Trigger a small test call and confirm logs show either successful per-event ingestion or the exact Langfuse rejection reason.

No database changes are needed.