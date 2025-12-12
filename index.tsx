import React, { useState, useRef, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI } from "@google/genai";
import styled, { keyframes, css, createGlobalStyle } from 'styled-components';

// --- System Instruction ---
const ULVEN_SYSTEM_INSTRUCTION = `
### ROLLE
Du er et ekko av forfatteren Tor Ulven. Du har mottatt et "frø" (en setning), og skal skrive en sammenhengende, meditativ tekst.

### STILISTISKE REGLER
1.  **Det Arkeologiske Blikket:** Beskriv nåtiden som fortid. Objekter er fossiler.
2.  **Anatomi og Forfall:** Bruk ord som knokler, hinne, kalk, sediment, stillhet, støv, fossiler, skjelett.
3.  **Syntaks:** Lange, buktende setninger, men med presis punktsetting. Bruk parenteser (...) for å skyte inn presise, ofte urovekkende detaljer om tingenes tilstand.
4.  **Lengde:** Skriv langt. Du skal fylle flere sider. Ikke stopp før historien er ferdig.
5.  **Språk:** Norsk (Bokmål).

### EKSEMPLER (TONE OG STIL)
Her er noen eksempler på setninger som fanger tonen du skal etterligne. Bruk disse som en stemmegafler for språket ditt:

*   "Lyset faller inn gjennom vinduet som en gammel bandasje som langsomt vikles av mørket, og avslører rommets anatomi: stoler som ventende skjeletter, bordet som en flat slette hvor støvet har lagt seg som snø over et utdødd landskap."
*   "Det er ikke stillhet, men fravær av lyd, slik et tomt sneglehus er fravær av liv, en kalkholdig spiral som vitner om noe som en gang trakk seg langsomt tilbake."
*   "Å betrakte sin egen hånd hvilende på lakenet, og plutselig se den som et fremmed objekt, en samling av sener og knokler midlertidig drapert i hud, snart klar for å returnere til det uorganiske kretsløpet."
*   "Tiden beveger seg ikke her; den har sedimentert seg i lag på lag av ubevegelighet."

### GENERERING
Start rett på teksten. Ingen innledning. Fortsett organisk fra frøet. Du skal IKKE gjenta frøet i starten, bare fortsette setningen eller tankerekken.
`;

// --- Configuration ---
const CHARS_PER_PAGE = 650; // Drastically reduced for larger font
const TYPING_SPEED = 15; 

// --- Global Styles ---
const GlobalStyle = createGlobalStyle`
  body {
    margin: 0;
    padding: 0;
    background-color: #2c2b29; /* Dark background to frame the white page */
    color: #111;
    font-family: 'Cormorant Garamond', serif;
    overflow: hidden; /* Prevent body scroll, we handle page flips */
    touch-action: pan-y; /* Allow vertical scroll if needed, but horizontal is swipe */
  }
`;

// --- Styled Components ---

const AppContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  width: 100vw;
  perspective: 1000px;
`;

// The Scalable Book Page
const PageWrapper = styled.div`
  /* Aspect Ratio & Sizing Logic */
  aspect-ratio: 210 / 297; /* A4 */
  height: 96vh;
  max-width: 96vw;
  
  background-color: #fcfbf9;
  box-shadow: 0 0 50px rgba(0,0,0,0.5);
  position: relative;
  overflow: hidden;
  
  /* Container Query Magic: All children use cqw/cqh units */
  container-type: size;
  
  display: flex;
  flex-direction: column;
  padding: 8cqw 10cqw;
`;

const PageHeader = styled.div`
  font-family: 'Inter', sans-serif;
  font-size: 1.5cqw; 
  text-transform: uppercase;
  letter-spacing: 0.1cqw;
  color: #444;
  border-bottom: 0.2cqw solid #111;
  padding-bottom: 1.0cqw;
  margin-bottom: 4cqw;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
`;

const PageFooter = styled.div`
  margin-top: auto;
  padding-top: 3cqw;
  display: flex;
  justify-content: space-between;
  font-family: 'Inter', sans-serif;
  font-size: 1.5cqw;
  color: #666;
`;

const ContentGrid = styled.div<{ $layout: string }>`
  display: grid;
  flex: 1;
  gap: 3cqw;
  height: 100%;
  align-content: start;
  
  ${props => props.$layout === 'image-top' && css`
    grid-template-rows: auto 1fr;
  `}

  ${props => props.$layout === 'image-bottom' && css`
    grid-template-rows: 1fr auto;
  `}
