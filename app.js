/* =================================================================
   CHENETHA DESIGN MITRA - Handloom AI Assistant Client Application
   Luxury Indian Handloom Pattern & Motif Synthesis Engine
   ================================================================= */

let currentLang = 'en-US';
let viewMode = 'flat'; // 'flat', 'drape', 'zoom'
let isRecording = false;
let isRecognitionStarting = false;
let isRecognitionStopping = false;
let speechBaseText = '';
let recognition = null;
let hasGenerated = false; // Generate final design only when user clicks "Generate My Design"

let selectedStyle = 'Mangalagiri Cotton & Silk';
let generationSeed = 0;
let currentVariations = [];
let activeVariationIndex = 0;

// Application State for current active design
let currentDesign = {
    title: "Mangalagiri Pure Silk & Nizam Gopuram Saree",
    sareeStyle: "Mangalagiri Cotton & Silk",
    fabricType: "Silk",
    bodyColor: "#047857",
    borderColor: "#800020",
    palluColor: "#991B1B",
    zariColor: "#D97706",
    motifType: "temple",
    motifDensity: "Medium",
    borderStyle: "temple",
    bodyPattern: "checks",
    palluStyle: "traditional_stripes",
    motifArrangement: "staggered",
    promptUsed: ""
};

// Canvas context
let canvas, ctx;
let currentPage = 'home';

document.addEventListener('DOMContentLoaded', () => {
    canvas = document.getElementById('sareeCanvas');
    if (canvas) {
        ctx = canvas.getContext('2d');
    }

    initSpeechRecognition();
    initEventListeners();
    initScreen3Customizations();
    checkBackendHealth();
    syncColorHexTags();

    // Check URL hash on initial load
    const initialHash = (window.location.hash || '').replace('#', '');
    if (['home', 'explore', 'studio', 'about', 'contact'].includes(initialHash)) {
        navigateToPage(initialHash);
    } else {
        navigateToPage('home');
    }

    // Initial welcome state: Render guided preview on canvas, waiting for user to click "Generate My Design"
    renderWelcomeCanvas();
});

// Browser History & Popstate navigation
window.addEventListener('popstate', () => {
    const hash = (window.location.hash || '').replace('#', '');
    if (['home', 'explore', 'studio', 'about', 'contact'].includes(hash)) {
        navigateToPage(hash);
    } else {
        navigateToPage('home');
    }
});

// -----------------------------------------------------------------
// 0. Website Page Router & Navigation Controller
// -----------------------------------------------------------------
function navigateToPage(pageId) {
    const validPages = ['home', 'explore', 'studio', 'about', 'contact'];
    if (!validPages.includes(pageId)) pageId = 'home';
    currentPage = pageId;

    // Toggle Page Views
    validPages.forEach(p => {
        const pageEl = document.getElementById(`page-${p}`);
        if (pageEl) {
            pageEl.classList.toggle('active', p === pageId);
        }
        const navLink = document.getElementById(`navLink-${p}`);
        if (navLink) {
            navLink.classList.toggle('active', p === pageId);
        }
        const mobileNavLink = document.getElementById(`mobileNavLink-${p}`);
        if (mobileNavLink) {
            mobileNavLink.classList.toggle('active', p === pageId);
        }
    });

    // Close mobile menu on every navigation
    closeMobileMenu();

    // Update URL Hash
    const hash = `#${pageId}`;
    if (window.location.hash !== hash) {
        history.pushState(null, '', hash);
    }

    // Smooth Scroll to Top
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // When entering Design Studio, ensure canvas renders crisply
    if (pageId === 'studio') {
        setTimeout(() => {
            if (hasGenerated) {
                renderSareeCanvas();
            } else {
                renderWelcomeCanvas();
            }
        }, 50);
    }
}

// Backward compatibility alias
function navigateToScreen(screenId) {
    if (screenId === 'screen-create' || screenId === 'screen-preview') {
        navigateToPage('studio');
    } else {
        navigateToPage('home');
    }
}

function selectStyleAndGoStudio(styleName) {
    const pill = document.querySelector(`.style-pill[data-style="${styleName}"]`) ||
        document.querySelector(`.style-card[data-style="${styleName}"]`);
    selectStyleCard(pill, styleName);
    navigateToPage('studio');
}

function selectSuggestedAndGo(styleName) {
    selectStyleAndGoStudio(styleName);
}

// Mobile Menu Handlers
function toggleMobileMenu() {
    const drawer = document.getElementById('mobileDrawer');
    const toggleBtn = document.getElementById('mobileMenuToggle');
    if (drawer) {
        const isActive = drawer.classList.toggle('active');
        if (toggleBtn) {
            toggleBtn.classList.toggle('active', isActive);
            toggleBtn.setAttribute('aria-expanded', isActive ? 'true' : 'false');
        }
    }
}

function closeMobileMenu() {
    const drawer = document.getElementById('mobileDrawer');
    const toggleBtn = document.getElementById('mobileMenuToggle');
    if (drawer) drawer.classList.remove('active');
    if (toggleBtn) {
        toggleBtn.classList.remove('active');
        toggleBtn.setAttribute('aria-expanded', 'false');
    }
}

// Gallery Filter Handler (Page 2)
function filterGallery(category, btnElement) {
    document.querySelectorAll('.filter-pill').forEach(btn => btn.classList.remove('active'));
    if (btnElement) btnElement.classList.add('active');

    const cards = document.querySelectorAll('#exploreGalleryGrid .gallery-card');
    cards.forEach(card => {
        const cat = card.getAttribute('data-category');
        if (category === 'all' || cat === category) {
            card.style.display = 'flex';
        } else {
            card.style.display = 'none';
        }
    });
}

// Contact Form Handler (Page 5)
async function handleContactSubmit(event) {
    event.preventDefault();
    const nameEl = document.getElementById('contactName');
    const emailEl = document.getElementById('contactEmail');
    const phoneEl = document.getElementById('contactPhone');
    const clusterEl = document.getElementById('contactCluster');
    const purposeEl = document.getElementById('contactPurpose');
    const messageEl = document.getElementById('contactMessage');
    const submitBtn = document.getElementById('contactSubmitBtn');

    const name = nameEl ? nameEl.value.trim() : '';
    const email = emailEl ? emailEl.value.trim() : '';
    const phone = phoneEl ? phoneEl.value.trim() : '';
    const cluster = clusterEl ? clusterEl.value : 'General';
    const purpose = purposeEl ? purposeEl.value : 'General';
    const message = messageEl ? messageEl.value.trim() : '';

    if (!name || !email || !message) {
        showToast("⚠️ Please provide your Name, Email, and Message.");
        return;
    }

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span>⏳</span> Sending Inquiry...';
    }

    try {
        const res = await fetch('/api/contact', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, phone, cluster, purpose, message })
        });
        if (res.ok) {
            showToast("✨ Thank you! Your inquiry has been received by our Handloom Studio.");
        } else {
            saveContactLocally({ name, email, phone, cluster, purpose, message });
            showToast("✨ Message received! Our artisan coordinator will contact you.");
        }
    } catch (e) {
        saveContactLocally({ name, email, phone, cluster, purpose, message });
        showToast("✨ Message received! Our artisan coordinator will contact you.");
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span>📨</span> <span>Submit Inquiry</span> <span>➔</span>';
        }
        const form = document.getElementById('contactForm');
        if (form) form.reset();
    }
}

function saveContactLocally(entry) {
    try {
        const list = JSON.parse(localStorage.getItem('handloom_contacts') || '[]');
        list.push({ ...entry, createdAt: new Date().toISOString() });
        localStorage.setItem('handloom_contacts', JSON.stringify(list));
    } catch (e) { }
}

// -----------------------------------------------------------------
// 1. Style Selection (Before Generation) - 5 Andhra Traditions
// -----------------------------------------------------------------
function selectStyleCard(el, styleName) {
    selectedStyle = styleName;
    document.querySelectorAll('.style-pill').forEach(card => card.classList.remove('active'));
    document.querySelectorAll('.style-card').forEach(card => card.classList.remove('active'));
    if (el) {
        el.classList.add('active');
    } else {
        const pill = document.querySelector(`.style-pill[data-style="${styleName}"]`) ||
            document.querySelector(`.style-pill[data-style*="${styleName}"]`);
        if (pill) pill.classList.add('active');
    }

    const sLower = styleName.toLowerCase();

    // Configure authentic defaults based on the selected Andhra tradition
    if (sLower.includes('mangalagiri')) {
        currentDesign.sareeStyle = 'Mangalagiri Cotton & Silk';
        currentDesign.title = "Mangalagiri Pure Silk & Nizam Gopuram Saree";
        currentDesign.fabricType = "Silk";
        currentDesign.bodyColor = "#047857";
        currentDesign.borderColor = "#800020";
        currentDesign.palluColor = "#991B1B";
        currentDesign.zariColor = "#D97706";
        currentDesign.motifType = "temple";
        currentDesign.bodyPattern = "checks";
        currentDesign.borderStyle = "temple";
        currentDesign.palluStyle = "traditional_stripes";
    } else if (sLower.includes('uppada')) {
        currentDesign.sareeStyle = 'Uppada Jamdani Silks';
        currentDesign.title = "Uppada Jamdani Translucent Silk Saree";
        currentDesign.fabricType = "Silk";
        currentDesign.bodyColor = "#0F766E";
        currentDesign.borderColor = "#BE185D";
        currentDesign.palluColor = "#BE185D";
        currentDesign.zariColor = "#F59E0B";
        currentDesign.motifType = "peacock";
        currentDesign.bodyPattern = "floral_vines";
        currentDesign.borderStyle = "double_zari";
        currentDesign.palluStyle = "decorative_pallu";
    } else if (sLower.includes('pochampally')) {
        currentDesign.sareeStyle = 'Pochampally Double Ikat';
        currentDesign.title = "Pochampally Double Ikat Stepped Diamond Saree";
        currentDesign.fabricType = "Cotton";
        currentDesign.bodyColor = "#EAB308";
        currentDesign.borderColor = "#6B21A8";
        currentDesign.palluColor = "#6B21A8";
        currentDesign.zariColor = "#FBBF24";
        currentDesign.motifType = "ikat";
        currentDesign.bodyPattern = "diagonal_ikat";
        currentDesign.borderStyle = "ikat_wave";
        currentDesign.palluStyle = "ikat_block";
    } else if (sLower.includes('venkatagiri')) {
        currentDesign.sareeStyle = 'Venkatagiri Zari Spires';
        currentDesign.title = "Venkatagiri Fine Silk Chalu Butti Saree";
        currentDesign.fabricType = "Silk";
        currentDesign.bodyColor = "#064E3B";
        currentDesign.borderColor = "#B91C1C";
        currentDesign.palluColor = "#B91C1C";
        currentDesign.zariColor = "#D97706";
        currentDesign.motifType = "mango";
        currentDesign.bodyPattern = "scattered_buttis";
        currentDesign.borderStyle = "double_zari";
        currentDesign.palluStyle = "cascade_temple";
    } else if (sLower.includes('dharmavaram')) {
        currentDesign.sareeStyle = 'Dharmavaram Bridal Brocade';
        currentDesign.title = "Dharmavaram Grand Bridal Brocade Saree";
        currentDesign.fabricType = "Silk";
        currentDesign.bodyColor = "#4A0812";
        currentDesign.borderColor = "#991B1B";
        currentDesign.palluColor = "#800020";
        currentDesign.zariColor = "#D4AF37";
        currentDesign.motifType = "mango";
        currentDesign.bodyPattern = "paisley_lattice";
        currentDesign.borderStyle = "peacock_border";
        currentDesign.palluStyle = "grand_medallion";
    } else if (styleName === 'Floral') {
        currentDesign.sareeStyle = 'Uppada Jamdani Silks';
        currentDesign.motifType = 'lotus';
        currentDesign.bodyPattern = 'floral_vines';
        currentDesign.borderStyle = 'double_zari';
        currentDesign.palluStyle = 'decorative_pallu';
        currentDesign.title = "Floral Lata & Lotus Pure Silk Saree";
    } else if (styleName === 'Peacock') {
        currentDesign.sareeStyle = 'Uppada Jamdani Silks';
        currentDesign.motifType = 'peacock';
        currentDesign.bodyPattern = 'checks';
        currentDesign.borderStyle = 'peacock_border';
        currentDesign.palluStyle = 'grand_medallion';
        currentDesign.title = "Imperial Mayuri Crest & Kattam Silk Saree";
    } else if (styleName === 'Paisley/Mango') {
        currentDesign.sareeStyle = 'Dharmavaram Bridal Brocade';
        currentDesign.motifType = 'mango';
        currentDesign.bodyPattern = 'paisley_lattice';
        currentDesign.borderStyle = 'double_zari';
        currentDesign.palluStyle = 'decorative_pallu';
        currentDesign.title = "Sacred Kalka Brocade Handloom Saree";
    } else if (styleName === 'Temple Border') {
        currentDesign.sareeStyle = 'Mangalagiri Cotton & Silk';
        currentDesign.motifType = 'temple';
        currentDesign.bodyPattern = 'scattered_buttis';
        currentDesign.borderStyle = 'temple';
        currentDesign.palluStyle = 'cascade_temple';
        currentDesign.title = "Nizam Gopuram Spire Silk Saree";
    } else if (styleName === 'Geometric') {
        currentDesign.sareeStyle = 'Pochampally Double Ikat';
        currentDesign.motifType = 'ikat';
        currentDesign.bodyPattern = 'diagonal_ikat';
        currentDesign.borderStyle = 'ikat_wave';
        currentDesign.palluStyle = 'ikat_block';
        currentDesign.title = "Pochampally Double Ikat Diamond Saree";
    } else {
        currentDesign.sareeStyle = 'Mangalagiri Cotton & Silk';
        currentDesign.motifType = 'temple';
        currentDesign.bodyPattern = 'checks';
        currentDesign.borderStyle = 'temple';
        currentDesign.palluStyle = 'traditional_stripes';
        currentDesign.title = "Heritage Mangalagiri Zari Checks Saree";
    }

    currentDesign.sareeStyle = styleName;

    // Update active badge in studio
    const tag = document.getElementById('sareeTagBadge');
    if (tag) tag.textContent = `${styleName} Silk Saree`;

    // Synchronize both Studio Left Inputs and Studio Right Preview controls
    syncAllControlsToUI();

    // If already generated once, update preview in real-time; otherwise maintain welcome guide
    if (hasGenerated) {
        renderSareeCanvas();
    } else {
        renderWelcomeCanvas();
    }

    const msg = currentLang === 'te-IN' ? `డిజైన్ శైలి ఎంచుకోబడింది: ${styleName}` : `Selected Style: ${styleName}`;
    showToast(`✨ ${msg}`);
}

// -----------------------------------------------------------------
// 2. Language Toggle System
// -----------------------------------------------------------------
function switchLanguage(lang) {
    currentLang = lang;

    // Synchronize all language toggles across desktop navbar, studio voice bar, and mobile drawer
    const updateActive = (id, targetLang) => {
        const el = document.getElementById(id);
        if (el) el.classList.toggle('active', lang === targetLang);
    };

    updateActive('langEnBtn', 'en-US');
    updateActive('langTeBtn', 'te-IN');
    updateActive('drawerLangEnBtn', 'en-US');
    updateActive('drawerLangTeBtn', 'te-IN');
    updateActive('voiceLangEnBtn', 'en-US');
    updateActive('voiceLangTeBtn', 'te-IN');

    // Update active speech recognition engine language if instance exists
    if (recognition) {
        recognition.lang = lang;
    }

    // Update textarea placeholder for the active language
    const promptInput = document.getElementById('promptInput');
    if (promptInput) {
        promptInput.placeholder = lang === 'te-IN'
            ? 'మీ చీర వివరాలు మాట్లాడండి లేదా రాయండి... (ఉదా: పెళ్లి కోసం నెమలి మోటిఫ్ కెంపు రంగు పట్టు చీర, బంగారు జరీ గోపురం బోర్డర్)'
            : 'Speak or type your custom requirement... (e.g. Grand wedding saree in crimson red with gold peacock motif and temple border / పెళ్లి కోసం నెమలి మోటిఫ్ కెంపు రంగు పట్టు చీర)';
    }

    // Update text content of elements with data-en and data-te
    document.querySelectorAll('[data-en]').forEach(el => {
        if (lang === 'te-IN' && el.getAttribute('data-te')) {
            el.textContent = el.getAttribute('data-te');
        } else if (el.getAttribute('data-en')) {
            el.textContent = el.getAttribute('data-en');
        }
    });

    // Update speech status language message if not currently recording
    const speechStatus = document.getElementById('speechStatus');
    if (speechStatus && !isRecording) {
        speechStatus.innerHTML = lang === 'te-IN'
            ? 'మైక్రోఫోన్ నొక్కి మాట్లాడండి (తెలుగు).'
            : 'Click microphone to speak in Telugu or English, or type above.';
    }

    if (hasGenerated) {
        renderSareeCanvas();
    } else {
        renderWelcomeCanvas();
    }
}

function setVoiceLanguage(lang) {
    switchLanguage(lang);
    const msg = lang === 'te-IN'
        ? '🎙️ వాయిస్ ఇన్పుట్: తెలుగు (te-IN)'
        : '🎙️ Voice Input: English (en-IN)';
    showToast(msg);
}

// -----------------------------------------------------------------
// 3. Speech-to-Text Recognition (Telugu & English)
// -----------------------------------------------------------------

// Helper to remove any duplicate words or repeated consecutive phrases from recognized transcripts
function deduplicateConsecutiveWords(text) {
    if (!text) return '';
    const words = text.trim().split(/\s+/);
    if (words.length <= 1) return text.trim();

    let cleaned = [...words];
    let changed = true;
    while (changed) {
        changed = false;
        const maxK = Math.floor(cleaned.length / 2);
        for (let k = maxK; k >= 1; k--) {
            for (let i = 0; i <= cleaned.length - 2 * k; i++) {
                const seq1 = cleaned.slice(i, i + k).join(' ').toLowerCase();
                const seq2 = cleaned.slice(i + k, i + 2 * k).join(' ').toLowerCase();
                if (seq1 === seq2) {
                    cleaned.splice(i + k, k);
                    changed = true;
                    break;
                }
            }
            if (changed) break;
        }
    }
    return cleaned.join(' ');
}

