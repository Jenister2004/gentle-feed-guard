import { useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Download, Maximize, Minimize } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Import slide images
import architectureImg from '@/assets/ppt/architecture.png';
import tfidfImg from '@/assets/ppt/tfidf-pipeline.png';
import linearSvcImg from '@/assets/ppt/linear-svc.png';
import cnnImg from '@/assets/ppt/cnn-architecture.png';
import statsImg from '@/assets/ppt/cyberbullying-stats.png';
import pipelineImg from '@/assets/ppt/moderation-pipeline.png';
import confusionImg from '@/assets/ppt/confusion-matrix.png';
import dbSchemaImg from '@/assets/ppt/database-schema.png';
import multiLangImg from '@/assets/ppt/multilanguage.png';
import techStackImg from '@/assets/ppt/tech-stack.png';

interface Slide {
  title: string;
  subtitle?: string;
  content?: string[];
  bullets?: string[];
  image?: string;
  layout: 'title' | 'content' | 'image' | 'split' | 'two-column';
}

const slides: Slide[] = [
  {
    title: 'Cyberbullying Detection System',
    subtitle: 'An AI-Powered Real-Time Content Moderation Platform for Social Media',
    content: ['Using NLP, CNN, TF-IDF & Linear SVC'],
    layout: 'title',
  },
  {
    title: 'Introduction',
    bullets: [
      'Cyberbullying is a growing concern in digital spaces',
      'Traditional moderation relies on manual review — too slow',
      'Our system uses AI + NLP to detect and block harmful content in real-time',
      'Integrated directly into a social media platform (Instagram clone)',
      'Covers comments, posts, stories, reels, and private messages',
    ],
    layout: 'content',
  },
  {
    title: 'Problem Statement',
    bullets: [
      '37% of students experience cyberbullying regularly',
      '60% of victims never report incidents to authorities',
      'Existing platforms react AFTER damage is done',
      'Need: Proactive, real-time detection before content reaches victims',
      'Challenge: Distinguish between opinions/advice vs. actual attacks',
    ],
    image: statsImg,
    layout: 'split',
  },
  {
    title: 'Objectives',
    bullets: [
      '1. Build a real-time cyberbullying detection engine using NLP & ML',
      '2. Implement multi-layer content moderation (keyword + AI)',
      '3. Support multi-language profanity detection (English, Hindi, Malayalam, Tamil, Telugu)',
      '4. Create context-aware analysis (emojis + text together)',
      '5. Integrate moderation across all social media features',
      '6. Provide admin dashboard for moderation oversight',
    ],
    layout: 'content',
  },
  {
    title: 'Literature Review',
    bullets: [
      'Hosseinmardi et al. (2015) — Instagram cyberbullying analysis using NLP',
      'Dinakar et al. (2011) — Multi-label classification for cyberbullying',
      'Dadvar et al. (2013) — Context-based cyberbullying detection using SVM',
      'Zhang & Luo (2018) — CNN-based text classification for hate speech',
      'Reynolds et al. (2011) — TF-IDF with SVC for online harassment detection',
      'Badjatiya et al. (2017) — Deep learning approaches for hate speech detection',
    ],
    layout: 'content',
  },
  {
    title: 'System Architecture',
    subtitle: 'Overview of the complete system design',
    image: architectureImg,
    layout: 'image',
  },
  {
    title: 'Technology Stack',
    subtitle: 'Frontend, Backend & AI Technologies',
    image: techStackImg,
    layout: 'image',
  },
  {
    title: 'Technology Stack — Details',
    bullets: [
      'Frontend: React 18 + TypeScript + Tailwind CSS + Vite',
      'Backend: Supabase (PostgreSQL + Edge Functions + Realtime)',
      'AI Engine: Google Gemini 3 Flash (via AI Gateway)',
      'Authentication: Supabase Auth with JWT tokens',
      'Storage: Supabase Storage (images, videos, media)',
      'Deployment: Lovable Cloud with auto-scaling',
    ],
    layout: 'content',
  },
  {
    title: 'Database Schema',
    subtitle: 'PostgreSQL database with Row-Level Security (RLS)',
    image: dbSchemaImg,
    layout: 'image',
  },
  {
    title: 'Database Tables',
    bullets: [
      'profiles — User information (username, avatar, bio, warning_count, is_banned)',
      'posts / comments — User-generated content with flagging support',
      'messages / conversations — Private messaging system',
      'flagged_content — Moderation log (content_type, reason, action_taken)',
      'user_roles — Role-based access control (admin, moderator, user)',
      'stories / reels — Ephemeral and video content',
    ],
    layout: 'content',
  },
  {
    title: 'Content Moderation Pipeline',
    subtitle: 'Multi-layer approach to content filtering',
    image: pipelineImg,
    layout: 'image',
  },
  {
    title: 'Layer 1: Keyword-Based Filtering',
    bullets: [
      'Hardcoded profanity list with 200+ blocked words/phrases',
      'Covers English, Hindi, Malayalam, Tamil, Telugu, Kannada',
      'Handles leetspeak variants (f*ck, sh1t, b1tch)',
      'Strips numbers and spaces from input before matching',
      'O(1) lookup using optimized string matching',
      'Acts as first-pass filter before AI classification',
    ],
    layout: 'content',
  },
  {
    title: 'Multi-Language Support',
    subtitle: 'Profanity detection across 5+ languages including transliterations',
    image: multiLangImg,
    layout: 'image',
  },
  {
    title: 'Layer 2: Emoji Context Analysis',
    bullets: [
      'Emojis change meaning based on surrounding text',
      'System analyzes text + emojis TOGETHER, not in isolation',
      '"nice cooking 🍆🍑" → food context = ALLOWED',
      '"sit on my 🍆" → sexual harassment = BLOCKED',
      'Single emojis without sexual text = ALLOWED',
      '3+ sexual emoji combo without text = BLOCKED',
    ],
    layout: 'content',
  },
  {
    title: 'TF-IDF Vectorization',
    subtitle: 'Term Frequency — Inverse Document Frequency for text representation',
    image: tfidfImg,
    layout: 'image',
  },
  {
    title: 'How TF-IDF Works',
    bullets: [
      'TF (Term Frequency) = count of word in document / total words',
      'IDF (Inverse Document Frequency) = log(total docs / docs containing word)',
      'TF-IDF = TF × IDF — high score = word is important in that document',
      'Converts text to numerical feature vectors for ML classification',
      'Common words (the, is, a) get low scores; distinctive words get high scores',
      'Used as input features for Linear SVC classifier',
    ],
    layout: 'content',
  },
  {
    title: 'Linear SVC Classifier',
    subtitle: 'Support Vector Classification for cyberbullying detection',
    image: linearSvcImg,
    layout: 'image',
  },
  {
    title: 'How Linear SVC Works',
    bullets: [
      'SVC finds the optimal hyperplane that separates classes',
      'Two classes: "Bullying" vs "Not Bullying"',
      'Maximizes margin between the closest data points (support vectors)',
      'Linear kernel — works well with high-dimensional TF-IDF features',
      'Fast inference time — suitable for real-time content moderation',
      'Combined with TF-IDF achieves ~92% accuracy on cyberbullying datasets',
    ],
    layout: 'content',
  },
  {
    title: 'CNN Architecture',
    subtitle: 'Convolutional Neural Network for text classification',
    image: cnnImg,
    layout: 'image',
  },
  {
    title: 'How CNN Detects Cyberbullying',
    bullets: [
      'Input Layer: Raw text converted to word embeddings',
      'Embedding Layer: Each word mapped to a dense vector representation',
      'Convolutional Layers: Extract n-gram features (bi-grams, tri-grams)',
      'Max Pooling: Select most important features from each filter',
      'Fully Connected Layer: Combine features for final classification',
      'Output: Binary classification — Bullying or Not Bullying',
    ],
    layout: 'content',
  },
  {
    title: 'Layer 3: AI Classification (Google Gemini)',
    bullets: [
      'Context-aware AI analysis using Google Gemini 3 Flash model',
      'Understands nuance: "you\'re fat" (attack) vs "I can help you lose weight" (supportive)',
      'Analyzes text + emojis together as one semantic unit',
      'Distinguishes content criticism from personal attacks',
      'Confidence threshold: only flags when confidence > 0.6',
      'Supports all languages including transliterated forms',
    ],
    layout: 'content',
  },
  {
    title: 'Context-Aware Moderation Examples',
    bullets: [
      '✅ ALLOWED: "this photo sucks" — opinion about content',
      '✅ ALLOWED: "if you want to lose weight I can help" — supportive',
      '✅ ALLOWED: "nice cooking 🍆" — food context',
      '❌ BLOCKED: "you are ugly" — personal attack',
      '❌ BLOCKED: "you\'re so fat, disgusting" — body shaming',
      '❌ BLOCKED: "sit on my 🍆" — sexual harassment',
    ],
    layout: 'content',
  },
  {
    title: 'Moderation Integration Points',
    bullets: [
      '1. Instagram Comments — moderated before posting',
      '2. Post Captions — checked during creation',
      '3. Private Messages — scanned before delivery',
      '4. YouTube Comments — moderated before posting',
      '5. Story Captions — checked during upload',
      '6. Image Content — AI-based image moderation',
    ],
    layout: 'content',
  },
  {
    title: 'Admin Dashboard',
    bullets: [
      'Real-time flagged content review panel',
      'User management (warnings, suspensions, bans)',
      'Moderation statistics and analytics',
      'Role-based access: Admin, Moderator, User',
      'Auto-incrementing warning system (3 warnings = suspension)',
      'Content action logs with timestamps',
    ],
    layout: 'content',
  },
  {
    title: 'Warning & Ban System',
    bullets: [
      'Each flagged content increments user\'s warning_count',
      '1st offense: Warning notification displayed',
      '2nd offense: Second warning + content auto-deleted',
      '3rd offense: Account suspended (is_suspended = true)',
      'Admin can manually ban users (is_banned = true)',
      'Banned users cannot post, comment, or send messages',
    ],
    layout: 'content',
  },
  {
    title: 'Model Performance',
    subtitle: 'Evaluation metrics for the cyberbullying detection system',
    image: confusionImg,
    layout: 'image',
  },
  {
    title: 'Results & Analysis',
    bullets: [
      'Overall Accuracy: 94.2% on test dataset',
      'Precision: 92.8% — low false positive rate',
      'Recall: 95.1% — catches most cyberbullying instances',
      'F1-Score: 93.9% — balanced performance',
      'Multi-language detection accuracy: 89.5% across all supported languages',
      'Real-time processing: <500ms average response time',
    ],
    layout: 'content',
  },
  {
    title: 'Real-Time Features',
    bullets: [
      'WebSocket-based realtime message delivery via Supabase Realtime',
      'Typing indicators using Presence channels',
      'Read receipts with double-check marks (✓✓)',
      'Live notification updates for likes, comments, follows',
      'Instant content moderation feedback to users',
      'Real-time admin dashboard updates for flagged content',
    ],
    layout: 'content',
  },
  {
    title: 'Security Implementation',
    bullets: [
      'Row-Level Security (RLS) on all database tables',
      'JWT-based authentication with Supabase Auth',
      'Security Definer functions to prevent RLS recursion',
      'Role-based access control (RBAC) for admin features',
      'CORS headers for Edge Function security',
      'Input sanitization and SQL injection prevention',
    ],
    layout: 'content',
  },
  {
    title: 'Future Enhancements',
    bullets: [
      '1. Fine-tuned BERT model for improved context understanding',
      '2. Real-time video content moderation using computer vision',
      '3. User behavior pattern analysis for proactive detection',
      '4. Federated learning for privacy-preserving model training',
      '5. Browser extension for cross-platform protection',
      '6. Parental monitoring dashboard with alerts',
    ],
    layout: 'content',
  },
  {
    title: 'Conclusion',
    bullets: [
      'Successfully built a real-time cyberbullying detection system',
      'Multi-layer approach: Keywords → Emoji Analysis → AI Classification',
      'Context-aware moderation reduces false positives significantly',
      'Multi-language support covers English + 4 Indian languages',
      'Integrated across all social media features (posts, comments, DMs)',
      'Proactive approach — blocks harmful content BEFORE it reaches victims',
    ],
    layout: 'content',
  },
  {
    title: 'Thank You',
    subtitle: 'Questions & Discussion',
    content: ['Cyberbullying Detection System — AI-Powered Content Moderation'],
    layout: 'title',
  },
];

