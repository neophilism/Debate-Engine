/** Pure browser provenance policy for cookie-authenticated mutations. */
export function isTrustedMutationOrigin(input:{
 origin:string|null;host:string|null;forwardedHost:string|null;forwardedProto:string|null;
 canonicalOrigin?:string|null;environment?:string
}){
 const {origin,host,forwardedHost,forwardedProto,canonicalOrigin,environment}=input;
 if(!origin||!host)return false;
 if(/[, \t\r\n]/.test(origin)||/[, \t\r\n]/.test(host)||!/^[a-zA-Z0-9.-]+(?::[0-9]{1,5})?$/.test(host))
  return false;
 let actual:URL;
 try{actual=new URL(origin)}catch{return false}
 if(actual.username||actual.password||actual.pathname!=="/"||actual.search||actual.hash||
    !["https:","http:"].includes(actual.protocol))return false;
 const local=actual.hostname==="localhost"||actual.hostname==="127.0.0.1";
 if(actual.protocol!=="https:"&&!(environment!=="production"&&local))return false;
 if(canonicalOrigin){
  let canonical:URL;
  try{canonical=new URL(canonicalOrigin)}catch{return false}
  if(canonical.origin!==actual.origin||canonical.protocol!=="https:")return false;
 }
 // Neither a client-injected forward header nor a comma-separated proxy chain
 // may authorize writes from a foreign origin.
 if(forwardedHost&&(/[, \t\r\n]/.test(forwardedHost)||forwardedHost!==host))return false;
 if(forwardedProto&&(forwardedProto!=="https"&&forwardedProto!=="http"||
   forwardedProto==="https"&&actual.protocol!=="https:"||
   forwardedProto==="http"&&actual.protocol!=="http:"))return false;
 return actual.host.toLowerCase()===host.toLowerCase();
}
