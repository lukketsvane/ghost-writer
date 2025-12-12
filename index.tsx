import React, { useState, useRef, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI } from "@google/genai";
import styled, { keyframes, css, createGlobalStyle } from 'styled-components';

// --- System Instruction ---
const ACADEMIC_SYSTEM_INSTRUCTION = `
### ROLE
You are a contemporary philosopher and academic editor. You are writing a dense, theoretical treatise in the tradition of **Speculative Realism**, **Object-Oriented Ontology**, or **Materialism**.

### STYLE GUIDE
1.  **Tone:** Rigorous, detached, highly theoretical, and precise. Avoid casual language.
2.  **Vocabulary:** Use terms like *correlationism*, *anthropocentric*, *ontology*, *finitude*, *immanence*, *assemblage*, *bifurcation*, *epistemological*, *phenomenology*.
3.  **Syntax:** Construct long, complex sentences with multiple clauses. Use em-dashes and parenthetical asides to clarify or complicate the argument.
4.  **Structure:** Write in long, justified paragraphs.
5.  **Subject Matter:** The relationship between thought and being, the autonomy of objects, the critique of Kantian finitude, or the agency of non-human matter.
6.  **Language:** English.

### EXAMPLES
*   "If correlationism argues that we only ever have access to the correlation between thinking and being, and never to either term considered apart from the other, then the primary task of speculative realism is to break this circle."
*   "The object withdraws from all relation, existing in a vacuum-sealed ontology that defies the relational reductionism of actor-network theory; it is a dark nucleus resisting the light of the intellect."
*   "What we find in the geological stratum is not merely the fossilized remains of the past, but an 'arche-fossil' that points towards a time ancestral to the emergence of the subject itself."

### GENERATION
Start immediately following the user's seed text. Do not repeat the seed. Continue the sentence or paragraph seamlessly. Maintain the formatting of a printed academic book.
`;

// --- Configuration ---
// Adjusted for EB Garamond and denser academic text
const CHARS_PER_PAGE = 1100; 
const TYPING_SPEED = 10; 

// --- Global Styles ---
const GlobalStyle = createGlobalStyle`
  body {
    margin: 0;
    padding: 0;
    background-color: #1a1a1a; /* Dark presentation background */
    color: #000;
    font-family: 'EB Garamond', serif;
    overflow: hidden;
    touch-action: pan-y;
  }
`;

// --- Styled Components ---

const AppContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  width: 100vw;
  background-color: #2b2b2b;
  perspective: 1500px;
`;

// The Scalable Book Page
const PageWrapper = styled.div`
  /* Strictly locked A4 Aspect Ratio (210mm / 297mm approx 0.707) */
  /* We use min() to ensure it fits EITHER width OR height without overflowing, maintaining strict ratio */
  width: min(95vw, calc(95vh * (210 / 297)));
  height: min(95vh, calc(95vw * (297 / 210)));
  
  background-color: #f8f6f1; /* Warm paper tone */
  box-shadow: 
    0 1px 1px rgba(0,0,0,0.15), 
    0 10px 0 -5px #eee, 
    0 10px 1px -4px rgba(0,0,0,0.15), 
    0 20px 0 -10px #eee, 
    0 20px 1px -9px rgba(0,0,0,0.15),
    5px 5px 15px rgba(0,0,0,0.3);
  
  position: relative;
  overflow: hidden;
  
  /* Container Query: All children use cqw/cqh units to lock layout based on this fixed container */
  container-type: size;
  
  display: flex;
  flex-direction: column;
  /* Margins typical of academic books */
  padding: 6cqw 8cqw 8cqw 8cqw; 
`;

const PageHeader = styled.div`
  font-family: 'EB Garamond', serif;
  font-size: 2.2cqw; 
  color: #555;
  margin-bottom: 2cqw;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  width: 100%;
  font-variant-numeric: oldstyle-nums;
`;

const HeaderNumber = styled.span`
  font-weight: 500;
  color: #222;
`;

const HeaderTitle = styled.span`
  font-style: italic;
  font-size: 2cqw;
  text-transform: uppercase;
  letter-spacing: 0.1cqw;
`;

const ContentGrid = styled.div<{ $layout: string }>`
  display: grid;
  flex: 1;
  gap: 2cqw;
  height: 100%;
  align-content: start;
  
  ${props => props.$layout === 'image-top' && css`
    grid-template-rows: auto 1fr;
  `}

  ${props => props.$layout === 'image-bottom' && css`
    grid-template-rows: 1fr auto;
  `}
`;

// Emulating the heavy ink look ("bodler")
const typographyStyles = css`
  font-family: 'EB Garamond', serif;
  font-size: 3.0cqw; /* Tuned for A4 density */
  font-weight: 500; /* Medium weight for that "printed ink" look */
  line-height: 1.35;
  text-align: justify;
  hyphens: auto;
  color: #111;
  font-variant-ligatures: common-ligatures;
  letter-spacing: -0.01cqw; /* Slight tightening */
