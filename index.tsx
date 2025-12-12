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
Skriv en sammenhengende strøm av prosa. Bygg videre på teksten.
`;

// --- Configuration ---
const CHARS_PER_PAGE = 750; 
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
    touch-action: none; /* Prevent scroll on PWA */
    user-select: none;
    -webkit-user-select: none;
  }
`;

// --- Animations ---
const pulse = keyframes`
  0% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.3; transform: scale(0.85); }
  100% { opacity: 1; transform: scale(1); }
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
  aspect-ratio: 2 / 3;
  height: min(92vh, calc(92vw * (3 / 2)));
  width: min(92vw, calc(92vh * (2 / 3)));
  
  background-color: #fcfbf9;
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
  padding: 6cqw 8cqw 10cqw 8cqw; 
`;

const PageHeader = styled.div`
  font-family: 'EB Garamond', serif;
  color: #000; 
  margin-bottom: 3.5cqw;
  padding-bottom: 1cqw; 
  border-bottom: 2px solid #000;
  
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  width: 100%;
  font-variant-numeric: oldstyle-nums;
`;

const HeaderNumber = styled.span`
  font-size: 3.5cqw;
  font-weight: 700;
  color: #000;
  line-height: 1;
`;

const HeaderTitle = styled.span`
  font-style: normal;
  font-size: 2.2cqw;
  text-transform: uppercase; 
  letter-spacing: 0.15cqw;
  font-weight: 600;
  color: #000;
`;

const ContentGrid = styled.div<{ $layout: string }>`
  display: grid;
  flex: 1;
  gap: 3cqw;
  height: 100%;
  align-content: start;
  
  ${props => props.$layout === 'image-top' && css`grid-template-rows: 42cqh 1fr;`}
  ${props => props.$layout === 'image-bottom' && css`grid-template-rows: 1fr 42cqh;`}
  ${props => props.$layout === 'text-only' && css`grid-template-rows: 1fr;`}
`;

const typographyStyles = css`
  font-family: 'EB Garamond', serif;
  font-size: 3.8cqw; 
  font-weight: 500;
  line-height: 1.35;
  text-align: justify;
  hyphens: auto;
  color: #000;
  font-variant-ligatures: common-ligatures;
`;

const TextBody = styled.div`
  ${typographyStyles}
  white-space: pre-wrap;
  overflow: hidden;
  
  p { 
    margin-bottom: 0; 
    text-indent: 1.5em; 
    margin-top: 0;
  }
  
  p:first-of-type { 
    text-indent: 0; 
  }
`;

const FixedImageFrame = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  overflow: hidden;
`;

const Illustration = styled.img<{ $visible: boolean }>`
  max-width: 100%; 
  max-height: 98%;
  height: auto;
  width: auto;
  display: block;
  mix-blend-mode: multiply; 
  filter: grayscale(100%) contrast(1.3);
  opacity: ${props => props.$visible ? 1 : 0};
  transition: opacity 2s ease-in-out;
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

// Pulsing period / cursor
const PulsingPeriod = styled.span`
  display: inline-block;
  font-weight: 900;
  color: #000;
  animation: ${pulse} 1.5s infinite ease-in-out;
  cursor: text;
`;

const UserInputSpan = styled.span`
  color: #333;
  /* text-decoration: underline; */ /* Optional: distinguish user text */
`;

