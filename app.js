// State
let accessToken = localStorage.getItem('wabi_access_token') || null;

// DOM Elements
const loginView = document.getElementById('login-view');
const posView = document.getElementById('pos-view');
const loginForm = document.getElementById('login-form');
const posForm = document.getElementById('pos-form');
const btnLogout = document.getElementById('btn-logout');
const toast = document.getElementById('toast');
const toastMsg = document.getElementById('toast-message');
const receiptInput = document.getElementById('receipt-image');
const btnScan = document.getElementById('btn-scan');
const scanProgress = document.getElementById('scan-progress');
const progressFill = document.querySelector('.progress-fill');
const progressText = document.querySelector('.progress-text');

// Initialize
function init() {
    if (accessToken) {
        showView(posView);
        prefillOrderId();
    } else {
        showView(loginView);
    }
}

// Helpers
function showView(view) {
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    view.classList.remove('hidden');
}

function showToast(message, type = 'info') {
    toastMsg.textContent = message;
    // reset animation by removing and adding class
    toast.className = 'toast hidden';
    void toast.offsetWidth; // trigger reflow
    toast.className = `toast show ${type}`;
    setTimeout(() => {
        toast.classList.remove('show');
    }, 4000);
}

function toggleLoading(button, isLoading) {
    const span = button.querySelector('span');
    const spinner = button.querySelector('.spinner');
    
    // For label buttons (btn-scan)
    if (button.tagName.toLowerCase() === 'label') {
        if (isLoading) {
            span.classList.add('hidden');
            button.querySelector('i').classList.add('hidden');
            spinner.classList.remove('hidden');
            button.classList.add('disabled');
        } else {
            span.classList.remove('hidden');
            button.querySelector('i').classList.remove('hidden');
            spinner.classList.add('hidden');
            button.classList.remove('disabled');
        }
        return;
    }

    // For normal buttons
    if (isLoading) {
        span.classList.add('hidden');
        spinner.classList.remove('hidden');
        button.disabled = true;
    } else {
        span.classList.remove('hidden');
        spinner.classList.add('hidden');
        button.disabled = false;
    }
}