// Helper to merge consecutive or cumulative speech transcripts without duplicate overlaps
function mergeTranscripts(existing, newText) {
    existing = (existing || '').trim();
    newText = (newText || '').trim();
    if (!existing) return newText;
    if (!newText) return existing;

    const existLower = existing.toLowerCase();
    const newLower = newText.toLowerCase();

    // Identical phrase or existing already ends with newText
    if (existLower === newLower || existLower.endsWith(newLower)) return existing;

    // Mobile cumulative result: newText contains existing as its prefix
    if (newLower.startsWith(existLower)) return newText;

    const existWords = existing.split(/\s+/);
    const newWords = newText.split(/\s+/);

    // Check for word-level overlap at the boundary (e.g. "sky blue with" + "with gold border")
    const maxOverlap = Math.min(existWords.length, newWords.length);
    for (let len = maxOverlap; len > 0; len--) {
        const existTail = existWords.slice(existWords.length - len).join(' ').toLowerCase();
        const newHead = newWords.slice(0, len).join(' ').toLowerCase();
        if (existTail === newHead) {
            return existWords.concat(newWords.slice(len)).join(' ');
        }
    }

    return existing + ' ' + newText;
}

// Helper to strip already finalized text from the active interim transcript
function cleanInterimAgainstFinal(finalText, interimText) {
    finalText = (finalText || '').trim();
    interimText = (interimText || '').trim();
    if (!interimText) return '';
    if (!finalText) return interimText;

    const finalLower = finalText.toLowerCase();
    const interimLower = interimText.toLowerCase();

    // If interim is completely covered by final text, do not duplicate
    if (finalLower === interimLower || finalLower.endsWith(interimLower)) {
        return '';
    }

    // If interim repeats the entire final text prefix, take only the fresh interim words
    if (interimLower.startsWith(finalLower)) {
        return interimText.slice(finalText.length).trim();
    }

    // Check word-level overlap at boundary
    const finalWords = finalText.split(/\s+/);
    const interimWords = interimText.split(/\s+/);
    const maxOverlap = Math.min(finalWords.length, interimWords.length);
    for (let len = maxOverlap; len > 0; len--) {
        const finalTail = finalWords.slice(finalWords.length - len).join(' ').toLowerCase();
        const interimHead = interimWords.slice(0, len).join(' ').toLowerCase();
        if (finalTail === interimHead) {
            return interimWords.slice(len).join(' ');
        }
    }

    return interimText;
}

function initSpeechRecognition() {
    const micBtn = document.getElementById('micBtn');
    const speechStatus = document.getElementById('speechStatus');
    const promptInput = document.getElementById('promptInput');

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
        if (speechStatus) {
            speechStatus.innerHTML = currentLang === 'te-IN'
                ? '<span style="color:#DC2626">ఈ బ్రౌజర్‌లో వాయిస్ గుర్తింపు అందుబాటులో లేదు. దయచేసి వివరాలను టైప్ చేయండి లేదా Chrome ఉపయోగించండి.</span>'
                : '<span style="color:#DC2626">Speech recognition is not supported in this browser. Please type your requirement or open in Chrome.</span>';
        }
        if (micBtn) {
            micBtn.style.opacity = '0.5';
            micBtn.title = 'Voice recognition unavailable in this browser';
        }
        return;
    }

    // Single persistent SpeechRecognition instance
    try {
        recognition = new SpeechRecognition();
    } catch (e) {
        console.error('Failed to create SpeechRecognition:', e);
        return;
    }

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    let noSpeechCount = 0;

    if (micBtn) {
        micBtn.addEventListener('click', (e) => {
            e.preventDefault();

            // Guard against rapid multi-taps on mobile touchscreens
            if (isRecognitionStarting || isRecognitionStopping) return;

            if (isRecording) {
                // User manually stops recording
                isRecognitionStopping = true;
                if (speechStatus) {
                    speechStatus.innerHTML = currentLang === 'te-IN'
                        ? 'ఆగుతున్నాము... విన్న మాటలను నమోదు చేస్తున్నాము...'
                        : 'Stopping... Finalizing recognized speech...';
                }
                try {
                    recognition.stop();
                } catch (err) {
                    isRecording = false;
                    isRecognitionStopping = false;
                    micBtn.classList.remove('recording');
                }
            } else {
                // Start single recording session
                isRecognitionStarting = true;
                noSpeechCount = 0;
                speechBaseText = promptInput ? promptInput.value.trim() : '';
                recognition.lang = currentLang || 'en-US';

                try {
                    recognition.start();
                } catch (err) {
                    // If previous session was in an unclean state, abort and restart cleanly
                    console.warn('Recognition start exception, resetting instance:', err);
                    try { recognition.abort(); } catch (e) { }
                    setTimeout(() => {
                        try {
                            recognition.start();
                        } catch (e2) {
                            isRecognitionStarting = false;
                            if (speechStatus) {
                                speechStatus.innerHTML = '<span style="color:#DC2626">Microphone unavailable. Please try again.</span>';
                            }
                        }
                    }, 150);
                }
            }
        });
    }

    recognition.onstart = () => {
        isRecording = true;
        isRecognitionStarting = false;
        isRecognitionStopping = false;
        noSpeechCount = 0;
        if (micBtn) {
            micBtn.classList.add('recording');
            micBtn.setAttribute('aria-label', 'Stop recording');
        }
        if (speechStatus) {
            speechStatus.innerHTML = currentLang === 'te-IN'
                ? '🔴 వింటున్నాము... మాట్లాడండి (తెలుగు). మాట్లాడటం పూర్తికాగానే మైక్ మళ్లీ నొక్కండి...'
                : '🔴 Listening... Speak clearly now. Click the mic button again when finished speaking...';
        }
    };

    // Mobile voice-input deduplication & separate interim/final handling:
    // 1. Separate finalized chunks from active interim hypotheses.
    // 2. Prevent mobile Android Chrome from echoing cumulative results repeatedly.
    // 3. Strip finalized text from interim hypotheses so interim text isn't appended repeatedly.
    // 4. Ensure each spoken word appears only once in the transcript.
    recognition.onresult = (event) => {
        noSpeechCount = 0;
        let finalStr = '';
        let interimStr = '';

        for (let i = 0; i < event.results.length; i++) {
            const res = event.results[i];
            if (!res || !res[0]) continue;
            const text = (res[0].transcript || '').trim();
            if (!text) continue;

            if (res.isFinal) {
                finalStr = mergeTranscripts(finalStr, text);
            } else {
                interimStr = mergeTranscripts(interimStr, text);
            }
        }

        // Clean final transcripts from repeated consecutive words or phrases
        finalStr = deduplicateConsecutiveWords(finalStr);

        // Maintain strict separate handling for interim results:
        // Filter out any interim words that are already present in finalStr
        const uniqueInterim = cleanInterimAgainstFinal(finalStr, interimStr);

        // Combine finalized speech with any pending interim hypothesis
        let sessionSpoken = finalStr;
        if (uniqueInterim) {
            sessionSpoken = sessionSpoken ? (sessionSpoken + ' ' + uniqueInterim) : uniqueInterim;
        }

        sessionSpoken = deduplicateConsecutiveWords(sessionSpoken);

        if (promptInput && sessionSpoken) {
            promptInput.value = speechBaseText ? (speechBaseText + ' ' + sessionSpoken) : sessionSpoken;
        }

        // STRICT REQUIREMENT: DO NOT generate any design inside onresult!
    };

    recognition.onerror = (event) => {
        if (event.error === 'no-speech') {
            noSpeechCount++;
            if (noSpeechCount > 2) {
                // User has been silent across multiple cycles, finish recording session
                isRecording = false;
                isRecognitionStarting = false;
                isRecognitionStopping = false;
                if (micBtn) {
                    micBtn.classList.remove('recording');
                    micBtn.setAttribute('aria-label', 'Start recording');
                }
                if (speechStatus) {
                    speechStatus.innerHTML = currentLang === 'te-IN'
                        ? 'మాటలు వినబడలేదు. మైక్రోఫోన్ నొక్కి మళ్లీ మాట్లాడండి లేదా పైన టైప్ చేయండి.'
                        : 'No speech was detected. Click microphone to speak again or type above.';
                }
            }
            // Otherwise let onend seamlessly resume so user can continue speaking naturally
        } else if (event.error === 'not-allowed' || event.error === 'permission-denied') {
            isRecording = false;
            isRecognitionStarting = false;
            isRecognitionStopping = false;
            noSpeechCount = 0;
            if (micBtn) {
                micBtn.classList.remove('recording');
                micBtn.setAttribute('aria-label', 'Start recording');
            }
            if (speechStatus) {
                speechStatus.innerHTML = currentLang === 'te-IN'
                    ? '<span style="color:#DC2626">⚠️ మైక్రోఫోన్ అనుమతి నిరాకరించబడింది. దయచేసి బ్రౌజర్ సెట్టింగ్స్‌లో మైక్ అనుమతి ఇవ్వండి.</span>'
                    : '<span style="color:#DC2626">⚠️ Microphone permission denied. Please allow microphone access in your browser settings.</span>';
            }
            showToast(currentLang === 'te-IN' ? 'దయచేసి మైక్రోఫోన్ అనుమతి ఇవ్వండి' : 'Microphone permission required');
        } else if (event.error !== 'aborted') {
            isRecording = false;
            isRecognitionStarting = false;
            isRecognitionStopping = false;
            noSpeechCount = 0;
            if (micBtn) {
                micBtn.classList.remove('recording');
                micBtn.setAttribute('aria-label', 'Start recording');
            }
            if (speechStatus) {
                speechStatus.innerHTML = `<span style="color:#DC2626">Voice status: ${event.error}</span>`;
            }
        }
    };

    recognition.onend = () => {
        // If recording was NOT manually stopped by user and not terminated by fatal error,
        // seamlessly resume on mobile so natural pauses don't abruptly end the recording session.
        if (isRecording && !isRecognitionStopping && noSpeechCount < 3) {
            speechBaseText = promptInput ? promptInput.value.trim() : '';
            try {
                recognition.start();
                return;
            } catch (err) {
                // If restart fails, proceed to clean shutdown
            }
        }

        isRecording = false;
        isRecognitionStarting = false;
        isRecognitionStopping = false;
        noSpeechCount = 0;
        if (micBtn) {
            micBtn.classList.remove('recording');
            micBtn.setAttribute('aria-label', 'Start recording');
        }

        // Clean up prompt text once recording is stopped
        if (promptInput) {
            promptInput.value = deduplicateConsecutiveWords(promptInput.value.trim());
        }

        // STRICT REQUIREMENT: DO NOT generate any design inside onend!
        // Display complete recognized text so user can review or edit before clicking "Generate My Design".
        if (promptInput && promptInput.value.trim().length > 0) {
            if (speechStatus) {
                speechStatus.innerHTML = currentLang === 'te-IN'
                    ? '✅ మాటలు రికార్డ్ చేయబడ్డాయి. వివరాలను సరిచూసుకుని, క్రింద ఉన్న "నా డిజైన్‌ను రూపొందించండి" బటన్ నొక్కండి.'
                    : '✅ Speech recognized! Review or edit your text above, then click "Generate My Design" below.';
            }
        } else {
            if (speechStatus) {
                speechStatus.innerHTML = currentLang === 'te-IN'
                    ? 'మైక్రోఫోన్ నొక్కి మాట్లాడండి (తెలుగు).'
                    : 'Click microphone to speak in Telugu or English, or type above.';
            }
        }
    };
}

function useSamplePrompt(promptEn, promptTe) {
    const promptInput = document.getElementById('promptInput');
    if (promptInput) {
        promptInput.value = currentLang === 'te-IN' ? promptTe : promptEn;
    }
    showToast(currentLang === 'te-IN' ? 'నమూనా వివరాలు చేర్చబడ్డాయి!' : 'Sample requirement loaded!');
}

function syncColorHexTags() {
    const syncTag = (inputId, tagId) => {
        const input = document.getElementById(inputId);
        const tag = document.getElementById(tagId);
        if (input && tag) tag.textContent = input.value.toUpperCase();
    };
    syncTag('bodyColorPicker', 'bodyHexTag');
    syncTag('borderColorPicker', 'borderHexTag');
    syncTag('palluColorPicker', 'palluHexTag');
    syncTag('zariColorPicker', 'zariHexTag');

    syncTag('s3BodyColorPicker', 's3BodyHexTag');
    syncTag('s3BorderColorPicker', 's3BorderHexTag');
    syncTag('s3PalluColorPicker', 's3PalluHexTag');
    syncTag('s3ZariColorPicker', 's3ZariHexTag');
}

function syncAllControlsToUI() {
    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el && val) el.value = val;
    };

    // Customization Atelier Controls
    setVal('bodyColorPicker', currentDesign.bodyColor);
    setVal('borderColorPicker', currentDesign.borderColor);
    setVal('palluColorPicker', currentDesign.palluColor);
    setVal('zariColorPicker', currentDesign.zariColor);
    setVal('motifSelect', currentDesign.motifType);
    setVal('borderSelect', currentDesign.borderStyle);
    setVal('bodyPatternSelect', currentDesign.bodyPattern);
    setVal('palluSelect', currentDesign.palluStyle);
    setVal('densitySelect', currentDesign.motifDensity);

    // Live Customization Toolbar Controls
    setVal('s3BodyColorPicker', currentDesign.bodyColor);
    setVal('s3BorderColorPicker', currentDesign.borderColor);
    setVal('s3PalluColorPicker', currentDesign.palluColor);
    setVal('s3ZariColorPicker', currentDesign.zariColor);
    setVal('s3MotifSelect', currentDesign.motifType);
    setVal('s3BorderSelect', currentDesign.borderStyle);
    setVal('s3PalluSelect', currentDesign.palluStyle);
    setVal('s3BodyPatternSelect', currentDesign.bodyPattern);

    // Active Category Pill
    const catBadge = document.getElementById('activeCategoryName');
    if (catBadge && selectedStyle) catBadge.textContent = selectedStyle;

    syncColorHexTags();
}

function applyColorPalette(body, border, pallu, zari, name) {
    currentDesign.bodyColor = body;
    currentDesign.borderColor = border;
    currentDesign.palluColor = pallu;
    currentDesign.zariColor = zari;
    syncAllControlsToUI();
    if (hasGenerated) renderSareeCanvas();
    showToast(`🎨 Applied Palette: ${name}`);
}

function initScreen3Customizations() {
    const bindS3Color = (s3Id, baseId, prop, s3TagId, baseTagId) => {
        const s3El = document.getElementById(s3Id);
        const baseEl = document.getElementById(baseId);
        const s3Tag = document.getElementById(s3TagId);
        const baseTag = document.getElementById(baseTagId);
        if (s3El) {
            s3El.addEventListener('input', (e) => {
                const val = e.target.value;
                currentDesign[prop] = val;
                if (baseEl) baseEl.value = val;
                if (s3Tag) s3Tag.textContent = val.toUpperCase();
                if (baseTag) baseTag.textContent = val.toUpperCase();
                if (hasGenerated) renderSareeCanvas();
            });
        }
    };

    bindS3Color('s3BodyColorPicker', 'bodyColorPicker', 'bodyColor', 's3BodyHexTag', 'bodyHexTag');
    bindS3Color('s3BorderColorPicker', 'borderColorPicker', 'borderColor', 's3BorderHexTag', 'borderHexTag');
    bindS3Color('s3PalluColorPicker', 'palluColorPicker', 'palluColor', 's3PalluHexTag', 'palluHexTag');
    bindS3Color('s3ZariColorPicker', 'zariColorPicker', 'zariColor', 's3ZariHexTag', 'zariHexTag');

    const bindS3Select = (s3Id, baseId, prop) => {
        const s3El = document.getElementById(s3Id);
        const baseEl = document.getElementById(baseId);
        if (s3El) {
            s3El.addEventListener('change', (e) => {
                const val = e.target.value;
                currentDesign[prop] = val;
                if (baseEl) baseEl.value = val;
                if (hasGenerated) renderSareeCanvas();
            });
        }
    };

    bindS3Select('s3BodyPatternSelect', 'bodyPatternSelect', 'bodyPattern');
    bindS3Select('s3BorderSelect', 'borderSelect', 'borderStyle');
    bindS3Select('s3PalluSelect', 'palluSelect', 'palluStyle');
    bindS3Select('s3MotifSelect', 'motifSelect', 'motifType');
}

// -----------------------------------------------------------------
// 4. Event Listeners & Controls Initialization
// -----------------------------------------------------------------
function initEventListeners() {
    // Generate Final Design Button
    const generateBtn = document.getElementById('generateBtn');
    if (generateBtn) {
        generateBtn.addEventListener('click', () => triggerAISuggestion(false));
    }

    // Support Enter key in Prompt Textarea for rapid generation
    const promptInput = document.getElementById('promptInput');
    if (promptInput) {
        promptInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                triggerAISuggestion(false);
            }
        });
    }

    // Generate Another Design Button (Cycles visible pattern combinations)
    const generateAnotherBtn = document.getElementById('generateAnotherBtn');
    if (generateAnotherBtn) {
        generateAnotherBtn.addEventListener('click', generateAnotherDesign);
    }

    // Customization color pickers (Screen 2 with Screen 3 sync)
    const bindColor = (id, prop, tagId, s3Id, s3TagId) => {
        const el = document.getElementById(id);
        const tag = document.getElementById(tagId);
        const s3El = s3Id ? document.getElementById(s3Id) : null;
        const s3Tag = s3TagId ? document.getElementById(s3TagId) : null;
        if (el) {
            el.addEventListener('input', (e) => {
                const val = e.target.value;
                currentDesign[prop] = val;
                if (tag) tag.textContent = val.toUpperCase();
                if (s3El) s3El.value = val;
                if (s3Tag) s3Tag.textContent = val.toUpperCase();
                if (hasGenerated) renderSareeCanvas();
            });
        }
    };

    bindColor('bodyColorPicker', 'bodyColor', 'bodyHexTag', 's3BodyColorPicker', 's3BodyHexTag');
    bindColor('borderColorPicker', 'borderColor', 'borderHexTag', 's3BorderColorPicker', 's3BorderHexTag');
    bindColor('palluColorPicker', 'palluColor', 'palluHexTag', 's3PalluColorPicker', 's3PalluHexTag');
    bindColor('zariColorPicker', 'zariColor', 'zariHexTag', 's3ZariColorPicker', 's3ZariHexTag');

    // Select dropdowns (Screen 2 with Screen 3 sync)
    const bindSelect = (id, prop, s3Id) => {
        const el = document.getElementById(id);
        const s3El = s3Id ? document.getElementById(s3Id) : null;
        if (el) {
            el.addEventListener('change', (e) => {
                currentDesign[prop] = e.target.value;
                if (s3El) s3El.value = e.target.value;
                if (hasGenerated) renderSareeCanvas();
            });
        }
    };

    bindSelect('bodyPatternSelect', 'bodyPattern', 's3BodyPatternSelect');
    bindSelect('borderSelect', 'borderStyle', 's3BorderSelect');
    bindSelect('palluSelect', 'palluStyle', null);
    bindSelect('motifSelect', 'motifType', 's3MotifSelect');
    bindSelect('densitySelect', 'motifDensity', null);

    const fabricSelect = document.getElementById('fabricSelect');
    if (fabricSelect) {
        fabricSelect.addEventListener('change', (e) => {
            currentDesign.fabricType = e.target.value;
            updateWeaverSpecs();
            if (hasGenerated) renderSareeCanvas();
        });
    }

    // Save & Download buttons
    const saveBtn = document.getElementById('saveDesignBtn');
    if (saveBtn) saveBtn.addEventListener('click', saveDesign);

    const downloadBtn = document.getElementById('downloadPreviewBtn');
    if (downloadBtn) downloadBtn.addEventListener('click', downloadCanvasPNG);

    const printBtn = document.getElementById('printCardBtn');
    if (printBtn) printBtn.addEventListener('click', printSpecCard);

    // Modal collection listeners
    const openCollBtn = document.getElementById('openCollectionBtn');
    if (openCollBtn) openCollBtn.addEventListener('click', openCollectionModal);

    const closeCollBtn = document.getElementById('closeCollectionBtn');
    if (closeCollBtn) {
        closeCollBtn.addEventListener('click', () => {
            const modal = document.getElementById('collectionModal');
            if (modal) modal.classList.remove('active');
        });
    }

    // Mobile drawer backdrop / click outside and Escape key handler
    document.addEventListener('click', (e) => {
        const drawer = document.getElementById('mobileDrawer');
        const toggleBtn = document.getElementById('mobileMenuToggle');
        if (drawer && drawer.classList.contains('active')) {
            if (!drawer.contains(e.target) && !toggleBtn.contains(e.target)) {
                closeMobileMenu();
            }
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeMobileMenu();
            const modal = document.getElementById('collectionModal');
            if (modal) modal.classList.remove('active');
        }
    });
}

