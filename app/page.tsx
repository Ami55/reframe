"use client";

import { useState } from "react";

type SourceType = "url" | "sheet" | "html" | "text";
type ChatMessage = { role: "user" | "assistant"; text: string };
type SourceInsight = { title:string; url:string; angle:string; content_summary:string; key_topics:string[]; entities:string[]; unique_insights:string[]; language_signals:string[]; evidence_types:string[]; content_gaps:string[] };
type Result = {
  source: { title: string; word_count: number; preserved_links: number; preserved_images: number };
  strategy: { original_focus: string; recommended_query: string; search_intent: string; rationale: string };
  research: { ai_overview_text: string; ai_overview_references: SourceInsight[]; organic_competitors: SourceInsight[]; common_patterns: string[]; language_analysis: { tone: string; structure: string; vocabulary: string; answer_style: string } };
  gaps: { missing_topics: string[]; keep_from_original: string[]; opportunities: string[] };
  outline: { heading: string; purpose: string }[];
  final: { title: string; meta_title: string; meta_description: string; html: string };
  qa: { overall_score: number; checks: { label: string; status: "pass" | "warning"; note: string }[] };
};

const steps = [
  ["01", "Understand", "Read the existing article and identify its real search intent."],
  ["02", "Research", "Review the search landscape, AI answers and useful competitor sources."],
  ["03", "Reframe", "Find content gaps without losing the original article’s strongest ideas."],
  ["04", "Refresh", "Rewrite, quality-check and return clean, publish-ready content."],
];

const progressLabels = ["Reading source", "Finding search focus", "Researching competitors", "Analysing content gaps", "Building the outline", "Rewriting the article", "Running quality checks"];

