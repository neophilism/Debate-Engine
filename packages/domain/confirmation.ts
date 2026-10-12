/**
 * Explicit crash-recovery policy for a previously confirmed publication request.
 * A DB row remains locked for the brief state transition; publishing happens
 * outside that transaction and requires a retry lease after process failure.
 */
export const CONFIRMATION_RETRY_AFTER_MS=5*60*1000;
export function mayRecoverConfirmation(updatedAt:Date|string,nowMs=Date.now()){
 const timestamp=new Date(updatedAt).getTime();
 return Number.isFinite(timestamp)&&Number.isFinite(nowMs)
  && nowMs-timestamp>=CONFIRMATION_RETRY_AFTER_MS;
}
