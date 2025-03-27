// Constants
const sheetWidth = 2440; // Standard sheet width in mm
const sheetHeight = 1220; // Standard sheet height in mm
const woodWaste = 10; // 10mm waste between pieces
const sheetCost = 455; // Cost per sheet in RF
const cutCost = 10; // Cost per cut in RF
const teakCost = 10; // Cost per meter of teak in RF
let sheets = []; // Array to store sheets and their pieces
let currentUnit = 'mm'; // Default unit

// Display dimensions (pixels)
const displayWidth = 800; // px
const displayHeight = 400; // px

// Calculate scaling factors
const scaleX = displayWidth / sheetWidth;
const scaleY = displayHeight / sheetHeight;
const uniformScale = Math.min(scaleX, scaleY); // Maintain aspect ratio

// Unit conversion event listener
document.getElementById('unitSelector').addEventListener('change', function(e) {
  currentUnit = e.target.value;
  updateDisplayUnits();
});

document.getElementById('piece-form').addEventListener('submit', function (e) {
  e.preventDefault();

  // Get user input and convert to mm
  const length = UnitConverter.toMM(parseFloat(document.getElementById('length').value), currentUnit);
  const width = UnitConverter.toMM(parseFloat(document.getElementById('width').value), currentUnit);
  const quantity = parseInt(document.getElementById('quantity').value);
  const teakSides = Array.from(document.querySelectorAll('input[name="teak"]:checked')).map(input => input.value);

  // Validate input
  if (length > sheetWidth || width > sheetHeight) {
    const maxLength = UnitConverter.fromMM(sheetWidth, currentUnit);
    const maxWidth = UnitConverter.fromMM(sheetHeight, currentUnit);
    alert(`Piece dimensions cannot exceed sheet size (${maxLength}${currentUnit} x ${maxWidth}${currentUnit})`);
    return;
  }

  // Add pieces to sheets
  for (let i = 0; i < quantity; i++) {
    addPieceToSheet(length, width, teakSides);
  }

  // Clear input fields
  clearInputFields();

  // Render sheets and details
  renderSheets();
  renderSheetDetails();
  generateQuotation();
});

function clearInputFields() {
  document.getElementById('length').value = '';
  document.getElementById('width').value = '';
  document.getElementById('quantity').value = '1';
  document.querySelectorAll('input[name="teak"]').forEach(input => (input.checked = false));
}

function addPieceToSheet(length, width, teakSides) {
  let added = false;

  // Try to add the piece to an existing sheet
  for (const sheet of sheets) {
    if (tryFitPiece(sheet, length, width)) {
      sheet.pieces[sheet.pieces.length - 1].teakSides = teakSides;
      added = true;
      break;
    }
  }

  // If no sheet can fit the piece, create a new sheet
  if (!added) {
    const newSheet = {
      width: sheetWidth,
      height: sheetHeight,
      pieces: [],
    };
    tryFitPiece(newSheet, length, width);
    newSheet.pieces[newSheet.pieces.length - 1].teakSides = teakSides;
    sheets.push(newSheet);
  }
}

function tryFitPiece(sheet, length, width) {
  // Try original orientation
  if (canFit(sheet, length, width)) {
    placePiece(sheet, length, width, false);
    return true;
  }

  // Try rotated orientation
  if (canFit(sheet, width, length)) {
    placePiece(sheet, width, length, true);
    return true;
  }

  return false;
}

function canFit(sheet, pieceWidth, pieceHeight) {
  const pieceWidthWithWaste = pieceWidth + woodWaste;
  const pieceHeightWithWaste = pieceHeight + woodWaste;

  // Check if piece fits in sheet dimensions
  if (pieceWidthWithWaste > sheet.width || pieceHeightWithWaste > sheet.height) {
    return false;
  }

  // Check for overlapping with existing pieces
  for (let y = 0; y <= sheet.height - pieceHeightWithWaste; y++) {
    for (let x = 0; x <= sheet.width - pieceWidthWithWaste; x++) {
      if (!isOverlapping(sheet, x, y, pieceWidthWithWaste, pieceHeightWithWaste)) {
        return true;
      }
    }
  }
  return false;
}

function isOverlapping(sheet, x, y, pieceWidth, pieceHeight) {
  for (const piece of sheet.pieces) {
    if (
      x < piece.x + piece.width + woodWaste &&
      x + pieceWidth > piece.x &&
      y < piece.y + piece.height + woodWaste &&
      y + pieceHeight > piece.y
    ) {
      return true;
    }
  }
  return false;
}

function placePiece(sheet, pieceWidth, pieceHeight, isRotated) {
  for (let y = 0; y <= sheet.height - (pieceHeight + woodWaste); y++) {
    for (let x = 0; x <= sheet.width - (pieceWidth + woodWaste); x++) {
      if (!isOverlapping(sheet, x, y, pieceWidth, pieceHeight)) {
        sheet.pieces.push({
          x,
          y,
          width: pieceWidth,
          height: pieceHeight,
          isRotated,
          teakSides: [],
        });
        return;
      }
    }
  }
}

