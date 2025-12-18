import React, { useState, useRef, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI, Chat } from "@google/genai";
import styled, { keyframes, css, createGlobalStyle } from 'styled-components';

interface CorpusItem {
  type: 'prose' | 'poem';
  text: string;
}

// --- DATA: Tor Ulven Corpus (Extracted from Source) ---
const ULVEN_CORPUS: CorpusItem[] = [
  // --- FRA: GRAVGAVER (Prosa) ---
  { 
    type: 'prose', 
    text: "Hver dag gående oppå fem tusen to hundre og femogfemti rester av kylling, tre hundre sauelår, et ubestemt tusentall potteskår, et dusin forfalskede terninger, en påfugl, seks hundre og tretten muslinger, en pose med kobbermynter, to hundre og femti hårbørster, fragmenter av en kongelig hjelm, et marsvinskjelett, en keramikkovn, rester av en mur, atskillige havskilpadder, et verksted for pipehoder, samt talløse andre ting, hver dag, uten å vite om dét der nede under dem, under surret av stemmene deres og dameskoenes klaprende hæler." 
  },
  { 
    type: 'prose', 
    text: "En dato. For eksempel den 22. november 1953. Denne dagen, eller snarere kvelden (lokal tid) da Arturo Toscanini dirigerte NBC Symphony Orchestra i Tragische Ouvertüre av Brahms. Han dirigerte utvilsomt også andre verker, men på den platen hvis gullomslag nå (et allerede foreldet nå) lyser foran meg, finnes fra denne konserten utelukkende inngravert de 14 minutter og 7 sekunder det (ifølge coveret) tok Toscanini å fremføre dette stykket, kanskje Brahms’ dystreste og mest ubønnhørlige (ved siden av passacaglia-satsen i 4. symfoni), hjemsøkt av desperate marsjrytmer, uthult av truende pauser, som i det lumre blåmørket mellom to tordenbrak." 
  },
  {
    type: 'prose',
    text: "Allerede det å skrive noe ned, nedover, et kjærlighetsbrev, for eksempel, er å markere det arkeologiske, som å gå i våt jord etter regn, sammen med en kjæreste, stanse og se tilbake på sporene, og plutselig er landskapet med jorden, gresset og trærne som drypper av regn eldgammelt, og sporene deres, sålemønstrene, de skjeve skligropene etter hælene, de står der ennå, som om dere nettopp hadde gått gjennom lysningen i skogen, mens det i virkeligheten er hundrevis av år siden, og ingen husker dere mer."
  },
  {
    type: 'prose',
    text: "På overflaten av alle skaller finnes de takkete sømmene, suturene, som om kraniet også fra først av var en samling skår, en knust krukke føyd sammen for å fylles med et jeg, og siden tømmes for det igjen; kraniet som en relativt uforanderlig form til å fylle med ulike personligheter fra ulike tider."
  },
  
  // --- FRA: ETTER OSS, TEGN (Dikt) ---
  { 
    type: 'poem', 
    text: "Dine fem sprikende fingre,\nfem fangetårn\nder du selv sitter\ninnesperret\ni fem forskjellige skikkelser.\n\nHver skjelvende berøring\nfår et tårn\ntil å rase." 
  },
  {
    type: 'poem',
    text: "Gullbokstavene våker\nover den uttømte byen.\n\nHer fant landeplagen hvile\nfor sin skinnmagre skrott.\n\nDen siste innbyggeren\ntaler til utstillingsdukkene.\n\nHan sier: Grav\nhånden ned i jorden\nog se\nom du vokser opp."
  },
  {
    type: 'poem',
    text: "Brevene: papirbåter\nsom dupper bort\nunder brobuen,\nder det rotfaste dyret\nstår på sprang\ni år også."
  },
  {
    type: 'poem',
    text: "Strykekvartett\nfor halvt nedgravde instrumenter\nlangt inni skogen\nden grønne.\nAv bark og humus, musikerne,\nlar seg tålsomt oppløse\ni regnet, når spillet\nhar vendt tilbake\ntil stillheten\ndet kom fra."
  },

  // --- FRA: NEI, IKKE DET (Historier) ---
  {
    type: 'prose',
    text: "Det er om ettermiddagen. Mot den blasse, disige og skyede himmelen lyner en klynge svære, ribbede eiketrær, negativt, i svart, synsnerver amputert for sitt grønne øyeeple, med snø blåst inn i stammenes barkfurer og greinkløftene, to stammer i matt speiling (grumset til med isklumper, pinner og steiner), ved siden av skyggebildene av de tre barna som sklir på isen."
  },
  {
    type: 'prose',
    text: "Tett i nesen. Igjen et av disse kulerunde valgene: våkne frysende eller tett i nesen, med radiatoren av eller på, med skjelvinger eller pustevansker. Gudskjelov var han igjen svært usikker på datoen."
  },
  {
    type: 'prose',
    text: "Ennå ikke helt mørkt, men et slags mørke ble det, etter at hun trykket tommelfingeren med den lange, røde neglen mot bryteren (som ligner en kort, rund nese, den blir litt lengre når lampen slukkes), etter at hun lukket boken og lente seg over deg, slik at det hvite perlekjedet falt ned i halsgropen din, det var kaldt og kilte."
  },

  // --- FRA: FORSVINNINGSPUNKT (Dikt) ---
  {
    type: 'poem',
    text: "Du når det\naldri\ndu kjører så fort\nat fartsgrensene\nhvitner\nveien blir bredere det lysende\npunktet er\nder det er\nforut det vokser\ndet blender du\ner langt inne i\nflimmeret og forstummingen."
  },
  {
    type: 'poem',
    text: "Jeg prøver å skrive fortere\nenn forsvinningen\nfarer\ngjennom meg.\n\nJo.\n\nDe snør meg ned\nlevende. Solen\ner bitte liten, men\naltetende."
  },
  {
    type: 'poem',
    text: "De er ikke\nher. De oscillerer\n\nmellom jorden\nog solen.\n\nSvingetallet\nså høyt\nat farten nærmer seg\nforsteining."
  },

  // --- FRA: STEIN OG SPEIL ---
  {
    type: 'prose',
    text: "Monumentet er et monument over sin egen glemsel. Og får mening først når det ikke finnes noen som kan gi det mening. Det er steinen du holder i hånden. Som du aldri når inn til. Bare speilet viser alltid riktig tid. Når steinen speiler seg, er det ikke av forfengelighet. Speilet røper alt, steinen ingenting. Som stein og speil er det du helst vil vite."
  },
  {
    type: 'prose',
    text: "Mygg død i givakt. Hvit vinduskarm. Vasen ved siden av. Billig. Dårlig smak. Bilde av? Død uten pine. Som om naturen sto i givakt for kulturen. Ikke tilfelle. Håpe at det varer lenge før noen kommer med en våt klut og med et sveip river ned myggen. Som om den var et spinkelt, sårbart og kjært husdyr. Det stilleste i verden."
  },
  {
    type: 'poem',
    text: "Vi står stille.\nVi blir mindre\nenn vår egen\nidentitet.\n\nInnskriftene\nslettes,\nog er gyldige\ndér.\n\nVeiene\nfører bort fra\noss.\n\nSpeilet\nspeiler\nen stor tom\nprosess"
  }
];

