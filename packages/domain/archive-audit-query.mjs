/** Stable, publication-bounded keyset pagination for all retained public objects. */
export function auditPageQuery({asOf,cursor,limit}){
 if(!(asOf instanceof Date)||!Number.isFinite(asOf.valueOf()))throw Error("Invalid audit snapshot time");
 if(!Number.isInteger(limit)||limit<1||limit>501)throw Error("Invalid audit page size");
 if(cursor && (!(cursor.time instanceof Date)||!Number.isFinite(cursor.time.valueOf())||
    typeof cursor.kind!=="string"||typeof cursor.id!=="string"))
  throw Error("Invalid archival cursor");
 return {
  text:`WITH all_sources AS (
    SELECT 'media'::text AS kind,m.id::text AS id,m.storage_key,
      m.original_sha256::text AS sha256,m.size_bytes::bigint AS size_bytes,m.created_at AS activity_at
    FROM media_assets m JOIN submissions s ON s.media_asset_id=m.id JOIN debates d ON d.id=s.debate_id
    WHERE s.published_at IS NOT NULL AND d.status='published'
    UNION ALL
    SELECT 'document'::text,doc.id::text,doc.storage_key,doc.sha256::text,doc.size_bytes::bigint,doc.published_at
    FROM submission_documents doc JOIN submissions s ON s.id=doc.submission_id JOIN debates d ON d.id=s.debate_id
    WHERE s.published_at IS NOT NULL AND d.status='published'
    UNION ALL
    SELECT 'released_summary'::text,a.id::text,a.rendered_storage_key,a.output_sha256::text,
      NULL::bigint,a.rendered_at
    FROM derivative_artifacts a WHERE a.status='released' AND a.rendered_storage_key IS NOT NULL
   )
   SELECT kind,id,storage_key,sha256,size_bytes::text AS bytes,
     COALESCE(activity_at,'1970-01-01T00:00:00Z'::timestamptz) AS audit_sort_time
   FROM all_sources
   WHERE COALESCE(activity_at,'1970-01-01T00:00:00Z'::timestamptz)<=$1::timestamptz
     AND ($2::timestamptz IS NULL OR
       (COALESCE(activity_at,'1970-01-01T00:00:00Z'::timestamptz),kind,id)<($2::timestamptz,$3::text,$4::text))
   ORDER BY audit_sort_time DESC,kind DESC,id DESC LIMIT $5`,
  values:[asOf,cursor?.time??null,cursor?.kind??null,cursor?.id??null,limit]
 };
}
