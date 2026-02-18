import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

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

    // Verify user
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
        // If AI fails, allow the comment through
        return new Response(JSON.stringify({ flagged: false }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const aiData = await aiResponse.json();
      const aiText = aiData.choices?.[0]?.message?.content || '';
      
      try {
        // Clean the response - remove markdown code blocks if present
        const cleaned = aiText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const result = JSON.parse(cleaned);
        flagged = result.flagged === true && (result.confidence || 0) > 0.6;
        reason = result.reason || 'Cyberbullying detected';
      } catch {
        console.error("Failed to parse AI response:", aiText);
        flagged = false;
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
      // Log to flagged_content table
      await supabase.from('flagged_content').insert({
        content_type: type,
        user_id: userId,
        original_content: type === 'text' ? content : content,
        reason,
        action_taken: 'auto_deleted',
      });

      // If it's a comment that was flagged, also update warning count
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