export default function Home() {
  const [source, setSource] = useState<SourceType>("url");
  const [value, setValue] = useState("");
  const [assetValue, setAssetValue] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("strategy");
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [revising, setRevising] = useState(false);

  function changeSource(next: SourceType) {
    setSource(next); setValue(""); setAssetValue(""); setResult(null); setError(""); setChatMessages([]);
  }

  async function startRefresh() {
    if (!value.trim() || !apiKey.trim() || running) return;
    setRunning(true); setResult(null); setError(""); setProgress(0);
    let marker = 0;
    const timer = window.setInterval(() => { marker = Math.min(marker + 1, 5); setProgress(marker); }, 7000);
    try {
      const response = await fetch("/api/refresh", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ source, value, assets:assetValue, apiKey }) });
      const data = await response.json();
      if (!response.ok) throw new Error(response.status === 429 ? "The API is still busy after automatic retries. Wait one minute and click Run full refresh again." : data.error || "The refresh could not be completed.");
      setProgress(6); setResult(data); setTab("strategy"); setChatMessages([]);
      window.setTimeout(() => document.getElementById("results")?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The refresh could not be completed.");
    } finally { window.clearInterval(timer); setRunning(false); }
  }

  async function copyHtml() { if (result) await navigator.clipboard.writeText(result.final.html); }
  async function reviseArticle() {
    const instruction = chatInput.trim();
    if (!instruction || !result || revising) return;
    setChatInput(""); setChatMessages(items=>[...items,{role:"user",text:instruction}]); setRevising(true);
    try {
      const response = await fetch("/api/revise", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({apiKey,instruction,final:result.final,context:{query:result.strategy.recommended_query,outline:result.outline,gaps:result.gaps},history:chatMessages.slice(-6)})});
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "The edit could not be applied.");
      setResult(current=>current?{...current,final:data.final}:current);
      setChatMessages(items=>[...items,{role:"assistant",text:data.summary}]);
    } catch (caught) { setChatMessages(items=>[...items,{role:"assistant",text:caught instanceof Error?caught.message:"The edit could not be applied."}]); }
    finally { setRevising(false); }
  }
  function downloadHtml() {
    if (!result) return;
    const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([result.final.html], { type: "text/html" }));
    link.download = "refreshed-article.html"; link.click(); URL.revokeObjectURL(link.href);
  }

  const fieldLabel = source === "url" ? "Blog post URL" : source === "sheet" ? "Google Sheet URL" : source === "html" ? "Article HTML" : "Article text";
  const placeholder = source === "url" ? "https://example.com/blog/article" : source === "sheet" ? "Paste a publicly accessible Google Sheet link" : source === "html" ? "Paste your existing HTML here…" : "Paste your article text here…";

  return <main>
    <header className="site-header"><a className="logo" href="#top"><span>SEO</span><b>Girl</b></a><nav><a href="#workflow">How it works</a><a href="#start">New refresh</a></nav></header>
    <section className="hero" id="top"><div className="hero-pill"><i /> SEO STRATEGY × AI CONTENT SYSTEMS</div><h1>Refresh what you have.<br/><span>Make it worth finding.</span></h1><p>A focused workspace for researching, improving and rewriting existing blog content—without losing the ideas, links and images that already make it yours.</p><a className="hero-cta" href="#start">Start a content refresh</a></section>

    <section className="start-card" id="start">
      <div className="start-heading"><div><small>START HERE</small><h2>What are we refreshing?</h2></div><div className="setting-badges"><span className="market-note">US · Google.com · English</span><span className="private-note">● Your work stays private</span></div></div>
      <div className="source-tabs" role="tablist">
        {([['url','Single URL'],['sheet','Google Sheet'],['html','Paste HTML'],['text','Paste Text']] as [SourceType,string][]).map(([id,label]) => <button key={id} role="tab" aria-selected={source===id} className={source===id?'active':''} onClick={()=>changeSource(id)}>{label}</button>)}
      </div>
      <label className="source-field"><span>{fieldLabel}</span>{source === "html" || source === "text" ? <textarea value={value} onChange={e=>setValue(e.target.value)} placeholder={placeholder} rows={7}/> : <input type="url" value={value} onChange={e=>setValue(e.target.value)} placeholder={placeholder}/>}</label>
      {source==="url"&&<details className="asset-fallback"><summary>Need to preserve images from a protected page?</summary><p>Some sites hide image URLs from research tools. Paste the article’s image tags, CDN URLs, or CMS HTML here and Reframe will carry them into the refreshed article.</p><textarea value={assetValue} onChange={e=>setAssetValue(e.target.value)} placeholder={'<img src="https://…" alt="…">\n—or paste the existing CMS HTML—'} rows={5}/></details>}
      <div className="key-row">
        <div><strong>OpenAI API key</strong><small>Required to run research and rewriting. Used for this request only and never stored.</small></div>
        <div className="key-input"><input type={showKey?"text":"password"} value={apiKey} onChange={e=>setApiKey(e.target.value)} placeholder="sk-…" autoComplete="off"/><button onClick={()=>setShowKey(!showKey)} type="button">{showKey?"Hide":"Show"}</button></div>
      </div>
      <div className="start-footer"><p>A full refresh can take a few minutes. Temporary API limits are retried automatically.</p><button disabled={!value.trim()||!apiKey.trim()||running} onClick={startRefresh}>{running?"Refreshing…":"Run full refresh"}</button></div>
      {error && <div className="error-notice"><b>!</b><span><strong>Refresh stopped</strong>{error}</span></div>}
    </section>

    {running && <section className="run-panel" aria-live="polite"><div className="run-head"><div><small>REFRESH IN PROGRESS</small><h2>{progressLabels[progress]}</h2></div><span>{progress+1} / {progressLabels.length}</span></div><div className="progress-track"><i style={{width:`${((progress+1)/progressLabels.length)*100}%`}}/></div><div className="progress-list">{progressLabels.map((label,index)=><div key={label} className={index<progress?'done':index===progress?'active':''}><b>{index<progress?'✓':String(index+1).padStart(2,'0')}</b><span>{label}</span></div>)}</div></section>}

    {result && <section className="results" id="results">
      <div className="result-summary"><div><small>REFRESH COMPLETE</small><h2>{result.final.title}</h2><p>{result.source.word_count.toLocaleString()} original words · {result.source.preserved_links} links · {result.source.preserved_images} images found</p></div><div className="score"><b>{result.qa.overall_score}</b><span>Quality score</span></div></div>
      <div className="result-tabs">{[["strategy","Search focus"],["research","Research"],["gaps","Content gaps"],["outline","New outline"],["final","Final article"],["qa","Quality check"]].map(([id,label])=><button key={id} className={tab===id?'active':''} onClick={()=>setTab(id)}>{label}</button>)}</div>
      <div className="result-body">
        {tab==="strategy" && <div className="strategy-grid"><article><small>ORIGINAL FOCUS</small><h3>{result.strategy.original_focus}</h3></article><article className="featured"><small>RECOMMENDED QUERY</small><h3>{result.strategy.recommended_query}</h3><span>{result.strategy.search_intent}</span></article><p className="rationale">{result.strategy.rationale}</p></div>}
        {tab==="research" && <><div className="overview"><small>AI OVERVIEW — ANSWER TEXT</small><p>{result.research.ai_overview_text}</p></div><h3>Cross-source content patterns</h3><ul className="chips">{result.research.common_patterns.map(x=><li key={x}>{x}</li>)}</ul><h3>Linguistic analysis across the full texts</h3><div className="language-grid"><article><small>TONE</small><p>{result.research.language_analysis.tone}</p></article><article><small>STRUCTURE</small><p>{result.research.language_analysis.structure}</p></article><article><small>VOCABULARY &amp; ENTITIES</small><p>{result.research.language_analysis.vocabulary}</p></article><article><small>ANSWER STYLE</small><p>{result.research.language_analysis.answer_style}</p></article></div><h3>Top 10 organic competitors</h3><div className="competitors">{result.research.organic_competitors.map((x,i)=><SourceCard key={x.url} item={x} index={i}/>)}</div><h3>Unique AI Overview references</h3><p className="source-note">AI Overview references that duplicate an organic competitor—or come from an excluded platform—are removed.</p><div className="competitors ai-sources">{result.research.ai_overview_references.map((x,i)=><SourceCard key={x.url} item={x} index={i}/>)}</div></>}
        {tab==="gaps" && <div className="three-columns"><List title="Missing topics" items={result.gaps.missing_topics}/><List title="Keep from original" items={result.gaps.keep_from_original}/><List title="Opportunities" items={result.gaps.opportunities}/></div>}
        {tab==="outline" && <div className="outline-list">{result.outline.map((x,i)=><article key={i}><b>{String(i+1).padStart(2,'0')}</b><div><h3>{x.heading}</h3><p>{x.purpose}</p></div></article>)}</div>}
        {tab==="final" && <><div className="editor-layout"><div className="final-document"><div className="meta-card"><label>Title<input value={result.final.title} readOnly/></label><label>Meta title<input value={result.final.meta_title} readOnly/></label><label>Meta description<textarea value={result.final.meta_description} readOnly/></label></div><div className="final-actions"><button onClick={copyHtml}>Copy HTML</button><button className="secondary" onClick={downloadHtml}>Download HTML</button></div><div className="article-preview" dangerouslySetInnerHTML={{__html:result.final.html}}/></div><aside className="revision-chat"><div className="chat-heading"><small>EDIT WITH AI</small><h3>What should I change?</h3><p>Ask for a specific edit. Research, links and images stay intact unless you say otherwise.</p></div><div className="chat-messages">{chatMessages.length===0?<div className="chat-empty">Try: “Make the introduction shorter and more direct.”</div>:chatMessages.map((message,index)=><div key={index} className={`chat-message ${message.role}`}>{message.text}</div>)}{revising&&<div className="chat-message assistant typing">Applying your edit…</div>}</div><div className="chat-compose"><textarea value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();reviseArticle()}}} placeholder="Tell me what to change…" rows={4}/><button onClick={reviseArticle} disabled={!chatInput.trim()||revising}>{revising?"Editing…":"Apply change"}</button></div></aside></div></>}
        {tab==="qa" && <div className="qa-list">{result.qa.checks.map(x=><article key={x.label}><b className={x.status}>{x.status==='pass'?'✓':'!'}</b><div><h3>{x.label}</h3><p>{x.note}</p></div></article>)}</div>}
      </div>
    </section>}

    <section className="workflow" id="workflow"><div className="section-intro"><small>THE WORKFLOW</small><h2>From existing post to<br/><span>better answer.</span></h2></div><div className="step-grid">{steps.map(([n,t,d])=><article key={n}><span>{n}</span><h3>{t}</h3><p>{d}</p></article>)}</div></section>
    <footer className="site-footer"><div className="footer-logo"><span>SEO</span><b>Girl</b><small>CONTENT REFRESH STUDIO</small></div><div className="legal"><span>© 2026 Reframe. Developed by Ami - SEO Girl. All rights reserved.</span></div></footer>
  </main>;
}

function List({title,items}:{title:string;items:string[]}) { return <article><h3>{title}</h3><ul>{items.map(x=><li key={x}>{x}</li>)}</ul></article> }
function SourceCard({item,index}:{item:SourceInsight;index:number}) { return <details className="source-card"><summary><b>{String(index+1).padStart(2,'0')}</b><div><strong>{item.title}</strong><span>{item.angle}</span></div><i>View findings</i></summary><div className="source-findings"><p>{item.content_summary}</p><Insight title="Key topics" items={item.key_topics}/><Insight title="Entities" items={item.entities}/><Insight title="Unique insights" items={item.unique_insights}/><Insight title="Language signals" items={item.language_signals}/><Insight title="Evidence used" items={item.evidence_types}/><Insight title="Weaknesses / gaps" items={item.content_gaps}/><a href={item.url} target="_blank" rel="noreferrer">Open source</a></div></details> }
function Insight({title,items}:{title:string;items:string[]}) { return <div className="insight"><strong>{title}</strong><ul>{items.map(item=><li key={item}>{item}</li>)}</ul></div> }