`;

// Shared Typography Styles
const typographyStyles = css`
  font-family: 'Cormorant Garamond', serif;
  font-size: 4.5cqw; /* Large, clear text */
  font-weight: 500; /* Medium Bold */
  line-height: 1.25;
  text-align: justify;
  color: #000; /* Pure black for maximum contrast */
  font-variant-ligatures: common-ligatures;
`;

const TextBody = styled.div`
  ${typographyStyles}
  white-space: pre-wrap;
  
  p { margin-bottom: 0; text-indent: 1.5em; }
  p:first-of-type { text-indent: 0; }
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
  width: 80%; /* Slightly larger image for the bold layout */
  height: auto;
  display: block;
  mix-blend-mode: multiply; 
  /* High contrast filter to blow out off-white background to pure white (transparent in multiply) */
  filter: grayscale(100%) brightness(1.15) contrast(1.6);
  opacity: 0.95;
`;

const Caption = styled.div`
  font-family: 'Inter', sans-serif; 
  font-size: 1.4cqw;
  color: #666;
  margin-top: 1.5cqw;
  text-align: center;
  width: 100%;
  text-transform: uppercase;
  letter-spacing: 0.1cqw;
`;

const NavigationHint = styled.div`
  position: absolute;
  bottom: 20px;
  left: 0;
  right: 0;
  text-align: center;
  color: rgba(255,255,255,0.3);
  font-family: 'Inter', sans-serif;
  font-size: 0.8rem;
  pointer-events: none;
