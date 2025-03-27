// Init the app when DOM is loaded thru
document.addEventListener('DOMContentLoaded', function() {
    lucide.createIcons();
    
    //DOM
    const fileInput = document.getElementById('file-input');
    const uploadArea = document.getElementById('upload-area');
    const imagePreview = document.getElementById('image-preview');
    const previewImg = document.getElementById('preview-img');
    const removeImage = document.getElementById('remove-image');
    const extractButton = document.getElementById('extract-button');
    const errorMessage = document.getElementById('error-message');
    const emptyState = document.getElementById('empty-state');
    const resultsTabs = document.getElementById('results-tabs');
    const dominantColorElement = document.getElementById('dominant-color');
    const dominantColorPreview = document.getElementById('dominant-color-preview');
    const dominantColorCode = document.getElementById('dominant-color-code');
    const paletteContainer = document.getElementById('palette-container');
    const palette = document.getElementById('palette');
    const copyDominant = document.getElementById('copy-dominant');
    const copyPalette = document.getElementById('copy-palette');
    const savePalette = document.getElementById('save-palette');
    const sharePalette = document.getElementById('share-palette');
    const tabs = document.querySelectorAll('.tab');
    const tabPanels = document.querySelectorAll('.tab-panel');
    const paletteOptions = document.querySelectorAll('.palette-options .option-button');
    const exportMethods = document.querySelectorAll('[data-export]');
    const exportPreview = document.getElementById('export-preview');
    const copyExport = document.getElementById('copy-export');
    const copyHarmonies = document.getElementById('copy-harmonies');
    
    // Color details elements
    const detailHex = document.getElementById('detail-hex');
    const detailRgb = document.getElementById('detail-rgb');
    const detailHsl = document.getElementById('detail-hsl');
    const detailCmyk = document.getElementById('detail-cmyk');
    const detailName = document.getElementById('detail-name');
    
    //harmony ele
    const complementaryHarmony = document.getElementById('complementary-harmony');
    const triadicHarmony = document.getElementById('triadic-harmony');
    const analogousHarmony = document.getElementById('analogous-harmony');
    const monochromaticHarmony = document.getElementById('monochromatic-harmony');
    
    //color thief inst
    const colorThief = new ColorThief();
    
    let dominantColor = null;
    let colorPalette = [];
    let colorHarmonies = {};
    let extractionHistory = loadFromLocalStorage('hexitHistory') || [];
    let currentExportFormat = 'css';
    let activeColor = null;
    
    fileInput.setAttribute('accept', 'image/jpeg,image/png,image/webp,image/gif');
    fileInput.addEventListener('change', function(e) {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            handleFile(file);
        }
    });
    
    document.addEventListener('dragover', function(e) {
        e.preventDefault();
        document.querySelector('.upload-container').classList.add('highlight');
    });
    
    document.addEventListener('dragleave', function(e) {
        if (!e.relatedTarget || e.relatedTarget === document.body) {
            document.querySelector('.upload-container').classList.remove('highlight');
        }
    });
    
    document.addEventListener('drop', function(e) {
        e.preventDefault();
        document.querySelector('.upload-container').classList.remove('highlight');
    });
    ['dragenter', 'dragover'].forEach(eventName => {
        uploadArea.addEventListener(eventName, function(e) {
            e.preventDefault();
            e.stopPropagation();
            uploadArea.classList.add('dragover');
        }, false);
    });
    
    ['dragleave', 'dragend'].forEach(eventName => {
        uploadArea.addEventListener(eventName, function(e) {
            e.preventDefault();
            e.stopPropagation();
            uploadArea.classList.remove('dragover');
        }, false);
    });
    
    uploadArea.addEventListener('drop', function(e) {
        e.preventDefault();
        e.stopPropagation();
        uploadArea.classList.remove('dragover');
        
        try {

            let files = [];
            if (e.dataTransfer.items) {
    
                for (let i = 0; i < e.dataTransfer.items.length; i++) {
                    if (e.dataTransfer.items[i].kind === 'file') {
                        const file = e.dataTransfer.items[i].getAsFile();
                        if (file) files.push(file);
                    }
                }
            } else if (e.dataTransfer.files) {
                files = Array.from(e.dataTransfer.files);
            }
            
            if (files.length > 0) {
                handleFile(files[0]);
            }
        } catch (error) {
            showError('Error processing dropped file. Please try clicking to browse files instead.');
        }
    }, false);

    uploadArea.addEventListener('click', function(e) {
        fileInput.click();
    });
    
    removeImage.addEventListener('click', resetUI);
    
    extractButton.addEventListener('click', extractColors);

    copyDominant.addEventListener('click', function() {
        if (dominantColor) {
            copyToClipboard(dominantColor);
        }
    });

    copyPalette.addEventListener('click', function() {
        if (colorPalette.length) {
            copyToClipboard(colorPalette.join(', '));
        }
    });
    
    savePalette.addEventListener('click', function() {
        if (colorPalette.length) {
            const savedPalettes = loadFromLocalStorage('hexitSaved') || [];
            savedPalettes.push({
                dominant: dominantColor,
                palette: colorPalette,
                timestamp: new Date().toISOString()
            });
            saveToLocalStorage('hexitSaved', savedPalettes);
        }
    });

    sharePalette.addEventListener('click', function() {
        if (colorPalette.length) {
            const paletteData = {
                d: dominantColor.substring(1),
                p: colorPalette.map(c => c.substring(1))
            };
            const shareUrl = `${window.location.origin}${window.location.pathname}?palette=${encodeURIComponent(JSON.stringify(paletteData))}`;
            
            if (navigator.share) {
                navigator.share({
                    title: 'HexIt Color Palette',
                    text: 'Check out this color palette I extracted with HexIt!',
                    url: shareUrl
                }).catch(() => {
                    copyToClipboard(shareUrl);
                });
            } else {
                copyToClipboard(shareUrl);
            }
        }
    });

    copyHarmonies.addEventListener('click', function() {
        if (Object.keys(colorHarmonies).length) {
            const harmoniesText = Object.entries(colorHarmonies)
                .map(([key, colors]) => `${key}: ${colors.join(', ')}`)
                .join('\n');
            copyToClipboard(harmoniesText);
        }
    });

    copyExport.addEventListener('click', function() {
        copyToClipboard(exportPreview.textContent);
    });
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            tabs.forEach(t => t.classList.remove('active'));
            tabPanels.forEach(p => p.classList.remove('active'));
            this.classList.add('active');
            document.querySelector(`[data-tab-panel="${tabName}"]`).classList.add('active');
        });
    });
    paletteOptions.forEach(option => {
        option.addEventListener('click', function() {
            const count = this.getAttribute('data-count');
            const quality = this.hasAttribute('data-quality') ? this.getAttribute('data-quality') : 'normal';
            
            paletteOptions.forEach(o => o.classList.remove('active'));
         
            this.classList.add('active');
            
            updatePaletteWithOptions(count, quality);
        });
    });
    
    // Export method switching
    exportMethods.forEach(method => {
        method.addEventListener('click', function() {
            const format = this.getAttribute('data-export');
            exportMethods.forEach(m => m.classList.remove('active'));
            this.classList.add('active');
            currentExportFormat = format;
            updateExportPreview();
        });
    });
    document.addEventListener('click', function(e) {
        const colorEl = e.target.closest('.palette-color');
        if (colorEl) {
            const color = colorEl.getAttribute('data-color');
            updateColorDetails(color);
            document.querySelectorAll('.palette-color').forEach(c => c.style.transform = '');
            colorEl.style.transform = 'translateY(-8px) scale(1.1)';
            document.querySelector('[data-tab="details"]').click();
        }
    });
    
    /**
     * Handles the file selected by the user
     * @param {File} file - The file object to process
     */
    function handleFile(file) {
        try {
            if (!file.type.match('image.*')) {
                showError('Please select a valid image file (JPG, PNG, WebP, or GIF)');
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                showError('Image size should be less than 5MB');
                return;
            }
            hideError();
            const objectUrl = URL.createObjectURL(file);
            const testImage = new Image();
            testImage.onload = function() {
                previewImg.onerror = function() {
                    showError('Error loading image. Please try another file.');
                    URL.revokeObjectURL(objectUrl);
                };
                
                previewImg.onload = function() {
                    imagePreview.classList.add('animate-fade-in');
                    imagePreview.style.display = 'block';
                    extractButton.disabled = false;
                    extractButton.classList.add('animate-bounce');
                    setTimeout(() => extractButton.classList.remove('animate-bounce'), 1000);
                    
                    URL.revokeObjectURL(objectUrl);
                
                    document.querySelector('.upload-container').classList.add('success');
                };
                previewImg.src = objectUrl;
            };
            
            testImage.onerror = function() {
                showError('Invalid image file. The file could not be processed as an image.');
                URL.revokeObjectURL(objectUrl);
            };
            testImage.src = objectUrl;
        } catch (error) {
            showError('Error processing file. Please try again with a different image.');
        }
    }
    function extractColors() {
        try {
            if (!previewImg.complete || !previewImg.naturalHeight) {
                showError('Image not fully loaded. Please wait a moment and try again.');
                return;
            }
            const loading = document.createElement('div');
            loading.className = 'loading';
            loading.innerHTML = '<div class="loading-spinner"></div>';
            document.querySelector('.upload-container').appendChild(loading);
            setTimeout(() => {
                try {
                    dominantColor = rgbToHex(...colorThief.getColor(previewImg));
                    const paletteColors = colorThief.getPalette(previewImg, 16);
                    colorPalette = paletteColors.map(color => rgbToHex(...color));
                    updateColorsUI();
                    generateHarmonies(dominantColor);
                    addToHistory();
                    updateExportPreview();
                    loading.remove();
                } catch (error) {
                    showError('Could not extract colors. Please try another image.');
                    loading.remove();
                }
            }, 300);
        } catch (error) {
            showError('Could not extract colors. Please try another image.');
        }
    }
    function updateColorsUI() {
        emptyState.style.display = 'none';
        resultsTabs.style.display = 'block';
        dominantColorPreview.style.backgroundColor = dominantColor;
        dominantColorCode.textContent = dominantColor;
        updatePaletteWithOptions();
        updateColorDetails(dominantColor);
    }
    
    /**
     * Updates palette display with options
     * @param {number} count - Number of colors to display
     * @param {string} quality - Quality level ('normal' or 'high')
     */
    function updatePaletteWithOptions(count = 8, quality = 'normal') {
        palette.innerHTML = '';
        const displayCount = parseInt(count);
        let displayPalette = colorPalette.slice(0, displayCount);
        if (quality === 'high') {
            displayPalette = sortColorsByHue(displayPalette);
        }
        displayPalette.forEach((color, index) => {
            const colorElement = document.createElement('div');
            colorElement.className = 'palette-color animate-fade-in';
            colorElement.style.backgroundColor = color;
            colorElement.setAttribute('data-color', color);
            colorElement.style.animationDelay = `${index * 50}ms`;
            
            palette.appendChild(colorElement);
        });
    }
    
    /**
     * Updates color details panel
     * @param {string} color - Hex color code
     */
    function updateColorDetails(color) {
        if (!color) return;
        activeColor = color;
        detailHex.textContent = color;
        const rgb = hexToRgb(color);
        detailRgb.textContent = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
        const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
        detailHsl.textContent = `hsl(${Math.round(hsl.h)}°, ${Math.round(hsl.s)}%, ${Math.round(hsl.l)}%)`;
        
        const cmyk = rgbToCmyk(rgb.r, rgb.g, rgb.b);
        detailCmyk.textContent = `cmyk(${Math.round(cmyk.c)}%, ${Math.round(cmyk.m)}%, ${Math.round(cmyk.y)}%, ${Math.round(cmyk.k)}%)`;
        
        detailName.textContent = getColorName(rgb.r, rgb.g, rgb.b);
    }
    
    /**
     *generates color harmonies from a base color
     * @param {string} baseColor - base color in hex
     */
    function generateHarmonies(baseColor) {
        if (!baseColor) return;
        const rgb = hexToRgb(baseColor);
        const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
        const complementary = [
            baseColor,
            hslToHex((hsl.h + 180) % 360, hsl.s, hsl.l)
        ];
        const triadic = [
            baseColor,
            hslToHex((hsl.h + 120) % 360, hsl.s, hsl.l),
            hslToHex((hsl.h + 240) % 360, hsl.s, hsl.l)
        ];
        const analogous = [
            hslToHex((hsl.h - 30 + 360) % 360, hsl.s, hsl.l),
            baseColor,
            hslToHex((hsl.h + 30) % 360, hsl.s, hsl.l)
        ];
        const monochromatic = [
            hslToHex(hsl.h, hsl.s, Math.max(0, hsl.l - 30)),
            hslToHex(hsl.h, hsl.s, Math.max(0, hsl.l - 15)),
            baseColor,
            hslToHex(hsl.h, hsl.s, Math.min(100, hsl.l + 15)),
            hslToHex(hsl.h, hsl.s, Math.min(100, hsl.l + 30))
        ];
        colorHarmonies = {
            complementary,
            triadic,
            analogous,
            monochromatic
        };
        updateHarmoniesUI();
    }
    
    function updateHarmoniesUI() {
        complementaryHarmony.innerHTML = '';
        triadicHarmony.innerHTML = '';
        analogousHarmony.innerHTML = '';
        monochromaticHarmony.innerHTML = '';
        colorHarmonies.complementary.forEach(color => {
            const colorElement = document.createElement('div');
            colorElement.className = 'harmony-color';
            colorElement.style.backgroundColor = color;
            colorElement.setAttribute('data-color', color);
            complementaryHarmony.appendChild(colorElement);
        });
        colorHarmonies.triadic.forEach(color => {
            const colorElement = document.createElement('div');
            colorElement.className = 'harmony-color';
            colorElement.style.backgroundColor = color;
            colorElement.setAttribute('data-color', color);
            triadicHarmony.appendChild(colorElement);
        });
        colorHarmonies.analogous.forEach(color => {
            const colorElement = document.createElement('div');
            colorElement.className = 'harmony-color';
            colorElement.style.backgroundColor = color;
            colorElement.setAttribute('data-color', color);
            analogousHarmony.appendChild(colorElement);
        });
        colorHarmonies.monochromatic.forEach(color => {
            const colorElement = document.createElement('div');
            colorElement.className = 'harmony-color';
            colorElement.style.backgroundColor = color;
            colorElement.setAttribute('data-color', color);
            monochromaticHarmony.appendChild(colorElement);
        });
    }
    
    function updateExportPreview() {
        if (!colorPalette.length) return;
        
        let exportContent = '';
        
        switch (currentExportFormat) {
            case 'css':
                exportContent = generateCssVariables(colorPalette);
                break;
            case 'scss':
                exportContent = generateScssVariables(colorPalette);
                break;
            case 'json':
                exportContent = generateJson(colorPalette);
                break;
            case 'tailwind':
                exportContent = generateTailwindConfig(colorPalette);
                break;
            case 'svg':
                exportContent = generateSvgSwatches(colorPalette);
                break;
        }
        
        exportPreview.innerHTML = `<code>${exportContent}</code>`;
    }
    
    function addToHistory() {
        const historyItem = {
            dominant: dominantColor,
            palette: colorPalette.slice(0, 8),
            timestamp: new Date().toISOString()
        };
        extractionHistory.unshift(historyItem);
        if (extractionHistory.length > 10) {
            extractionHistory.pop();
        }
        saveToLocalStorage('hexitHistory', extractionHistory);
    }
    
    /**
     *this shows an error message
     * @param {string} message - Error message 
     */
    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
    }
    
    function hideError() {
        errorMessage.textContent = '';
        errorMessage.style.display = 'none';
    }
    
    function resetUI() {
        previewImg.src = '';
        imagePreview.style.display = 'none';
        imagePreview.classList.remove('animate-fade-in');
        extractButton.disabled = true;
        hideError();
        fileInput.value = '';
        document.querySelector('.upload-container').classList.remove('success', 'highlight');
        emptyState.style.display = 'flex';
        resultsTabs.style.display = 'none';
        dominantColor = null;
        colorPalette = [];
        colorHarmonies = {};
    }
    
    /**
     * Converts RGB to HEX color
     * @param {number} r - Red value (0-255)
     * @param {number} g - Green value (0-255)
     * @param {number} b - Blue value (0-255)
     * @returns {string} Hex color code
     */
    function rgbToHex(r, g, b) {
        return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
    }
    
    /**
     * Converts HEX to RGB color
     * @param {string} hex - Hex color code
     * @returns {Object} RGB color object
     */
    function hexToRgb(hex) {
        const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
        hex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
        
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }
    
    /**
     * Converts RGB to HSL color
     * @param {number} r - red value (0-255)
     * @param {number} g - green value (0-255)
     * @param {number} b - blue value (0-255)
     * @returns {Object} HSL color object
     */
    function rgbToHsl(r, g, b) {
        r /= 255;
        g /= 255;
        b /= 255;
        
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;
        
        if (max === min) {
            h = s = 0; // achromatic
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            
            h /= 6;
        }
        
        return {
            h: Math.round(h * 360),
            s: Math.round(s * 100),
            l: Math.round(l * 100)
        };
    }
    
    /**
     * Converts HSL to HEX color
     * @param {number} h - Hue (0-360)
     * @param {number} s - Saturation (0-100)
     * @param {number} l - Lightness (0-100)
     * @returns {string} Hex color code
     */
    function hslToHex(h, s, l) {
        h /= 360;
        s /= 100;
        l /= 100;
        
        let r, g, b;
        
        if (s === 0) {
            r = g = b = l; // achromatic
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1/6) return p + (q - p) * 6 * t;
                if (t < 1/2) return q;
                if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            };
            
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }
        
        return rgbToHex(
            Math.round(r * 255),
            Math.round(g * 255),
            Math.round(b * 255)
        );
    }
    
    /**
     * Converts RGB to CMYK color
     * @param {number} r - Red value (0-255)
     * @param {number} g - Green value (0-255)
     * @param {number} b - Blue value (0-255)
     * @returns {Object} CMYK color object
     */
    function rgbToCmyk(r, g, b) {
        r /= 255;
        g /= 255;
        b /= 255;
        
        const k = 1 - Math.max(r, g, b);
        const c = (1 - r - k) / (1 - k) || 0;
        const m = (1 - g - k) / (1 - k) || 0;
        const y = (1 - b - k) / (1 - k) || 0;
        
        return {
            c: Math.round(c * 100),
            m: Math.round(m * 100),
            y: Math.round(y * 100),
            k: Math.round(k * 100)
        };
    }
    
    /**
     * Sorts colors by hue
     * @param {Array} colors - Array of hex color codes
     * @returns {Array} Sorted array of colors
     */
    function sortColorsByHue(colors) {
        return colors.sort((a, b) => {
            const rgbA = hexToRgb(a);
            const rgbB = hexToRgb(b);
            const hslA = rgbToHsl(rgbA.r, rgbA.g, rgbA.b);
            const hslB = rgbToHsl(rgbB.r, rgbB.g, rgbB.b);
            return hslA.h - hslB.h;
        });
    }
    
    /**
     * Gets approximate color name
     * @param {number} r - Red value (0-255)
     * @param {number} g - Green value (0-255)
     * @param {number} b - Blue value (0-255)
     * @returns {string} Color name
     */
    function getColorName(r, g, b) {
        const colorNames = {
            '#FF0000': 'Red',
            '#00FF00': 'Green',
            '#0000FF': 'Blue',
            '#FFFF00': 'Yellow',
            '#FF00FF': 'Magenta',
            '#00FFFF': 'Cyan',
            '#FFFFFF': 'White',
            '#000000': 'Black',
            '#808080': 'Gray',
            '#FFA500': 'Orange',
            '#800080': 'Purple',
            '#A52A2A': 'Brown',
            '#FFC0CB': 'Pink',
            '#808000': 'Olive',
            '#800000': 'Maroon',
            '#008000': 'Dark Green',
            '#000080': 'Navy',
            '#FF4500': 'Orange Red',
            '#DA70D6': 'Orchid',
            '#FFD700': 'Gold',
            '#C0C0C0': 'Silver',
            '#F5F5DC': 'Beige'
        };
        function colorDiff(r1, g1, b1, r2, g2, b2) {
            return Math.sqrt(
                Math.pow(r1 - r2, 2) +
                Math.pow(g1 - g2, 2) +
                Math.pow(b1 - b2, 2)
            );
        }
        
        let closestColor = '';
        let minDiff = Infinity;
        
        for (const hex in colorNames) {
            const rgb = hexToRgb(hex);
            const diff = colorDiff(r, g, b, rgb.r, rgb.g, rgb.b);
            
            if (diff < minDiff) {
                minDiff = diff;
                closestColor = colorNames[hex];
            }
        }
        
        return closestColor;
    }
    
    /**
     * Copies text to clipboard
     * @param {string} text - Text to copy
     */
    function copyToClipboard(text) {
        navigator.clipboard.writeText(text).catch(err => {
            // Fallback method
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.left = '-999999px';
            textarea.style.top = '-999999px';
            document.body.appendChild(textarea);
            textarea.focus();
            textarea.select();
            
            try {
                document.execCommand('copy');
            } catch (err) {
                console.error('Fallback copy failed:', err);
            }
            
            document.body.removeChild(textarea);
        });
    }
    
    /**
     * Generates CSS variables from colors
     * @param {Array} colors - Array of hex color codes
     * @returns {string} CSS variables code
     */
    function generateCssVariables(colors) {
        let css = ':root {\n';
        
        // Add dominant color
        css += `  --color-dominant: ${dominantColor};\n`;
        
        // Add palette colors
        colors.forEach((color, index) => {
            css += `  --color-${index + 1}: ${color};\n`;
        });
        
        css += '}';
        return css;
    }
    
    /**
     * Generates SCSS variables from colors
     * @param {Array} colors - Array of hex color codes
     * @returns {string} SCSS variables code
     */
    function generateScssVariables(colors) {
        let scss = '// Color Variables\n';
        
        // Add dominant color
        scss += `$color-dominant: ${dominantColor};\n`;
        
        // Add palette colors
        colors.forEach((color, index) => {
            scss += `$color-${index + 1}: ${color};\n`;
        });
        
        // Add color map
        scss += '\n// Color Map\n';
        scss += '$colors: (\n';
        scss += `  "dominant": $color-dominant,\n`;
        colors.forEach((color, index) => {
            scss += `  "${index + 1}": $color-${index + 1}${index < colors.length - 1 ? ',' : ''}\n`;
        });
        scss += ');';
        
        return scss;
    }
    
    /**
     * Generates JSON from colors
     * @param {Array} colors - Array of hex color codes
     * @returns {string} JSON string
     */
    function generateJson(colors) {
        const json = {
            dominant: dominantColor,
            palette: colors,
            harmonies: colorHarmonies,
            timestamp: new Date().toISOString()
        };
        return JSON.stringify(json, null, 2);
    }
    
    /**
     * Generates Tailwind config from colors
     * @param {Array} colors - Array of hex color codes
     * @returns {string} Tailwind config code
     */
    function generateTailwindConfig(colors) {
        let config = 'module.exports = {\n';
        config += '  theme: {\n';
        config += '    extend: {\n';
        config += '      colors: {\n';
        config += '        palette: {\n';
        config += `          dominant: "${dominantColor}",\n`;
        
        colors.forEach((color, index) => {
            config += `          "${index + 1}": "${color}"${index < colors.length - 1 ? ',' : ''}\n`;
        });
        
        config += '        }\n';
        config += '      }\n';
        config += '    }\n';
        config += '  }\n';
        config += '};';
        
        return config;
    }
    
    /**
     * Generates SVG swatches from colors
     * @param {Array} colors - Array of hex color codes
     * @returns {string} SVG code
     */
    function generateSvgSwatches(colors) {
        const swatchSize = 50;
        const padding = 5;
        const width = colors.length * (swatchSize + padding) + padding;
        const height = swatchSize + (padding * 2);
        
        let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">\n`;
        svg += '  <style>\n';
        svg += '    .swatch-label { font-family: monospace; font-size: 10px; text-anchor: middle; }\n';
        svg += '  </style>\n';
        
        colors.forEach((color, index) => {
            const x = padding + index * (swatchSize + padding);
            const y = padding;
            
            svg += `  <rect x="${x}" y="${y}" width="${swatchSize}" height="${swatchSize}" fill="${color}" rx="5" />\n`;
            svg += `  <text x="${x + (swatchSize / 2)}" y="${y + swatchSize + 15}" class="swatch-label">${color}</text>\n`;
        });
        
        svg += '</svg>';
        
        return svg;
    }
    
    /**
     * Saves data to local storage
     * @param {string} key - Storage key
     * @param {any} data - Data to store
     * @returns {boolean} Success status
     */
    function saveToLocalStorage(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Error saving to localStorage:', error);
            return false;
        }
    }
    
    /**
     * Loads data from local storage
     * @param {string} key - storage key
     * @returns {any} Stord data
     */
    function loadFromLocalStorage(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Error loading from localStorage:', error);
            return null;
        }
    }
    function checkUrlParameters() {
        const urlParams = new URLSearchParams(window.location.search);
        const paletteParam = urlParams.get('palette');
        
        if (paletteParam) {
            try {
                const paletteData = JSON.parse(decodeURIComponent(paletteParam));
                
                if (paletteData.d && paletteData.p && paletteData.p.length) {
             
                    dominantColor = '#' + paletteData.d;
                    colorPalette = paletteData.p.map(c => '#' + c);
                    updateColorsUI();
                    generateHarmonies(dominantColor);
                    updateExportPreview();
                    history.replaceState({}, document.title, window.location.pathname);
                }
            } catch (error) {
                console.error('Error parsing shared palette:', error);
            }
        }
    }
    
    checkUrlParameters();
});