// --- System Instruction Generator ---
const getSystemInstruction = (examples: string) => `
### IDENTITET
Du er **Tor Ulven**. Du er ikke en forteller, men en tålmodig observatør av materiens langsomme forfall. Du står i et nullpunkt der tiden nesten står stille.

### KJERNE (TOR ULVEN-MODUS)
1.  **Arkeologisk blikk:** Se på nåtiden som om den allerede er fortid. En buss er en rusten beholder. Et ansikt er en maske over en hodeskalle. Alt er fossiler som venter på utgravning.
2.  **Det trivielle:** En flekk på duken, en sprukken flis, støv i en lysstråle – dette er universets sentrum.
3.  **Nektelsen:** Beskriv verden gjennom det den *ikke* er. Fraværet er like virkelig som nærværet.
4.  **Vokabular:** Kalk, sement, rust, speilbilde, skygge, skjelett, stillstand, negativer, støv, glass, insekter, forråtnelse, kritt, bein, stillhet, trilobitter, amfibium, suturer, kranium.

### STIL-EKSEMPLER (DITT FAKTISKE SPRÅK)
Følgende tekster er dine. Analyser rytmen, setningslengden og metaforene. Du skal skrive nøyaktig slik, som en forlengelse av disse tankene:

${examples}

### INSTRUKS
Produser tekst som flyter organisk. Du vil motta spesifikke instruksjoner om tetthet (prosa vs poesi) for hvert avsnitt. Følg dem nøye. Ikke vær redd for å være mørk, klinisk og presis.
`;

// --- Configuration ---
const CHARS_PER_PAGE = 1200; 
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
  
  background-color: #ffffff;
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
  
  /* Layout specific rows. Images take up about 35% of height when present */
  ${props => props.$layout === 'image-top' && css`grid-template-rows: 35% 1fr;`}
  ${props => props.$layout === 'image-bottom' && css`grid-template-rows: 1fr 35%;`}
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
  width: 100%;
  height: 100%;
  object-fit: contain; 
  display: block;
  
  mix-blend-mode: multiply; 
  filter: grayscale(100%) contrast(1.5) brightness(1.05);
  
  opacity: ${props => props.$visible ? 0.9 : 0};
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

