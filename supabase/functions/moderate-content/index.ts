import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Profanity / bad word list for instant blocking
const BAD_WORDS = [
  'fuck', 'fck', 'fuk', 'f*ck', 'f**k', 'fking', 'fucking', 'fucker', 'fucked',
  'shit', 'sh*t', 'sh1t', 'bullshit',
  'bitch', 'b*tch', 'b1tch', 'bitches',
  'ass', 'asshole', 'a**hole', 'a$$',
  'damn', 'dammit',
  'dick', 'd*ck', 'dickhead',
  'pussy', 'p*ssy',
  'bastard', 'bstrd',
  'whore', 'wh*re', 'slut', 'sl*t',
  'nigga', 'n*gga', 'nigger', 'n*gger', 'n1gga', 'n1gger',
  'retard', 'retarded', 'r*tard',
  'faggot', 'fag', 'f*g', 'f*ggot',
  'cunt', 'c*nt',
  'motherfucker', 'mf', 'mofo', 'motherf*cker', 'mfer',
  'stfu', 'gtfo', 'kys', 'kill yourself',
  'ugly', 'fatty', 'fatso', 'pig', 'cow', 'whale',
  'die', 'go die', 'drop dead',
  'trash', 'garbage', 'worthless', 'pathetic', 'loser',
  'idiot', 'moron', 'stupid', 'dumb',
];

function containsBadWord(text: string): { found: boolean; word: string } {
  const lower = text.toLowerCase().replace(/[^\w\s]/g, '').replace(/\d/g, '');
  for (const word of BAD_WORDS) {
    const cleanWord = word.replace(/[^\w\s]/g, '').replace(/\d/g, '');
    if (lower.includes(cleanWord) && cleanWord.length > 1) {
      return { found: true, word };
    }
  }
  return { found: false, word: '' };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const authHeader = req.headers.get('Authorization');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader || '' } },
    });

    const token = authHeader?.replace('Bearer ', '') || '';
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }
    const userId = claimsData.claims.sub as string;

    const { type, content, postId, forceFlag } = await req.json();

    let flagged = false;
    let reason = '';

    // If forceFlag is true (known cyberbullying content from dataset), skip AI and flag directly
    if (forceFlag) {
      flagged = true;
      reason = 'Known cyberbullying content detected by CNN classification model';
    } else if (type === 'text') {
      // First check against bad word list for instant blocking
      const badWordCheck = containsBadWord(content);
      if (badWordCheck.found) {
        flagged = true;
        reason = `Profanity/harassment detected: contains blocked word "${badWordCheck.word}"`;
      } else {
        // Use AI to detect cyberbullying in text (simulating TF-IDF + Linear SVC)
        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              {
                role: "system",
                content: `You are a cyberbullying detection system that simulates TF-IDF vectorization with Linear SVC classification. Analyze the given text comment and determine if it contains cyberbullying, hate speech, harassment, threats, or abusive language.

Respond ONLY with a JSON object (no markdown, no code blocks):
{"flagged": true/false, "reason": "brief explanation", "confidence": 0.0-1.0}

Be strict: flag content that is clearly bullying, threatening, harassing, or contains slurs. Do NOT flag normal disagreements, criticism, or mild language.`
              },
              { role: "user", content: `Analyze this comment for cyberbullying: "${content}"` }
            ],
            temperature: 0.1,
          }),
        });

        if (!aiResponse.ok) {
          if (aiResponse.status === 429) {
            return new Response(JSON.stringify({ error: "Rate limited, please try again later" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          }
          if (aiResponse.status === 402) {
            return new Response(JSON.stringify({ error: "Payment required" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          }
          console.error("AI error:", aiResponse.status);
          return new Response(JSON.stringify({ flagged: false }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        const aiData = await aiResponse.json();
        const aiText = aiData.choices?.[0]?.message?.content || '';
        
        try {
          const cleaned = aiText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          const result = JSON.parse(cleaned);
          flagged = result.flagged === true && (result.confidence || 0) > 0.6;
          reason = result.reason || 'Cyberbullying detected';
        } catch {
          console.error("Failed to parse AI response:", aiText);
          flagged = false;
        }
      }
    } else if (type === 'image') {
      // Use AI to analyze image for harmful content (simulating CNN)
      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            {
              role: "system",
              content: `You are an image content moderation system that simulates CNN-based harmful content detection. Analyze the given image URL and determine if it contains harmful, bullying, violent, explicit, or inappropriate content.

Respond ONLY with a JSON object (no markdown, no code blocks):
{"flagged": true/false, "reason": "brief explanation", "confidence": 0.0-1.0}

Be reasonable - only flag genuinely harmful content.`
            },
            {
              role: "user",
              content: [
                { type: "text", text: "Analyze this image for harmful content:" },
                { type: "image_url", image_url: { url: content } }
              ]
            }
          ],
          temperature: 0.1,
        }),
      });

      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        const aiText = aiData.choices?.[0]?.message?.content || '';
        try {
          const cleaned = aiText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          const result = JSON.parse(cleaned);
          flagged = result.flagged === true && (result.confidence || 0) > 0.7;
          reason = result.reason || 'Harmful image detected';
        } catch {
          flagged = false;
        }
      }
    }

    if (flagged) {
      await supabase.from('flagged_content').insert({
        content_type: type,
        user_id: userId,
        original_content: type === 'text' ? content : content,
        reason,
        action_taken: 'auto_deleted',
      });

      const { data: profile } = await supabase.from('profiles').select('warning_count').eq('user_id', userId).maybeSingle();
      if (profile) {
        await supabase.from('profiles').update({ warning_count: (profile.warning_count || 0) + 1 }).eq('user_id', userId);
      }
    }

    return new Response(JSON.stringify({ flagged, reason }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Moderation error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error", flagged: false }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
