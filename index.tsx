import React, { useState, useRef, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI, Chat } from "@google/genai";
import styled, { keyframes, css, createGlobalStyle } from 'styled-components';

// --- System Instruction (Tor Ulven Emulation) ---
const ULVEN_SYSTEM_INSTRUCTION = `
### IDENTITET
Du er forfatteren **Tor Ulven**. Du skriver ikke for å underholde, men for å avdekke tilværelsens nullpunkt. Du produserer kortprosa og oppbrutte observasjoner.

### STILTREKKE
1.  **Arkeologisk blikk:** Betrakt nåtiden som om den allerede er fortid. En kaffekopp er et utgravd funn. Et ansikt er en maske som snart skal smuldre opp. Verden er et museum som ennå ikke har åpnet.
2.  **Presisjon:** Bruk et kjølig, presist språk. Ingen utropstegn. Ingen sentimentale adjektiver. Setningene skal være klare som glass, men innholdet mørkt.
3.  **Vokabular:** Kalk, fossiler, røntgen, speil, linser, støv, skygger, negativer, anatomi, skjelett, gjennomsiktighet, stillstand.
4.  **Syntaks:** Elliptisk. Du kan veksle mellom korte, konstaterende setninger og lange, buktende perioder som zoomer inn på mikroskopiske detaljer.
5.  **Stemning:** Ensomhet, men en "ren" ensomhet. Stillhet. Tingenes tause liv.

### GENERASJONS-INSTRUKS
Skriv en sammenhengende strøm av prosa. Når du blir bedt om å fortsette, bygg videre på stemningen uten brudd. Ikke repeter deg selv.
`;

// --- Configuration ---
const CHARS_PER_PAGE = 750; // Slightly reduced to fit bolder text + image on first page
const TYPING_SPEED = 20; 

// --- Global Styles ---
const GlobalStyle = createGlobalStyle`
  body {
    margin: 0;
    padding: 0;
    background-color: #1a1a1a;
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
  background-color: #111;
  perspective: 1500px;
`;

const PageWrapper = styled.div`
  /* Standard Trade Book Ratio (2:3) */
  aspect-ratio: 2 / 3;
  /* Fit to screen */
  height: min(92vh, calc(92vw * (3 / 2)));
  width: min(92vw, calc(92vh * (2 / 3)));
  
  background-color: #fcfbf9; /* Off-white book paper */
  box-shadow: 
    0 1px 1px rgba(0,0,0,0.15), 
    0 10px 0 -5px #e0e0e0, 
    0 10px 1px -4px rgba(0,0,0,0.15), 
    0 20px 0 -10px #e0e0e0, 
    0 20px 1px -9px rgba(0,0,0,0.15),
    10px 10px 30px rgba(0,0,0,0.4);
  
  position: relative;
  overflow: hidden;
  container-type: size;
  
  display: flex;
  flex-direction: column;
  /* Academic margins: wider bottom margin */
  padding: 6cqw 8cqw 10cqw 8cqw; 
`;

// Updated Header to match reference images (Divider line, Number Left, Title Right)
const PageHeader = styled.div`
  font-family: 'EB Garamond', serif;
  color: #000; 
  margin-bottom: 3.5cqw;
  padding-bottom: 1cqw; 
  border-bottom: 2px solid #000; /* Thicker line */
  
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  width: 100%;
  font-variant-numeric: oldstyle-nums;
`;

const HeaderNumber = styled.span`
  font-size: 3.5cqw; /* Much larger number */
  font-weight: 700; /* Bold */
  color: #000;
  line-height: 1;
`;

const HeaderTitle = styled.span`
  font-style: normal;
  font-size: 2.2cqw; /* Larger title */
  text-transform: uppercase; 
  letter-spacing: 0.15cqw;
  font-weight: 600; /* Bolder title */
  color: #000;
`;

// Grid layout with fixed slots
const ContentGrid = styled.div<{ $layout: string }>`
  display: grid;
  flex: 1;
  gap: 3cqw;
  height: 100%;
  align-content: start;
  
  /* Fixed height rows for image vs text stability */
  ${props => props.$layout === 'image-top' && css`
    grid-template-rows: 42cqh 1fr; 
  `}

  ${props => props.$layout === 'image-bottom' && css`
    grid-template-rows: 1fr 42cqh;
  `}

  ${props => props.$layout === 'text-only' && css`
    grid-template-rows: 1fr;
  `}
`;

const typographyStyles = css`
  font-family: 'EB Garamond', serif;
  font-size: 3.8cqw; 
  font-weight: 500; /* Bolder body text (Medium) */
  line-height: 1.35;
  text-align: justify;
  hyphens: auto;
  color: #000; /* Pure black */
  font-variant-ligatures: common-ligatures;
`;

