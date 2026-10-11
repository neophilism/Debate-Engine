"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { authClient } from "../../lib/auth/client";

export default function SignInPage() {
  const [create,setCreate]=useState(false);
  const [busy,setBusy]=useState(false);
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [name,setName]=useState("");
  const [message,setMessage]=useState("");
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true);setMessage("");
    try {
      const result = create ?
        await authClient.signUp.email({email,password,name}) :
        await authClient.signIn.email({email,password});
      if (result.error) { setMessage(result.error.message || "Authentication failed."); return; }
      window.location.assign("/workspace");
    } catch {
      setMessage("Could not reach the authentication service.");
    } finally { setBusy(false); }
  }
  return <div className="interior-page auth-page">
    <p className="eyebrow dark">CANDIDATE WORKSPACE</p>
    <h1>{create ? "Create your" : "Welcome"}<br/><em>{create ? "account." : "back."}</em></h1>
    <p className="interior-lead">Candidate registration is not candidate verification. Only verified candidates can publish official debate contributions.</p>
    <form className="action-form" onSubmit={submit}>
      {create && <label>Display name<input autoComplete="name" required minLength={2} maxLength={160} value={name} onChange={e=>setName(e.target.value)}/></label>}
      <label>Email address<input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label>
      <label>Password<input type="password" autoComplete={create?"new-password":"current-password"} required minLength={12} value={password} onChange={e=>setPassword(e.target.value)}/></label>
      {message && <p role="alert" className="form-alert">{message}</p>}
      <button className="button button-dark" disabled={busy}>{busy?"Working…":create?"Create account →":"Sign in →"}</button>
    </form>
    <button className="link-button" onClick={()=>{setCreate(!create);setMessage("");}}>{create?"Already have an account? Sign in":"New here? Create an account"}</button>
    <p><Link href="/debates" className="inline-arrow">Return to public debates ↗</Link></p>
  </div>;
}
