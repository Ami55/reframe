export const runtime = "edge";

const sourceInsightSchema = {type:"object",additionalProperties:false,properties:{title:{type:"string"},url:{type:"string"},angle:{type:"string"},content_summary:{type:"string"},key_topics:{type:"array",items:{type:"string"}},entities:{type:"array",items:{type:"string"}},unique_insights:{type:"array",items:{type:"string"}},language_signals:{type:"array",items:{type:"string"}},evidence_types:{type:"array",items:{type:"string"}},content_gaps:{type:"array",items:{type:"string"}}},required:["title","url","angle","content_summary","key_topics","entities","unique_insights","language_signals","evidence_types","content_gaps"]};

const schema = {
  type: "object", additionalProperties: false,
  properties: {
    source: { type:"object", additionalProperties:false, properties:{title:{type:"string"},word_count:{type:"integer"},preserved_links:{type:"integer"},preserved_images:{type:"integer"}}, required:["title","word_count","preserved_links","preserved_images"] },
    strategy: { type:"object", additionalProperties:false, properties:{original_focus:{type:"string"},recommended_query:{type:"string"},search_intent:{type:"string"},rationale:{type:"string"}}, required:["original_focus","recommended_query","search_intent","rationale"] },
    research: { type:"object", additionalProperties:false, properties:{ai_overview_text:{type:"string"},ai_overview_references:{type:"array",items:sourceInsightSchema},organic_competitors:{type:"array",items:sourceInsightSchema},common_patterns:{type:"array",items:{type:"string"}},language_analysis:{type:"object",additionalProperties:false,properties:{tone:{type:"string"},structure:{type:"string"},vocabulary:{type:"string"},answer_style:{type:"string"}},required:["tone","structure","vocabulary","answer_style"]}}, required:["ai_overview_text","ai_overview_references","organic_competitors","common_patterns","language_analysis"] },
    gaps: { type:"object", additionalProperties:false, properties:{missing_topics:{type:"array",items:{type:"string"}},keep_from_original:{type:"array",items:{type:"string"}},opportunities:{type:"array",items:{type:"string"}}}, required:["missing_topics","keep_from_original","opportunities"] },
    outline: { type:"array",items:{type:"object",additionalProperties:false,properties:{heading:{type:"string"},purpose:{type:"string"}},required:["heading","purpose"]} },
    final: { type:"object",additionalProperties:false,properties:{title:{type:"string"},meta_title:{type:"string"},meta_description:{type:"string"},html:{type:"string"}},required:["title","meta_title","meta_description","html"] },
    qa: { type:"object",additionalProperties:false,properties:{overall_score:{type:"integer"},checks:{type:"array",items:{type:"object",additionalProperties:false,properties:{label:{type:"string"},status:{type:"string",enum:["pass","warning"]},note:{type:"string"}},required:["label","status","note"]}}},required:["overall_score","checks"] }
  }, required:["source","strategy","research","gaps","outline","final","qa"]
};

function outputText(data:any) {
  if (typeof data.output_text === "string") return data.output_text;
  for (const item of data.output || []) for (const content of item.content || []) if (content.type === "output_text") return content.text;
  return "";
}

const wait = (ms:number) => new Promise(resolve => setTimeout(resolve, ms));

async function runOpenAI(body:any, apiKey:string) {
  let response:Response | null = null;
  for (let attempt = 0; attempt < 4; attempt++) {
    response = await fetch("https://api.openai.com/v1/responses", { method:"POST", headers:{"Authorization":`Bearer ${apiKey}`,"Content-Type":"application/json"}, body:JSON.stringify(body) });
    if (response.ok || (response.status !== 429 && response.status < 500)) return response;
    if (attempt < 3) {
      const retryHeader = Number(response.headers.get("retry-after"));
      const delay = Number.isFinite(retryHeader) && retryHeader > 0 ? retryHeader * 1000 : [2500, 6000, 12000][attempt];
      await wait(delay);
    }
  }
  return response!;
}

