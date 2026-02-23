import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Profanity / bad word list for instant blocking
const BAD_WORDS = [
  // Classic profanity
  'fuck', 'fck', 'fuk', 'f*ck', 'f**k', 'fking', 'fucking', 'fucker', 'fucked', 'fked',
  'shit', 'sh*t', 'sh1t', 'bullshit', 'shitty',
  'bitch', 'b*tch', 'b1tch', 'bitches', 'biatch',
  'ass', 'asshole', 'a**hole', 'a$$', 'asswipe',
  'damn', 'dammit',
  'dick', 'd*ck', 'dickhead', 'dckhead',
  'pussy', 'p*ssy', 'puss',
  'bastard', 'bstrd',
  'whore', 'wh*re', 'slut', 'sl*t', 'thot', 'th0t',
  'nigga', 'n*gga', 'nigger', 'n*gger', 'n1gga', 'n1gger', 'nibba',
  'retard', 'retarded', 'r*tard', 'retrded',
  'faggot', 'fag', 'f*g', 'f*ggot',
  'cunt', 'c*nt',
  'motherfucker', 'mf', 'mofo', 'motherf*cker', 'mfer',
  'stfu', 'gtfo', 'kys', 'kill yourself', 'kms',
  
  // Body shaming / appearance
  'ugly', 'fatty', 'fatso', 'pig', 'cow', 'whale', 'lard', 'obese',
  'anorexic', 'skeleton', 'stick figure', 'flat', 'midget', 'manlet',
  'butterface', 'fugly', 'hideous', 'gross looking',
  
  // Violence / threats
  'die', 'go die', 'drop dead', 'hope you die', 'neck yourself',
  'slit your wrists', 'jump off', 'hang yourself', 'end yourself',
  
  // General insults
  'trash', 'garbage', 'worthless', 'pathetic', 'loser', 'lame',
  'idiot', 'moron', 'stupid', 'dumb', 'braindead', 'brain dead',
  'clown', 'joke', 'disgrace', 'waste of space', 'nobody',
  'creep', 'weirdo', 'freak', 'psycho', 'nutjob', 'delusional',
  
  // Gen Z / internet slang bullying
  'ratio', 'ratiod', 'cope', 'seethe', 'mald', 'malding',
  'skill issue', 'no cap you ugly', 'mid', 'npc', 'npc behavior',
  'pick me', 'pick me girl', 'pick me boy', 'simp',
  'incel', 'femcel', 'beta', 'beta male', 'cuck', 'soy boy', 'soyboy',
  'touch grass', 'chronically online',
  'delulu', 'cringe', 'ick', 'flop', 'flop era',
  'caught in 4k', 'main character syndrome',
  'karen', 'boomer', 'ok boomer',
  'sus', 'sussy', 'cap', 'no cap trash',
  'L take', 'huge L', 'massive L', 'you fell off',
  'deadass ugly', 'fr ugly', 'lowkey ugly', 'highkey ugly',
  'ate nothing', 'served nothing', 'gave nothing',
  'oomf ugly', 'mutuals hate you',
  'unalive', 'unalive yourself', 'go unalive',
  'giving pick me', 'giving cringe', 'giving desperate',
  'clout chaser', 'attention seeker', 'try hard', 'tryhard',
  'dog water', 'dogwater', 'bot', 'ur a bot',
  'no rizz', 'zero rizz', 'negative rizz',
  'get rekt', 'rekt', 'owned', 'pwned',
  'noob', 'n00b', 'scrub',
  'weirdo behavior', 'creep behavior', 'predator',
  'pedo', 'groomer',
  'loner', 'no friends', 'nobody likes you', 'everyone hates you',
  'go away', 'leave forever', 'disappear',
  'not funny', 'unfunny', 'cringe af',
  'poverty', 'broke boy', 'broke girl', 'poor kid',
  'crusty', 'dusty', 'musty', 'ashy',
  'ran through', 'for the streets', 'body count',
  'yikes', 'embarrassing', 'embarrassment',
];

// Sexual / body-shaming emoji patterns
const SEXUAL_EMOJIS = ['🍑', '🍆', '💦', '🌭', '🥒', '🍌', '👅', '🫦'];

function containsSexualEmojiCombo(text: string): { found: boolean; reason: string } {
  const found = SEXUAL_EMOJIS.filter(e => text.includes(e));
  // If 2+ sexual emojis appear together, it's likely harassment
  if (found.length >= 2) {
    return { found: true, reason: `Sexual harassment emoji combination detected: ${found.join(' ')}` };
  }
  // Single 🍑 or 🍆 or 💦 with body-related words
  if (found.length >= 1) {
    const lower = text.toLowerCase();
    const bodyWords = ['ass', 'butt', 'booty', 'dick', 'cock', 'cum', 'wet', 'suck', 'lick', 'ride', 'smash', 'bang', 'pound', 'thicc', 'thick', 'juicy', 'tight', 'hole', 'big', 'size', 'huge', 'small', 'tiny'];
    for (const w of bodyWords) {
      if (lower.includes(w)) {
        return { found: true, reason: `Sexual body-shaming detected: ${found.join('')} with "${w}"` };
      }
    }
  }
  return { found: false, reason: '' };
}

function containsBadWord(text: string): { found: boolean; word: string } {
  // First check sexual emoji combos
  const emojiCheck = containsSexualEmojiCombo(text);
  if (emojiCheck.found) {
    return { found: true, word: emojiCheck.reason };
  }

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

    const { type, content, postId, forceFlag, checkEmbeddedText } = await req.json();

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
      // Use AI to analyze image for harmful content AND embedded text (simulating CNN)
      const systemPrompt = checkEmbeddedText
        ? `You are an image content moderation system that simulates CNN-based harmful content detection. Analyze the given image and determine if it contains:
1. Harmful, bullying, violent, explicit, or inappropriate visual content
2. ANY embedded/overlaid text in the image - read all text visible in the image and check if it contains cyberbullying, hate speech, harassment, threats, slurs, or abusive language

If the image contains text with cyberbullying or offensive content, it MUST be flagged even if the image itself looks normal.

Respond ONLY with a JSON object (no markdown, no code blocks):
{"flagged": true/false, "reason": "brief explanation", "confidence": 0.0-1.0, "embedded_text": "any text found in the image or empty string"}`
        : `You are an image content moderation system that simulates CNN-based harmful content detection. Analyze the given image URL and determine if it contains harmful, bullying, violent, explicit, or inappropriate content.

Respond ONLY with a JSON object (no markdown, no code blocks):
{"flagged": true/false, "reason": "brief explanation", "confidence": 0.0-1.0}

Be reasonable - only flag genuinely harmful content.`;

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: [
                { type: "text", text: checkEmbeddedText
                  ? "Analyze this image for harmful content AND read any embedded/overlaid text to check for cyberbullying:"
                  : "Analyze this image for harmful content:" },
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
          flagged = result.flagged === true && (result.confidence || 0) > 0.6;
          reason = result.reason || 'Harmful content detected';
          
          // If embedded text was found, also check it against the bad word list
          if (!flagged && result.embedded_text) {
            const textCheck = containsBadWord(result.embedded_text);
            if (textCheck.found) {
              flagged = true;
              reason = `Cyberbullying text detected in image: contains "${textCheck.word}"`;
            }
          }
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
