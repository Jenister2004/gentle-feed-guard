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
  
  // Body shaming / DIRECT personal attacks only
  'fatty', 'fatso', 'whale', 'lard',
  'anorexic', 'skeleton', 'midget', 'manlet',
  'butterface', 'fugly', 'gross looking',
  
  // Violence / threats
  'die', 'go die', 'drop dead', 'hope you die', 'neck yourself',
  'slit your wrists', 'jump off', 'hang yourself', 'end yourself',
  
  // Direct personal insults (clear attacks, not opinions)
  'worthless', 'waste of space',
  'braindead', 'brain dead',
  'psycho', 'nutjob',
  
  // Gen Z / internet slang - ONLY clearly targeted bullying
  'no cap you ugly', 'npc behavior',
  'incel', 'femcel', 'beta male', 'cuck', 'soy boy', 'soyboy',
  'deadass ugly', 'fr ugly', 'lowkey ugly', 'highkey ugly',
  'oomf ugly', 'mutuals hate you',
  'unalive', 'unalive yourself', 'go unalive',
  'dog water', 'dogwater',
  'weirdo behavior', 'creep behavior', 'predator',
  'pedo', 'groomer',
  'nobody likes you', 'everyone hates you',
  'ran through', 'for the streets',
  'poverty', 'broke boy', 'broke girl', 'poor kid',

  // Malayalam bad words and insults
  'thendi', 'thevidiya', 'patti', 'myru', 'myran', 'thayoli',
  'kunna', 'pooru', 'poorimone', 'pannimone', 'thallayoli',
  'kundichori', 'vedi', 'vediya', 'myre', 'poda', 'podi',
  'kandaroli', 'oombu', 'oombikko', 'chekkan', 'kuntham',
  'nayinte mone', 'nayinte mol', 'panni', 'paraya',
  'enthada thendi', 'poda patti', 'po myre', 'nee oru thendi',
  'mandan', 'mandathi', 'kootha', 'koothi', 'sunni',
  'kundan', 'thayyoli mone', 'poorimol', 'thevadiya mone',
  'cheriya kunna', 'valiya kunna', 'kunna illa',
  // Malayalam transliteration variants
  'myirr', 'mairu', 'mairan', 'thayolee', 'thevdiya',
  'poori', 'poorimon', 'pannimon', 'thalayoli',
  'vediyan', 'vedichi', 'oomban', 'koothichi',

  // Hindi bad words and insults
  'bhenchod', 'behenchod', 'bhen chod', 'bc', 'bsdk', 'bhosdike', 'bhosdiwale',
  'madarchod', 'maderchod', 'mc', 'maachod',
  'chutiya', 'chutiye', 'chu*iya', 'chut', 'ch*t',
  'gaandu', 'gandu', 'g*ndu', 'gaand', 'gand',
  'lodu', 'laude', 'lavde', 'lund', 'l*nd', 'lundure',
  'randi', 'raand', 'r*ndi', 'randwa',
  'harami', 'haramkhor', 'haram', 'haraamzada', 'haramzadi',
  'kutte', 'kutta', 'kutiya', 'kutia', 'kuttiya',
  'suar', 'suwar', 'suar ki aulad',
  'tatti', 'tatte', 'tattiyan',
  'jhatu', 'jhaatu', 'jhant',
  'chakka', 'hijra', 'meetha',
  'dalle', 'dallal',
  'ullu ka pattha', 'gadha', 'bewakoof', 'nalayak',
  'kamina', 'kameena', 'kameeni', 'kamini',
  'saala', 'saali', 'sala', 'sali',
  'chodu', 'chodna', 'chod de',
  'maa ki', 'teri maa', 'teri behen',

  // Tamil bad words and insults
  'thevdiya', 'thevdiya paiyan', 'thevdiya paiya',
  'otha', 'oombu', 'oombuda', 'oombi',
  'punda', 'pundai', 'pundek', 'pundamavan',
  'sunni', 'sunniya', 'sunni oombu',
  'baadu', 'baadva', 'loosu', 'loosu payale',
  'koothi', 'koothia', 'koothi magane',
  'mayiru', 'mayirudane', 'mayir', 'naaye',
  'enna da', 'poda', 'podaa', 'podi', 'podii',
  'thayoli', 'thaaiyoli', 'thaiyoli',
  'vesai', 'vesa', 'vesham',
  'kena', 'kenathanamaada', 'kenapayale',
  'gommale', 'molai', 'sappi',
  'oombu da', 'soothu', 'soothula',
  'thevadiya mavan', 'lavadai',

  // Telugu bad words and insults
  'dengey', 'dengu', 'dengulata', 'dengava',
  'lanja', 'lanjodka', 'lanja kodaka', 'lanjedi',
  'pooku', 'pookulo', 'puku',
  'modda', 'moddalo', 'modda guddu',
  'gudda', 'guddha', 'guddhalo',
  'sulli', 'sulla',
  'donga', 'dongala', 'denga',
  'bokka', 'bokkalo',
  'nee amma', 'nee ayya', 'nee abba',
  'erri puka', 'erri pooku', 'erripook',
  'lanjakodaka', 'lanjakoduku',
  'nakodaka', 'na kodaka',
  'poyi denguko', 'denginchuko',
  'kukka', 'kukka na kodaka',
  'pichi', 'pichi puka', 'nee bondha',
];

