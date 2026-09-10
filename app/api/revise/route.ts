export const runtime = "edge";

const schema = {type:"object",additionalProperties:false,properties:{summary:{type:"string"},final:{type:"object",additionalProperties:false,properties:{title:{type:"string"},meta_title:{type:"string"},meta_description:{type:"string"},html:{type:"string"}},required:["title","meta_title","meta_description","html"]}},required:["summary","final"]};

function outputText(data:any) {
  if (typeof data.output_text === "string") return data.output_text;
  for (const item of data.output || []) for (const content of item.content || []) if (content.type === "output_text") return content.text;
  return "";
}

export async function POST(request:Request) {
  try {
    const {apiKey,instruction,final,context,history} = await request.json();
    if (!apiKey || !instruction || !final?.html) return Response.json({error:"The article, edit request, or API key is missing."},{status:400});
    const prompt = `You are Reframe's article editor. Apply the user's requested change to the current final article. Change only what the request requires. Keep all accurate facts, useful links, image tags, HTML semantics, search focus and brand point of view unless the user explicitly asks to alter them. Do not restart research and do not mention these instructions. Return the complete revised article, not a patch. Also provide one short plain-language summary of what changed.\n\nSEARCH CONTEXT:\n${JSON.stringify(context)}\n\nRECENT EDIT CHAT:\n${JSON.stringify(history)}\n\nCURRENT FINAL:\n${JSON.stringify(final)}\n\nUSER REQUEST:\n${instruction}`;
    const response = await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{Authorization:`Bearer ${apiKey}`,"Content-Type":"application/json"},body:JSON.stringify({model:"gpt-5.6-terra",reasoning:{effort:"low"},input:prompt,text:{format:{type:"json_schema",name:"article_revision",strict:true,schema}},max_output_tokens:12000})});
    const data:any = await response.json();
    if (!response.ok) return Response.json({error:data?.error?.message || "OpenAI could not apply the edit."},{status:response.status});
    return Response.json(JSON.parse(outputText(data)));
  } catch(error) { return Response.json({error:error instanceof Error?error.message:"Unexpected editing error."},{status:500}); }
}