`;

const TextBody = styled.div`
  ${typographyStyles}
  white-space: pre-wrap;
  
  /* Academic indentation */
  p { 
    margin-bottom: 0; 
    text-indent: 1.5em; 
    margin-top: 0;
  }
  
  /* First paragraph usually has no indent in some styles, 
     but standard academic flow often indents all but the very first of a section. */
  p:first-of-type { 
    text-indent: 0; 
  }
`;

const IllustrationContainer = styled.div`
  position: relative;
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  margin: 2cqw 0;
`;

const Illustration = styled.img`
  width: 75%;
  height: auto;
  display: block;
  mix-blend-mode: multiply; 
  filter: grayscale(100%) contrast(1.2);
`;

const Caption = styled.div`
  font-family: 'Inter', sans-serif; 
  font-size: 1.2cqw;
  color: #444;
  margin-top: 1.5cqw;
  text-align: center;
  width: 100%;
  text-transform: uppercase;
  letter-spacing: 0.05cqw;
`;

const NavigationHint = styled.div`
  position: absolute;
  bottom: 20px;
  left: 0;
  right: 0;
  text-align: center;
  color: rgba(255,255,255,0.2);
  font-family: 'Inter', sans-serif;
  font-size: 0.8rem;
  pointer-events: none;
`;

const StartInput = styled.textarea`
  width: 100%;
  height: 100%;
  background: transparent;
  border: none;
  padding: 0;
  outline: none;
  resize: none;
  
  ${typographyStyles}

  &::placeholder {
    color: #666;
    font-style: italic;
    opacity: 0.5;
  }