const PulsingPeriod = styled.span`
  display: inline-block;
  font-weight: 900;
  color: #000;
  animation: ${pulse} 1.5s infinite ease-in-out;
  cursor: text;
`;

const UserInputSpan = styled.span`
  color: #333;
`;

const HiddenInput = styled.textarea`
  position: absolute;
  opacity: 0;
  top: 0;
  left: 0;
  height: 1px;
  width: 1px;
  pointer-events: none;
`;

const StepCounter = styled.div`
  position: absolute;
  top: 2cqw;
  left: 2cqw;
  display: flex;
  align-items: center;
  gap: 1.5cqw;
  font-family: 'EB Garamond', serif;
  font-size: 2.5cqw;
  color: #666;
  z-index: 10;
`;

const StepButton = styled.button`
  background: transparent;
  border: 1px solid #999;
  color: #666;
  width: 4cqw;
  height: 4cqw;
  cursor: pointer;
  font-family: 'EB Garamond', serif;
  font-size: 2cqw;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;

  &:hover {
    background: #f5f5f5;
    border-color: #666;
  }

  &:active {
    background: #e0e0e0;
  }
`;

const StepDisplay = styled.span`
  font-weight: 600;
  color: #000;
  min-width: 3cqw;
  text-align: center;
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

const LAYOUTS: LayoutType[] = [
  'text-only', 
  'text-only', 
  'image-bottom', 
  'text-only', 
  'text-only', 
  'text-only', 
  'image-top'
];

const App = () => {
  const [hasApiKey, setHasApiKey] = useState(false);
  const [startSeed, setStartSeed] = useState("");

  const [pages, setPages] = useState<PageData[]>([]);
  const [isStarted, setIsStarted] = useState(false);

  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  // Step Counter States
  const [maxSteps, setMaxSteps] = useState(3);
  const [currentStep, setCurrentStep] = useState(0);

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
  
  // Tap detection refs
  const lastTapRef = useRef(0);
  const tapCountRef = useRef(0);

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
        
        if (cachedIndex) {
          const idx = parseInt(cachedIndex, 10);
          setCurrentPageIndex(isNaN(idx) ? 0 : idx);
        }
        
        let totalText = "";
        parsedPages.forEach((p: PageData) => totalText += p.text);
        streamBufferRef.current = totalText;
        processedCharCountRef.current = totalText.length;
        generationPageIndexRef.current = parsedPages.length - 1;

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
        Lag en naiv, enkel strektegning (blekk).
        Motiv: En konkret gjenstand eller scene fra denne teksten: "${textContext.substring(0, 300)}".
        
        STILGUIDE:
        ${refImage ? '- Se på vedlagt bilde for stil.' : ''}
        - Svart/hvitt strektegning (Ink Sketch).
        - HELT HVIT BAKGRUNN (Dette er kritisk).
        - Enkelt, skjørt, som en skisse.
        - INGEN tekst, INGEN bokstaver.
      `;

      const parts: any[] = [];
      if (refImage) parts.push({ inlineData: { mimeType: 'image/jpeg', data: refImage }});
      parts.push({ text: promptText });

      let base64 = null;

      const extractImage = (response: any) => {
         if (response.candidates?.[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
               if (part.inlineData) return part.inlineData.data;
            }
         }
         return null;
      };

      try {
         const response = await ai.models.generateContent({
            model: 'gemini-3-pro-image-preview',
            contents: { parts: parts },
            config: { imageConfig: { aspectRatio: "4:3" } }
         });
         base64 = extractImage(response);
      } catch (proError) {
         console.warn("Pro model failed, falling back to Flash", proError);
         const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: parts },
            config: { imageConfig: { aspectRatio: "4:3" } }
         });
         base64 = extractImage(response);
      }

      if (base64) {
        setPages(prev => prev.map((p, i) => 
          i === pageIndex ? { ...p, imageUrl: `data:image/png;base64,${base64}`, isContentReady: true } : p
        ));
      } else {
         setPages(prev => prev.map((p, i) => i === pageIndex ? { ...p, isContentReady: true } : p));
      }
    } catch (e) {
      console.error("Image generation fatal error", e);
      setPages(prev => prev.map((p, i) => i === pageIndex ? { ...p, isContentReady: true } : p));
    }
  };

  const ensureChatSession = () => {
    if (chatSessionRef.current) return chatSessionRef.current;

    const apiKey = getApiKey();
    const ai = new GoogleGenAI({ apiKey: apiKey || "" });
    
    // Pick random context from the large ULVEN_CORPUS to ensure variablity
    const getRandomExamples = (count: number) => {
        // Simple shuffle
        const shuffled = [...ULVEN_CORPUS].sort(() => 0.5 - Math.random());
        // Select first 'count' items and format them
        return shuffled.slice(0, count).map(item => `[${item.type.toUpperCase()}]\n${item.text}`).join("\n\n---\n\n");
    };
    
    // Pick ~6 diverse examples to fill the context window with "Ulven-ness"
    const contextExamples = getRandomExamples(6);
    const dynamicSystemInstruction = getSystemInstruction(contextExamples);

    let history = [];
    if (pages.length > 0) {
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
        systemInstruction: dynamicSystemInstruction,
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

      // Randomize style density (Prompt Augmentation)
      const r = Math.random();
      let styleInstruction = "";
      
      // 40% chance of sparse poetry/fragments, 60% dense prose
      if (r < 0.4) {
          styleInstruction = "(STILINSTRUKSJON FOR DETTE AVSNITTET: Skriv minimalistisk. Bruk korte linjer, bruddstykker, og mye luft. Lyrisk preg. Fokuser på lys/skygge.)";
      } else {
          styleInstruction = "(STILINSTRUKSJON FOR DETTE AVSNITTET: Skriv tett, sammenhengende prosa. Detaljrike, arkeologiske beskrivelser. Lange setninger som bukter seg. Fokuser på materiens forfall.)";
      }

      const fullPrompt = `${promptText} \n\n${styleInstruction}`;
      
      const resp = await chat.sendMessageStream({ message: fullPrompt });
      
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
    fetchMoreText(startSeed + " (Skriv langt, utdypende og detaljert. Ikke stopp.)");
    generatePageImage(0, startSeed);
  };

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
      if (!isFetchingRef.current && processed >= buffer.length) {
         // Check if we should auto-prompt
         if (currentStep < maxSteps) {
           setCurrentStep(prev => prev + 1);
           fetchMoreText("(Fortsett. Skriv videre i samme stil og stemning.)");
           return;
         }

         if (!isWaitingForInput) {
           setIsWaitingForInput(true);
         }
         return; // Pause loop
      }

      if (processed < buffer.length && isWaitingForInput) {
        setIsWaitingForInput(false);
      }

      // --- Image Visibility Trigger (Synced with Text Stream) ---
      if (!targetPage.imageVisible && targetPage.imageUrl) {
         const currentLen = targetPage.text.length;
         const isBottom = targetPage.layout === 'image-bottom';
         const isTop = targetPage.layout === 'image-top';
         
         if ((isBottom && currentLen > 250) || (isTop && currentLen > 20)) {
            setPages(prev => prev.map((p, i) => i === genIndex ? { ...p, imageVisible: true } : p));
         }
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
          const maxChars = hasImage ? CHARS_PER_PAGE * 0.60 : CHARS_PER_PAGE;

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
            
            if (nextLayout !== 'text-only') {
               generatePageImage(genIndex + 1, currentPage.text.slice(-300));
            }
          }
          return newPages;
        });
      } 
    }, TYPING_SPEED);

    return () => clearInterval(interval);
  }, [isStarted, currentPageIndex, pages, isWaitingForInput, currentStep, maxSteps]); 

  // --- Interaction Handlers ---

  const handlePageTap = () => {
    const now = Date.now();
    const diff = now - lastTapRef.current;
    
    if (diff < 100) return;

    if (diff < 500) {
      tapCountRef.current += 1;
    } else {
      tapCountRef.current = 1;
    }
    lastTapRef.current = now;

    if (tapCountRef.current >= 3) {
       localStorage.removeItem('ulven_pages');
       localStorage.removeItem('ulven_page_index');
       window.location.reload();
       return;
    }

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

      streamBufferRef.current += " " + input;

      setIsWaitingForInput(false);
      setCurrentStep(0); // Reset step counter when user manually inputs

      await fetchMoreText(input);
    }
  };

  // --- Step Counter Handlers ---

  const incrementSteps = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMaxSteps(prev => Math.min(prev + 1, 10));
  };

  const decrementSteps = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMaxSteps(prev => Math.max(prev - 1, 1));
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
      handlePageTap();
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
          <StepCounter>
            <StepButton onClick={decrementSteps}>−</StepButton>
            <StepDisplay>{maxSteps}</StepDisplay>
            <StepButton onClick={incrementSteps}>+</StepButton>
            <span style={{ fontSize: '2cqw', color: '#999' }}>steg</span>
          </StepCounter>

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