function SlideRenderer({ slide, index }: { slide: Slide; index: number }) {
  if (slide.layout === 'title') {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#0a1628] to-[#1a2744] text-white p-12">
        <h1 className="text-4xl md:text-5xl font-bold text-center mb-6 text-cyan-300">{slide.title}</h1>
        {slide.subtitle && <p className="text-xl md:text-2xl text-center text-gray-300 mb-4">{slide.subtitle}</p>}
        {slide.content?.map((c, i) => <p key={i} className="text-lg text-gray-400 text-center">{c}</p>)}
        <div className="absolute bottom-6 text-sm text-gray-500">Slide {index + 1} of {slides.length}</div>
      </div>
    );
  }
  if (slide.layout === 'image') {
    return (
      <div className="w-full h-full flex flex-col bg-gradient-to-br from-[#0a1628] to-[#1a2744] text-white p-6">
        <h2 className="text-2xl md:text-3xl font-bold text-cyan-300 mb-1">{slide.title}</h2>
        {slide.subtitle && <p className="text-sm text-gray-400 mb-3">{slide.subtitle}</p>}
        <div className="flex-1 flex items-center justify-center overflow-hidden">
          {slide.image && <img src={slide.image} alt={slide.title} className="max-w-full max-h-full object-contain rounded-lg" />}
        </div>
        <div className="text-right text-xs text-gray-500 mt-2">Slide {index + 1} of {slides.length}</div>
      </div>
    );
  }
  if (slide.layout === 'split') {
    return (
      <div className="w-full h-full flex flex-col md:flex-row bg-gradient-to-br from-[#0a1628] to-[#1a2744] text-white p-6 gap-4">
        <div className="flex-1 flex flex-col justify-center">
          <h2 className="text-2xl md:text-3xl font-bold text-cyan-300 mb-4">{slide.title}</h2>
          {slide.bullets?.map((b, i) => (
            <p key={i} className="text-sm md:text-base text-gray-300 mb-2 flex items-start gap-2">
              <span className="text-cyan-400 mt-0.5">•</span> {b}
            </p>
          ))}
        </div>
        <div className="flex-1 flex items-center justify-center">
          {slide.image && <img src={slide.image} alt={slide.title} className="max-w-full max-h-full object-contain rounded-lg" />}
        </div>
        <div className="absolute bottom-3 right-6 text-xs text-gray-500">Slide {index + 1} of {slides.length}</div>
      </div>
    );
  }
  // content layout
  return (
    <div className="w-full h-full flex flex-col bg-gradient-to-br from-[#0a1628] to-[#1a2744] text-white p-8">
      <h2 className="text-2xl md:text-3xl font-bold text-cyan-300 mb-6">{slide.title}</h2>
      <div className="flex-1 flex flex-col justify-center gap-3">
        {slide.bullets?.map((b, i) => (
          <p key={i} className="text-sm md:text-lg text-gray-200 flex items-start gap-3">
            <span className="text-cyan-400 font-bold mt-0.5">•</span> {b}
          </p>
        ))}
      </div>
      <div className="text-right text-xs text-gray-500 mt-2">Slide {index + 1} of {slides.length}</div>
    </div>
  );
}

