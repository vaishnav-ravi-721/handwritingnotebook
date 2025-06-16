document.addEventListener('DOMContentLoaded', function() {
    // Canvas setup
    const canvas = document.getElementById('drawingCanvas');
    const ctx = canvas.getContext('2d');
    let isDrawing = false;
    let showGrid = false;
    let showCharacters = true;
    const drawingHistory = [];
    let historyIndex = -1;
    
    // Character management
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789,./';
    let currentCharIndex = 0;
    let savedCharacters = {};
    
    // UI elements
    const characterDisplay = document.getElementById('characterDisplay');
    const prevCharBtn = document.getElementById('prevChar');
    const nextCharBtn = document.getElementById('nextChar');
    const saveCharBtn = document.getElementById('saveChar');
    const clearCanvasBtn = document.getElementById('clearCanvas');
    const clearCurrentBtn = document.getElementById('clearCurrent');
    const clearAllBtn = document.getElementById('clearAll');
    const exportAllBtn = document.getElementById('exportAll');
    const importAllBtn = document.getElementById('importAll');
    const penSizeInput = document.getElementById('penSize');
    const penColorInput = document.getElementById('penColor');
    const previewTextInput = document.getElementById('previewText');
    const outputTextDiv = document.getElementById('outputText');
    const fontSizeInput = document.getElementById('fontSize');
    const textColorInput = document.getElementById('textColor');
    const characterListDiv = document.getElementById('characterList');
    const notebookContent = document.getElementById('notebookContent');
    const clearNotebookBtn = document.getElementById('clearNotebook');
    const printNotebookBtn = document.getElementById('printNotebook');
    const pdfNotebookBtn = document.getElementById('pdfNotebook');
    const notebookFontSizeInput = document.getElementById('notebookFontSize');
    const canvasWidthInput = document.getElementById('canvasWidth');
    const canvasHeightInput = document.getElementById('canvasHeight');
    const toggleGridBtn = document.getElementById('toggleGrid');
    const toggleCharactersBtn = document.getElementById('toggleCharacters');
    const undoBtn = document.getElementById('undoBtn');
    const redoBtn = document.getElementById('redoBtn');
    const pasteButton = document.getElementById('pasteButton');
    const pasteArea = document.getElementById('pasteArea');
    const convertButton = document.getElementById('convertButton');
    
    // Initialize
    loadFromLocalStorage();
    updateCharacterDisplay();
    clearCanvas();
    setupNotebook();
    
    // Event listeners
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);
    
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd);
    
    prevCharBtn.addEventListener('click', prevCharacter);
    nextCharBtn.addEventListener('click', nextCharacter);
    saveCharBtn.addEventListener('click', saveCharacter);
    clearCanvasBtn.addEventListener('click', clearCanvas);
    clearCurrentBtn.addEventListener('click', clearCurrentCharacter);
    clearAllBtn.addEventListener('click', clearAllCharacters);
    exportAllBtn.addEventListener('click', exportAllCharacters);
    importAllBtn.addEventListener('click', importAllCharacters);
    undoBtn.addEventListener('click', undo);
    redoBtn.addEventListener('click', redo);
    
    previewTextInput.addEventListener('input', updateOutputText);
    fontSizeInput.addEventListener('input', updateOutputText);
    textColorInput.addEventListener('input', updateOutputText);
    
    notebookContent.addEventListener('input', updateNotebookContent);
    notebookContent.addEventListener('keydown', handleNotebookKeyDown);
    clearNotebookBtn.addEventListener('click', clearNotebook);
    printNotebookBtn.addEventListener('click', printNotebook);
    pdfNotebookBtn.addEventListener('click', saveAsPDF);
    notebookFontSizeInput.addEventListener('input', updateNotebookFontSize);
    
    canvasWidthInput.addEventListener('change', updateCanvasSize);
    canvasHeightInput.addEventListener('change', updateCanvasSize);
    toggleGridBtn.addEventListener('click', toggleGrid);
    toggleCharactersBtn.addEventListener('click', toggleCharacters);
    
    pasteButton.addEventListener('click', showPasteArea);
    convertButton.addEventListener('click', convertPastedText);
    
    // Drawing functions
    function startDrawing(e) {
        isDrawing = true;
        saveDrawingState();
        draw(e);
        e.preventDefault();
    }
    
    function draw(e) {
        if (!isDrawing) return;
        
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX || e.touches[0].clientX) - rect.left;
        const y = (e.clientY || e.touches[0].clientY) - rect.top;
        
        ctx.lineWidth = penSizeInput.value;
        ctx.lineCap = 'round';
        ctx.strokeStyle = penColorInput.value;
        
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y);
        
        e.preventDefault();
    }
    
    function stopDrawing() {
        isDrawing = false;
        ctx.beginPath();
        autoSaveCharacter();
    }
    
    // Touch event handlers
    function handleTouchStart(e) {
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousedown', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            startDrawing(mouseEvent);
        }
        e.preventDefault();
    }
    
    function handleTouchMove(e) {
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousemove', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            draw(mouseEvent);
        }
        e.preventDefault();
    }
    
    function handleTouchEnd() {
        const mouseEvent = new MouseEvent('mouseup');
        stopDrawing(mouseEvent);
    }
    
    // Canvas controls
    function updateCanvasSize() {
        saveDrawingState();
        canvas.width = parseInt(canvasWidthInput.value);
        canvas.height = parseInt(canvasHeightInput.value);
        updateCharacterDisplay();
    }
    
    function toggleGrid() {
        showGrid = !showGrid;
        toggleGridBtn.textContent = showGrid ? 'Hide Grid' : 'Show Grid';
        updateCharacterDisplay();
    }
    
    function toggleCharacters() {
        showCharacters = !showCharacters;
        toggleCharactersBtn.textContent = showCharacters ? 'Hide Characters' : 'Show Characters';
        characterListDiv.classList.toggle('hidden');
    }
    
    function drawGrid() {
        if (!showGrid) return;
        
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 1;
        
        // Vertical lines
        for (let x = 0; x <= canvas.width; x += 20) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
        }
        
        // Horizontal lines
        for (let y = 0; y <= canvas.height; y += 20) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }
    }
    
    // Undo/Redo functionality
    function saveDrawingState() {
        // Remove any states after current history index
        if (historyIndex < drawingHistory.length - 1) {
            drawingHistory.length = historyIndex + 1;
        }
        
        // Save current canvas state
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        drawingHistory.push(imageData);
        historyIndex = drawingHistory.length - 1;
        
        updateUndoRedoButtons();
    }
    
    function undo() {
        if (historyIndex > 0) {
            historyIndex--;
            ctx.putImageData(drawingHistory[historyIndex], 0, 0);
            updateUndoRedoButtons();
        }
    }
    
    function redo() {
        if (historyIndex < drawingHistory.length - 1) {
            historyIndex++;
            ctx.putImageData(drawingHistory[historyIndex], 0, 0);
            updateUndoRedoButtons();
        }
    }
    
    function updateUndoRedoButtons() {
        undoBtn.disabled = historyIndex <= 0;
        redoBtn.disabled = historyIndex >= drawingHistory.length - 1;
    }
    
    // Character management functions
    function updateCharacterDisplay() {
        const currentChar = characters[currentCharIndex];
        characterDisplay.textContent = currentChar;
        
        // Clear canvas with white background
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        drawGrid();
        
        // If we have a saved version of this character, display it
        if (savedCharacters[currentChar]) {
            const img = new Image();
            img.onload = function() {
                // Clear and redraw grid
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                drawGrid();
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            };
            img.src = savedCharacters[currentChar];
        }
    }
    
    function prevCharacter() {
        autoSaveCharacter();
        currentCharIndex = (currentCharIndex - 1 + characters.length) % characters.length;
        updateCharacterDisplay();
    }
    
    function nextCharacter() {
        autoSaveCharacter();
        currentCharIndex = (currentCharIndex + 1) % characters.length;
        updateCharacterDisplay();
    }
    
    function autoSaveCharacter() {
        if (isCanvasEmpty()) return;
        
        const currentChar = characters[currentCharIndex];
        
        // Create a temporary canvas to save with white background
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        
        // Fill with white background
        tempCtx.fillStyle = 'white';
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        
        // Draw the character (without grid)
        tempCtx.drawImage(canvas, 0, 0);
        
        savedCharacters[currentChar] = tempCanvas.toDataURL('image/png');
        saveToLocalStorage();
        updateSavedCharactersList();
    }
    
    function isCanvasEmpty() {
        const pixelData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        for (let i = 3; i < pixelData.length; i += 4) {
            if (pixelData[i] !== 0) return false;
        }
        return true;
    }
    
    function clearCanvas() {
        saveDrawingState();
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        drawGrid();
        ctx.beginPath();
    }
    
    function saveCharacter() {
        autoSaveCharacter();
    }
    
    function clearCurrentCharacter() {
        const currentChar = characters[currentCharIndex];
        delete savedCharacters[currentChar];
        saveToLocalStorage();
        updateSavedCharactersList();
        updateCharacterDisplay();
    }
    
    function clearAllCharacters() {
        if (confirm('Are you sure you want to delete ALL saved characters? This cannot be undone.')) {
            savedCharacters = {};
            saveToLocalStorage();
            updateSavedCharactersList();
            updateCharacterDisplay();
        }
    }
    
    function updateSavedCharactersList() {
        characterListDiv.innerHTML = '';
        
        for (const char in savedCharacters) {
            if (savedCharacters[char]) {
                const charContainer = document.createElement('div');
                charContainer.className = 'character-item';
                
                const charLabel = document.createElement('div');
                charLabel.textContent = char;
                
                const charCanvas = document.createElement('canvas');
                charCanvas.width = 30;
                charCanvas.height = 30;
                const charCtx = charCanvas.getContext('2d');
                
                // Draw white background for the preview
                charCtx.fillStyle = 'white';
                charCtx.fillRect(0, 0, charCanvas.width, charCanvas.height);
                
                const img = new Image();
                img.onload = function() {
                    charCtx.drawImage(img, 0, 0, charCanvas.width, charCanvas.height);
                };
                img.src = savedCharacters[char];
                
                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = '×';
                deleteBtn.className = 'danger';
                deleteBtn.style.marginLeft = '5px';
                deleteBtn.style.padding = '2px 5px';
                deleteBtn.onclick = function() {
                    delete savedCharacters[char];
                    saveToLocalStorage();
                    updateSavedCharactersList();
                    if (char === characters[currentCharIndex]) {
                        updateCharacterDisplay();
                    }
                };
                
                charContainer.appendChild(charLabel);
                charContainer.appendChild(charCanvas);
                charContainer.appendChild(deleteBtn);
                characterListDiv.appendChild(charContainer);
            }
        }
    }
    
    function exportAllCharacters() {
        const data = JSON.stringify(savedCharacters);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'handwriting_characters.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    function importAllCharacters() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = function(e) {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = function(event) {
                try {
                    const imported = JSON.parse(event.target.result);
                    Object.assign(savedCharacters, imported);
                    saveToLocalStorage();
                    updateSavedCharactersList();
                    updateCharacterDisplay();
                } catch (err) {
                    alert('Error importing file: ' + err.message);
                }
            };
            reader.readAsText(file);
        };
        
        input.click();
    }
    
    function updateOutputText() {
        const text = previewTextInput.value;
        let outputHTML = '';
        
        for (const char of text) {
            if (savedCharacters[char]) {
                outputHTML += `<img src="${savedCharacters[char]}" style="height:${fontSizeInput.value}px; display:inline-block; vertical-align:middle; background-color:white;" alt="${char}">`;
            } else {
                outputHTML += `<span style="color:${textColorInput.value}; font-size:${fontSizeInput.value}px; display:inline-block; vertical-align:middle;">${char}</span>`;
            }
        }
        
        outputTextDiv.innerHTML = outputHTML;
    }
    
    // Notebook functions
    function setupNotebook() {
        // Create 30 ruled lines
        let linesHTML = '';
        for (let i = 0; i < 30; i++) {
            linesHTML += `<div class="notebook-line" data-line-number="${i + 1}"><br></div>`;
        }
        notebookContent.innerHTML = linesHTML;
        
        // Load any saved notebook content
        const savedNotebook = localStorage.getItem('handwritingNotebook');
        if (savedNotebook) {
            notebookContent.innerHTML = savedNotebook;
            ensureMinimumLines();
        }
    }
    
    function ensureMinimumLines() {
        const lines = notebookContent.querySelectorAll('.notebook-line');
        if (lines.length < 30) {
            const linesToAdd = 30 - lines.length;
            for (let i = 0; i < linesToAdd; i++) {
                const line = document.createElement('div');
                line.className = 'notebook-line';
                line.dataset.lineNumber = lines.length + i + 1;
                line.innerHTML = '<br>';
                notebookContent.appendChild(line);
            }
        }
    }
    
    function handleNotebookKeyDown(e) {
        if (e.key === 'Enter') {
            // When Enter is pressed, add a new line after a short delay
            setTimeout(() => {
                const selection = window.getSelection();
                const range = selection.getRangeAt(0);
                const line = range.startContainer.parentElement.closest('.notebook-line');
                
                if (line) {
                    const newLine = document.createElement('div');
                    newLine.className = 'notebook-line';
                    newLine.dataset.lineNumber = notebookContent.querySelectorAll('.notebook-line').length + 1;
                    newLine.innerHTML = '<br>';
                    line.after(newLine);
                    
                    // Move cursor to new line
                    const newRange = document.createRange();
                    newRange.selectNodeContents(newLine);
                    newRange.collapse(true);
                    selection.removeAllRanges();
                    selection.addRange(newRange);
                }
            }, 10);
        } else if (e.key === 'Backspace') {
            const selection = window.getSelection();
            if (selection.isCollapsed) {
                const range = selection.getRangeAt(0);
                const line = range.startContainer.parentElement.closest('.notebook-line');
                
                if (line) {
                    const lineNumber = parseInt(line.dataset.lineNumber) || 0;
                    const isFirstLine = range.startOffset === 0 && range.startContainer === line.firstChild;
                    
                    // Don't allow deleting lines below the 30th line if empty
                    if (lineNumber > 30 && line.textContent.trim() === '' && isFirstLine) {
                        e.preventDefault();
                    }
                }
            }
        }
    }
    
    function updateNotebookContent() {
        // Replace text with handwriting images
        const walker = document.createTreeWalker(
            notebookContent,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );
        
        let node;
        while (node = walker.nextNode()) {
            if (node.nodeValue.trim() === '') continue;
            
            const parent = node.parentNode;
            if (parent.tagName === 'IMG') continue;
            
            const text = node.nodeValue;
            let replacementHTML = '';
            
            for (const char of text) {
                if (savedCharacters[char]) {
                    replacementHTML += `<img src="${savedCharacters[char]}" style="height:${notebookFontSizeInput.value}px; background-color:white;" alt="${char}">`;
                } else {
                    replacementHTML += char;
                }
            }
            
            const temp = document.createElement('div');
            temp.innerHTML = replacementHTML;
            
            while (temp.firstChild) {
                parent.insertBefore(temp.firstChild, node);
            }
            
            parent.removeChild(node);
        }
        
        // Ensure we have at least 30 lines
        ensureMinimumLines();
        
        // Save to local storage
        localStorage.setItem('handwritingNotebook', notebookContent.innerHTML);
    }
    
    function clearNotebook() {
        if (confirm('Are you sure you want to clear the notebook? This cannot be undone.')) {
            notebookContent.innerHTML = '';
            setupNotebook();
            localStorage.removeItem('handwritingNotebook');
        }
    }
    
    function printNotebook() {
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>My Handwritten Notes</title>
                <style>
                    body { font-family: Arial; padding: 20px; }
                    .notebook-page { 
                        background-color: white; 
                        padding: 40px; 
                        position: relative;
                    }
                    .notebook-line { 
                        position: relative; 
                        min-height: 24px; 
                        margin-bottom: 24px; 
                    }
                    .notebook-line::after {
                        content: "";
                        position: absolute;
                        left: 0;
                        right: 0;
                        bottom: -5px;
                        border-bottom: 1px solid #eee;
                    }
                    .red-margin {
                        border-left: 2px solid red;
                        padding-left: 10px;
                        margin-left: -12px;
                    }
                </style>
            </head>
            <body>
                <div class="notebook-page">
                    <div class="red-margin"></div>
                    <div>${notebookContent.innerHTML}</div>
                </div>
                <script>
                    window.onload = function() { window.print(); }
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    }
    
  // Function to download the bill as a PDF
      function saveAsPDF() {
        const billContainer = document.getElementById("bill-container");
        const addItemContainer = document.getElementById("add-item-container");
        const tools = document.getElementById("tools");
        const historySidebar = document.getElementById("history-sidebar");
        const historyOverlay = document.getElementById("history-overlay");
        const copyListTable = document.getElementById("copyList");

        // Store initial display states
        const initialBillDisplay = billContainer.style.display;
        const initialAddItemDisplay = addItemContainer.style.display;
        const initialToolsDisplay = tools.style.display;
        const initialHistorySidebarDisplay = historySidebar.style.display;
        const initialHistoryOverlayDisplay = historyOverlay.style.display;

        // 1. Show the bill container and hide the add item container
        billContainer.style.display = "block";
        addItemContainer.style.display = "none";

        // Hide elements that should not appear in the PDF
        // Hide the "Remove" column in the copyList table before generating PDF
        hideTableColumn(copyListTable, 6, "none");

        if(historySidebar) historySidebar.style.display = "none"; // Hide history sidebar if it exists
        if(historyOverlay) historyOverlay.style.display = "none"; // Hide history overlay if it exists
        if(tools) tools.style.display = "none"; // Hide tool buttons if it exists


        // Configuration options for html2pdf
        const opt = {
          margin: 0.5, // Add some margin for better appearance
          filename: 'bill.pdf', // Output filename
          image: { type: 'jpeg', quality: 100 }, // Image quality
          html2canvas: {
              scale: 5, // Increase scale for better resolution
              useCORS: true,
              logging: true, // Enable logging for debugging
              allowTaint: true // Allow tainting for cross-origin images if any (use with caution)
          },
          jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' } // jsPDF options
        };

        // Generate and save the PDF
        html2pdf().set(opt).from(billContainer).save().then(() => {
            // Use setTimeout to revert display states after PDF generation is complete
            setTimeout(() => {
                // Restore initial display states
                billContainer.style.display = initialBillDisplay;
                addItemContainer.style.display = initialAddItemDisplay;
                if(tools) tools.style.display = initialToolsDisplay;
                if(historySidebar) historySidebar.style.display = initialHistorySidebarDisplay;
                if(historyOverlay) historyOverlay.style.display = initialHistoryOverlayDisplay;

                // Restore the "Remove" column in the copyList table
                hideTableColumn(copyListTable, 6, "table-cell");
            }, 100); // A small delay to ensure PDF saving is complete
        });
      }
    function showPasteArea() {
        pasteArea.classList.toggle('hidden');
        convertButton.classList.toggle('hidden');
        if (!pasteArea.classList.contains('hidden')) {
            pasteArea.value = '';
            pasteArea.focus();
        }
    }
    
    function convertPastedText() {
        const text = pasteArea.value;
        if (!text.trim()) return;
        
        // Split text into paragraphs
        const paragraphs = text.split(/\n\s*\n/);
        
        // Clear notebook and add new content
        notebookContent.innerHTML = '';
        
        // Add each paragraph with proper spacing
        paragraphs.forEach((para, index) => {
            if (para.trim()) {
                // Create a div for each paragraph
                const paraDiv = document.createElement('div');
                paraDiv.style.marginBottom = '24px';
                
                // Split paragraph into lines that fit the notebook width
                const words = para.split(/\s+/);
                let currentLine = '';
                
                words.forEach(word => {
                    const testLine = currentLine ? `${currentLine} ${word}` : word;
                    const testElement = document.createElement('span');
                    testElement.textContent = testLine;
                    testElement.style.visibility = 'hidden';
                    testElement.style.position = 'absolute';
                    testElement.style.whiteSpace = 'nowrap';
                    document.body.appendChild(testElement);
                    
                    if (testElement.offsetWidth < notebookContent.offsetWidth - 40) {
                        currentLine = testLine;
                    } else {
                        // Add the current line
                        const lineDiv = document.createElement('div');
                        lineDiv.className = 'notebook-line';
                        lineDiv.textContent = currentLine;
                        paraDiv.appendChild(lineDiv);
                        
                        // Start new line with current word
                        currentLine = word;
                    }
                    
                    document.body.removeChild(testElement);
                });
                
                // Add the last line of the paragraph
                if (currentLine) {
                    const lineDiv = document.createElement('div');
                    lineDiv.className = 'notebook-line';
                    lineDiv.textContent = currentLine;
                    paraDiv.appendChild(lineDiv);
                }
                
                notebookContent.appendChild(paraDiv);
                
                // Add extra space between paragraphs
                if (index < paragraphs.length - 1) {
                    const spacer = document.createElement('div');
                    spacer.className = 'notebook-line';
                    spacer.innerHTML = '<br>';
                    notebookContent.appendChild(spacer);
                }
            }
        });
        
        // Ensure we have at least 30 lines
        ensureMinimumLines();
        
        // Update the notebook content
        updateNotebookContent();
        
        // Hide the paste area
        showPasteArea();
    }
    
    function updateNotebookFontSize() {
        const imgs = notebookContent.querySelectorAll('img');
        imgs.forEach(img => {
            img.style.height = `${notebookFontSizeInput.value}px`;
        });
    }
    
    // Local storage functions
    function saveToLocalStorage() {
        localStorage.setItem('handwritingCharacters', JSON.stringify(savedCharacters));
        localStorage.setItem('handwritingNotebook', notebookContent.innerHTML);
    }
    
    function loadFromLocalStorage() {
        const saved = localStorage.getItem('handwritingCharacters');
        if (saved) {
            savedCharacters = JSON.parse(saved);
        } else {
            // Initialize with empty saved characters for all possible characters
            for (const char of characters) {
                savedCharacters[char] = null;
            }
        }
        updateSavedCharactersList();
    }
    
    // Tab functions
    window.openTab = function(tabName) {
        const tabs = document.getElementsByClassName('tab');
        for (let i = 0; i < tabs.length; i++) {
            tabs[i].classList.remove('active');
        }
        
        const tabContents = document.getElementsByClassName('tab-content');
        for (let i = 0; i < tabContents.length; i++) {
            tabContents[i].classList.remove('active');
        }
        
        document.querySelector(`.tab[onclick="openTab('${tabName}')"]`).classList.add('active');
        document.getElementById(tabName).classList.add('active');
    };
});