function renderSheets() {
  const sheetContainer = document.getElementById('sheet-container');
  sheetContainer.innerHTML = '';

  if (sheets.length === 0) {
    sheetContainer.innerHTML = '<p>No sheets created yet. Add pieces to begin.</p>';
    return;
  }

  sheets.forEach((sheet, index) => {
    const sheetDiv = document.createElement('div');
    sheetDiv.className = 'sheet';
    
    // Add sheet title with converted units
    const titleDiv = document.createElement('div');
    titleDiv.className = 'sheet-title';
    const sheetWidthConverted = UnitConverter.fromMM(sheetWidth, currentUnit);
    const sheetHeightConverted = UnitConverter.fromMM(sheetHeight, currentUnit);
    titleDiv.textContent = `Sheet ${index + 1} (${sheetWidthConverted}${currentUnit} × ${sheetHeightConverted}${currentUnit})`;
    sheetDiv.appendChild(titleDiv);

    // Add pieces
    sheet.pieces.forEach((piece) => {
      const pieceDiv = document.createElement('div');
      pieceDiv.className = 'piece';
      
      // Calculate display dimensions and position
      const displayWidth = piece.width * uniformScale;
      const displayHeight = piece.height * uniformScale;
      const displayX = piece.x * uniformScale;
      const displayY = piece.y * uniformScale;
      
      pieceDiv.style.width = `${displayWidth}px`;
      pieceDiv.style.height = `${displayHeight}px`;
      pieceDiv.style.left = `${displayX}px`;
      pieceDiv.style.top = `${displayY}px`;
      
      // Add piece label with converted units
      const labelDiv = document.createElement('div');
      labelDiv.className = 'piece-label';
      const pieceWidthConverted = UnitConverter.fromMM(piece.width, currentUnit);
      const pieceHeightConverted = UnitConverter.fromMM(piece.height, currentUnit);
      labelDiv.textContent = `${pieceWidthConverted} × ${pieceHeightConverted}${currentUnit}`;
      
      if (piece.isRotated) {
        labelDiv.textContent += ' (Rotated)';
      }
      if (piece.teakSides.length > 0) {
        labelDiv.textContent += ` | Teak: ${piece.teakSides.join(', ')}`;
      }
      pieceDiv.appendChild(labelDiv);
      
      sheetDiv.appendChild(pieceDiv);
    });

    sheetContainer.appendChild(sheetDiv);
  });
}

function renderSheetDetails() {
  const tableBody = document.getElementById('sheet-table-body');
  tableBody.innerHTML = '';

  sheets.forEach((sheet, index) => {
    const remainingArea = (sheet.width * sheet.height) - sheet.pieces.reduce((acc, piece) => acc + (piece.width * piece.height), 0);
    const remainingLength = UnitConverter.fromMM(sheet.width - Math.max(...sheet.pieces.map(piece => piece.x + piece.width)), currentUnit);
    const remainingWidth = UnitConverter.fromMM(sheet.height - Math.max(...sheet.pieces.map(piece => piece.y + piece.height)), currentUnit);
    const numberOfCuts = sheet.pieces.length - 1;
    const teakMeters = sheet.pieces.reduce((acc, piece) => acc + calculateTeakMeters(piece), 0);

    const row = document.createElement('tr');
    row.innerHTML = `
      <td>Sheet ${index + 1}</td>
      <td>${(remainingArea / 1e6).toFixed(2)} m²</td>
      <td>${remainingLength.toFixed(2)} ${currentUnit}</td>
      <td>${remainingWidth.toFixed(2)} ${currentUnit}</td>
      <td>${numberOfCuts}</td>
      <td>${teakMeters.toFixed(2)} m</td>
    `;
    tableBody.appendChild(row);
  });
}

function calculateTeakMeters(piece) {
  let meters = 0;
  if (piece.teakSides.includes('top') || piece.teakSides.includes('bottom')) {
    meters += piece.width / 1000;
  }
  if (piece.teakSides.includes('left') || piece.teakSides.includes('right')) {
    meters += piece.height / 1000;
  }
  return meters;
}

function generateQuotation() {
  const quotationDiv = document.getElementById('quotation');
  
  if (sheets.length === 0) {
    quotationDiv.innerHTML = '<p>No quotation available. Add pieces to generate.</p>';
    return;
  }

  const totalSheets = sheets.length;
  const totalCuts = sheets.reduce((acc, sheet) => acc + (sheet.pieces.length - 1), 0);
  const totalTeakMeters = sheets.reduce((acc, sheet) => acc + sheet.pieces.reduce((acc, piece) => acc + calculateTeakMeters(piece), 0), 0);

  const sheetTotal = totalSheets * sheetCost;
  const cutsTotal = totalCuts * cutCost;
  const teakTotal = totalTeakMeters * teakCost;
  const grandTotal = sheetTotal + cutsTotal + teakTotal;

  const sheetWidthConverted = UnitConverter.fromMM(sheetWidth, currentUnit);
  const sheetHeightConverted = UnitConverter.fromMM(sheetHeight, currentUnit);

  quotationDiv.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th>Quantity</th>
          <th>Unit Price (RF)</th>
          <th>Total (RF)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Plywood Sheets (${sheetWidthConverted}${currentUnit} × ${sheetHeightConverted}${currentUnit})</td>
          <td>${totalSheets}</td>
          <td>${sheetCost.toFixed(2)}</td>
          <td>${sheetTotal.toFixed(2)}</td>
        </tr>
        <tr>
          <td>Cuts (@${UnitConverter.fromMM(woodWaste, currentUnit)}${currentUnit} blade width)</td>
          <td>${totalCuts}</td>
          <td>${cutCost.toFixed(2)}</td>
          <td>${cutsTotal.toFixed(2)}</td>
        </tr>
        <tr>
          <td>Teak Edging</td>
          <td>${totalTeakMeters.toFixed(2)} m</td>
          <td>${teakCost.toFixed(2)}</td>
          <td>${teakTotal.toFixed(2)}</td>
        </tr>
        <tr class="total-row">
          <td colspan="3"><strong>Grand Total</strong></td>
          <td><strong>${grandTotal.toFixed(2)} RF</strong></td>
        </tr>
      </tbody>
    </table>
  `;
}

// Initialize with empty state
renderSheets();
renderSheetDetails();
generateQuotation();