function setViewMode(mode) {
    viewMode = mode;
    document.getElementById('viewFlatBtn').classList.toggle('active', mode === 'flat');
    document.getElementById('viewDrapeBtn').classList.toggle('active', mode === 'drape');
    document.getElementById('viewZoomBtn').classList.toggle('active', mode === 'zoom');
    if (hasGenerated) {
        renderSareeCanvas();
    } else {
        renderWelcomeCanvas();
    }
}

// -----------------------------------------------------------------
// 5. Backend Health & AI Generation Processing
// -----------------------------------------------------------------
async function checkBackendHealth() {
    try {
        await fetch('/api/health');
    } catch (e) {
        // Standalone client mode operates smoothly with local browser storage
    }
}

async function triggerAISuggestion(isRegenerate = false) {
    hasGenerated = true;
    navigateToPage('studio');

    // Reveal the post-generation customization atelier and live toolbar
    const postGen = document.getElementById('postGenerationCustomization');
    if (postGen) postGen.style.display = 'block';
    const previewBar = document.getElementById('previewCustomizationBar');
    if (previewBar) previewBar.style.display = 'block';

    const promptInput = document.getElementById('promptInput');
    const userText = promptInput ? promptInput.value.trim() : '';
    const generateBtn = document.getElementById('generateBtn');

    // Combine selected style with user voice/text requirement
    const combinedPrompt = userText
        ? `${selectedStyle} style handloom saree. ${userText}`
        : `${selectedStyle} style traditional handloom saree in pure silk`;

    if (isRegenerate) {
        generationSeed++;
    } else {
        generationSeed = 0;
    }

    if (generateBtn) {
        generateBtn.innerHTML = '<span>⏳</span> Synthesizing Handloom Design...';
        generateBtn.disabled = true;
    }

    try {
        const response = await fetch('/api/suggest', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: combinedPrompt, userText: userText, style: selectedStyle, language: currentLang, seed: generationSeed })
        });

        if (response.ok) {
            const resData = await response.json();
            if (resData.variations && resData.variations.length > 0) {
                applySingleAIDesign(resData.variations[0], resData.detectedRequirements, combinedPrompt);
            } else if (resData.suggestion) {
                applySingleAIDesign(resData.suggestion, resData.detectedRequirements, combinedPrompt);
            } else {
                fallbackClientAISuggestions(combinedPrompt, generationSeed, userText);
            }
        } else {
            fallbackClientAISuggestions(combinedPrompt, generationSeed, userText);
        }
    } catch (err) {
        fallbackClientAISuggestions(combinedPrompt, generationSeed, userText);
    } finally {
        if (generateBtn) {
            const btnTextEn = "Generate My Design";
            const btnTextTe = "నా డిజైన్‌ను రూపొందించండి";
            generateBtn.innerHTML = `<span>✨</span> <span data-en="${btnTextEn}" data-te="${btnTextTe}">${currentLang === 'te-IN' ? btnTextTe : btnTextEn}</span>`;
            generateBtn.disabled = false;
        }

        // On mobile devices, smooth scroll down so user immediately sees the generated saree preview
        if (window.innerWidth <= 900) {
            const previewEl = document.querySelector('.canvas-atelier-frame') || document.querySelector('.studio-preview-panel');
            if (previewEl) {
                setTimeout(() => {
                    previewEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }, 120);
            }
        }
    }
}

// -----------------------------------------------------------------
// 6. One Design at a Time & "Generate Another Design" Engine
// -----------------------------------------------------------------
function generateAnotherDesign() {
    hasGenerated = true;
    generationSeed++;

    // User's selected preferences to preserve
    const userBodyColor = currentDesign.bodyColor;
    const userBorderColor = currentDesign.borderColor;
    const userPalluColor = currentDesign.palluColor;
    const userZariColor = currentDesign.zariColor;
    const userDensity = currentDesign.motifDensity;

    // Distinct pattern presets inspired by the 5 authentic Andhra Pradesh handloom traditions
    const patternVariations = [
        {
            title: "Mangalagiri Micro Kattam Checks & Nizam Temple Spikes",
            bodyPattern: "checks",
            borderStyle: "temple",
            palluStyle: "traditional_stripes",
            motifType: currentDesign.motifType || 'temple',
            motifArrangement: "staggered",
            density: userDensity || "Medium",
            specs: { warp: "2/120s Pure Silk", weft: "80s Mercerized Cotton", reed: "88 Reed / 94 Picks", cards: "280 Hooks Nizam Handloom", duration: "6 - 8 Days" }
        },
        {
            title: "Uppada Jamdani Floating Floral Vines & Double Zari Creeper",
            bodyPattern: "floral_vines",
            borderStyle: "double_zari",
            palluStyle: "decorative_pallu",
            motifType: currentDesign.motifType || 'lotus',
            motifArrangement: "staggered",
            density: userDensity || "Medium",
            specs: { warp: "2/120s Mulberry Silk", weft: "Pure Silk 20/22 Denier", reed: "92 Reed / 98 Picks", cards: "Jamdani Hand Shuttle Weave", duration: "12 - 15 Days" }
        },
        {
            title: "Pochampally Double Ikat Stepped Diamonds & Wave Border",
            bodyPattern: "diagonal_ikat",
            borderStyle: "ikat_wave",
            palluStyle: "ikat_block",
            motifType: currentDesign.motifType || 'ikat',
            motifArrangement: "diagonal",
            density: "Medium",
            specs: { warp: "2/100s Mercerized Cotton", weft: "80s Combed Cotton", reed: "80 Reed / 88 Picks", cards: "Pagdu Bandhu Tie & Dye Loom", duration: "7 - 10 Days" }
        },
        {
            title: "Venkatagiri Fine Chalu Buttis & Cascading Gopuram Spire Tiers",
            bodyPattern: "scattered_buttis",
            borderStyle: "temple",
            palluStyle: "cascade_temple",
            motifType: currentDesign.motifType || 'mango',
            motifArrangement: "border_trailing",
            density: "Sparse",
            specs: { warp: "2/120s Fine Silk", weft: "100s Gossamer Cotton", reed: "84 Reed / 90 Picks", cards: "320 Hooks Zari Jacquard", duration: "8 - 11 Days" }
        },
        {
            title: "Dharmavaram Bridal Kalka Jaal & Grand Chakra Medallion",
            bodyPattern: "paisley_lattice",
            borderStyle: "peacock_border",
            palluStyle: "grand_medallion",
            motifType: currentDesign.motifType || 'peacock',
            motifArrangement: "lattice_nodes",
            density: "Dense",
            specs: { warp: "2/120s Mulberry Silk", weft: "Pure Silk 20/22 Denier", reed: "96 Reed / 102 Picks", cards: "480 Hooks Bridal Jacquard", duration: "14 - 18 Days" }
        },
        {
            title: "Heritage Zari Pinstripes & Chevron Wave Accents",
            bodyPattern: "stripes",
            borderStyle: "chevron_pattern",
            palluStyle: "decorative_pallu",
            motifType: currentDesign.motifType || 'lotus',
            motifArrangement: "staggered",
            density: userDensity || "Medium",
            specs: { warp: "2/120s Mulberry Silk", weft: "Pure Silk 20/22 Denier", reed: "90 Reed / 96 Picks", cards: "300 Hooks Jacquard Set", duration: "7 - 9 Days" }
        }
    ];

    const presetIndex = generationSeed % patternVariations.length;
    const nextPreset = patternVariations[presetIndex];

    // Apply the new pattern combination while preserving user colors & requested motifs
    currentDesign.bodyPattern = nextPreset.bodyPattern;
    currentDesign.borderStyle = currentDesign.borderMotif ? (currentDesign.borderMotif === 'peacock' ? 'peacock_border' : 'double_zari') : nextPreset.borderStyle;
    currentDesign.palluStyle = nextPreset.palluStyle;

    // Never replace an explicitly user-requested motif with random alternatives
    if (currentDesign.userRequestedMotif) {
        currentDesign.motifType = currentDesign.userRequestedMotif;
        currentDesign.bodyMotif = currentDesign.userRequestedMotif;
    } else {
        currentDesign.motifType = nextPreset.motifType;
        currentDesign.bodyMotif = nextPreset.motifType;
    }

    currentDesign.motifArrangement = nextPreset.motifArrangement;
    currentDesign.motifDensity = userDensity || nextPreset.density;
    currentDesign.title = `${selectedStyle} Saree - ${nextPreset.title}`;

    // Synchronize both Screen 2 and Screen 3 UI controls
    syncAllControlsToUI();

    // Update AI detected chips & rationale
    const chipBorder = document.getElementById('chipBorder');
    const chipMotif = document.getElementById('chipMotif');
    if (chipBorder) chipBorder.innerHTML = `🏛️ Border: <b>${currentDesign.borderStyle.replace(/_/g, ' ').toUpperCase()}</b>`;
    if (chipMotif) chipMotif.innerHTML = `🪷 Motif: <b>${currentDesign.motifType.toUpperCase()}</b>`;

    const aiSum = document.getElementById('aiSummaryText');
    if (aiSum) {
        aiSum.innerHTML = `<b>Pattern Variation #${presetIndex + 1}:</b> Synthesized <b>${nextPreset.title}</b> with ${currentDesign.motifArrangement} motif distribution and ${currentDesign.borderStyle.replace(/_/g, ' ')} border.`;
    }

    if (nextPreset.specs) {
        setValText('specWarp', nextPreset.specs.warp);
        setValText('specWeft', nextPreset.specs.weft);
        setValText('specReed', nextPreset.specs.reed);
        setValText('specCards', nextPreset.specs.cards);
        setValText('specDuration', nextPreset.specs.duration);
    }

    // Re-render the single large canvas preview
    renderSareeCanvas();

    const toastMsg = currentLang === 'te-IN'
        ? `🎲 కొత్త ప్యాటర్న్: ${nextPreset.title}`
        : `🎲 New Pattern Generated: ${nextPreset.title}`;
    showToast(toastMsg);
}

function applySingleAIDesign(suggestion, detectedReqs, promptText) {
    if (!suggestion) return;

    // Reveal post-generation customization sections
    const postGen = document.getElementById('postGenerationCustomization');
    if (postGen) postGen.style.display = 'block';
    const previewBar = document.getElementById('previewCustomizationBar');
    if (previewBar) previewBar.style.display = 'block';

    currentDesign.title = suggestion.suggestedTitle || `${selectedStyle} Handloom Saree`;
    currentDesign.sareeStyle = suggestion.style ? (suggestion.style.nameEn || selectedStyle) : selectedStyle;
    currentDesign.bodyColor = suggestion.colors ? suggestion.colors.body : currentDesign.bodyColor;
    currentDesign.borderColor = suggestion.colors ? suggestion.colors.border : currentDesign.borderColor;
    currentDesign.palluColor = suggestion.colors ? suggestion.colors.pallu : currentDesign.palluColor;
    currentDesign.zariColor = suggestion.colors ? suggestion.colors.zari : currentDesign.zariColor;

    const chosenMotif = suggestion.motif ? (suggestion.motif.id || suggestion.motif) : currentDesign.motifType;
    currentDesign.motifType = chosenMotif;
    currentDesign.bodyMotif = suggestion.bodyMotif || chosenMotif;
    currentDesign.borderMotif = suggestion.borderMotif || (suggestion.borderStyle === 'peacock_border' ? 'peacock' : null);
    currentDesign.palluMotif = suggestion.palluMotif || chosenMotif;

    if (detectedReqs && detectedReqs.userRequestedMotif) {
        currentDesign.userRequestedMotif = detectedReqs.userRequestedMotif;
    } else if (suggestion.userRequestedMotif) {
        currentDesign.userRequestedMotif = suggestion.userRequestedMotif;
    }

    currentDesign.borderStyle = suggestion.borderStyle || currentDesign.borderStyle;
    currentDesign.bodyPattern = suggestion.bodyPattern || currentDesign.bodyPattern;
    currentDesign.palluStyle = suggestion.palluStyle || currentDesign.palluStyle;
    currentDesign.motifArrangement = suggestion.motifArrangement || "staggered";
    currentDesign.motifDensity = suggestion.motifDensity || "Medium";

    // Synchronize both Studio Customization Atelier and Preview toolbar controls
    syncAllControlsToUI();

    // Update AI detected chips
    if (detectedReqs) {
        const chipColor = document.getElementById('chipColor');
        const chipMotif = document.getElementById('chipMotif');
        const chipBorder = document.getElementById('chipBorder');
        const chipStyle = document.getElementById('chipStyle');

        if (chipColor) chipColor.innerHTML = `🎨 Color: <b>${detectedReqs.color}</b>`;
        if (chipMotif) chipMotif.innerHTML = `🪷 Motif: <b>${detectedReqs.motif}</b>`;
        if (chipBorder) chipBorder.innerHTML = `🏛️ Border: <b>${currentDesign.borderStyle.replace(/_/g, ' ').toUpperCase()}</b>`;
        if (chipStyle) chipStyle.innerHTML = `🧵 Style: <b>${detectedReqs.style || selectedStyle}</b>`;
    }

    const aiSum = document.getElementById('aiSummaryText');
    if (aiSum) aiSum.innerHTML = suggestion.aiSummary || `Handloom saree synthesized with authentic ${currentDesign.bodyPattern.replace(/_/g, ' ')} pattern and ${currentDesign.borderStyle.replace(/_/g, ' ')} border.`;

    const recStyle = document.getElementById('recStyleVal');
    if (recStyle) recStyle.textContent = currentDesign.sareeStyle;

    const recMotif = document.getElementById('recMotifVal');
    if (recMotif) recMotif.textContent = currentDesign.motifType.toUpperCase();

    const palName = document.getElementById('paletteNameText');
    if (palName) palName.textContent = suggestion.colors ? (suggestion.colors.paletteName || 'Handloom Palette') : 'Handloom Palette';

    const swBody = document.getElementById('swatchBody');
    if (swBody) swBody.style.backgroundColor = currentDesign.bodyColor;
    const swBorder = document.getElementById('swatchBorder');
    if (swBorder) swBorder.style.backgroundColor = currentDesign.borderColor;
    const swPallu = document.getElementById('swatchPallu');
    if (swPallu) swPallu.style.backgroundColor = currentDesign.palluColor;

    const recBorder = document.getElementById('recBorderVal');
    if (recBorder) recBorder.textContent = currentDesign.borderStyle.replace(/_/g, ' ').toUpperCase();

    // Weaver Specs Update
    if (suggestion.weaverSpecs) {
        setValText('specWarp', suggestion.weaverSpecs.warpYarn);
        setValText('specWeft', suggestion.weaverSpecs.weftYarn);
        setValText('specReed', suggestion.weaverSpecs.reedPicks);
        setValText('specCards', suggestion.weaverSpecs.jacquardCards);
        setValText('specDuration', suggestion.weaverSpecs.estimatedWeavingTime);
    }

    // Render single large saree preview
    renderSareeCanvas();
    showToast("✨ Handloom Design Synthesized Successfully!");
}

function setValText(id, txt) {
    const el = document.getElementById(id);
    if (el) el.textContent = txt;
}