const TextBody = styled.div`
  ${typographyStyles}
  white-space: pre-wrap;
  overflow: hidden; /* Ensure text doesn't spill out of its grid cell */
  
  p { 
    margin-bottom: 0; 
    text-indent: 1.5em; 
    margin-top: 0;
  }
  
  p:first-of-type { 
    text-indent: 0; 
  }
`;

// Fixed frame for images to simulate typesetting layout
const FixedImageFrame = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  overflow: hidden;
`;

const Illustration = styled.img`
  max-width: 100%; 
  max-height: 98%;
  height: auto;
  width: auto;
  display: block;
  mix-blend-mode: multiply; 
  filter: grayscale(100%) contrast(1.3);
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
  font-weight: 500;
  &::placeholder {
    color: #888;
    font-style: italic;
    opacity: 0.6;
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

// Layout cycle: Alternating or specific pattern
// Note: Initial page is handled manually in startBook to be 'image-bottom'
const LAYOUTS: LayoutType[] = ['text-only', 'image-top', 'text-only', 'image-bottom'];

const App = () => {
  const [hasApiKey, setHasApiKey] = useState(false);
  // Tor Ulven inspired seed
  const [startSeed, setStartSeed] = useState("Det er ingenting her, bare støvet som danser i lysstripen fra vinduet, som mikroskopiske planeter i et univers som ikke vet om oss.");
  
  const [pages, setPages] = useState<PageData[]>([]);
  const [isStarted, setIsStarted] = useState(false);
  
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  // Refs
  const chatSessionRef = useRef<Chat | null>(null);
  const streamBufferRef = useRef("");
  const processedCharCountRef = useRef(0);
  const generationPageIndexRef = useRef(0);
  const isFetchingRef = useRef(false);
  
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

  const getStyleReference = async (): Promise<string | null> => {
    try {
        const response = await fetch('/style.jpg');
        if (!response.ok) return null;
        const blob = await response.blob();
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = (reader.result as string).split(',')[1];
                resolve(base64);
            };
            reader.readAsDataURL(blob);
        });
    } catch (e) {
        console.log("No style reference found (style.jpg)");
        return null;
    }
  };

  const generatePageImage = async (pageIndex: number, textContext: string) => {
    if (pages[pageIndex]?.hasGeneratedImage) return;
    
    // Optimistic update to prevent double calls
    setPages(prev => prev.map((p, i) => i === pageIndex ? { ...p, hasGeneratedImage: true } : p));

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const refImage = await getStyleReference();
      
      const promptText = `
        Lag en naiv, enkel strektegning.
        Motiv: En abstrakt eller surrealistisk tolkning av denne teksten: "${textContext.substring(0, 300)}".
        
        STILINSTRUKSER:
        - Enkel, vaklevoren blekkstrek.
        - Svart strek på hvit bakgrunn.
        - INGEN farger eller gråtoner.
        - Minimalistisk.
        ${refImage ? 'VIKTIG: Bruk det vedlagte bildet som STILREFERANSE for strekføring og estetikk.' : 'Stil: Som Rodolphe Töpffer.'}
      `;

      const parts: any[] = [];
      if (refImage) {
          parts.push({ inlineData: { mimeType: 'image/jpeg', data: refImage }});
      }
      parts.push({ text: promptText });

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: parts },
        config: { 
          imageConfig: { aspectRatio: "4:3" }
        }
      });

      let base64 = null;
      if (response.candidates?.[0]?.content?.parts) {
          for (const part of response.candidates[0].content.parts) {
              if (part.inlineData) {
                  base64 = part.inlineData.data;
                  break;
              }
          }
      }

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

  const fetchMoreText = async (promptText: string) => {
    if (isFetchingRef.current || !chatSessionRef.current) return;
    
    isFetchingRef.current = true;
    try {
      const resp = await chatSessionRef.current.sendMessageStream({ message: promptText });
      
      for await (const chunk of resp) {
        const txt = chunk.text;
        if (txt) {
           streamBufferRef.current += txt;
        }
      }
    } catch (e) {
      console.error("Text gen failed", e);
    } finally {
      isFetchingRef.current = false;
    }
  };

  const startBook = async () => {
    if (!startSeed.trim()) return;
    setIsStarted(true);
    
    const initialPage: PageData = {
      id: 7, // Starting page number
      text: startSeed,
      layout: 'image-bottom', // FORCE FIRST PAGE TO HAVE IMAGE AT BOTTOM
      hasGeneratedImage: false,
      isContentReady: true
    };
    
    setPages([initialPage]);
    setCurrentPageIndex(0);
    generationPageIndexRef.current = 0;
    
    streamBufferRef.current = " "; 
    processedCharCountRef.current = 0;

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const chat = ai.chats.create({
      model: 'gemini-3-pro-preview',
      config: { 
        systemInstruction: ULVEN_SYSTEM_INSTRUCTION,
        thinkingConfig: { thinkingBudget: 4096 }
      }
    });
    
    chatSessionRef.current = chat;
    fetchMoreText(startSeed);
    
    // Trigger image generation immediately for the first page
    generatePageImage(0, startSeed);
  };

  useEffect(() => {
    if (!isStarted) return;

    const interval = setInterval(() => {
      const genIndex = generationPageIndexRef.current;
      const targetPage = pages[genIndex];

      if (!targetPage || !targetPage.isContentReady) return; 

      const buffer = streamBufferRef.current;
      const processed = processedCharCountRef.current;

      if (!isFetchingRef.current && (buffer.length - processed) < 300) {
        fetchMoreText("Fortsett.");
      }

      if (processed < buffer.length) {
        const char = buffer[processed];
        processedCharCountRef.current += 1;

        setPages(prevPages => {
          const newPages = [...prevPages];
          const currentPage = newPages[genIndex];

          currentPage.text += char;

          const currentLength = currentPage.text.length;
          const isAtWordBoundary = char === ' ' || char === '.' || char === '\n';
          
          // Shorter text limit if page has image
          const hasImage = currentPage.layout !== 'text-only';
          const maxChars = hasImage ? CHARS_PER_PAGE * 0.50 : CHARS_PER_PAGE;

          if (currentLength > maxChars && isAtWordBoundary) {
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
               generatePageImage(genIndex + 1, currentPage.text.slice(-300));
            }
          }
          return newPages;
        });
        setTick(t => t + 1);
      } 
    }, TYPING_SPEED);

    return () => clearInterval(interval);
  }, [isStarted, currentPageIndex, pages]); 

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartRef.current === null) return;
    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStartRef.current - touchEnd;

    if (diff > 50 && currentPageIndex < pages.length - 1) {
      setCurrentPageIndex(prev => prev + 1);
    }
    
    if (diff < -50 && currentPageIndex > 0) {
      setCurrentPageIndex(prev => prev - 1);
    }
    
    touchStartRef.current = null;
  };

  if (!hasApiKey) {
    return (
      <AppContainer>
        <PageWrapper>
          <PageHeader>
             <HeaderNumber>0</HeaderNumber>
             <HeaderTitle>BEGRENSET TILGANG</HeaderTitle>
          </PageHeader>
          <div style={{flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center'}}>
            <button 
              style={{
                background: 'transparent', 
                border: '2px solid #000', 
                color: '#000', 
                padding: '1.5cqw 4cqw', 
                cursor: 'pointer',
                fontFamily: 'EB Garamond, serif',
                fontSize: '2.5cqw',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.1cqw'
              }} 
              onClick={handleSelectKey}
            >
              Velg API-nøkkel
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
            <HeaderNumber>7</HeaderNumber>
            <HeaderTitle>Etterlatte fragmenter</HeaderTitle>
          </PageHeader>
          
          <div style={{flex: 1, display: 'flex', flexDirection: 'column'}}>
            <StartInput 
              value={startSeed} 
              onChange={e => setStartSeed(e.target.value)} 
              placeholder="Skriv her..."
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

  return (
    <>
      <GlobalStyle />
      <AppContainer 
        onTouchStart={handleTouchStart} 
        onTouchEnd={handleTouchEnd}
      >
        <PageWrapper>
          <PageHeader>
            {/* Strict Header: Number Left, Title Right as per images */}
            <HeaderNumber>{activePage.id}</HeaderNumber>
            <HeaderTitle>Stein og Speil</HeaderTitle>
          </PageHeader>

          <ContentGrid $layout={activePage.layout}>
            {/* Top Image Slot */}
            {activePage.layout === 'image-top' && (
               <FixedImageFrame>
                 {activePage.imageUrl && (
                    <Illustration src={activePage.imageUrl} />
                 )}
               </FixedImageFrame>
            )}

            {/* Text Slot */}
            <TextBody>
                {activePage.text}
            </TextBody>

            {/* Bottom Image Slot */}
            {activePage.layout === 'image-bottom' && (
                <FixedImageFrame>
                   {activePage.imageUrl && (
                      <Illustration src={activePage.imageUrl} />
                   )}
                </FixedImageFrame>
            )}
          </ContentGrid>
        </PageWrapper>

        {pages.length > 1 && (
          <NavigationHint>
            Side {currentPageIndex + 1} av {pages.length}
          </NavigationHint>
        )}
      </AppContainer>
    </>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);