export async function POST(request: Request) {
  try {
    const { source, value, assets } = await request.json();
    const apiKey = process.env.OPENAI_API_KEY;
    if (!value) return Response.json({error:"Add a source to refresh."},{status:400});
    if (!apiKey) return Response.json({error:"OPENAI_API_KEY is not configured on the server."},{status:500});
    const input = `SOURCE TYPE: ${source}\nSOURCE: ${String(value).slice(0,120000)}\n\nEXACT ORIGINAL IMAGE/LINK ASSET MANIFEST (may be empty):\n${String(assets || "").slice(0,60000)}`;
    const prompt = `You are the engine inside Reframe, a professional SEO content-refresh application. Complete the entire workflow in one run.\n\n1. Read the existing page/content carefully. For a URL, open and read the full article body—not merely its search snippet. For a public Google Sheet, inspect the first eligible content row.\n2. Infer its genuine topic and intent. Recommend a natural primary query based on intent and current search evidence; never invent search volume.\n3. Run a live Google-style search for that query. Identify the top 10 useful organic editorial competitors in ranking order. Exclude the source domain, Reddit, YouTube, Quora, forums, social networks, marketplaces, video-only pages, duplicates, and weak or irrelevant pages. Do not treat excluded results as competitors.\n4. Open and read the full main text of every retained organic competitor. Analyse topics and language: tone, sentence and paragraph patterns, heading structure, vocabulary/entities, direct-answer style, specificity, and information framing.\n5. Inspect the AI Overview separately. Capture and synthesize the answer text displayed above its citations. Collect every cited/reference URL, apply the same exclusions, open each retained reference, and read its full main text.\n6. Canonicalise URLs and deduplicate by destination page. If an AI Overview reference is already among the organic competitors, keep it only in organic_competitors and omit it from ai_overview_references. The latter must contain only unique additional AI Overview sources. Never count or display one source twice.\n7. Across all full texts, identify recurring angles, entities, questions, evidence patterns, and linguistic conventions. Compare them with the original and identify meaningful gaps. Separate consensus from one-source claims.\n8. Preserve the original's distinctive ideas, accurate facts, useful links, and image tags where available. Do not replace the brand's point of view with generic copy.\n9. Create an improved entity-rich outline, then write a complete polished article in semantic HTML. Preserve useful original links and images. Do not include html/body tags. Never fabricate facts; qualify uncertainty.\n10. Produce title, meta title (roughly 50–60 characters), meta description (roughly 140–160 characters), and quality checks. Return genuine direct URLs actually consulted. Make the final article substantive, readable, non-repetitive, and publish-ready.\n\n${input}`;
    const perSourceRequirements = `\n\nSEARCH MARKET: Treat the target SERP as United States, using Google.com and English-language search intent. Select and order organic competitors according to what is relevant for a US searcher. Do not accidentally localize the SERP to Canada or the server's physical location. International sources are allowed when they are genuinely useful for the topic, but the market and intent baseline remains US.\n\nPER-SOURCE EVIDENCE REQUIREMENT: For every organic competitor and unique AI Overview reference, report only findings supported by that page's full text: a concise content summary, 3–8 key topics, named entities (people, places, organizations, products, concepts), genuinely unique insights, observable language/format signals, evidence types used, and weaknesses or missing coverage. Do not copy large passages. Do not infer that a page contains something you did not observe. Keep each field concise so all sources fit in the response.`;
    const body:any = { model:"gpt-5.6-terra", reasoning:{effort:"medium"}, tools:[{type:"web_search_preview",user_location:{type:"approximate",country:"US"}}], tool_choice:"auto", input:prompt+perSourceRequirements, text:{format:{type:"json_schema",name:"content_refresh",strict:true,schema}}, max_output_tokens:18000 };
    const response = await runOpenAI(body, apiKey);
    const data:any = await response.json();
    if (!response.ok) return Response.json({error:data?.error?.message || "OpenAI could not complete the refresh."},{status:response.status});
    const text = outputText(data);
    if (!text) return Response.json({error:"The model completed without a usable article. Please run it again."},{status:502});
    return Response.json(JSON.parse(text));
  } catch (error) { return Response.json({error:error instanceof Error?error.message:"Unexpected refresh error."},{status:500}); }
}