function fallbackClientAISuggestions(promptText, seed = 0, explicitUserText = '') {
    // Prefer user's explicit voice or typed input; fall back to combined prompt
    const userSpeech = (explicitUserText || '').trim();
    const sourceText = userSpeech.length > 0 ? userSpeech : (promptText || '').trim();
    const lower = sourceText.toLowerCase();
    const combinedLower = (promptText || '').toLowerCase().trim();

    // 1. Comprehensive Handloom Color Catalog with English & Telugu Names and Zari Tones
    const COLOR_CATALOG = [
        {
            id: "crimson",
            name: "Crimson Red",
            nameTe: "కెంపు ఎరుపు",
            hex: "#800020",
            zariHex: "#DC2626",
            keywords: [
                "crimson red", "crimson", "kempu red", "kempu", "ruby red", "ruby", 
                "blood red", "sindoor red", "sindoor", "vermilion", "scarlet", "burgundy", 
                "maroon", "red", "కెంపు ఎరుపు", "కెంపు రంగు", "కెంపు", "రూబీ", "సిందూరం", 
                "ఎరుపు రంగు", "ఎరుపు", "ఎర్రని", "ఎర్ర", "మెరూన్"
            ]
        },
        {
            id: "royal_blue",
            name: "Royal Blue",
            nameTe: "రాయల్ బ్లూ",
            hex: "#1D4ED8",
            zariHex: "#3B82F6",
            keywords: [
                "royal blue", "navy blue", "indigo blue", "indigo", "navy", "dark blue", 
                "deep blue", "blue", "రాయల్ బ్లూ", "నేవీ బ్లూ", "ఇండిగో", "నీలం రంగు", 
                "నీలం", "నీలి", "బ్లూ"
            ]
        },
        {
            id: "sky_blue",
            name: "Sky Blue",
            nameTe: "ఆకాశ నీలం",
            hex: "#0284C7",
            zariHex: "#38BDF8",
            keywords: [
                "sky blue", "cyan", "baby blue", "light blue", "turquoise", 
                "ఆకాశ నీలం", "లైట్ బ్లూ"
            ]
        },
        {
            id: "teal",
            name: "Peacock Teal",
            nameTe: "నెమలి పింఛం రంగు",
            hex: "#0F766E",
            zariHex: "#14B8A6",
            keywords: [
                "peacock teal", "peacock blue", "peacock green", "teal blue", "teal green", 
                "teal", "sea green", "నెమలి పింఛం రంగు", "నెమలి పింఛం", "నెమలి రంగు", 
                "పింఛం పచ్చ", "పింఛం", "టియాల్"
            ]
        },
        {
            id: "emerald",
            name: "Emerald Green",
            nameTe: "మరకత పచ్చ",
            hex: "#047857",
            zariHex: "#10B981",
            keywords: [
                "emerald green", "bottle green", "dark green", "deep green", "temple green", 
                "green", "మరకత పచ్చ", "ఆకుపచ్చ రంగు", "ఆకుపచ్చ", "పచ్చ రంగు", "పచ్చ", 
                "బాటిల్ గ్రీన్", "ఎమరాల్డ్ గ్రీన్"
            ]
        },
        {
            id: "parrot_green",
            name: "Parrot Green",
            nameTe: "చిలుక పచ్చ",
            hex: "#16A34A",
            zariHex: "#22C55E",
            keywords: [
                "parrot green", "light green", "lime green", "చిలుక పచ్చ రంగు", "చిలుక పచ్చ"
            ]
        },
        {
            id: "yellow",
            name: "Pitambaram Yellow",
            nameTe: "పీతాంబరం పసుపు",
            hex: "#EAB308",
            zariHex: "#FACC15",
            keywords: [
                "pitambaram yellow", "pitambaram", "golden yellow", "lemon yellow", 
                "mustard yellow", "haldi yellow", "haldi", "yellow", "పీతాంబరం పసుపు", 
                "పీతాంబరం", "పసుపు రంగు", "పసుపు", "పసుపుపచ్చ"
            ]
        },
        {
            id: "mustard",
            name: "Mustard Gold",
            nameTe: "ఆవాల బంగారం",
            hex: "#D97706",
            zariHex: "#F59E0B",
            keywords: [
                "mustard gold", "mustard", "ochre", "turmeric", "ఆవాలు", "పసుపు బంగారం"
            ]
        },
        {
            id: "gold",
            name: "Rich Gold",
            nameTe: "స్వర్ణ బంగారం",
            hex: "#D97706",
            zariHex: "#FBBF24",
            keywords: [
                "antique gold", "rich gold", "zari gold", "pure gold", "golden", "gold zari", 
                "gold", "స్వర్ణ బంగారం", "బంగారు రంగు", "బంగారు జరీ", "బంగారం", "బంగారు", 
                "గోల్డ్"
            ]
        },
        {
            id: "pink",
            name: "Rose Pink",
            nameTe: "రోజ్ పింక్",
            hex: "#DB2777",
            zariHex: "#F472B6",
            keywords: [
                "rose pink", "rani pink", "magenta", "baby pink", "deep pink", "hot pink", 
                "pink", "రాణి గులాబీ", "గులాబీ రంగు", "గులాబి రంగు", "గులాబీ పింక్", "పింక్"
            ]
        },
        {
            id: "purple",
            name: "Royal Purple",
            nameTe: "వంగపువ్వు ఊదా",
            hex: "#6B21A8",
            zariHex: "#A855F7",
            keywords: [
                "royal purple", "deep purple", "violet", "vangapuvvu", "lavender", "wine", 
                "purple", "వంగపువ్వు రంగు", "వంగపువ్వు", "ఊదా రంగు", "ఊదా", "పర్పుల్", "వైలెట్"
            ]
        },
        {
            id: "orange",
            name: "Terracotta Orange",
            nameTe: "నారింజ కాషాయం",
            hex: "#C2410C",
            zariHex: "#FB923C",
            keywords: [
                "terracotta orange", "terracotta", "saffron", "rust orange", "rust", 
                "peach", "orange", "నారింజ రంగు", "నారింజ", "కాషాయం రంగు", "కాషాయం", 
                "టెర్రకోట", "ఆరెంజ్"
            ]
        },
        {
            id: "black",
            name: "Charcoal Black",
            nameTe: "నలుపు",
            hex: "#18181B",
            zariHex: "#27272A",
            keywords: [
                "charcoal black", "jet black", "black", "dark", "నలుపు రంగు", "నలుపు", 
                "నల్లని", "బ్లాక్"
            ]
        },
        {
            id: "white",
            name: "Ivory White",
            nameTe: "తెలుపు ఐవరీ",
            hex: "#FAF7F2",
            zariHex: "#F8FAFC",
            keywords: [
                "ivory white", "off white", "cream white", "milk white", "pure white", 
                "ivory", "cream", "white", "తెలుపు రంగు", "తెలుపు", "తెల్లని", "ఐవరీ", 
                "క్రీమ్", "వెన్న"
            ]
        },
        {
            id: "silver",
            name: "Metallic Silver",
            nameTe: "వెండి జరీ",
            hex: "#94A3B8",
            zariHex: "#E2E8F0",
            keywords: [
                "metallic silver", "silver zari", "pure silver", "silver", "gray", "grey", 
                "వెండి జరీ", "వెండి రంగు", "వెండి", "సిల్వర్"
            ]
        },
        {
            id: "brown",
            name: "Chocolate Brown",
            nameTe: "గోధుమ రంగు",
            hex: "#78350F",
            zariHex: "#B45309",
            keywords: [
                "chocolate brown", "coffee brown", "copper", "brown", "గోధుమ రంగు", 
                "గోధుమ", "రాగి రంగు", "బ్రౌన్"
            ]
        }
    ];

    // 2. Andhra Pradesh Handloom Tradition Recognition
    let matchedTradition = null;
    if (combinedLower.includes('mangalagiri') || combinedLower.includes('మంగళగిరి')) {
        matchedTradition = 'Mangalagiri Cotton & Silk';
    } else if (combinedLower.includes('uppada') || combinedLower.includes('jamdani') || combinedLower.includes('ఉప్పాడ') || combinedLower.includes('జామ్‌దానీ') || combinedLower.includes('జాందాని')) {
        matchedTradition = 'Uppada Jamdani Silks';
    } else if (combinedLower.includes('pochampally') || combinedLower.includes('పోచంపల్లి') || combinedLower.includes('ikat') || combinedLower.includes('ఇకత్') || combinedLower.includes('pagdu')) {
        matchedTradition = 'Pochampally Double Ikat';
    } else if (combinedLower.includes('venkatagiri') || combinedLower.includes('వెంకటగిరి') || combinedLower.includes('chalu') || combinedLower.includes('చాలు')) {
        matchedTradition = 'Venkatagiri Zari Spires';
    } else if (combinedLower.includes('dharmavaram') || combinedLower.includes('ధర్మవరం') || combinedLower.includes('brocade') || combinedLower.includes('బ్రోకేడ్')) {
        matchedTradition = 'Dharmavaram Bridal Brocade';
    }

    if (matchedTradition) {
        selectedStyle = matchedTradition;
        const pill = document.querySelector(`.style-pill[data-style="${matchedTradition}"]`) ||
            document.querySelector(`.style-pill[data-style*="${matchedTradition.split(' ')[0]}"]`);
        if (pill) {
            document.querySelectorAll('.style-pill').forEach(c => c.classList.remove('active'));
            pill.classList.add('active');
        }
    }

    const effectiveStyle = selectedStyle || 'Mangalagiri Cotton & Silk';
    const effLower = effectiveStyle.toLowerCase();

    // 3. Exact Motif Extraction: Recognizes rose, lotus, jasmine, sunflower, peacock, mango, paisley, parrot, temple, geometric/ikat, leaves/vines, elephant, swan
    const MOTIF_DEFINITIONS = [
        {
            id: "rose",
            name: "Rose (గులాబీ)",
            keywords: [
                "rose motif", "rose motifs", "rose flower", "rose flowers", "rose butti", "rose buttis", 
                "roses", "rosebud", "gulabi", "గులాబీ పువ్వు", "గులాబీ మోటిఫ్", "గులాబి పువ్వు", 
                "గులాబీలు", "గులాబి", "గులాబీ"
            ],
            singleRegex: /\brose\b/i
        },
        {
            id: "lotus",
            name: "Lotus (తామర)",
            keywords: [
                "lotus", "lotuses", "kamala", "kamal", "padma", "తామర పువ్వు", "కమలం", "తామర", 
                "కమల", "పద్మం", "తామర పూవు", "పూలు", "పూల మోటిఫ్"
            ]
        },
        {
            id: "jasmine",
            name: "Jasmine (మల్లె మొగ్గలు)",
            keywords: [
                "jasmine", "malle moggu", "malli moggu", "malle", "malli", "moggu", "chameli", 
                "mallipoo", "మల్లె మొగ్గలు", "మల్లె మొగ్గ", "మల్లెపువ్వు", "మల్లెలు", "మల్లె", "మల్లి"
            ]
        },
        {
            id: "sunflower",
            name: "Sunflower (సూర్యకాంతి)",
            keywords: [
                "sunflower", "sunflowers", "surajmukhi", "suryakanthi", "సూర్యకాంతి పువ్వు", 
                "సూర్యకాంతి", "పొద్దుతిరుగుడు"
            ]
        },
        {
            id: "peacock",
            name: "Peacock (నెమలి)",
            keywords: [
                "peacock", "peacocks", "mayuri", "mayur", "mor", "నెమలి", "నెమళ్ళు", 
                "మయూరి", "మయూరం"
            ]
        },
        {
            id: "mango",
            name: "Mango / Paisley (మామిడి / కల్కా)",
            keywords: [
                "mango motif", "mango motifs", "mango", "paisley", "paisleys", "kalka", "ambi", 
                "keri", "మామిడి పిందె", "మామిడి పిందే", "మామిడి", "కల్కా", "పైస్లే"
            ]
        },
        {
            id: "parrot",
            name: "Parrot (చిలుక)",
            keywords: [
                "parrot", "parrots", "kili", "chiluka", "ramachiluka", "tota", "రామచిలుక", 
                "చిలుకలు", "చిలుక"
            ]
        },
        {
            id: "temple",
            name: "Temple Gopuram (గోపురం)",
            keywords: [
                "temple motif", "temple gopuram", "gopuram motif", "spire", "గోపురం మోటిఫ్", 
                "గోపురం", "గోపురాలు", "కోవెల"
            ]
        },
        {
            id: "ikat",
            name: "Geometric Ikat Diamond (ఇకత్)",
            keywords: [
                "geometric ikat", "ikat diamond", "double ikat", "geometric pattern", 
                "geometric patterns", "geometric design", "geometric motif", "geometric", 
                "geometry", "ఇకత్ డైమండ్", "ఇకత్", "రేఖాగణిత నమూనా", "రేఖాగణిత"
            ]
        },
        {
            id: "leaves",
            name: "Leaves & Vines (ఆకులు & తీగలు)",
            keywords: [
                "leaves and vines", "leaves & vines", "leaf motif", "leaves", "leaf", "vine", 
                "vines", "lata", "creeper", "creepers", "ఆకులు & తీగలు", "తీగలు", "ఆకులు", 
                "తీగ", "ఆకు", "లత"
            ]
        },
        {
            id: "elephant",
            name: "Regal Elephant (ఏనుగు / గజ)",
            keywords: [
                "elephant", "elephants", "gaja", "hathi", "ఏనుగు", "ఏనుగులు", "గజ"
            ]
        },
        {
            id: "swan",
            name: "Hamsa Swan (హంస)",
            keywords: [
                "swan", "swans", "hamsa", "హంస", "హంసలు"
            ]
        }
    ];

    let motifOccurrences = [];
    MOTIF_DEFINITIONS.forEach(mDef => {
        mDef.keywords.forEach(kw => {
            let startPos = 0;
            while (true) {
                const idx = lower.indexOf(kw, startPos);
                if (idx === -1) break;

                const isWordStart = idx === 0 || /[\s,.;:!?'"()/\-]/.test(lower[idx - 1]);
                const endIdx = idx + kw.length;
                const isWordEnd = endIdx === lower.length || /[\s,.;:!?'"()/\-]/.test(lower[endIdx]);

                const isOnlyRosePinkColor = (kw === 'rose' || kw === 'గులాబీ') && 
                    (lower.includes('rose pink') || lower.includes('rose color') || lower.includes('rose colour') || lower.includes('గులాబీ రంగు') || lower.includes('గులాబి రంగు')) &&
                    !lower.includes('rose motif') && !lower.includes('rose flower') && !lower.includes('rose butti') && !lower.includes('roses') && !lower.includes('గులాబీ పువ్వు') && !lower.includes('గులాబీలు');

                if (isWordStart && isWordEnd && !isOnlyRosePinkColor) {
                    motifOccurrences.push({
                        motifId: mDef.id,
                        name: mDef.name,
                        keyword: kw,
                        index: idx,
                        length: kw.length
                    });
                }
                startPos = idx + kw.length;
            }
        });

        if (mDef.id === 'rose' && mDef.singleRegex && mDef.singleRegex.test(lower)) {
            const hasColorMatch = lower.includes('rose pink') || lower.includes('rose color') || lower.includes('rose colour');
            const hasExplicitRoseMotif = lower.includes('rose motif') || lower.includes('rose flower') || lower.includes('roses') || lower.includes('rose butti');
            if (!hasColorMatch || hasExplicitRoseMotif) {
                const match = mDef.singleRegex.exec(lower);
                if (match && !motifOccurrences.some(o => o.motifId === 'rose')) {
                    motifOccurrences.push({
                        motifId: 'rose',
                        name: mDef.name,
                        keyword: 'rose',
                        index: match.index,
                        length: 4
                    });
                }
            }
        }
    });

    motifOccurrences.sort((a, b) => a.index !== b.index ? a.index - b.index : b.length - a.length);
    let nonOverlappingMotifs = [];
    for (let occ of motifOccurrences) {
        const overlaps = nonOverlappingMotifs.some(prev => 
            (occ.index >= prev.index && occ.index < prev.index + prev.length) ||
            (prev.index >= occ.index && prev.index < occ.index + occ.length)
        );
        if (!overlaps) nonOverlappingMotifs.push(occ);
    }

    let borderMotif = null;
    let palluMotif = null;
    let bodyMotif = null;
    let detectedMotif = null;
    let detectedMotifName = null;

    nonOverlappingMotifs.forEach(occ => {
        const afterText = lower.slice(occ.index + occ.length, Math.min(lower.length, occ.index + occ.length + 35));
        const beforeText = lower.slice(Math.max(0, occ.index - 35), occ.index);
        const surrounding = beforeText + " " + occ.keyword + " " + afterText;

        const isBorder = /(?:border|anchu|kaddi|బోర్డర్|అంచు)/i.test(surrounding);
        const isPallu = /(?:pallu|kongu|పల్లూ|కొంగు)/i.test(surrounding);
        const isBody = /(?:body|all over|butti|buttis|fabric|saree|బాడీ|చీర|అంతా)/i.test(surrounding);

        if (isBorder && !borderMotif) {
            borderMotif = occ.motifId;
        } else if (isPallu && !palluMotif) {
            palluMotif = occ.motifId;
        } else if (isBody && !bodyMotif) {
            bodyMotif = occ.motifId;
        } else if (!detectedMotif) {
            detectedMotif = occ.motifId;
            detectedMotifName = occ.name;
        }
    });

    if (!detectedMotif) {
        detectedMotif = bodyMotif || borderMotif || palluMotif || null;
        if (detectedMotif) {
            const foundDef = MOTIF_DEFINITIONS.find(m => m.id === detectedMotif);
            detectedMotifName = foundDef ? foundDef.name : detectedMotif;
        }
    }

    const userRequestedMotif = detectedMotif;

    // Default motif respecting the selected Andhra tradition ONLY if not specified by user
    if (!detectedMotif) {
        if (effLower.includes('mangalagiri')) {
            detectedMotif = 'temple';
            detectedMotifName = 'Temple Gopuram (గోపురం)';
        } else if (effLower.includes('uppada')) {
            detectedMotif = 'lotus';
            detectedMotifName = 'Jamdani Floral Lata';
        } else if (effLower.includes('pochampally')) {
            detectedMotif = 'ikat';
            detectedMotifName = 'Geometric Ikat Diamond';
        } else if (effLower.includes('venkatagiri')) {
            detectedMotif = 'lotus';
            detectedMotifName = 'Chalu Zari Butti';
        } else if (effLower.includes('dharmavaram')) {
            detectedMotif = 'peacock';
            detectedMotifName = 'Mayuri Crest';
        } else {
            detectedMotif = 'lotus';
            detectedMotifName = 'Sacred Lotus';
        }
    }

    if (!bodyMotif) bodyMotif = detectedMotif;
    if (!palluMotif) palluMotif = detectedMotif;

    // 4. Exact Contextual Color Extraction for Body, Border, Pallu, and Motif
    let foundOccurrences = [];
    const textToSearch = userSpeech.length > 0 ? userSpeech.toLowerCase() : lower;

    COLOR_CATALOG.forEach(cDef => {
        cDef.keywords.forEach(kw => {
            let startPos = 0;
            while (true) {
                const idx = textToSearch.indexOf(kw, startPos);
                if (idx === -1) break;

                const isWordStart = idx === 0 || /[\s,.;:!?'"()/\-]/.test(textToSearch[idx - 1]);
                const endIdx = idx + kw.length;
                const isWordEnd = endIdx === textToSearch.length || /[\s,.;:!?'"()/\-]/.test(textToSearch[endIdx]);

                const isRoseFlower = (kw === 'rose' || kw === 'గులాబీ') && 
                    (detectedMotif === 'rose' || bodyMotif === 'rose' || borderMotif === 'rose' || palluMotif === 'rose') &&
                    !textToSearch.includes('rose pink') && !textToSearch.includes('rose color') && !textToSearch.includes('rose colour') && !textToSearch.includes('గులాబీ రంగు') && !textToSearch.includes('గులాబి రంగు');

                if (isWordStart && isWordEnd && !isRoseFlower) {
                    foundOccurrences.push({
                        color: cDef,
                        keyword: kw,
                        index: idx,
                        length: kw.length
                    });
                }
                startPos = idx + kw.length;
            }
        });
    });

    foundOccurrences.sort((a, b) => a.index !== b.index ? a.index - b.index : b.length - a.length);

    let nonOverlapping = [];
    for (let occ of foundOccurrences) {
        const overlaps = nonOverlapping.some(prev => 
            (occ.index >= prev.index && occ.index < prev.index + prev.length) ||
            (prev.index >= occ.index && prev.index < occ.index + occ.length)
        );
        if (!overlaps) {
            nonOverlapping.push(occ);
        }
    }

    let userBodyColor = null;
    let userBorderColor = null;
    let userPalluColor = null;
    let userMotifColor = null;

    nonOverlapping.forEach(occ => {
        const afterText = textToSearch.slice(occ.index + occ.length, Math.min(textToSearch.length, occ.index + occ.length + 30));
        const beforeText = textToSearch.slice(Math.max(0, occ.index - 30), occ.index);

        const afterIsBody = /^\s*(?:color\s+|colour\s+|రంగు\s+)?(?:body|saree|fabric|బాడీ|చీర)/i.test(afterText);
        const beforeIsBody = /(?:body|saree body|బాడీ|చీర)\s*(?:is|in|of|color|colour|రంగు|:)?\s*$/i.test(beforeText);

        const afterIsBorder = /^\s*(?:color\s+|colour\s+|రంగు\s+)?(?:border|anchu|kaddi|బోర్డర్|అంచు)/i.test(afterText);
        const beforeIsBorder = /(?:border|anchu|బోర్డర్|అంచు)\s*(?:is|in|of|color|colour|రంగు|:)?\s*$/i.test(beforeText);

        const afterIsPallu = /^\s*(?:color\s+|colour\s+|రంగు\s+)?(?:pallu|kongu|పల్లూ|కొంగు)/i.test(afterText);
        const beforeIsPallu = /(?:pallu|kongu|పల్లూ|కొంగు)\s*(?:is|in|of|color|colour|రంగు|:)?\s*$/i.test(beforeText);

        const afterIsMotif = /^\s*(?:color\s+|colour\s+|రంగు\s+)?(?:motif|motifs|zari|butti|buttis|flower|peacock|lotus|rose|jasmine|sunflower|mango|paisley|parrot|elephant|swan|మోటిఫ్|జరీ|బుటా|పువ్వు|నెమలి|తామర|గులాబీ|మల్లె|సూర్యకాంతి|మామిడి|చిలుక)/i.test(afterText);
        const beforeIsMotif = /(?:motif|motifs|zari|మోటిఫ్|జరీ)\s*(?:is|in|of|color|colour|రంగు|:)?\s*$/i.test(beforeText);

        if (afterIsMotif || beforeIsMotif) {
            occ.role = 'motif';
        } else if (afterIsBorder || beforeIsBorder) {
            occ.role = 'border';
        } else if (afterIsPallu || beforeIsPallu) {
            occ.role = 'pallu';
        } else if (afterIsBody || beforeIsBody) {
            occ.role = 'body';
        } else {
            occ.role = 'unassigned';
        }
    });

    // Step A: Assign explicit contextual roles
    nonOverlapping.forEach(occ => {
        if (occ.role === 'body' && !userBodyColor) {
            userBodyColor = occ.color;
        } else if (occ.role === 'border' && !userBorderColor) {
            userBorderColor = occ.color;
        } else if (occ.role === 'pallu' && !userPalluColor) {
            userPalluColor = occ.color;
        } else if (occ.role === 'motif' && !userMotifColor) {
            userMotifColor = occ.color;
        }
    });

    // Step B: Assign unassigned colors in natural linguistic order (1st: body, 2nd: border, 3rd: motif)
    const unassigned = nonOverlapping.filter(o => o.role === 'unassigned');
    unassigned.forEach(occ => {
        if (!userBodyColor) {
            userBodyColor = occ.color;
        } else if (!userBorderColor && occ.color.id !== userBodyColor.id) {
            userBorderColor = occ.color;
        } else if (!userMotifColor && occ.color.id !== userBodyColor.id && (!userBorderColor || occ.color.id !== userBorderColor.id)) {
            userMotifColor = occ.color;
        }
    });

    // 5. Authentic Andhra Tradition Color Defaults
    let defaultBody = "#D97706";
    let defaultBorder = "#800020";
    let defaultPallu = "#991B1B";
    let defaultZari = "#FBBF24";
    let defaultPaletteName = "Mustard Gold & Nizam Crimson";

    if (effLower.includes('mangalagiri')) {
        defaultBody = "#D97706";
        defaultBorder = "#800020";
        defaultPallu = "#991B1B";
        defaultZari = "#FBBF24";
        defaultPaletteName = "Mustard Gold & Nizam Crimson";
    } else if (effLower.includes('uppada')) {
        defaultBody = "#0F766E";
        defaultBorder = "#BE185D";
        defaultPallu = "#BE185D";
        defaultZari = "#F59E0B";
        defaultPaletteName = "Translucent Teal & Rose Jamdani";
    } else if (effLower.includes('pochampally')) {
        defaultBody = "#EAB308";
        defaultBorder = "#6B21A8";
        defaultPallu = "#6B21A8";
        defaultZari = "#FBBF24";
        defaultPaletteName = "Pitambaram Yellow & Royal Purple Ikat";
    } else if (effLower.includes('venkatagiri')) {
        defaultBody = "#064E3B";
        defaultBorder = "#B91C1C";
        defaultPallu = "#B91C1C";
        defaultZari = "#D97706";
        defaultPaletteName = "Emerald Green & Ruby Zari Spire";
    } else if (effLower.includes('dharmavaram')) {
        defaultBody = "#4A0812";
        defaultBorder = "#991B1B";
        defaultPallu = "#800020";
        defaultZari = "#D4AF37";
        defaultPaletteName = "Bridal Sindoor Maroon & Antique Gold";
    }

    // Apply exact user choices, falling back to tradition defaults only when not specified
    let finalBodyColor = userBodyColor ? userBodyColor.hex : defaultBody;
    let finalBorderColor = userBorderColor ? userBorderColor.hex : defaultBorder;
    let finalPalluColor = userPalluColor ? userPalluColor.hex : finalBorderColor;
    let finalZariColor = userMotifColor ? (userMotifColor.zariHex || userMotifColor.hex) : defaultZari;

    // Handle silver zari if explicitly requested
    if (lower.includes('silver') || lower.includes('వెండి')) {
        finalZariColor = "#E2E8F0";
    }

    // Build Descriptive Palette Label
    let paletteLabel = "";
    if (userBodyColor && userBorderColor) {
        paletteLabel = `${userBodyColor.name} & ${userBorderColor.name}`;
    } else if (userBodyColor) {
        paletteLabel = `${userBodyColor.name} with ${effectiveStyle} Border`;
    } else if (userBorderColor) {
        paletteLabel = `${effectiveStyle} with ${userBorderColor.name} Border`;
    } else {
        paletteLabel = defaultPaletteName;
    }

    if (userMotifColor) {
        paletteLabel += ` (${userMotifColor.name} Motifs)`;
    }

    // 6. Border Style Detection (Respecting user request or Andhra tradition)
    let borderStyle = "double_zari";
    if (borderMotif === 'peacock' || lower.includes('peacock border') || lower.includes('నెమలి బోర్డర్') || lower.includes('నెమలి అంచు')) {
        borderStyle = "peacock_border";
    } else if (lower.includes('temple border') || lower.includes('gopuram border') || lower.includes('గోపురం బోర్డర్') || lower.includes('temple spikes') || lower.includes('గోపురం అంచు')) {
        borderStyle = "temple";
    } else if (lower.includes('ikat wave') || lower.includes('wave border') || lower.includes('ఇకత్ బోర్డర్') || lower.includes('తరంగాలు')) {
        borderStyle = "ikat_wave";
    } else if (lower.includes('chevron') || lower.includes('zig') || lower.includes('జిగ్')) {
        borderStyle = "chevron_pattern";
    } else if (lower.includes('stripe') || lower.includes('గీతల బోర్డర్') || lower.includes('గీతలు')) {
        borderStyle = "zari_stripes";
    } else if (lower.includes('double zari') || lower.includes('ద్వంద్వ జరీ')) {
        borderStyle = "double_zari";
    } else if (lower.includes('temple') || lower.includes('గోపురం')) {
        borderStyle = "temple";
    } else if (borderMotif) {
        borderStyle = (borderMotif === 'peacock') ? "peacock_border" : "double_zari";
    } else {
        if (effLower.includes('mangalagiri')) borderStyle = "temple";
        else if (effLower.includes('uppada')) borderStyle = "double_zari";
        else if (effLower.includes('pochampally')) borderStyle = "ikat_wave";
        else if (effLower.includes('venkatagiri')) borderStyle = "temple";
        else if (effLower.includes('dharmavaram')) borderStyle = "peacock_border";
        else borderStyle = "double_zari";
    }

    // 7. Body Pattern Detection (Respecting user request or Andhra tradition)
    let bodyPattern = "floral_vines";
    if (lower.includes('check') || lower.includes('kattam') || lower.includes('గడులు') || lower.includes('గళ్ళు') || lower.includes('చెక్స్') || lower.includes('geometric')) {
        bodyPattern = "checks";
    } else if (lower.includes('lattice') || lower.includes('jaal') || lower.includes('వల')) {
        bodyPattern = "lattice";
    } else if (lower.includes('paisley lattice') || lower.includes('మామిడి జాల్')) {
        bodyPattern = "paisley_lattice";
    } else if (lower.includes('diagonal') || lower.includes('క్రాస్')) {
        bodyPattern = "diagonal_ikat";
    } else if (lower.includes('stripe') || lower.includes('గీతలు')) {
        bodyPattern = "stripes";
    } else if (lower.includes('butti') || lower.includes('బుటాలు') || lower.includes('chalu')) {
        bodyPattern = "scattered_buttis";
    } else if (lower.includes('solid') || lower.includes('plain') || lower.includes('సాదా')) {
        bodyPattern = "solid";
    } else if (lower.includes('floral vines') || lower.includes('vines') || lower.includes('తీగలు')) {
        bodyPattern = "floral_vines";
    } else {
        if (effLower.includes('mangalagiri')) bodyPattern = "checks";
        else if (effLower.includes('uppada')) bodyPattern = "floral_vines";
        else if (effLower.includes('pochampally')) bodyPattern = "diagonal_ikat";
        else if (effLower.includes('venkatagiri')) bodyPattern = "scattered_buttis";
        else if (effLower.includes('dharmavaram')) bodyPattern = "paisley_lattice";
        else bodyPattern = "floral_vines";
    }

    // 8. Pallu Style Detection (Respecting user request or Andhra tradition)
    let palluStyle = "grand_medallion";
    if (palluMotif || lower.includes('floral pallu') || lower.includes('పూల కొంగు') || lower.includes('పల్లూ లో') || lower.includes('కొంగు లో')) {
        palluStyle = "decorative_pallu";
    } else if (lower.includes('temple pallu') || lower.includes('cascade') || lower.includes('గోపురాలు') || lower.includes('గోపురాల కొంగు')) {
        palluStyle = "cascade_temple";
    } else if (lower.includes('traditional pallu') || lower.includes('పట్టీల కొంగు') || lower.includes('గీతల కొంగు')) {
        palluStyle = "traditional_stripes";
    } else if (lower.includes('ikat pallu') || lower.includes('ఇకత్ కొంగు')) {
        palluStyle = "ikat_block";
    } else if (lower.includes('medallion') || lower.includes('chakra') || lower.includes('చక్రం') || lower.includes('bridal pallu')) {
        palluStyle = "grand_medallion";
    } else {
        if (effLower.includes('mangalagiri')) palluStyle = "traditional_stripes";
        else if (effLower.includes('uppada')) palluStyle = "decorative_pallu";
        else if (effLower.includes('pochampally')) palluStyle = "ikat_block";
        else if (effLower.includes('venkatagiri')) palluStyle = "cascade_temple";
        else if (effLower.includes('dharmavaram')) palluStyle = "grand_medallion";
        else palluStyle = "grand_medallion";
    }

    // 9. Authentic Weaver Specifications
    let weaverSpecs = {
        warpYarn: "2/120s Mulberry Silk",
        weftYarn: "Pure Silk 20/22 Denier",
        reedPicks: "88 Reed / 94 Picks",
        jacquardCards: "280 Hooks Jacquard Set",
        estimatedWeavingTime: "7 - 9 Days"
    };

    if (effLower.includes('mangalagiri')) {
        weaverSpecs = {
            warpYarn: "2/120s Pure Silk / 80s Cotton",
            weftYarn: "Pure Silk 20/22 Denier / 80s Combed Cotton",
            reedPicks: "88 Reed / 94 Picks",
            jacquardCards: "Nizam Gopuram Pit Loom Frame",
            estimatedWeavingTime: "5 - 7 Days"
        };
    } else if (effLower.includes('uppada')) {
        weaverSpecs = {
            warpYarn: "100s Fine Cotton / 2/120s Mulberry Silk",
            weftYarn: "Pure Silk 20/22 Denier (Translucent Gossamer)",
            reedPicks: "96 Reed / 104 Picks",
            jacquardCards: "Non-Mechanical Jamdani Bamboo Shuttles",
            estimatedWeavingTime: "12 - 16 Days"
        };
    } else if (effLower.includes('pochampally')) {
        weaverSpecs = {
            warpYarn: "2/100s Mercerized Cotton / 2/120s Mulberry Silk",
            weftYarn: "Double Ikat Tie-Dye Weft (Pagdu Bandhu)",
            reedPicks: "84 Reed / 92 Picks",
            jacquardCards: "Chitku Handloom Frame / Asu Peg Mapping",
            estimatedWeavingTime: "8 - 12 Days"
        };
    } else if (effLower.includes('venkatagiri')) {
        weaverSpecs = {
            warpYarn: "100s/120s Combed Sea Island Cotton & Silk",
            weftYarn: "Pure Zari & Fine Silk (Chalu Weave)",
            reedPicks: "92 Reed / 98 Picks",
            jacquardCards: "320 Hooks Zari Spire Jacquard",
            estimatedWeavingTime: "8 - 11 Days"
        };
    } else if (effLower.includes('dharmavaram')) {
        weaverSpecs = {
            warpYarn: "2/120s Heavy Mulberry Silk (Double Warp)",
            weftYarn: "Pure Silk 20/22 Denier + Heavy Silver-Gilt Zari",
            reedPicks: "100 Reed / 112 Picks",
            jacquardCards: "480 Hooks Bridal Brocade Jacquard Set",
            estimatedWeavingTime: "14 - 20 Days"
        };
    }

    const suggestion = {
        suggestedTitle: `${effectiveStyle} Saree - ${detectedMotifName || detectedMotif}`,
        style: { nameEn: effectiveStyle, nameTe: effectiveStyle },
        colors: { body: finalBodyColor, border: finalBorderColor, pallu: finalPalluColor, zari: finalZariColor, paletteName: paletteLabel },
        motif: { id: detectedMotif, en: (detectedMotifName || detectedMotif).toUpperCase(), te: detectedMotif },
        bodyMotif: bodyMotif || detectedMotif,
        borderMotif: borderMotif || (borderStyle === 'peacock_border' ? 'peacock' : null),
        palluMotif: palluMotif || detectedMotif,
        userRequestedMotif: userRequestedMotif,
        bodyPattern: bodyPattern,
        borderStyle: borderStyle,
        palluStyle: palluStyle,
        motifArrangement: "staggered",
        motifDensity: "Medium",
        aiSummary: `Synthesized authentic <b>${effectiveStyle}</b> saree matching your description: <b>${(detectedMotifName || detectedMotif).toUpperCase()}</b> motifs on <b>${paletteLabel}</b> with <b>${bodyPattern.replace(/_/g, ' ')}</b> body and <b>${borderStyle.replace(/_/g, ' ')}</b> border.`,
        weaverSpecs: weaverSpecs
    };

    const detectedReqs = {
        color: paletteLabel,
        motif: (detectedMotifName || detectedMotif).toUpperCase(),
        border: borderStyle.replace(/_/g, ' ').toUpperCase(),
        style: effectiveStyle,
        userRequestedMotif: userRequestedMotif
    };

    applySingleAIDesign(suggestion, detectedReqs, sourceText);
}

function updateWeaverSpecs() {
    const fabSelect = document.getElementById('fabricSelect');
    const fab = fabSelect ? fabSelect.value : 'Silk';
    if (fab === 'Cotton') {
        setValText('specWarp', "2/100s Mercerized Cotton");
        setValText('specWeft', "80s Combed Cotton");
    } else {
        setValText('specWarp', "2/120s Mulberry Silk");
        setValText('specWeft', "Pure Silk 20/22 Denier");
    }
}

// -----------------------------------------------------------------
// 7. Welcome Screen Before Generation
// -----------------------------------------------------------------
function renderWelcomeCanvas() {
    if (!canvas || !ctx) return;
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    // Warm loom background
    ctx.fillStyle = "#1E0A0F";
    ctx.fillRect(0, 0, w, h);

    // Draw baseline saree weave in background
    drawFlatSareeView(w, h, 0.45);

    // Elegant Indian Handloom Invitation Centerpiece
    ctx.save();
    const cx = w / 2;
    const cy = h / 2;

    // Center Gold-trimmed Maroon Plaque
    ctx.fillStyle = "rgba(72, 10, 21, 0.94)";
    ctx.strokeStyle = "#D4AF37";
    ctx.lineWidth = 2.5;

    const boxW = 600;
    const boxH = 150;
    ctx.beginPath();
    ctx.roundRect(cx - boxW / 2, cy - boxH / 2, boxW, boxH, 12);
    ctx.fill();
    ctx.stroke();

    // Plaque Filigree Corner Dots
    ctx.fillStyle = "#D4AF37";
    const pad = 8;
    ctx.beginPath();
    ctx.arc(cx - boxW / 2 + pad, cy - boxH / 2 + pad, 3, 0, Math.PI * 2);
    ctx.arc(cx + boxW / 2 - pad, cy - boxH / 2 + pad, 3, 0, Math.PI * 2);
    ctx.arc(cx - boxW / 2 + pad, cy + boxH / 2 - pad, 3, 0, Math.PI * 2);
    ctx.arc(cx + boxW / 2 - pad, cy + boxH / 2 - pad, 3, 0, Math.PI * 2);
    ctx.fill();

    // Header Text
    ctx.textAlign = "center";
    ctx.fillStyle = "#FBF4DE";
    ctx.font = "700 18px Cinzel Decorative, Outfit, serif";
    const welcomeTitle = currentLang === 'te-IN'
        ? `✨ చేనేత స్టూడియో: ${selectedStyle} శైలి`
        : `✨ Handloom Studio: ${selectedStyle} Saree`;
    ctx.fillText(welcomeTitle, cx, cy - 24);

    // Subtitle Action Guide
    ctx.fillStyle = "#D4AF37";
    ctx.font = "600 14px Outfit, sans-serif";
    const welcomeSub = currentLang === 'te-IN'
        ? "🎙️ వాయిస్ లేదా టెక్స్ట్ ద్వారా చెప్పండి, వెంటనే డిజైన్ రూపొందుతుంది"
        : "🎙️ Speak in Telugu/English or type, then click 'Generate My Design'";
    ctx.fillText(welcomeSub, cx, cy + 8);

    ctx.fillStyle = "#E2E8F0";
    ctx.font = "12px Outfit, sans-serif";
    const subNote = currentLang === 'te-IN'
        ? "🎨 రూపొందించిన తర్వాత రంగులు, మోటిఫ్‌లు, బోర్డర్లు & పల్లూ మార్చుకోవచ్చు"
        : "🎨 Full customization for colors, motifs, borders & pallu unlocks after generation";
    ctx.fillText(subNote, cx, cy + 36);

    ctx.restore();

    const tagBadge = document.getElementById('sareeTagBadge');
    if (tagBadge) tagBadge.textContent = `${selectedStyle} (Ready to Generate)`;
}

// -----------------------------------------------------------------
// 8. Dynamic Saree Visualization Engine (Canvas Rendering)
// -----------------------------------------------------------------
function renderSareeCanvas() {
    if (!canvas || !ctx) return;
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    const tagBadge = document.getElementById('sareeTagBadge');
    if (tagBadge) tagBadge.textContent = `${currentDesign.title} (${currentDesign.fabricType})`;

    if (viewMode === 'flat') {
        drawFlatSareeView(w, h, 1.0);
    } else if (viewMode === 'drape') {
        drawDrapedSareeView(w, h);
    } else if (viewMode === 'zoom') {
        drawZoomMotifView(w, h);
    }
}

// Draw Flat Saree View (Pallu + Body + Borders + Repeat Motifs + Body Patterns)
function drawFlatSareeView(w, h, opacity = 1.0) {
    ctx.save();
    ctx.globalAlpha = opacity;

    const borderHeight = 60;
    const palluWidth = 230;

    // 1. Draw Body Base Fabric
    ctx.fillStyle = currentDesign.bodyColor;
    ctx.fillRect(palluWidth, borderHeight, w - palluWidth, h - (borderHeight * 2));

    // 2. Draw Body Patterns (Leafy Vines, Checks, Jaal Lattice, Ikat, etc.)
    drawBodyPattern(ctx, palluWidth, borderHeight, w - palluWidth, h - (borderHeight * 2), currentDesign.bodyPattern, currentDesign.zariColor);

    // Fabric Weave Micro Texture overlay
    drawWeaveTexture(palluWidth, borderHeight, w - palluWidth, h - (borderHeight * 2));

    // 3. Draw Pallu Section (Left End)
    drawPalluSection(ctx, 0, 0, palluWidth, h, currentDesign.palluStyle, currentDesign.palluColor, currentDesign.zariColor, currentDesign.palluMotif || currentDesign.motifType);

    // 4. Top & Bottom Borders
    ctx.fillStyle = currentDesign.borderColor;
    ctx.fillRect(palluWidth, 0, w - palluWidth, borderHeight);
    ctx.fillRect(palluWidth, h - borderHeight, w - palluWidth, borderHeight);

    // Draw Architectural Border Patterns
    drawBorderPattern(ctx, palluWidth, 0, w - palluWidth, borderHeight, currentDesign.borderStyle, true);
    drawBorderPattern(ctx, palluWidth, h - borderHeight, w - palluWidth, borderHeight, currentDesign.borderStyle, false);

    // 5. Draw Body Repeating Motifs
    drawBodyMotifs(ctx, palluWidth, borderHeight, w - palluWidth, h - (borderHeight * 2), currentDesign.bodyMotif || currentDesign.motifType, currentDesign.motifDensity, currentDesign.motifArrangement, currentDesign.zariColor);

    // Border Divider Zari Frame
    ctx.strokeStyle = currentDesign.zariColor;
    ctx.lineWidth = 2.5;
    ctx.strokeRect(palluWidth, borderHeight, w - palluWidth, h - borderHeight * 2);

    ctx.restore();
}

// -----------------------------------------------------------------
// 9. Authentic Handloom Motif Graphics Engine
// -----------------------------------------------------------------
function drawMotifSymbol(ctx, x, y, size, type, color) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.8;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (type === 'peacock') {
        // Authentic Mayuri Peacock Silhouette with Crest, S-Neck & Layered Plumes
        const s = size / 24;

        // Crest (3 Kalagi plumes with golden pearls)
        ctx.beginPath();
        ctx.moveTo(x - 2 * s, y - 8 * s);
        ctx.lineTo(x - 5 * s, y - 13 * s);
        ctx.moveTo(x, y - 9 * s);
        ctx.lineTo(x - 1 * s, y - 14 * s);
        ctx.moveTo(x + 2 * s, y - 8 * s);
        ctx.lineTo(x + 3 * s, y - 13 * s);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(x - 5 * s, y - 14 * s, 1.2 * s, 0, Math.PI * 2);
        ctx.arc(x - 1 * s, y - 15 * s, 1.2 * s, 0, Math.PI * 2);
        ctx.arc(x + 3 * s, y - 14 * s, 1.2 * s, 0, Math.PI * 2);
        ctx.fill();

        // Graceful S-Curved Neck and Head
        ctx.beginPath();
        ctx.arc(x - 1 * s, y - 6 * s, 3 * s, 0, Math.PI * 2);
        ctx.fill();

        // Beak pointing left
        ctx.beginPath();
        ctx.moveTo(x - 4 * s, y - 6 * s);
        ctx.lineTo(x - 8 * s, y - 5 * s);
        ctx.lineTo(x - 4 * s, y - 4 * s);
        ctx.closePath();
        ctx.fill();

        // Curved Breast and Body
        ctx.beginPath();
        ctx.moveTo(x - 1 * s, y - 3 * s);
        ctx.bezierCurveTo(x - 6 * s, y + 2 * s, x - 4 * s, y + 8 * s, x, y + 9 * s);
        ctx.bezierCurveTo(x + 5 * s, y + 9 * s, x + 7 * s, y + 4 * s, x + 3 * s, y - 1 * s);
        ctx.closePath();
        ctx.fill();

        // Wing details
        ctx.strokeStyle = "rgba(0, 0, 0, 0.25)";
        ctx.beginPath();
        ctx.arc(x + 1 * s, y + 4 * s, 3.5 * s, -0.4, Math.PI * 0.9);
        ctx.stroke();
        ctx.strokeStyle = color;

        // Fanned Tail Feathers (3 Layered Plumes with Eyelets)
        ctx.beginPath();
        ctx.moveTo(x + 3 * s, y + 6 * s);
        ctx.bezierCurveTo(x + 10 * s, y + 5 * s, x + 15 * s, y - 2 * s, x + 12 * s, y - 8 * s);
        ctx.bezierCurveTo(x + 7 * s, y - 4 * s, x + 4 * s, y + 2 * s, x + 3 * s, y + 6 * s);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(x + 3 * s, y + 7 * s);
        ctx.bezierCurveTo(x + 12 * s, y + 9 * s, x + 18 * s, y + 2 * s, x + 16 * s, y - 4 * s);
        ctx.bezierCurveTo(x + 11 * s, y - 1 * s, x + 6 * s, y + 4 * s, x + 3 * s, y + 7 * s);
        ctx.fill();

        // Feather Eyes (Teardrop with inner center)
        ctx.beginPath();
        ctx.arc(x + 12 * s, y - 7 * s, 1.8 * s, 0, Math.PI * 2);
        ctx.arc(x + 16 * s, y - 3 * s, 1.8 * s, 0, Math.PI * 2);
        ctx.fill();

        // Standing Perch Branch
        ctx.beginPath();
        ctx.moveTo(x - 6 * s, y + 10 * s);
        ctx.quadraticCurveTo(x, y + 8 * s, x + 8 * s, y + 11 * s);
        ctx.stroke();

    } else if (type === 'mango' || type === 'paisley') {
        // Classic Indian Kalka / Ambi Paisley Motif
        const s = size / 24;

        ctx.beginPath();
        // Curled Hook Apex
        ctx.moveTo(x + 2 * s, y - 11 * s);
        ctx.bezierCurveTo(x + 10 * s, y - 9 * s, x + 12 * s, y - 2 * s, x + 9 * s, y + 4 * s);
        // Plump Teardrop Body
        ctx.bezierCurveTo(x + 6 * s, y + 10 * s, x - 5 * s, y + 11 * s, x - 8 * s, y + 5 * s);
        ctx.bezierCurveTo(x - 11 * s, y - 1 * s, x - 6 * s, y - 7 * s, x - 1 * s, y - 10 * s);
        // Inward curl
        ctx.bezierCurveTo(x + 3 * s, y - 12 * s, x + 5 * s, y - 7 * s, x + 2 * s, y - 5 * s);
        ctx.bezierCurveTo(x, y - 4 * s, x - 1 * s, y - 6 * s, x + 1 * s, y - 7 * s);
        ctx.fill();

        // Inner Paisley Spiral Whorl
        ctx.strokeStyle = "rgba(0, 0, 0, 0.3)";
        ctx.beginPath();
        ctx.arc(x - 1 * s, y + 2 * s, 3.5 * s, 0, Math.PI * 1.5);
        ctx.stroke();

        // Calyx Double Leaf at Base
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(x - 3 * s, y + 11 * s, 3.5 * s, 1.5 * s, -Math.PI / 4, 0, Math.PI * 2);
        ctx.ellipse(x + 3 * s, y + 11 * s, 3.5 * s, 1.5 * s, Math.PI / 4, 0, Math.PI * 2);
        ctx.fill();

    } else if (type === 'lotus') {
        // Blooming Indian Kamala (7-Petal Lotus)
        const s = size / 24;

        // Central pointed petal
        ctx.beginPath();
        ctx.moveTo(x, y - 12 * s);
        ctx.quadraticCurveTo(x + 4 * s, y - 5 * s, x, y + 6 * s);
        ctx.quadraticCurveTo(x - 4 * s, y - 5 * s, x, y - 12 * s);
        ctx.fill();

        // Inner Left Petal
        ctx.beginPath();
        ctx.moveTo(x, y + 5 * s);
        ctx.quadraticCurveTo(x - 7 * s, y - 2 * s, x - 6 * s, y - 9 * s);
        ctx.quadraticCurveTo(x - 2 * s, y - 4 * s, x, y + 5 * s);
        ctx.fill();

        // Inner Right Petal
        ctx.beginPath();
        ctx.moveTo(x, y + 5 * s);
        ctx.quadraticCurveTo(x + 7 * s, y - 2 * s, x + 6 * s, y - 9 * s);
        ctx.quadraticCurveTo(x + 2 * s, y - 4 * s, x, y + 5 * s);
        ctx.fill();

        // Outer Sweeping Left Petal
        ctx.beginPath();
        ctx.moveTo(x, y + 6 * s);
        ctx.quadraticCurveTo(x - 12 * s, y + 3 * s, x - 11 * s, y - 4 * s);
        ctx.quadraticCurveTo(x - 5 * s, y + 1 * s, x, y + 6 * s);
        ctx.fill();

        // Outer Sweeping Right Petal
        ctx.beginPath();
        ctx.moveTo(x, y + 6 * s);
        ctx.quadraticCurveTo(x + 12 * s, y + 3 * s, x + 11 * s, y - 4 * s);
        ctx.quadraticCurveTo(x + 5 * s, y + 1 * s, x, y + 6 * s);
        ctx.fill();

        // Lotus Base Pedestal / Sepals
        ctx.beginPath();
        ctx.arc(x, y + 8 * s, 6 * s, 0, Math.PI);
        ctx.fill();

    } else if (type === 'temple') {
        // Multi-tiered Stepped Temple Gopuram Tower
        const s = size / 24;

        // Kalasam Finial Pinnacle
        ctx.beginPath();
        ctx.arc(x, y - 13 * s, 1.8 * s, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(x - 1 * s, y - 11 * s, 2 * s, 2 * s);

        // Top Spire Tier
        ctx.beginPath();
        ctx.moveTo(x, y - 10 * s);
        ctx.lineTo(x + 4 * s, y - 4 * s);
        ctx.lineTo(x - 4 * s, y - 4 * s);
        ctx.closePath();
        ctx.fill();

        // Cornice 1
        ctx.fillRect(x - 6 * s, y - 4 * s, 12 * s, 2 * s);

        // Middle Tier with Carved Pillars
        ctx.fillRect(x - 7 * s, y - 2 * s, 14 * s, 4 * s);
        // Cornice 2
        ctx.fillRect(x - 9 * s, y + 2 * s, 18 * s, 2 * s);

        // Bottom Adhisthana Plinth Base
        ctx.fillRect(x - 10 * s, y + 4 * s, 20 * s, 5 * s);
        // Central Arch Niche
        ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
        ctx.beginPath();
        ctx.arc(x, y + 5 * s, 2.5 * s, Math.PI, 0);
        ctx.lineTo(x + 2.5 * s, y + 9 * s);
        ctx.lineTo(x - 2.5 * s, y + 9 * s);
        ctx.closePath();
        ctx.fill();

    } else if (type === 'ikat' || type === 'geometric') {
        // Pochampally Stepped Diamond with Cross Star
        const s = size / 24;

        // Stepped outer diamond contour
        ctx.beginPath();
        ctx.moveTo(x, y - 12 * s);
        ctx.lineTo(x + 3 * s, y - 9 * s);
        ctx.lineTo(x + 6 * s, y - 9 * s);
        ctx.lineTo(x + 9 * s, y - 6 * s);
        ctx.lineTo(x + 9 * s, y - 3 * s);
        ctx.lineTo(x + 12 * s, y);
        ctx.lineTo(x + 9 * s, y + 3 * s);
        ctx.lineTo(x + 9 * s, y + 6 * s);
        ctx.lineTo(x + 6 * s, y + 9 * s);
        ctx.lineTo(x + 3 * s, y + 9 * s);
        ctx.lineTo(x, y + 12 * s);
        ctx.lineTo(x - 3 * s, y + 9 * s);
        ctx.lineTo(x - 6 * s, y + 9 * s);
        ctx.lineTo(x - 9 * s, y + 6 * s);
        ctx.lineTo(x - 9 * s, y + 3 * s);
        ctx.lineTo(x - 12 * s, y);
        ctx.lineTo(x - 9 * s, y - 3 * s);
        ctx.lineTo(x - 9 * s, y - 6 * s);
        ctx.lineTo(x - 6 * s, y - 9 * s);
        ctx.lineTo(x - 3 * s, y - 9 * s);
        ctx.closePath();
        ctx.fill();

        // Inner Diamond cut
        ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
        ctx.beginPath();
        ctx.moveTo(x, y - 6 * s);
        ctx.lineTo(x + 6 * s, y);
        ctx.lineTo(x, y + 6 * s);
        ctx.lineTo(x - 6 * s, y);
        ctx.closePath();
        ctx.fill();

        // Central Star Cross
        ctx.fillStyle = color;
        ctx.fillRect(x - 1 * s, y - 4 * s, 2 * s, 8 * s);
        ctx.fillRect(x - 4 * s, y - 1 * s, 8 * s, 2 * s);

    } else if (type === 'elephant') {
        // Regal Temple Elephant (Gaja) with Trunk Upward & Saddle Cloth
        const s = size / 24;

        // Head and Raised Trunk
        ctx.beginPath();
        ctx.arc(x - 4 * s, y - 3 * s, 5 * s, 0, Math.PI * 2);
        ctx.fill();

        // Trunk curving up
        ctx.beginPath();
        ctx.moveTo(x - 8 * s, y - 1 * s);
        ctx.bezierCurveTo(x - 13 * s, y - 2 * s, x - 13 * s, y - 9 * s, x - 8 * s, y - 9 * s);
        ctx.stroke();

        // Body
        ctx.beginPath();
        ctx.ellipse(x + 2 * s, y + 1 * s, 8 * s, 6 * s, 0, 0, Math.PI * 2);
        ctx.fill();

        // Legs
        ctx.fillRect(x - 6 * s, y + 4 * s, 3 * s, 7 * s);
        ctx.fillRect(x - 2 * s, y + 4 * s, 3 * s, 7 * s);
        ctx.fillRect(x + 3 * s, y + 4 * s, 3 * s, 7 * s);
        ctx.fillRect(x + 7 * s, y + 4 * s, 3 * s, 7 * s);

        // Saddle Cloth (Jhool) with Fringes
        ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
        ctx.fillRect(x - 1 * s, y - 3 * s, 6 * s, 6 * s);

    } else if (type === 'rose') {
        // Authentic Layered Handloom Gulab Rosette (Concentric cup petals, spiral whorl, sepals & calyx)
        const s = size / 24;

        // 1. Pointed Rose Sepals / Calyx Leaves peeking out behind petals
        ctx.beginPath();
        // Sepal 1 (bottom left)
        ctx.moveTo(x - 2 * s, y + 4 * s);
        ctx.quadraticCurveTo(x - 10 * s, y + 10 * s, x - 12 * s, y + 5 * s);
        ctx.quadraticCurveTo(x - 7 * s, y + 2 * s, x - 2 * s, y + 4 * s);
        // Sepal 2 (bottom right)
        ctx.moveTo(x + 2 * s, y + 4 * s);
        ctx.quadraticCurveTo(x + 10 * s, y + 10 * s, x + 12 * s, y + 5 * s);
        ctx.quadraticCurveTo(x + 7 * s, y + 2 * s, x + 2 * s, y + 4 * s);
        // Sepal 3 (top)
        ctx.moveTo(x, y - 4 * s);
        ctx.quadraticCurveTo(x - 3 * s, y - 11 * s, x, y - 12 * s);
        ctx.quadraticCurveTo(x + 3 * s, y - 11 * s, x, y - 4 * s);
        ctx.closePath();
        ctx.fill();

        // 2. Outer Tier Petals: 5 scalloped cupped petals with cleft margins
        for (let i = 0; i < 5; i++) {
            const angle = (i * 2 * Math.PI / 5) - Math.PI / 2;
            const nextAngle = ((i + 1) * 2 * Math.PI / 5) - Math.PI / 2;
            const midAngle = angle + Math.PI / 5;
            
            const p1x = x + Math.cos(angle) * 7.5 * s;
            const p1y = y + Math.sin(angle) * 7.5 * s;
            const p2x = x + Math.cos(nextAngle) * 7.5 * s;
            const p2y = y + Math.sin(nextAngle) * 7.5 * s;
            const tipX = x + Math.cos(midAngle) * 11 * s;
            const tipY = y + Math.sin(midAngle) * 11 * s;

            ctx.beginPath();
            ctx.moveTo(x + Math.cos(angle) * 3 * s, y + Math.sin(angle) * 3 * s);
            ctx.quadraticCurveTo(p1x, p1y, tipX, tipY);
            ctx.quadraticCurveTo(p2x, p2y, x + Math.cos(nextAngle) * 3 * s, y + Math.sin(nextAngle) * 3 * s);
            ctx.closePath();
            ctx.fill();

            // Petal cleft and fold highlight
            ctx.strokeStyle = "rgba(0, 0, 0, 0.35)";
            ctx.lineWidth = Math.max(1, 1.2 * s);
            ctx.beginPath();
            ctx.moveTo(tipX, tipY);
            ctx.lineTo(x + Math.cos(midAngle) * 8.5 * s, y + Math.sin(midAngle) * 8.5 * s);
            ctx.stroke();
            ctx.strokeStyle = color;
        }

        // 3. Middle Tier Overlapping Petals (staggered)
        for (let i = 0; i < 5; i++) {
            const midAngle = (i * 2 * Math.PI / 5) - Math.PI / 2 + Math.PI / 5;
            const tipX = x + Math.cos(midAngle) * 7.5 * s;
            const tipY = y + Math.sin(midAngle) * 7.5 * s;
            
            ctx.beginPath();
            ctx.arc(tipX, tipY, 3.8 * s, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = "rgba(0, 0, 0, 0.35)";
            ctx.lineWidth = Math.max(1, 1.2 * s);
            ctx.beginPath();
            ctx.arc(tipX, tipY, 3.8 * s, midAngle - 1.2, midAngle + 1.2);
            ctx.stroke();
            ctx.strokeStyle = color;
        }

        // 4. Center Rosebud Core: Tight spiraling whorl / rosette swirl
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, 4.5 * s, 0, Math.PI * 2);
        ctx.fill();

        // Distinct spiral whorl of the rosebud opening
        ctx.strokeStyle = "rgba(0, 0, 0, 0.45)";
        ctx.lineWidth = Math.max(1, 1.4 * s);
        ctx.beginPath();
        for (let t = 0; t < Math.PI * 3.5; t += 0.2) {
            const r = (0.6 + t * 0.95) * s;
            const sx = x + Math.cos(t) * r;
            const sy = y + Math.sin(t) * r;
            if (t === 0) ctx.moveTo(sx, sy);
            else ctx.lineTo(sx, sy);
        }
        ctx.stroke();

        // 5. Delicate rose stem & leaflet at bottom base
        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(1, 1.6 * s);
        ctx.beginPath();
        ctx.moveTo(x, y + 8 * s);
        ctx.quadraticCurveTo(x + 1 * s, y + 12 * s, x + 3 * s, y + 14 * s);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(x + 1.5 * s, y + 11 * s);
        ctx.quadraticCurveTo(x + 6 * s, y + 10 * s, x + 7 * s, y + 12 * s);
        ctx.quadraticCurveTo(x + 4 * s, y + 13 * s, x + 1.5 * s, y + 11 * s);
        ctx.closePath();
        ctx.fill();

    } else if (type === 'jasmine') {
        // Authentic Malli Moggu (Jasmine 5-Petal Star Flower with Delicate Buds)
        const s = size / 24;

        // 5 Radiant pointed jasmine petals
        for (let i = 0; i < 5; i++) {
            const angle = (i * 2 * Math.PI / 5) - Math.PI / 2;
            const tipX = x + Math.cos(angle) * 11 * s;
            const tipY = y + Math.sin(angle) * 11 * s;
            const leftAngle = angle - 0.35;
            const rightAngle = angle + 0.35;
            const baseLX = x + Math.cos(leftAngle) * 3 * s;
            const baseLY = y + Math.sin(leftAngle) * 3 * s;
            const baseRX = x + Math.cos(rightAngle) * 3 * s;
            const baseRY = y + Math.sin(rightAngle) * 3 * s;

            ctx.beginPath();
            ctx.moveTo(baseLX, baseLY);
            ctx.quadraticCurveTo(x + Math.cos(angle) * 6 * s, y + Math.sin(angle) * 6 * s, tipX, tipY);
            ctx.quadraticCurveTo(x + Math.cos(angle) * 6 * s, y + Math.sin(angle) * 6 * s, baseRX, baseRY);
            ctx.closePath();
            ctx.fill();
        }

        // Central golden floral pistil / dot
        ctx.beginPath();
        ctx.arc(x, y, 2.5 * s, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();

        // Delicate inner pearl ring
        ctx.strokeStyle = "rgba(0, 0, 0, 0.3)";
        ctx.beginPath();
        ctx.arc(x, y, 1.5 * s, 0, Math.PI * 2);
        ctx.stroke();

    } else if (type === 'sunflower') {
        // Authentic Indian Surajmukhi (Radiant Golden Sunflower Rosette)
        const s = size / 24;

        // 12 Radiant pointed golden petals radiating around center disc
        for (let i = 0; i < 12; i++) {
            const angle = (i * 2 * Math.PI / 12);
            const tipX = x + Math.cos(angle) * 12 * s;
            const tipY = y + Math.sin(angle) * 12 * s;
            const leftAngle = angle - 0.22;
            const rightAngle = angle + 0.22;
            const baseLX = x + Math.cos(leftAngle) * 5 * s;
            const baseLY = y + Math.sin(leftAngle) * 5 * s;
            const baseRX = x + Math.cos(rightAngle) * 5 * s;
            const baseRY = y + Math.sin(rightAngle) * 5 * s;

            ctx.beginPath();
            ctx.moveTo(baseLX, baseLY);
            ctx.quadraticCurveTo(x + Math.cos(angle) * 8 * s, y + Math.sin(angle) * 8 * s, tipX, tipY);
            ctx.quadraticCurveTo(x + Math.cos(angle) * 8 * s, y + Math.sin(angle) * 8 * s, baseRX, baseRY);
            ctx.closePath();
            ctx.fill();
        }

        // Center Seed Disc
        ctx.beginPath();
        ctx.arc(x, y, 5.2 * s, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
        ctx.fill();
        ctx.fillStyle = color;

        // Inner Seed Spiral / Stippling Rings
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.2 * s;
        ctx.beginPath();
        ctx.arc(x, y, 3.2 * s, 0, Math.PI * 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(x, y, 1.2 * s, 0, Math.PI * 2);
        ctx.fill();

    } else if (type === 'parrot') {
        // Traditional Kili / Ramachiluka Motif (Curved hooked beak, crest plume, graceful tail)
        const s = size / 24;

        // Crest plume at top of head
        ctx.beginPath();
        ctx.moveTo(x - 2 * s, y - 8 * s);
        ctx.quadraticCurveTo(x - 6 * s, y - 13 * s, x - 3 * s, y - 14 * s);
        ctx.stroke();

        // Rounded head
        ctx.beginPath();
        ctx.arc(x - 1 * s, y - 6 * s, 3.5 * s, 0, Math.PI * 2);
        ctx.fill();

        // Curved parrot hooked beak (upper hook downwards)
        ctx.beginPath();
        ctx.moveTo(x - 4 * s, y - 7 * s);
        ctx.quadraticCurveTo(x - 9 * s, y - 5 * s, x - 7 * s, y - 1 * s);
        ctx.quadraticCurveTo(x - 5 * s, y - 4 * s, x - 4 * s, y - 4 * s);
        ctx.closePath();
        ctx.fill();

        // Eye with ring
        ctx.strokeStyle = "rgba(0, 0, 0, 0.4)";
        ctx.beginPath();
        ctx.arc(x - 2 * s, y - 6 * s, 1.2 * s, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = color;

        // Plump breast and body
        ctx.beginPath();
        ctx.ellipse(x + 1 * s, y + 1 * s, 5.5 * s, 7 * s, Math.PI / 10, 0, Math.PI * 2);
        ctx.fill();

        // Folded wing contour
        ctx.strokeStyle = "rgba(0, 0, 0, 0.3)";
        ctx.beginPath();
        ctx.arc(x + 2 * s, y + 2 * s, 4 * s, -0.2, Math.PI * 0.8);
        ctx.stroke();
        ctx.strokeStyle = color;

        // Long sweeping tail feathers
        ctx.beginPath();
        ctx.moveTo(x + 4 * s, y + 6 * s);
        ctx.quadraticCurveTo(x + 9 * s, y + 12 * s, x + 8 * s, y + 16 * s);
        ctx.quadraticCurveTo(x + 5 * s, y + 13 * s, x + 2 * s, y + 8 * s);
        ctx.closePath();
        ctx.fill();

        // Perch branch
        ctx.beginPath();
        ctx.moveTo(x - 6 * s, y + 7 * s);
        ctx.lineTo(x + 7 * s, y + 7 * s);
        ctx.stroke();

    } else if (type === 'leaves' || type === 'vines') {
        // Traditional Vriksha Leaflets & Curling Vine Sprig
        const s = size / 24;

        // Sinuous vine stem
        ctx.beginPath();
        ctx.moveTo(x - 8 * s, y + 10 * s);
        ctx.bezierCurveTo(x - 3 * s, y + 4 * s, x - 1 * s, y - 4 * s, x + 4 * s, y - 9 * s);
        ctx.stroke();

        // Top terminal leaf
        ctx.beginPath();
        ctx.moveTo(x + 4 * s, y - 9 * s);
        ctx.quadraticCurveTo(x + 10 * s, y - 13 * s, x + 6 * s, y - 6 * s);
        ctx.quadraticCurveTo(x + 3 * s, y - 7 * s, x + 4 * s, y - 9 * s);
        ctx.closePath();
        ctx.fill();

        // Left upper leaf
        ctx.beginPath();
        ctx.ellipse(x - 5 * s, y - 2 * s, 4.5 * s, 2.2 * s, -Math.PI / 4, 0, Math.PI * 2);
        ctx.fill();

        // Right mid leaf
        ctx.beginPath();
        ctx.ellipse(x + 4 * s, y + 1 * s, 4.5 * s, 2.2 * s, Math.PI / 4, 0, Math.PI * 2);
        ctx.fill();

        // Left lower leaf
        ctx.beginPath();
        ctx.ellipse(x - 4 * s, y + 6 * s, 4 * s, 2 * s, -Math.PI / 6, 0, Math.PI * 2);
        ctx.fill();

        // Delicate curling tendril
        ctx.beginPath();
        ctx.arc(x + 7 * s, y - 4 * s, 2 * s, 0, Math.PI * 1.5);
        ctx.stroke();

    } else {
        // Swan / Hamsa
        const s = size / 24;
        ctx.beginPath();
        ctx.arc(x - 2 * s, y - 5 * s, 3 * s, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(x - 5 * s, y - 5 * s);
        ctx.lineTo(x - 9 * s, y - 4 * s);
        ctx.lineTo(x - 5 * s, y - 3 * s);
        ctx.fill();

        ctx.beginPath();
        ctx.ellipse(x + 2 * s, y + 2 * s, 6 * s, 4 * s, Math.PI / 6, 0, Math.PI * 2);
        ctx.fill();

        // Feather flourishes
        ctx.beginPath();
        ctx.moveTo(x + 6 * s, y);
        ctx.quadraticCurveTo(x + 11 * s, y - 4 * s, x + 10 * s, y - 8 * s);
        ctx.stroke();
    }

    ctx.restore();
}

// -----------------------------------------------------------------
// 10. Authentic Body Pattern Weave Layouts
// -----------------------------------------------------------------
function drawBodyPattern(ctx, x, y, width, height, pattern, zariColor) {
    ctx.save();
    ctx.strokeStyle = zariColor;
    ctx.fillStyle = zariColor;
    ctx.lineWidth = 1.4;

    if (pattern === 'floral_vines') {
        // Continuous Serpentine Vines with Pointed Leaves & 5-Petal Blossoms
        ctx.globalAlpha = 0.45;
        const waveH = 46;

        for (let py = y + 26; py < y + height - 20; py += waveH) {
            ctx.beginPath();
            ctx.moveTo(x, py);
            for (let px = x; px < x + width; px += 56) {
                ctx.bezierCurveTo(px + 18, py - 18, px + 38, py + 18, px + 56, py);
            }
            ctx.stroke();

            // Branching Pointed Leaves on Crests & Troughs
            for (let px = x + 16; px < x + width; px += 56) {
                // Top Leaf
                ctx.beginPath();
                ctx.moveTo(px, py - 10);
                ctx.quadraticCurveTo(px + 6, py - 16, px + 10, py - 12);
                ctx.quadraticCurveTo(px + 4, py - 7, px, py - 10);
                ctx.fill();

                // Bottom Leaf
                ctx.beginPath();
                ctx.moveTo(px + 28, py + 10);
                ctx.quadraticCurveTo(px + 34, py + 16, px + 38, py + 12);
                ctx.quadraticCurveTo(px + 32, py + 7, px + 28, py + 10);
                ctx.fill();

                // Miniature 5-petal flower blossom on the crest
                const fx = px + 12;
                const fy = py - 6;
                ctx.beginPath();
                ctx.arc(fx, fy, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }

    } else if (pattern === 'checks') {
        // Traditional Kattam (Checks with Miniature Zari Star Buttis)
        ctx.globalAlpha = 0.35;
        const step = 32;

        // Double pinstripes for authentic handloom check look
        for (let px = x; px < x + width; px += step) {
            ctx.beginPath(); ctx.moveTo(px, y); ctx.lineTo(px, y + height); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(px + 2, y); ctx.lineTo(px + 2, y + height); ctx.stroke();
        }
        for (let py = y; py < y + height; py += step) {
            ctx.beginPath(); ctx.moveTo(x, py); ctx.lineTo(x + width, py); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(x, py + 2); ctx.lineTo(x + width, py + 2); ctx.stroke();
        }

        // Star Butti inside every alternate check square
        ctx.globalAlpha = 0.6;
        let row = 0;
        for (let py = y + step / 2; py < y + height; py += step) {
            const colOffset = (row % 2 === 0) ? 0 : step;
            for (let px = x + step / 2 + colOffset; px < x + width; px += step * 2) {
                ctx.fillRect(px - 1.5, py - 4, 3, 8);
                ctx.fillRect(px - 4, py - 1.5, 8, 3);
            }
            row++;
        }

    } else if (pattern === 'lattice' || pattern === 'paisley_lattice') {
        // Diagonal Diamond Jaal Lattice with Ornate Florets
        ctx.globalAlpha = 0.35;
        const size = 38;

        for (let px = x - 200; px < x + width + 200; px += size) {
            ctx.beginPath(); ctx.moveTo(px, y); ctx.lineTo(px + 200, y + height); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(px, y + height); ctx.lineTo(px + 200, y); ctx.stroke();
        }

        // Rosette clasp at each crossing node
        ctx.globalAlpha = 0.55;
        for (let px = x + 19; px < x + width; px += size) {
            for (let py = y + 19; py < y + height; py += size) {
                if (pattern === 'paisley_lattice') {
                    drawMotifSymbol(ctx, px, py, 11, 'mango', zariColor);
                } else {
                    ctx.beginPath();
                    ctx.arc(px, py, 2.5, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }

    } else if (pattern === 'diagonal_ikat') {
        // Stepped Pochampally Diagonal Ikat Waves
        ctx.globalAlpha = 0.45;
        ctx.setLineDash([7, 3, 2, 3]);
        for (let px = x - 200; px < x + width + 200; px += 26) {
            ctx.beginPath(); ctx.moveTo(px, y); ctx.lineTo(px + 160, y + height); ctx.stroke();
        }
        ctx.setLineDash([]);

    } else if (pattern === 'stripes') {
        // Rhythm Zari Pinstripes with Fine Beads
        ctx.globalAlpha = 0.45;
        for (let px = x + 16; px < x + width; px += 24) {
            ctx.fillRect(px, y, 3, height);
            ctx.fillRect(px + 5, y, 1, height);
        }

    } else if (pattern === 'scattered_buttis') {
        // Staggered Butti Field (Rosettes & Buds)
        ctx.globalAlpha = 0.5;
        let r = 0;
        for (let py = y + 25; py < y + height - 15; py += 38) {
            const off = (r % 2 === 0) ? 0 : 25;
            for (let px = x + 25 + off; px < x + width - 15; px += 50) {
                drawMotifSymbol(ctx, px, py, 12, 'lotus', zariColor);
            }
            r++;
        }
    }

    ctx.restore();
}

// -----------------------------------------------------------------
// 11. Authentic Border Architecture Patterns
// -----------------------------------------------------------------
function drawBorderPattern(ctx, x, y, width, height, style, isTop) {
    ctx.save();
    ctx.fillStyle = currentDesign.zariColor;
    ctx.strokeStyle = currentDesign.zariColor;

    const startY = isTop ? y + height : y;
    const dir = isTop ? -1 : 1;

    const explicitBorderMotif = currentDesign.borderMotif || (style === 'peacock_border' ? 'peacock' : (style && style.endsWith('_border') ? style.replace('_border', '') : null));

    if (explicitBorderMotif) {
        // Row of Regal Repeating Motifs between fine framing zari bars
        ctx.fillRect(x, isTop ? y + 4 : y + height - 8, width, 3);
        ctx.fillRect(x, isTop ? y + height - 7 : y + 4, width, 3);

        const midY = y + height / 2;
        const spacing = (explicitBorderMotif === 'peacock' || explicitBorderMotif === 'elephant') ? 38 : 34;
        for (let px = x + 20; px < x + width - 20; px += spacing) {
            drawMotifSymbol(ctx, px, midY, 15, explicitBorderMotif, currentDesign.zariColor);
        }
    } else if (style === 'temple') {
        // Nizam Gopuram Stepped Spikes with Pearl (Mottu) Band
        const spikeW = 20;
        const spikeH = 22;

        for (let px = x + 6; px < x + width - 12; px += spikeW + 4) {
            // Outer Spire
            ctx.beginPath();
            ctx.moveTo(px, startY);
            ctx.lineTo(px + spikeW / 2, startY + (dir * spikeH));
            ctx.lineTo(px + spikeW, startY);
            ctx.closePath();
            ctx.fill();

            // Inner Stepped Accent Spire
            ctx.fillStyle = currentDesign.borderColor;
            ctx.beginPath();
            ctx.moveTo(px + 4, startY);
            ctx.lineTo(px + spikeW / 2, startY + (dir * (spikeH - 7)));
            ctx.lineTo(px + spikeW - 4, startY);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = currentDesign.zariColor;
        }

        // Running Pearl (Mottu) Line at Border Edge
        const pearlY = isTop ? y + 8 : y + height - 8;
        for (let px = x + 8; px < x + width; px += 8) {
            ctx.beginPath();
            ctx.arc(px, pearlY, 1.8, 0, Math.PI * 2);
            ctx.fill();
        }

        // Solid Border Rim Bar
        ctx.fillRect(x, isTop ? y + 14 : y + height - 16, width, 3);

    } else if (style === 'peacock_border') {
        // Row of Regal Repeating Peacocks between Zari Bars
        ctx.fillRect(x, isTop ? y + 4 : y + height - 8, width, 3);
        ctx.fillRect(x, isTop ? y + height - 7 : y + 4, width, 3);

        const midY = y + height / 2;
        for (let px = x + 20; px < x + width - 20; px += 36) {
            drawMotifSymbol(ctx, px, midY, 15, 'peacock', currentDesign.zariColor);
        }

    } else if (style === 'double_zari') {
        // Double Zari Bars enclosing an Undulating Floral Vine
        ctx.fillRect(x, y + 4, width, 4);
        ctx.fillRect(x, y + height - 8, width, 4);

        // Continuous undulating vine with leaves
        const midY = y + height / 2;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(x, midY);
        for (let px = x; px < x + width; px += 24) {
            ctx.quadraticCurveTo(px + 6, midY - 6, px + 12, midY);
            ctx.quadraticCurveTo(px + 18, midY + 6, px + 24, midY);
        }
        ctx.stroke();

        // Florets in crests
        for (let px = x + 6; px < x + width; px += 24) {
            ctx.beginPath();
            ctx.arc(px, midY - 6, 2, 0, Math.PI * 2);
            ctx.arc(px + 12, midY + 6, 2, 0, Math.PI * 2);
            ctx.fill();
        }

    } else if (style === 'ikat_wave') {
        // Interlocking Dual Wave Ikat Bands
        ctx.lineWidth = 2.5;
        const midY = y + height / 2;
        ctx.beginPath();
        for (let px = x; px < x + width; px += 20) {
            ctx.quadraticCurveTo(px + 10, midY - 10, px + 20, midY);
        }
        ctx.stroke();

        for (let px = x + 10; px < x + width; px += 20) {
            ctx.beginPath();
            ctx.arc(px, midY, 2.5, 0, Math.PI * 2);
            ctx.fill();
        }

    } else if (style === 'chevron_pattern') {
        // Double Chevron Zig-Zag with Diamond Florets
        ctx.lineWidth = 2;
        const midY = y + height / 2;
        ctx.beginPath();
        for (let px = x; px < x + width; px += 16) {
            ctx.moveTo(px, midY - 9);
            ctx.lineTo(px + 8, midY + 9);
            ctx.lineTo(px + 16, midY - 9);
        }
        ctx.stroke();

    } else {
        // Kaddi Ribbed Pin Stripes & Coins
        for (let px = x + 10; px < x + width; px += 16) {
            ctx.fillRect(px, y + 4, 3, height - 8);
        }
    }

    ctx.restore();
}

// -----------------------------------------------------------------
// 12. Detailed Pallu (Grand End Piece) Architecture
// -----------------------------------------------------------------
function drawPalluSection(ctx, x, y, width, height, palluStyle, palluColor, zariColor, motifType) {
    ctx.save();

    // Pallu Base Color Block
    ctx.fillStyle = palluColor;
    ctx.fillRect(x, y, width, height);

    ctx.fillStyle = zariColor;
    ctx.strokeStyle = zariColor;

    if (palluStyle === 'grand_medallion') {
        // Grand Central Chakra / Mandala Medallion with Radiating Lotus Petals
        ctx.fillRect(x + 10, 0, 4, height);
        ctx.fillRect(x + width - 14, 0, 4, height);

        const centerX = x + width / 2;
        const centerY = y + height / 2;

        // Outer Ray Ring
        ctx.lineWidth = 2;
        for (let i = 0; i < 16; i++) {
            const angle = (i * Math.PI) / 8;
            const r1 = 44;
            const r2 = 60;
            ctx.beginPath();
            ctx.moveTo(centerX + Math.cos(angle) * r1, centerY + Math.sin(angle) * r1);
            ctx.lineTo(centerX + Math.cos(angle) * r2, centerY + Math.sin(angle) * r2);
            ctx.stroke();
        }

        // Circular Medallion Rings
        ctx.beginPath();
        ctx.arc(centerX, centerY, 46, 0, Math.PI * 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(centerX, centerY, 36, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = palluColor;
        ctx.beginPath();
        ctx.arc(centerX, centerY, 18, 0, Math.PI * 2);
        ctx.fill();

        // Central Rosette Star
        ctx.fillStyle = zariColor;
        ctx.beginPath();
        ctx.arc(centerX, centerY, 6, 0, Math.PI * 2);
        ctx.fill();

        // 4 Corner Motifs filling the Pallu
        const cornerMotif = motifType || 'mango';
        drawMotifSymbol(ctx, x + 40, y + 60, 32, cornerMotif, zariColor);
        drawMotifSymbol(ctx, x + width - 40, y + 60, 32, cornerMotif, zariColor);
        drawMotifSymbol(ctx, x + 40, height - 60, 32, cornerMotif, zariColor);
        drawMotifSymbol(ctx, x + width - 40, height - 60, 32, cornerMotif, zariColor);

    } else if (palluStyle === 'decorative_pallu') {
        // 3-Tier Multi-Paneled Decorative Floral & Peacock Pallu
        ctx.fillRect(x + 12, 0, 4, height);
        ctx.fillRect(x + width - 16, 0, 4, height);

        // Divider bands
        const p1 = height * 0.28;
        const p2 = height * 0.72;
        ctx.fillRect(x + 16, p1, width - 32, 4);
        ctx.fillRect(x + 16, p2, width - 32, 4);

        // Tier 1: Procession of Small Motifs
        for (let px = x + 40; px < x + width - 30; px += 45) {
            drawMotifSymbol(ctx, px, p1 / 2, 22, motifType, zariColor);
        }

        // Tier 2: Large Central Grand Motif
        drawMotifSymbol(ctx, x + width / 2, (p1 + p2) / 2, 54, motifType, zariColor);

        // Tier 3: Procession of Small Motifs
        for (let px = x + 40; px < x + width - 30; px += 45) {
            drawMotifSymbol(ctx, px, p2 + (height - p2) / 2, 22, motifType, zariColor);
        }

    } else if (palluStyle === 'cascade_temple') {
        // Graduating Tiers of Gopuram Spikes Facing the Saree Body
        for (let py = 35; py < height - 30; py += 68) {
            for (let px = x + 35; px < x + width - 25; px += 45) {
                drawMotifSymbol(ctx, px, py, 32, 'temple', zariColor);
            }
        }
        ctx.fillRect(x, height / 2, width, 6);

    } else if (palluStyle === 'ikat_block') {
        // Color-Blocked Geometric Ikat Diamonds
        const blockH = height / 3;
        ctx.fillStyle = zariColor;
        ctx.globalAlpha = 0.25;
        ctx.fillRect(x, y + blockH, width, blockH);
        ctx.globalAlpha = 1.0;

        drawMotifSymbol(ctx, x + width / 2, y + blockH / 2, 44, 'ikat', zariColor);
        drawMotifSymbol(ctx, x + width / 2, y + blockH * 1.5, 48, motifType, zariColor);
        drawMotifSymbol(ctx, x + width / 2, y + blockH * 2.5, 44, 'ikat', zariColor);

    } else {
        // Traditional Zari Stripes & Fringes (Kaddi Pallu)
        ctx.globalAlpha = 0.9;
        for (let px = 16; px < width - 16; px += 18) {
            const wW = (px % 36 === 0) ? 8 : 2;
            ctx.fillRect(px, 0, wW, height);
        }
        ctx.globalAlpha = 1.0;

        drawMotifSymbol(ctx, 50, height / 2 - 80, 42, motifType, zariColor);
        drawMotifSymbol(ctx, 50, height / 2 + 80, 42, motifType, zariColor);
        drawMotifSymbol(ctx, width - 60, height / 2, 52, motifType, zariColor);
    }

    // End Fringes / Tassels (Kuchu) at the outer edge
    ctx.fillStyle = zariColor;
    for (let py = 6; py < height; py += 10) {
        ctx.beginPath();
        ctx.arc(x + 4, py, 3, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
}

// -----------------------------------------------------------------
// 13. Repeating Body Motifs Engine
// -----------------------------------------------------------------
function drawBodyMotifs(ctx, x, y, width, height, type, density, arrangement, zariColor) {
    const densityMap = { "Sparse": 85, "Medium": 58, "Dense": 40 };
    const step = densityMap[density] || 58;

    let row = 0;

    if (arrangement === 'grid') {
        for (let py = y + 35; py < y + height - 20; py += step) {
            for (let px = x + 40; px < x + width - 30; px += step) {
                drawMotifSymbol(ctx, px, py, 20, type, zariColor);
            }
        }
    } else if (arrangement === 'diagonal') {
        for (let py = y + 35; py < y + height - 20; py += step) {
            const offset = (py * 0.7) % step;
            for (let px = x + 40 + offset; px < x + width - 30; px += step) {
                drawMotifSymbol(ctx, px, py, 20, type, zariColor);
            }
        }
    } else if (arrangement === 'border_trailing') {
        for (let px = x + 40; px < x + width - 30; px += step) {
            drawMotifSymbol(ctx, px, y + 25, 20, type, zariColor);
            drawMotifSymbol(ctx, px + 20, y + 60, 16, type, zariColor);
            drawMotifSymbol(ctx, px, y + height - 25, 20, type, zariColor);
            drawMotifSymbol(ctx, px + 20, y + height - 60, 16, type, zariColor);
        }
    } else {
        // Staggered Half-Drop Repeat (Classic Handloom Standard)
        for (let py = y + 35; py < y + height - 20; py += step) {
            const offset = (row % 2 === 0) ? 0 : step / 2;
            for (let px = x + 45 + offset; px < x + width - 30; px += step) {
                drawMotifSymbol(ctx, px, py, 20, type, zariColor);
            }
            row++;
        }
    }
}

// Fabric Weave Grid Texture
function drawWeaveTexture(x, y, w, h) {
    ctx.save();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
    ctx.lineWidth = 1;
    for (let i = x; i < x + w; i += 4) {
        ctx.beginPath();
        ctx.moveTo(i, y);
        ctx.lineTo(i, y + h);
        ctx.stroke();
    }
    ctx.restore();
}

// Draw Saree Drape Simulation Mode
function drawDrapedSareeView(w, h) {
    ctx.fillStyle = "#160509";
    ctx.fillRect(0, 0, w, h);

    const centerX = w / 2;

    for (let i = -5; i <= 5; i++) {
        const px = centerX + i * 44;
        ctx.fillStyle = (i % 2 === 0) ? currentDesign.bodyColor : currentDesign.palluColor;

        ctx.beginPath();
        ctx.moveTo(px, 30);
        ctx.bezierCurveTo(px - 18, h / 2, px + 30, h - 50, px + (i * 12), h - 10);
        ctx.lineTo(px + 40 + (i * 12), h - 10);
        ctx.bezierCurveTo(px + 40, h / 2, px + 18, 30, px + 40, 30);
        ctx.closePath();
        ctx.fill();

        // Gold Zari Hem Border
        ctx.fillStyle = currentDesign.zariColor;
        ctx.fillRect(px + (i * 12), h - 28, 40, 10);

        // Pleat Motif
        drawMotifSymbol(ctx, px + 20, h / 2 + (i * 10), 18, currentDesign.bodyMotif || currentDesign.motifType, currentDesign.zariColor);
    }

    ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
    ctx.fillRect(20, 20, 280, 44);
    ctx.fillStyle = "#D4AF37";
    ctx.font = "600 13px Outfit, sans-serif";
    ctx.fillText("👗 Saree Pleat & Drape Simulation View", 32, 46);
}

// Draw Zoom Close-Up Motif & Yarn View Mode
function drawZoomMotifView(w, h) {
    ctx.fillStyle = currentDesign.bodyColor;
    ctx.fillRect(0, 0, w, h);

    // Magnified warp/weft cross weave threads
    ctx.strokeStyle = "rgba(0, 0, 0, 0.15)";
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 14) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y < h; y += 14) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    // High magnification motif
    drawMotifSymbol(ctx, w / 2, h / 2, 160, currentDesign.motifType, currentDesign.zariColor);

    // Zoom Overlay Badge
    ctx.fillStyle = "rgba(72, 10, 21, 0.85)";
    ctx.strokeStyle = "#D4AF37";
    ctx.lineWidth = 1.5;
    ctx.fillRect(20, 20, 360, 56);
    ctx.strokeRect(20, 20, 360, 56);

    ctx.fillStyle = "#D4AF37";
    ctx.font = "700 14px Cinzel Decorative, Outfit, serif";
    ctx.fillText(`🔍 Yarn Zoom: ${currentDesign.motifType.toUpperCase()} Motif`, 32, 42);
    ctx.fillStyle = "#FAF7F2";
    ctx.font = "12px Outfit, sans-serif";
    ctx.fillText(`Pattern: ${currentDesign.bodyPattern} | Border: ${currentDesign.borderStyle}`, 32, 60);
}

// -----------------------------------------------------------------
// 14. Save & Download & Spec Sheet Export Functions
// -----------------------------------------------------------------
async function saveDesign() {
    currentDesign.title = `${currentDesign.sareeStyle} ${currentDesign.motifType.toUpperCase()} Design`;

    try {
        const response = await fetch('/api/designs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(currentDesign)
        });

        const resData = await response.json();
        showToast(`✅ ${resData.message || 'Design Saved Successfully!'}`);
    } catch (e) {
        let localSaved = JSON.parse(localStorage.getItem('handloom_saved_designs') || '[]');
        localSaved.unshift({ ...currentDesign, id: Date.now(), createdAt: new Date().toLocaleString() });
        localStorage.setItem('handloom_saved_designs', JSON.stringify(localSaved));
        showToast("✅ Saved to Browser Storage!");
    }
}

function downloadCanvasPNG() {
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `Handloom_Saree_${currentDesign.motifType}_${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    showToast("📥 Fabric preview downloaded!");
}

function printSpecCard() {
    const printWin = window.open('', '_blank');
    const getTxt = id => {
        const el = document.getElementById(id);
        return el ? el.textContent : '';
    };

    printWin.document.write(`
        <html>
        <head>
            <title>Weaver Specification Card - ${currentDesign.title}</title>
            <style>
                body { font-family: 'Outfit', sans-serif; padding: 24px; color: #2C160F; background: #FFF; }
                h1 { color: #6B1124; border-bottom: 2px solid #C59B27; padding-bottom: 8px; font-size: 20px; }
                table { width: 100%; border-collapse: collapse; margin-top: 16px; }
                td, th { border: 1px solid #E5D5C5; padding: 8px 12px; text-align: left; font-size: 13px; }
                th { background-color: #FAF6EE; color: #6B1124; }
                .swatch { display: inline-block; width: 16px; height: 16px; border-radius: 4px; vertical-align: middle; margin-right: 6px; border: 1px solid #CCC; }
            </style>
        </head>
        <body>
            <h1>Chenetha Design Mitra - Weaver Specification Card</h1>
            <p><strong>Design Title:</strong> ${currentDesign.title}</p>
            <p><strong>Date Generated:</strong> ${new Date().toLocaleDateString()}</p>
            <table>
                <tr><th>Specification Item</th><th>Details</th></tr>
                <tr><td>Fabric Base</td><td>${currentDesign.fabricType}</td></tr>
                <tr><td>Body Pattern</td><td>${currentDesign.bodyPattern}</td></tr>
                <tr><td>Body Color Hex</td><td><span class="swatch" style="background:${currentDesign.bodyColor}"></span> ${currentDesign.bodyColor}</td></tr>
                <tr><td>Border Color Hex</td><td><span class="swatch" style="background:${currentDesign.borderColor}"></span> ${currentDesign.borderColor}</td></tr>
                <tr><td>Pallu Color Hex</td><td><span class="swatch" style="background:${currentDesign.palluColor}"></span> ${currentDesign.palluColor}</td></tr>
                <tr><td>Zari Tone</td><td><span class="swatch" style="background:${currentDesign.zariColor}"></span> ${currentDesign.zariColor}</td></tr>
                <tr><td>Motif Type</td><td>${currentDesign.motifType.toUpperCase()}</td></tr>
                <tr><td>Border Architecture</td><td>${currentDesign.borderStyle}</td></tr>
                <tr><td>Pallu Style</td><td>${currentDesign.palluStyle}</td></tr>
                <tr><td>Warp Yarn Spec</td><td>${getTxt('specWarp')}</td></tr>
                <tr><td>Weft Yarn Spec</td><td>${getTxt('specWeft')}</td></tr>
                <tr><td>Reed / Picks</td><td>${getTxt('specReed')}</td></tr>
                <tr><td>Jacquard Punch Cards</td><td>${getTxt('specCards')}</td></tr>
            </table>
            <br/><br/>
            <button onclick="window.print()">Print Card</button>
        </body>
        </html>
    `);
    printWin.document.close();
}

async function openCollectionModal() {
    const modal = document.getElementById('collectionModal');
    const container = document.getElementById('savedDesignsContainer');
    if (modal) modal.classList.add('active');

    if (container) container.innerHTML = '<div style="color:var(--text-secondary)">Loading saved designs...</div>';

    let designs = [];
    try {
        const res = await fetch('/api/designs');
        if (res.ok) {
            const data = await res.json();
            designs = data.designs || [];
        }
    } catch (e) {
        designs = JSON.parse(localStorage.getItem('handloom_saved_designs') || '[]');
    }

    if (!container) return;

    if (designs.length === 0) {
        container.innerHTML = '<div style="color:var(--text-muted); grid-column:1/-1;">No saved designs found. Create and save your first design!</div>';
        return;
    }

    container.innerHTML = designs.map(d => `
        <div class="saved-card" onclick='loadSavedDesign(${JSON.stringify(d).replace(/'/g, "&apos;")})'>
            <div class="saved-card-title">${d.title || d.sareeStyle}</div>
            <div class="saved-card-meta">${d.createdAt || ''} | ${d.motifType || ''}</div>
            <div class="saved-swatches">
                <span class="saved-swatch" style="background:${d.bodyColor}"></span>
                <span class="saved-swatch" style="background:${d.borderColor}"></span>
                <span class="saved-swatch" style="background:${d.palluColor}"></span>
                <span class="saved-swatch" style="background:${d.zariColor}"></span>
            </div>
        </div>
    `).join('');
}

function loadSavedDesign(design) {
    currentDesign = { ...currentDesign, ...design };
    hasGenerated = true;

    syncAllControlsToUI();

    const modal = document.getElementById('collectionModal');
    if (modal) modal.classList.remove('active');

    navigateToPage('studio');
    renderSareeCanvas();
    showToast(`Loaded saved design: ${currentDesign.title}`);
}

// Toast Notification Helper
function showToast(msg) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<span>✨</span> <span>${msg}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.remove();
    }, 3500);
}