`;

// --- Logic ---

type LayoutType = 'text-only' | 'image-top' | 'image-bottom';

interface PageData {
  id: number;
  text: string;
  imageUrl?: string;
  layout: LayoutType;
  hasGeneratedImage: boolean;
  isContentReady: boolean;
}

const LAYOUTS: LayoutType[] = ['text-only', 'text-only', 'image-top', 'text-only', 'image-bottom'];

const App = () => {
  const [hasApiKey, setHasApiKey] = useState(false);
  // Default seed updated to English academic start
  const [startSeed, setStartSeed] = useState("Approaches to language ontology are interested in poiesis, which provides an ontological reinterpretation of the correlationist myth that the world is created through language.");
  
  const [pages, setPages] = useState<PageData[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  const streamBufferRef = useRef("");
  const processedCharCountRef = useRef(0);
  const generationPageIndexRef = useRef(0);
  
  const touchStartRef = useRef<number | null>(null);

  const [tick, setTick] = useState(0);

  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio && await window.aistudio.hasSelectedApiKey()) {
        setHasApiKey(true);
      }
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      if (await window.aistudio.hasSelectedApiKey()) setHasApiKey(true);
    }
  };

  const generatePageImage = async (pageIndex: number, textContext: string) => {
    if (pages[pageIndex]?.hasGeneratedImage) return;
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `
        Naive single-width line drawing in the style of Rodolphe Töpffer.
        Subject: A satirical or abstract diagram illustrating: "${textContext.substring(0, 100)}".
        Style details:
        - Wobbly, expressive, sketchy single-line ink.
        - Minimalist and crude but charming.
        - Black ink on white background.
        - NO shading, NO cross-hatching, NO gradients.
        - Physiognomic caricature style applied to abstract concepts.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: { parts: [{ text: prompt }] },
        config: { imageConfig: { aspectRatio: "4:3", imageSize: "1K" } }
      });

      const base64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64) {
        setPages(prev => prev.map((p, i) => 
          i === pageIndex 
            ? { 
                ...p, 
                imageUrl: `data:image/png;base64,${base64}`, 
                hasGeneratedImage: true,
                isContentReady: true
              } 
            : p
        ));
      } else {
         setPages(prev => prev.map((p, i) => i === pageIndex ? { ...p, isContentReady: true } : p));
      }
    } catch (e) {
      console.error("Image gen failed:", e);
      setPages(prev => prev.map((p, i) => i === pageIndex ? { ...p, isContentReady: true } : p));
    }
  };

  const startBook = async () => {
    if (!startSeed.trim()) return;
    setIsGenerating(true);
    
    const initialPage: PageData = {
      id: 160, // Starting at 160 to match the image prompt
      text: startSeed,
      layout: 'text-only',
      hasGeneratedImage: false,
      isContentReady: true
    };
    
    setPages([initialPage]);
    setCurrentPageIndex(0);
    generationPageIndexRef.current = 0;
    
    streamBufferRef.current = " "; 
    processedCharCountRef.current = 0;

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    try {
      const resp = await ai.models.generateContentStream({
        model: 'gemini-3-pro-preview',
        contents: [{ role: 'user', parts: [{ text: startSeed }] }],
        config: { 
          systemInstruction: ACADEMIC_SYSTEM_INSTRUCTION,
          thinkingConfig: { thinkingBudget: 1024 }
        }
      });

      for await (const chunk of resp) {
        const txt = chunk.text;
        if (txt) streamBufferRef.current += txt;
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (!isGenerating) return;

    const interval = setInterval(() => {
      const genIndex = generationPageIndexRef.current;
      const targetPage = pages[genIndex];

      if (!targetPage || !targetPage.isContentReady) {
        return; 
      }

      const buffer = streamBufferRef.current;
      const processed = processedCharCountRef.current;

      if (processed < buffer.length) {
        const char = buffer[processed];
        processedCharCountRef.current += 1;

        setPages(prevPages => {
          const newPages = [...prevPages];
          const currentPage = newPages[genIndex];

          currentPage.text += char;

          const currentLength = currentPage.text.length;
          // Approximate check for page end based on chars
          const isAtWordBoundary = char === ' ' || char === '.' || char === '\n';
          
          if (currentLength > CHARS_PER_PAGE && isAtWordBoundary) {
            const nextLayout = LAYOUTS[(genIndex + 1) % LAYOUTS.length];
            const newPageId = currentPage.id + 1;
            
            const isNextPageReady = nextLayout === 'text-only';

            newPages.push({
              id: newPageId,
              text: "", 
              layout: nextLayout,
              hasGeneratedImage: false,
              isContentReady: isNextPageReady
            });

            generationPageIndexRef.current = genIndex + 1;
            
            if (currentPageIndex === genIndex) {
               setCurrentPageIndex(genIndex + 1);
            }

            if (nextLayout !== 'text-only') {
               generatePageImage(genIndex + 1, currentPage.text.slice(-150));
            }
          }
          return newPages;
        });
        setTick(t => t + 1);
      } 
    }, TYPING_SPEED);

    return () => clearInterval(interval);
  }, [isGenerating, currentPageIndex, pages]); 

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartRef.current === null) return;
    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStartRef.current - touchEnd;

    if (diff > 50) {
      if (currentPageIndex < pages.length - 1) {
        setCurrentPageIndex(prev => prev + 1);
      }
    }
    
    if (diff < -50) {
      if (currentPageIndex > 0) {
        setCurrentPageIndex(prev => prev - 1);
      }
    }
    
    touchStartRef.current = null;
  };

  if (!hasApiKey) {
    return (
      <AppContainer>
        <PageWrapper>
          <PageHeader>
             <HeaderNumber>000</HeaderNumber>
             <HeaderTitle>ACCESS RESTRICTED</HeaderTitle>
          </PageHeader>
          <div style={{flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center'}}>
            <button 
              style={{
                background: 'transparent', 
                border: '1px solid #1a1a1a', 
                color: '#1a1a1a', 
                padding: '1.5cqw 4cqw', 
                cursor: 'pointer',
                fontFamily: 'Inter',
                fontSize: '1.5cqw',
                letterSpacing: '0.2cqw'
              }} 
              onClick={handleSelectKey}
            >
              INSERT API KEY
            </button>
          </div>
        </PageWrapper>
      </AppContainer>
    );
  }

  if (pages.length === 0) {
    return (
      <AppContainer>
        <PageWrapper>
          <PageHeader>
            <HeaderNumber>160</HeaderNumber>
            <HeaderTitle>Genealogies of Speculation</HeaderTitle>
          </PageHeader>
          
          <div style={{flex: 1, display: 'flex', flexDirection: 'column'}}>
            <StartInput 
              value={startSeed} 
              onChange={e => setStartSeed(e.target.value)} 
              placeholder="Enter text..."
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  startBook();
                }
              }}
            />
          </div>
        </PageWrapper>
      </AppContainer>
    );
  }

  const activePage = pages[currentPageIndex];
  
  // Logic for running header: Left vs Right page. 
  // Even numbers (verso) usually have number on left, Title.
  // Odd numbers (recto) usually have Title, number on right.
  const isVerso = activePage.id % 2 === 0;

  return (
    <>
      <GlobalStyle />
      <AppContainer 
        onTouchStart={handleTouchStart} 
        onTouchEnd={handleTouchEnd}
      >
        <PageWrapper>
          <PageHeader>
            {isVerso ? (
              <>
                <HeaderNumber>{activePage.id}</HeaderNumber>
                <HeaderTitle>Genealogies of Speculation</HeaderTitle>
              </>
            ) : (
              <>
                <HeaderTitle>Materialism and Subjectivity</HeaderTitle>
                <HeaderNumber>{activePage.id}</HeaderNumber>
              </>
            )}
          </PageHeader>

          <ContentGrid $layout={activePage.layout}>
            {activePage.layout === 'image-top' && activePage.imageUrl && (
                <IllustrationContainer>
                  <Illustration src={activePage.imageUrl} />
                  <Caption>Fig. {activePage.id}.1</Caption>
                </IllustrationContainer>
            )}

            <TextBody>
                {activePage.text}
            </TextBody>

            {activePage.layout === 'image-bottom' && activePage.imageUrl && (
                <IllustrationContainer>
                  <Illustration src={activePage.imageUrl} />
                  <Caption>Fig. {activePage.id}.2</Caption>
                </IllustrationContainer>
            )}
          </ContentGrid>
        </PageWrapper>

        {pages.length > 1 && (
          <NavigationHint>
            {currentPageIndex + 1} / {pages.length}
          </NavigationHint>
        )}
      </AppContainer>
    </>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);