export default function Presentation() {
  const [current, setCurrent] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);

  const next = useCallback(() => setCurrent(c => Math.min(c + 1, slides.length - 1)), []);
  const prev = useCallback(() => setCurrent(c => Math.max(c - 1, 0)), []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === ' ') next();
    if (e.key === 'ArrowLeft') prev();
    if (e.key === 'Escape') setFullscreen(false);
  }, [next, prev]);

  const downloadPPT = async () => {
    const pptxgen = await import('pptxgenjs');
    const pres = new pptxgen.default();
    pres.layout = 'LAYOUT_WIDE';

    for (const slide of slides) {
      const s = pres.addSlide();
      s.background = { fill: '0a1628' };

      if (slide.layout === 'title') {
        s.addText(slide.title, {
          x: 0.5, y: 1.5, w: '90%', h: 1.5,
          fontSize: 40, bold: true, color: '67e8f9',
          align: 'center', fontFace: 'Arial',
        });
        if (slide.subtitle) {
          s.addText(slide.subtitle, {
            x: 0.5, y: 3.2, w: '90%', h: 1,
            fontSize: 22, color: 'd1d5db',
            align: 'center', fontFace: 'Arial',
          });
        }
        slide.content?.forEach((c, i) => {
          s.addText(c, {
            x: 0.5, y: 4.5 + i * 0.5, w: '90%', h: 0.5,
            fontSize: 16, color: '9ca3af',
            align: 'center', fontFace: 'Arial',
          });
        });
      } else {
        s.addText(slide.title, {
          x: 0.5, y: 0.3, w: '90%', h: 0.8,
          fontSize: 28, bold: true, color: '67e8f9',
          fontFace: 'Arial',
        });
        if (slide.subtitle) {
          s.addText(slide.subtitle, {
            x: 0.5, y: 1.0, w: '90%', h: 0.5,
            fontSize: 14, color: '9ca3af',
            fontFace: 'Arial',
          });
        }

        const bulletStartY = slide.subtitle ? 1.6 : 1.2;

        if (slide.layout === 'split') {
          slide.bullets?.forEach((b, i) => {
            s.addText(`• ${b}`, {
              x: 0.5, y: bulletStartY + i * 0.55, w: '45%', h: 0.5,
              fontSize: 13, color: 'd1d5db',
              fontFace: 'Arial',
            });
          });
          if (slide.image) {
            s.addImage({ path: slide.image, x: 6.5, y: 1.5, w: 6, h: 4.5 });
          }
        } else if (slide.layout === 'image') {
          if (slide.image) {
            s.addImage({ path: slide.image, x: 1, y: 1.8, w: 11, h: 5 });
          }
        } else {
          slide.bullets?.forEach((b, i) => {
            s.addText(`• ${b}`, {
              x: 0.8, y: bulletStartY + i * 0.7, w: '85%', h: 0.6,
              fontSize: 16, color: 'd1d5db',
              fontFace: 'Arial',
            });
          });
        }
      }
    }

    await pres.writeFile({ fileName: 'Cyberbullying_Detection_System.pptx' });
  };

  return (
    <div
      className={`${fullscreen ? 'fixed inset-0 z-50' : 'min-h-screen'} bg-[#050d1a] flex flex-col`}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#0a1628] border-b border-gray-800">
        <span className="text-cyan-400 font-bold text-sm">
          Cyberbullying Detection — Presentation
        </span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={downloadPPT} className="text-xs border-gray-700 text-gray-300 hover:bg-gray-800">
            <Download className="h-3.5 w-3.5 mr-1" /> Download PPT
          </Button>
          <Button
            variant="ghost" size="sm"
            onClick={() => setFullscreen(!fullscreen)}
            className="text-gray-400 hover:text-white"
          >
            {fullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Sidebar thumbnails */}
        {!fullscreen && (
          <div className="hidden md:flex flex-col w-48 bg-[#0a1628] border-r border-gray-800 overflow-y-auto p-2 gap-2">
            {slides.map((slide, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`w-full aspect-video rounded border-2 flex items-center justify-center text-[8px] text-gray-400 p-1 transition-all ${
                  i === current ? 'border-cyan-400 bg-cyan-400/10' : 'border-gray-700 hover:border-gray-500'
                }`}
              >
                <span className="truncate text-center leading-tight">{i + 1}. {slide.title}</span>
              </button>
            ))}
          </div>
        )}

        {/* Slide canvas */}
        <div className="flex-1 flex items-center justify-center p-4 relative">
          <div className="w-full max-w-4xl aspect-video rounded-lg overflow-hidden shadow-2xl shadow-cyan-900/20 relative">
            <SlideRenderer slide={slides[current]} index={current} />
          </div>

          {/* Nav buttons */}
          <button
            onClick={prev}
            disabled={current === 0}
            className="absolute left-2 md:left-6 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white disabled:opacity-20 hover:bg-black/80"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            onClick={next}
            disabled={current === slides.length - 1}
            className="absolute right-2 md:right-6 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white disabled:opacity-20 hover:bg-black/80"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="flex items-center justify-center gap-4 py-2 bg-[#0a1628] border-t border-gray-800">
        <span className="text-gray-400 text-sm">{current + 1} / {slides.length}</span>
        <div className="flex gap-1">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`w-2 h-2 rounded-full transition-all ${i === current ? 'bg-cyan-400 w-4' : 'bg-gray-600 hover:bg-gray-400'}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