`;

// Modified to look EXACTLY like the page content for seamless transition
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
    color: #888;
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
  // Controls whether the typing can proceed on this page
  isContentReady: boolean;
}

const LAYOUTS: LayoutType[] = ['text-only', 'image-bottom', 'text-only', 'image-top', 'text-only'];

const App = () => {
  const [hasApiKey, setHasApiKey] = useState(false);
  const [startSeed, setStartSeed] = useState("En bønn, eller kanskje bare en rykning i det autonome nervesystemet");
  
  const [pages, setPages] = useState<PageData[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Navigation State
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  // Streaming state refs
  const streamBufferRef = useRef("");
  const processedCharCountRef = useRef(0);
  const generationPageIndexRef = useRef(0);
  
  // Touch state
  const touchStartRef = useRef<number | null>(null);

  // Force Update tick
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
        Abstract, minimalist line art. Technical diagram style. 
        Concept: "${textContext.substring(0, 100)}".
        Style: Black ink on white. No shading. Thin lines. Scientific illustration of decay or biology.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: { parts: [{ text: prompt }] },
        config: { imageConfig: { aspectRatio: "1:1", imageSize: "1K" } }
      });

      const base64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64) {
        setPages(prev => prev.map((p, i) => 
          i === pageIndex 
            ? { 
                ...p, 
                imageUrl: `data:image/png;base64,${base64}`, 
                hasGeneratedImage: true,
                isContentReady: true // Allow typing to resume!
              } 
            : p
        ));
      } else {
         // Fallback if image fails - allow typing anyway
         setPages(prev => prev.map((p, i) => i === pageIndex ? { ...p, isContentReady: true } : p));
      }
    } catch (e) {
      console.error("Image gen failed:", e);
      // Fallback if image fails - allow typing anyway
      setPages(prev => prev.map((p, i) => i === pageIndex ? { ...p, isContentReady: true } : p));
    }
  };

  const startBook = async () => {
    if (!startSeed.trim()) return;
    setIsGenerating(true);
    
    // Create first page WITH the user's text
    const initialPage: PageData = {
      id: 1,
      text: startSeed, // Keep the user's text!
      layout: 'text-only',
      hasGeneratedImage: false,
      isContentReady: true
    };
    
    setPages([initialPage]);
    setCurrentPageIndex(0);
    generationPageIndexRef.current = 0;
    
    // Initialize buffer empty - we only stream the CONTINUATION
    streamBufferRef.current = " "; // Add a space for safety separation
    processedCharCountRef.current = 0;

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    try {
      const resp = await ai.models.generateContentStream({
        model: 'gemini-3-pro-preview',
        contents: [{ role: 'user', parts: [{ text: startSeed }] }],
        config: { 
          systemInstruction: ULVEN_SYSTEM_INSTRUCTION,
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
      // 1. Check if the current writing page is waiting for an image
      const genIndex = generationPageIndexRef.current;
      const targetPage = pages[genIndex];

      if (!targetPage || !targetPage.isContentReady) {
        return; // Pause typing until image is loaded
      }

      // 2. Normal typing logic
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
          const isAtWordBoundary = char === ' ' || char === '.' || char === '\n';
          
          if (currentLength > CHARS_PER_PAGE && isAtWordBoundary) {
            const nextLayout = LAYOUTS[(genIndex + 1) % LAYOUTS.length];
            const newPageId = genIndex + 2;
            
            // Text only pages are ready immediately.
            // Image pages must wait for the image generation before typing starts.
            const isNextPageReady = nextLayout === 'text-only';

            newPages.push({
              id: newPageId,
              text: "", // Start next page empty
              layout: nextLayout,
              hasGeneratedImage: false,
              isContentReady: isNextPageReady
            });

            generationPageIndexRef.current = genIndex + 1;
            
            // Auto-flip to new page
            if (currentPageIndex === genIndex) {
               setCurrentPageIndex(genIndex + 1);
            }

            // Trigger image gen for the new page immediately
            if (nextLayout !== 'text-only') {
               generatePageImage(genIndex + 1, currentPage.text.slice(-100));
            }
          }
          return newPages;
        });
        setTick(t => t + 1);
      } 
    }, TYPING_SPEED);

    return () => clearInterval(interval);
  }, [isGenerating, currentPageIndex, pages]); // Added pages dependency to react to isContentReady changes

  // --- Gestures ---

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartRef.current === null) return;
    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStartRef.current - touchEnd;

    // Swipe Left -> Next Page
    if (diff > 50) {
      if (currentPageIndex < pages.length - 1) {
        setCurrentPageIndex(prev => prev + 1);
      }
    }
    
    // Swipe Right -> Prev Page
    if (diff < -50) {
      if (currentPageIndex > 0) {
        setCurrentPageIndex(prev => prev - 1);
      }
    }
    
    touchStartRef.current = null;
  };

  // --- Render ---

  if (!hasApiKey) {
    return (
      <AppContainer>
        <PageWrapper>
          <PageHeader>
             <span>SYSTEM</span>
             <span>ARKIV LÅST</span>
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
              SETT INN NØKKEL
            </button>
          </div>
          <PageFooter>0</PageFooter>
        </PageWrapper>
      </AppContainer>
    );
  }

  // Start Screen (if not generated yet)
  if (pages.length === 0) {
    return (
      <AppContainer>
        <PageWrapper>
          <PageHeader>
            <span>Tidsskrift for spekulativ designteori</span>
            <span>Nr. 1</span>
          </PageHeader>
          
          <div style={{flex: 1, display: 'flex', flexDirection: 'column'}}>
            <StartInput 
              value={startSeed} 
              onChange={e => setStartSeed(e.target.value)} 
              placeholder="Skriv åpningen her..."
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  startBook();
                }
              }}
            />
          </div>

          <PageFooter>
            <span>161</span> {/* Fake page number from example */}
            <span>1</span>
          </PageFooter>
        </PageWrapper>
      </AppContainer>
    );
  }

  const activePage = pages[currentPageIndex];

  return (
    <>
      <GlobalStyle />
      <AppContainer 
        onTouchStart={handleTouchStart} 
        onTouchEnd={handleTouchEnd}
      >
        <PageWrapper>
          <PageHeader>
            <span>Tidsskrift for spekulativ designteori</span>
            <span>Nr. {activePage.id}</span>
          </PageHeader>

          <ContentGrid $layout={activePage.layout}>
            {activePage.layout === 'image-top' && activePage.imageUrl && (
                <IllustrationContainer>
                  <Illustration src={activePage.imageUrl} />
                  <Caption>Fig. {activePage.id}a</Caption>
                </IllustrationContainer>
            )}

            <TextBody>
                {activePage.text}
            </TextBody>

            {activePage.layout === 'image-bottom' && activePage.imageUrl && (
                <IllustrationContainer>
                  <Illustration src={activePage.imageUrl} />
                  <Caption>Fig. {activePage.id}b</Caption>
                </IllustrationContainer>
            )}
          </ContentGrid>

          <PageFooter>
             <span>{160 + activePage.id}</span>
             <span>{activePage.id}</span>
          </PageFooter>
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