function getTodayYYMMDD() {
    const today = new Date();
    const yy = String(today.getFullYear()).slice(-2);
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yy}${mm}${dd}`;
}

function prefillOrderId() {
    const orderIdInput = document.getElementById('order_id');
    if (!orderIdInput.value || orderIdInput.value.length < 6) {
        orderIdInput.value = getTodayYYMMDD();
        // Move cursor to end when focused
        orderIdInput.addEventListener('focus', function() {
            const val = this.value;
            this.value = '';
            this.value = val;
        }, { once: true });
    }
}

// Login logic
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const accessKey = document.getElementById('access_key').value;
    const btnSubmit = document.getElementById('btn-login');
    
    toggleLoading(btnSubmit, true);

    try {
        // Ahora usamos nuestro proxy interno
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: email,
                access_key: accessKey,
                login_method: "Password",
                plattform: 3
            })
        });

        const data = await response.json();

        if (response.ok && data.token && data.token.access_token) {
            accessToken = data.token.access_token;
            localStorage.setItem('wabi_access_token', accessToken);
            showToast('Login exitoso', 'success');
            showView(posView);
            prefillOrderId();
        } else {
            showToast(data.message || 'Error en credenciales', 'error');
        }
    } catch (error) {
        showToast('Error de conexión con la API', 'error');
        console.error(error);
    } finally {
        toggleLoading(btnSubmit, false);
    }
});

// Logout logic
btnLogout.addEventListener('click', () => {
    accessToken = null;
    localStorage.removeItem('wabi_access_token');
    showView(loginView);
});

// POS Support Submission
posForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btnSubmit = document.getElementById('btn-submit-pos');
    
    // Parse values to correct types as required by the payload
    const payload = {
        order_id: parseInt(document.getElementById('order_id').value, 10),
        ap: document.getElementById('ap').value,
        ref: document.getElementById('ref').value,
        terminal: document.getElementById('terminal').value,
        amount: parseFloat(document.getElementById('amount').value),
        first_number_card: document.getElementById('first_number_card').value,
        last_number_card: document.getElementById('last_number_card').value
    };

    toggleLoading(btnSubmit, true);

    try {
        // Ahora usamos nuestro proxy interno
        const response = await fetch('/api/support', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (response.ok) {
            showToast('Soporte procesado correctamente', 'success');
            // Clear form
            posForm.reset();
            prefillOrderId();
            // Clear preview
            document.getElementById('receipt-preview-container').classList.add('hidden');
            document.getElementById('receipt-preview').src = '';
        } else {
            // Token might be expired, check status 401
            if (response.status === 401) {
                showToast('Sesión expirada. Por favor ingresa de nuevo.', 'error');
                accessToken = null;
                localStorage.removeItem('wabi_access_token');
                showView(loginView);
            } else {
                showToast(data.message || 'Error al procesar el soporte', 'error');
            }
        }
    } catch (error) {
        showToast('Error de red al enviar soporte', 'error');
        console.error(error);
    } finally {
        toggleLoading(btnSubmit, false);
    }
});

// Image compression for OCR API (Keep it under 1MB)
function compressImage(file) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Resize to improve performance and stay under API limits
            let width = img.width;
            let height = img.height;
            const max = 1200;
            if (width > max || height > max) {
                if (width > height) {
                    height = Math.round((height * max) / width);
                    width = max;
                } else {
                    width = Math.round((width * max) / height);
                    height = max;
                }
            }
            
            canvas.width = width;
            canvas.height = height;
            
            // Draw image normally
            ctx.drawImage(img, 0, 0, width, height);
            
            // Convert to JPEG with 80% quality to compress
            resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.src = URL.createObjectURL(file);
    });
}

// OCR Logic (Cloud API - OCR.Space)
receiptInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (btnScan.classList.contains('disabled')) return;

    // Show preview immediately
    const previewContainer = document.getElementById('receipt-preview-container');
    const previewImage = document.getElementById('receipt-preview');
    previewImage.src = URL.createObjectURL(file);
    previewContainer.classList.remove('hidden');

    scanProgress.classList.remove('hidden');
    progressFill.style.width = '30%';
    progressText.textContent = 'Preparando imagen...';
    
    toggleLoading(btnScan, true);

    try {
        const base64Image = await compressImage(file);
        
        progressFill.style.width = '60%';
        progressText.textContent = 'Analizando con IA (Cloud)...';

        // Enviar la imagen a nuestro "Servidor Secreto" (Vercel Serverless Function)
        const response = await fetch('/api/ocr', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ base64Image })
        });

        const data = await response.json();
        
        progressFill.style.width = '100%';

        if (data.IsErroredOnProcessing) {
            throw new Error(data.ErrorMessage[0]);
        }

        const text = data.ParsedResults[0].ParsedText;
        console.log("OCR.Space Text Extracted:\n", text);
        
        parseReceiptText(text);
        showToast('Datos extraídos con Alta Precisión', 'success');
    } catch (error) {
        console.error("OCR Error:", error);
        showToast('Error al procesar el recibo con la Nube', 'error');
    } finally {
        setTimeout(() => {
            scanProgress.classList.add('hidden');
            toggleLoading(btnScan, false);
        }, 1000);
        // Reset input
        receiptInput.value = '';
    }
});

// Regex to extract data from receipt text
function parseReceiptText(text) {
    // Clean text and make uppercase for easier matching
    const upperText = text.toUpperCase();
    console.log("TEXTO LEIDO:\n", upperText);

    // 1. Extract AP: Looks for "AP:" or "RP:" followed by optional spaces and numbers
    // We also consider cases where 'A' is read as something else, but 'P:' is there.
    const apMatch = upperText.match(/[AR4]P[\s:;\.]+(\d{5,8})/);
    if (apMatch) document.getElementById('ap').value = apMatch[1];

    // 2. Extract REF: Looks for "REF:" followed by numbers
    const refMatch = upperText.match(/REF[\s:;\.]+(\d{5,8})/);
    if (refMatch) document.getElementById('ref').value = refMatch[1];

    // 3. Extract Terminal: Looks for "TERM:", "TERH:", etc.
    const termMatch = upperText.match(/T[EÉ]R[MHNP]?[\s:;\.]+(\d{6,10})/);
    if (termMatch && termMatch[1]) {
        const termFull = termMatch[1];
        document.getElementById('terminal').value = termFull.slice(-2);
    } else {
        // Fallback: look for LOTE:xxx TERM:xxx
        const loteTermMatch = upperText.match(/LOTE.*?(\d{6,10})/);
        if (loteTermMatch) {
            document.getElementById('terminal').value = loteTermMatch[1].slice(-2);
        }
    }

    // 4. Extract Card: 6 digits, ONLY X, *, spaces, or dots in between, then 4 digits.
    // This avoids accidentally matching the AP and REF numbers.
    const cardMatch = upperText.match(/(\d{6})[\sX\*Kx\.\-]{4,10}(\d{4})/);
    if (cardMatch) {
        document.getElementById('first_number_card').value = cardMatch[1];
        document.getElementById('last_number_card').value = cardMatch[2];
    } else {
        // Fallback for card: find the line with (T) or (C) at the end, which is usually the card
        const cardLineMatch = upperText.match(/(\d{6}).*?(\d{4})\s*\([A-Z]\)/);
        if (cardLineMatch) {
            document.getElementById('first_number_card').value = cardLineMatch[1];
            document.getElementById('last_number_card').value = cardLineMatch[2];
        }
    }

    // 5. Extract Amount: Look for lines with TOTAL or CONSUMO and get the number
    const amountMatch = upperText.match(/(?:TOTAL|CONSUMO|IMPORTE|TDTAL)[\s\S]{0,20}?(?:BS\.?|S\.?|\$)\s*(\d+[\.,]\d{2})/);
    if (amountMatch) {
        let amountStr = amountMatch[1];
        document.getElementById('amount').value = parseFloat(amountStr.replace(',', '.')).toFixed(2);
    } else {
        // Fallback: Just look for any number that looks like a price at the bottom
        const prices = upperText.match(/(\d+[\.,]\d{2})/g);
        if (prices && prices.length > 0) {
            const lastPrice = prices[prices.length - 1];
            document.getElementById('amount').value = parseFloat(lastPrice.replace(',', '.')).toFixed(2);
        }
    }
}

// Start
init();