// Hidden input to capture mobile keyboard
const HiddenInput = styled.textarea`
  position: absolute;
  opacity: 0;
  top: 0;
  left: 0;
  height: 1px;
  width: 1px;
  pointer-events: none; /* We programmatically focus it */
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
  imageVisible: boolean;
}

const LAYOUTS: LayoutType[] = ['text-only', 'image-top', 'text-only', 'image-bottom'];

const App = () => {
  const [hasApiKey, setHasApiKey] = useState(false);
  const [startSeed, setStartSeed] = useState("");
  
  const [pages, setPages] = useState<PageData[]>([]);
  const [isStarted, setIsStarted] = useState(false);
  
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  // Interaction States
  const [isWaitingForInput, setIsWaitingForInput] = useState(false);
  const [draftInput, setDraftInput] = useState("");
  const hiddenInputRef = useRef<HTMLTextAreaElement>(null);

  // Refs
  const chatSessionRef = useRef<Chat | null>(null);
  const streamBufferRef = useRef("");
  const processedCharCountRef = useRef(0);
  const generationPageIndexRef = useRef(0);
  const isFetchingRef = useRef(false);
  
  const touchStartRef = useRef<number | null>(null);

  const getApiKey = () => process.env.API_KEY || process.env.GEMINI_API_KEY;

  // --- Persistence & Init ---

  useEffect(() => {
    const checkKey = async () => {
      if (getApiKey()) {
        setHasApiKey(true);
        return;
      }
      if (window.aistudio && await window.aistudio.hasSelectedApiKey()) {
        setHasApiKey(true);
      }
    };
    checkKey();
  }, []);

  // Load from cache on mount
  useEffect(() => {
    const cachedPages = localStorage.getItem('ulven_pages');
    const cachedIndex = localStorage.getItem('ulven_page_index');
    
    if (cachedPages) {
      try {
        const parsedPages = JSON.parse(cachedPages);
        setPages(parsedPages);
        setIsStarted(true);
        
        // Restore index
        if (cachedIndex) {
          const idx = parseInt(cachedIndex, 10);
          setCurrentPageIndex(isNaN(idx) ? 0 : idx);
        }
        
        // Restore generation state (assume finished fetching for cached content)
        // Set pointers to the end of cached text
        let totalText = "";
        parsedPages.forEach((p: PageData) => totalText += p.text);
        streamBufferRef.current = totalText;
        processedCharCountRef.current = totalText.length;
        generationPageIndexRef.current = parsedPages.length - 1;

        // Force into input mode if we just loaded
        setIsWaitingForInput(true);
      } catch (e) {
        console.error("Cache load error", e);
      }
    }
  }, []);

  // Save to cache on change
  useEffect(() => {
    if (pages.length > 0) {
      localStorage.setItem('ulven_pages', JSON.stringify(pages));
    }
    localStorage.setItem('ulven_page_index', currentPageIndex.toString());
  }, [pages, currentPageIndex]);

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
        return null;
    }
  };

  const generatePageImage = async (pageIndex: number, textContext: string) => {
    if (pages[pageIndex]?.hasGeneratedImage) return;
    
    setPages(prev => prev.map((p, i) => i === pageIndex ? { ...p, hasGeneratedImage: true } : p));

    try {
      const apiKey = getApiKey();
      if (!apiKey && (!window.aistudio || !await window.aistudio.hasSelectedApiKey())) return;
      
      const ai = new GoogleGenAI({ apiKey: apiKey || "" });
      const refImage = await getStyleReference();
      
      const promptText = `
        Lag en naiv, enkel strektegning.
        Motiv: En abstrakt eller surrealistisk tolkning av denne teksten: "${textContext.substring(0, 300)}".
        STILINSTRUKSER: Enkel, vaklevoren blekkstrek. Svart strek på hvit bakgrunn.
        ${refImage ? 'VIKTIG: Bruk vedlagte stilreferanse.' : 'Stil: Som Rodolphe Töpffer.'}
      `;

      const parts: any[] = [];
      if (refImage) parts.push({ inlineData: { mimeType: 'image/jpeg', data: refImage }});
      parts.push({ text: promptText });

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: parts },
        config: { imageConfig: { aspectRatio: "4:3" } }
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
          i === pageIndex ? { ...p, imageUrl: `data:image/png;base64,${base64}`, isContentReady: true } : p
        ));
      } else {
         setPages(prev => prev.map((p, i) => i === pageIndex ? { ...p, isContentReady: true } : p));
      }
    } catch (e) {
      setPages(prev => prev.map((p, i) => i === pageIndex ? { ...p, isContentReady: true } : p));
    }
  };

  const ensureChatSession = () => {
    if (chatSessionRef.current) return chatSessionRef.current;

    const apiKey = getApiKey();
    const ai = new GoogleGenAI({ apiKey: apiKey || "" });
    
    // If we are recovering from a reload, try to give context
    let history = [];
    if (pages.length > 0) {
      // Reconstruct simple history: Model said everything so far.
      // Limits context window usage by just taking last ~2000 chars if huge
      const fullText = pages.map(p => p.text).join(" ");
      const contextText = fullText.slice(-3000); 
      
      history = [
         { role: 'user', parts: [{ text: "Start historien." }] },
         { role: 'model', parts: [{ text: contextText }] }
      ];
    }

    const chat = ai.chats.create({
      model: 'gemini-3-pro-preview',
      history: history,
      config: { 
        systemInstruction: ULVEN_SYSTEM_INSTRUCTION,
        thinkingConfig: { thinkingBudget: 4096 }
      }
    });
    chatSessionRef.current = chat;
    return chat;
  };

  const fetchMoreText = async (promptText: string) => {
    if (isFetchingRef.current) return;
    
    isFetchingRef.current = true;
    try {
      const chat = ensureChatSession();
      const resp = await chat.sendMessageStream({ message: promptText });
      
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
      id: 7,
      text: startSeed,
      layout: 'image-bottom',
      hasGeneratedImage: false,
      isContentReady: true,
      imageVisible: false 
    };
    
    setPages([initialPage]);
    setCurrentPageIndex(0);
    generationPageIndexRef.current = 0;
    streamBufferRef.current = " "; 
    processedCharCountRef.current = 0;

    ensureChatSession(); 
    // Initial fetch based on seed? No, we have the seed text. 
    // We just want to continue FROM the seed.
    // So we treat the seed as the first chunk.
    
    // Wait for user input to continue after seed
    // Or auto-continue a bit? 
    // Prompt implied auto-continue initially.
    // "research how to best emulate... create it perfectly"
    // "once the model stops... user has to write"
    // Let's let it run a bit first.
    fetchMoreText(startSeed + " (Fortsett)");
    generatePageImage(0, startSeed);
  };

  // Image visibility timer
  useEffect(() => {
    if (!isStarted) return;
    const targetIndex = currentPageIndex;
    if (!pages[targetIndex]) return;

    const timer = setTimeout(() => {
      setPages(prev => prev.map((p, i) => 
        i === targetIndex ? { ...p, imageVisible: true } : p
      ));
    }, 4000);

    return () => clearTimeout(timer);
  }, [currentPageIndex, isStarted]); 

  // Typing / Logic Loop
  useEffect(() => {
    if (!isStarted) return;

    const interval = setInterval(() => {
      const genIndex = generationPageIndexRef.current;
      const targetPage = pages[genIndex];

      if (!targetPage) return; 

      const buffer = streamBufferRef.current;
      const processed = processedCharCountRef.current;

      // --- Stop & Pulse Logic ---
      // If we have caught up to the buffer AND we are not fetching...
      if (!isFetchingRef.current && processed >= buffer.length) {
         if (!isWaitingForInput) {
           setIsWaitingForInput(true);
         }
         return; // Pause loop
      }

      // If we are processing, ensure we are not in waiting mode
      if (processed < buffer.length && isWaitingForInput) {
        setIsWaitingForInput(false);
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
              isContentReady: isNextPageReady,
              imageVisible: false 
            });

            generationPageIndexRef.current = genIndex + 1;
            
            // Auto-advance if reader is at the end
            if (currentPageIndex === genIndex) {
               setCurrentPageIndex(genIndex + 1);
            }

            if (nextLayout !== 'text-only') {
               generatePageImage(genIndex + 1, currentPage.text.slice(-300));
            }
          }
          return newPages;
        });
      } 
    }, TYPING_SPEED);

    return () => clearInterval(interval);
  }, [isStarted, currentPageIndex, pages, isWaitingForInput]); 

  // --- Interaction Handlers ---

  const handlePageTap = () => {
    if (isWaitingForInput && hiddenInputRef.current) {
      hiddenInputRef.current.focus();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDraftInput(e.target.value);
  };

  const handleInputSubmit = async (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!draftInput.trim()) return;

      const input = draftInput;
      setDraftInput("");
      
      // Add user text to page immediately
      streamBufferRef.current += " " + input; 
      // Note: The loop will pick this up and render it.
      // But we also need to trigger the AI response.
      
      // We must reset 'isWaiting' temporarily so the loop processes the user text
      // Then the fetchMoreText will run.
      setIsWaitingForInput(false);
      
      await fetchMoreText(input);
    }
  };

  // --- Touch Navigation ---

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartRef.current === null) return;
    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStartRef.current - touchEnd;

    if (Math.abs(diff) < 10) {
      handlePageTap(); // Treat as tap
    } else {
      if (diff > 50 && currentPageIndex < pages.length - 1) {
        setCurrentPageIndex(prev => prev + 1);
      }
      if (diff < -50 && currentPageIndex > 0) {
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

  if (!isStarted && pages.length === 0) {
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
        onClick={handlePageTap}
      >
        <HiddenInput 
          ref={hiddenInputRef}
          value={draftInput}
          onChange={handleInputChange}
          onKeyDown={handleInputSubmit}
          autoComplete="off"
        />

        <PageWrapper>
          <PageHeader>
            <HeaderNumber>{activePage.id}</HeaderNumber>
            <HeaderTitle>Stein og Speil</HeaderTitle>
          </PageHeader>

          <ContentGrid $layout={activePage.layout}>
            {activePage.layout === 'image-top' && (
               <FixedImageFrame>
                 {activePage.imageUrl && (
                    <Illustration src={activePage.imageUrl} $visible={activePage.imageVisible} />
                 )}
               </FixedImageFrame>
            )}

            <TextBody>
                {activePage.text}
                {/* Render draft input if we are on the active page and waiting */}
                {isWaitingForInput && currentPageIndex === pages.length - 1 && (
                  <>
                    <UserInputSpan>{draftInput}</UserInputSpan>
                    <PulsingPeriod>{draftInput.length > 0 ? '' : '.'}</PulsingPeriod>
                  </>
                )}
            </TextBody>

            {activePage.layout === 'image-bottom' && (
                <FixedImageFrame>
                   {activePage.imageUrl && (
                      <Illustration src={activePage.imageUrl} $visible={activePage.imageVisible} />
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