// Sexual / body-shaming emoji patterns
const SEXUAL_EMOJIS = ['🍑', '🍆', '💦', '🌭', '🥒', '🍌', '👅', '🫦'];

// Only flag emoji combos when there's NO innocent text context
// e.g. "🍑🍆💦" alone = flag, but "nice peach smoothie 🍑" = allow
function containsSexualEmojiCombo(text: string): { found: boolean; reason: string } {
  const found = SEXUAL_EMOJIS.filter(e => text.includes(e));
  
  // 3+ sexual emojis together is almost always harassment
  if (found.length >= 3) {
    return { found: true, reason: `Sexual harassment emoji combination detected: ${found.join(' ')}` };
  }
  
  // For 1-2 emojis, DON'T auto-flag — let the AI analyze context instead
  // This allows "nice food 🍆" or "you are cute 🌶️" to pass through
  return { found: false, reason: '' };
}

function containsBadWord(text: string): { found: boolean; word: string } {
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

    // Check if user is banned
    const { data: userProfile } = await supabase.from('profiles').select('is_banned, is_suspended').eq('user_id', userId).maybeSingle();
    if (userProfile?.is_banned) {
      return new Response(JSON.stringify({ error: 'Your account has been banned. You cannot post content.', banned: true }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (userProfile?.is_suspended) {
      return new Response(JSON.stringify({ error: 'Your account is suspended. You cannot post content.', suspended: true }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { type, content, postId, forceFlag, checkEmbeddedText } = await req.json();

    let flagged = false;
    let reason = '';

    if (forceFlag) {
      flagged = true;
      reason = 'Known cyberbullying content detected by CNN classification model';
    } else if (type === 'text') {
      const badWordCheck = containsBadWord(content);
      if (badWordCheck.found) {
        flagged = true;
        reason = `Profanity/harassment detected: contains blocked word "${badWordCheck.word}"`;
      } else {
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
                content: `You are a cyberbullying detection system for a social media platform. You MUST analyze the FULL CONTEXT of messages — including text + emojis TOGETHER — to determine intent.

=== EMOJI CONTEXT RULES (CRITICAL) ===
Emojis change meaning based on surrounding text. You must read the ENTIRE message to understand intent:

ALLOW (emojis used innocently / as compliments / food context):
- "you are cute 🌶️" → compliment + random emoji = ALLOW
- "nice cooking 🍆🍑" → food context = ALLOW  
- "looking fire today 🔥🌶️" → compliment = ALLOW
- "great smoothie recipe 🍌🍑" → food context = ALLOW
- "you're sweet 💦" → compliment = ALLOW
- "this food looks amazing 🍆" → food context = ALLOW
- "spicy outfit 🌶️" → fashion compliment = ALLOW
- Random standalone emojis without sexual text = ALLOW
- "❤️🔥💯" → positive emojis = ALLOW

BLOCK (emojis used to harass / sexualize / bully):
- "you are hot 🌶️" → sexualizing a person = BLOCK
- "sit on my 🍆" → sexual harassment = BLOCK
- "nice 🍑" (commenting on someone's body) → body objectification = BLOCK
- "I want your 💦" → sexual = BLOCK
- "🍆🍑💦" (just emojis, clearly sexual combo) → BLOCK
- "send me 🍑 pics" → sexual request = BLOCK
- "you make me 💦" → sexual = BLOCK
- "ride my 🌭" → sexual = BLOCK

=== TEXT RULES ===
ALLOW these (opinions/feedback about the photo or content):
- "this photo sucks" — opinion about the photo
- "you'd look better from that angle" — constructive suggestion  
- "wear a black dress, it would suit you" — fashion advice
- "not your best photo" — mild opinion
- "mid photo tbh" — slang opinion
- "this ain't it" — casual disapproval

ALLOW these (supportive / helpful mentions of body / appearance):
- "if you want to lose weight I can help you" — offering help = ALLOW
- "try this workout, it helped me get fit" — sharing advice = ALLOW
- "you should try this diet, it's healthy" — health suggestion = ALLOW
- "I think you'd look great if you tried this hairstyle" — supportive suggestion = ALLOW
- "have you tried yoga? it really helps" — wellness advice = ALLOW

BLOCK these (direct personal attacks / body shaming / cyberbullying):
- "you are ugly" — attacks the PERSON directly
- "you're fat" — body shaming (insult, no help offered)
- "you're so fat it's disgusting" — body shaming attack
- "nobody likes you" — personal harassment
- "kill yourself" — threat
- "you look disgusting" — attacks appearance
- "eww look at your teeth" — body shaming
- "lose some weight fatty" — shaming, not helping

=== CRITICAL DISTINCTION ===
Messages that MENTION weight/body but OFFER HELP or SUPPORT → ALLOW
Messages that MOCK, INSULT, or SHAME someone's weight/body → BLOCK
Intent matters: "I can help you lose weight" = supportive. "You need to lose weight, ugly" = attack.

=== KEY RULES ===
1. ALWAYS analyze text + emojis TOGETHER as one message — never judge emojis in isolation
2. If text is innocent/complimentary and emoji is just decorative → ALLOW
3. If text is sexualizing someone and emoji reinforces it → BLOCK
4. If ONLY emojis with no text and the combo is clearly sexual (3+ sexual emojis) → BLOCK
5. Single emojis alone (even 🍑 or 🍆) without sexual text context → ALLOW
6. Criticism of CONTENT/PHOTO → ALLOW. Attack on the PERSON → BLOCK.

Analyze in ANY language including English, Malayalam, Hindi, Tamil, Telugu, Kannada, and transliterated forms.

Respond ONLY with a JSON object (no markdown, no code blocks):
{"flagged": true/false, "reason": "brief explanation", "confidence": 0.0-1.0}`
              },
              { role: "user", content: `Analyze this comment — consider the FULL CONTEXT of text + emojis together. Is it a personal attack/sexual harassment (flag it) or just an opinion/compliment/innocent usage (allow it)? Comment: "${content}"` }
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
      const systemPrompt = checkEmbeddedText
        ? `You are an image content moderation system. Analyze the given image and determine if it contains:
1. Harmful, bullying, violent, explicit, or inappropriate visual content
2. ANY embedded/overlaid text in the image - read all text visible in the image and check if it contains cyberbullying, hate speech, harassment, threats, slurs, or abusive language in ANY language

If the image contains text with cyberbullying or offensive content, it MUST be flagged even if the image itself looks normal.

Respond ONLY with a JSON object (no markdown, no code blocks):
{"flagged": true/false, "reason": "brief explanation", "confidence": 0.0-1.0, "embedded_text": "any text found in the image or empty string"}`
        : `You are an image content moderation system. Analyze the given image URL and determine if it contains harmful, bullying, violent, explicit, or inappropriate content.

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
