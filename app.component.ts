import { Component, ElementRef, QueryList, ViewChildren, AfterViewInit, AfterViewChecked } from '@angular/core';

interface Chip {
  label: string;
  type: 'condition' | 'id';
}

@Component({
  selector: 'app-root',
  standalone: false,
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements AfterViewInit {
  chips: Chip[] = [
    { label: 'chocolateCake', type: 'id' },
    { label: 'AND', type: 'condition' },
    { label: 'frenchFries', type: 'id' },
    { label: 'OR', type: 'condition' },
    { label: '(', type: 'condition' },
    { label: 'iceCream', type: 'id' },
    { label: 'AND', type: 'condition' },
    { label: 'tuscanWhiteBeanSoupWithPancetta', type: 'id' },
    { label: ')', type: 'condition' }
  ];

  // Source boxes
  conditionChips: Chip[] = [
    { label: 'AND', type: 'condition' },
    { label: 'OR', type: 'condition' },
    { label: '(', type: 'condition' },
    { label: ')', type: 'condition' },
  ];

  idChips: Chip[] = [
    { label: 'pizza', type: 'id' },
    { label: 'chocolateCake', type: 'id' },
    { label: 'sushi', type: 'id' },
    { label: 'hamburger', type: 'id' },
    { label: 'pasta', type: 'id' },
    { label: 'iceCream', type: 'id' },
    { label: 'tacos', type: 'id' },
    { label: 'applePie', type: 'id' },
    { label: 'chickenNuggets', type: 'id' },
    { label: 'frenchFries', type: 'id' },
    { label: 'mediterraneanSeaBassWithLemonButterSauce', type: 'id' }, // 45 characters
    { label: 'pacificNorthwestSalmonWithFreshHerbs', type: 'id' }, // 40 characters
    { label: 'tuscanWhiteBeanSoupWithPancetta', type: 'id' }, // 35 characters
    { label: 'chickenAlfredoPastaWithBroccoli', type: 'id' }, // 34 characters
    { label: 'newEnglandClamChowderWithBacon', type: 'id' }, // 35 characters
    { label: 'chocolateLavaCakeWithVanillaIceCream', type: 'id' }, // 40 characters
    { label: 'beefWellingtonWithMushroomDuxelles', type: 'id' }, // 38 characters
    { label: 'southernFriedChickenWithGravy', type: 'id' }, // 32 characters
    { label: 'spaghettiCarbonaraWithPancettaAndParmesan', type: 'id' }, // 47 characters
    { label: 'chickenTikkaMasalaWithBasmatiRice', type: 'id' }, // 37 characters
  ];

  @ViewChildren('chipElement', { read: ElementRef }) chipElements!: QueryList<ElementRef>;

  draggingIndex: number | null = null;
  placeholderIndex: number | null = null;
  pointerOffset: { x: number; y: number } | null = null;
  pointerPosition: { x: number; y: number } | null = null;
  draggedChip: Chip | null = null;
  dragStartPosition: { x: number; y: number } | null = null;
  isOverTrash: boolean = false;
  stackConditionChips: boolean = true;
  truncatedChips: Set<number> = new Set();
  truncatedSourceChips: Set<string> = new Set(); // Track by label for source chips
  private truncationChecked = false;
  idChipsSearchText: string = '';
  panel1Text = "ID Chips"
  panel2Text = "Conditions"
  isChipListValid: boolean = true;
  validationMessage: string = '';

  get filteredIdChips(): Chip[] {
    const search = this.idChipsSearchText.trim().toLowerCase();
    if (!search) return this.idChips;
    return this.idChips.filter(chip => chip.label.toLowerCase().includes(search));
  }

  // ============================================================================
  // LIFECYCLE HOOKS
  // ============================================================================
  
  ngAfterViewInit() {
    // Remove the initial chips from the source box
    this.removeInitialChipsFromSource();
    
    // Initial check after view is initialized
    setTimeout(() => {
      this.checkTruncation();
      this.checkSourceChipsTruncation();
      this.validateChipList();
      this.truncationChecked = true;
    }, 0);
  }

  // ============================================================================
  // COMPUTED PROPERTIES
  // ============================================================================
  
  get virtualChips(): Chip[] {
    if (
      this.draggingIndex === null ||
      this.placeholderIndex === null ||
      this.draggingIndex === this.placeholderIndex
    ) {
      return this.chips;
    }
    const chipsCopy = [...this.chips];
    const [dragged] = chipsCopy.splice(this.draggingIndex, 1);
    chipsCopy.splice(this.placeholderIndex, 0, dragged);
    return chipsCopy;
  }

  // ============================================================================
  // DRAG AND DROP METHODS
  // ============================================================================
  
  onDragStarted(index: number, event: PointerEvent) {
    this.draggingIndex = index;
    this.placeholderIndex = index;
    this.draggedChip = { ...this.chips[index] };
    const chipRect = this.chipElements.get(index)!.nativeElement.getBoundingClientRect();

    // Pretend the pointer is at the center of the chip
    this.pointerOffset = {
      x: chipRect.width / 2,
      y: chipRect.height / 2,
    };

    // Set the pointer position to the center of the chip
    this.pointerPosition = {
      x: chipRect.left + chipRect.width / 2,
      y: chipRect.top + chipRect.height / 2,
    };

    // Track the drag start position
    this.dragStartPosition = { x: event.clientX, y: event.clientY };

    document.addEventListener('pointermove', this.onPointerMove);
    document.addEventListener('pointerup', this.onPointerUp);
  }

  onPointerMove = (event: PointerEvent) => {
    if (this.draggingIndex === null) return;

    const pointerX = event.clientX;
    const pointerY = event.clientY;
    this.pointerPosition = { x: pointerX, y: pointerY };

    // --- Add drag distance threshold ---
    const DRAG_DISTANCE_THRESHOLD = 10; // px, adjust as needed
    if (this.dragStartPosition) {
      const dragDistance = Math.sqrt(
        Math.pow(pointerX - this.dragStartPosition.x, 2) +
        Math.pow(pointerY - this.dragStartPosition.y, 2)
      );
      if (dragDistance < DRAG_DISTANCE_THRESHOLD) {
        return; // Don't move placeholder until minimum drag distance
      }
    }
    // --- END drag distance threshold ---

    const chipRects = this.chipElements.map(ref => ref.nativeElement.getBoundingClientRect());

    // Group chips by row (using their top position)
    const rowMap: { [rowTop: number]: { indices: number[], minLeft: number, maxRight: number } } = {};
    
    chipRects.forEach((rect, i) => {
      const rowTop = Math.round(rect.top);
      if (!rowMap[rowTop]) {
        rowMap[rowTop] = { indices: [], minLeft: rect.left, maxRight: rect.right };
      }
      rowMap[rowTop].indices.push(i);
      rowMap[rowTop].minLeft = Math.min(rowMap[rowTop].minLeft, rect.left);
      rowMap[rowTop].maxRight = Math.max(rowMap[rowTop].maxRight, rect.right);
    });

    // --- Robust row detection with threshold ---
    const VERTICAL_ROW_THRESHOLD = 30; // px, adjust as needed

    // Find all rowTops and their vertical bounds
    const rowBounds = Object.values(rowMap).map(row => {
      const firstRect = chipRects[row.indices[0]];
      const lastRect = chipRects[row.indices[row.indices.length - 1]];
      return {
        top: firstRect.top,
        bottom: firstRect.bottom,
        indices: row.indices,
        minLeft: row.minLeft,
        maxRight: row.maxRight,
      };
    });

    // Find the row where the pointer is within the vertical bounds (+ threshold)
    let activeRow = rowBounds.find(row =>
      pointerY >= row.top - VERTICAL_ROW_THRESHOLD &&
      pointerY <= row.bottom + VERTICAL_ROW_THRESHOLD
    );

    // If not in any row, do not move the placeholder
    if (!activeRow) return;

    // Expanded hitbox for first position in the active row
    const firstIdx = activeRow.indices[0];
    const firstRect = chipRects[firstIdx];
    if (pointerX < firstRect.left + firstRect.width / 2) {
      if (this.placeholderIndex !== firstIdx) {
        this.placeholderIndex = firstIdx;
        console.log(`[PREVIEW] Placeholder index: ${firstIdx}, Chips:`, this.chips.map(c => c.label).join(','));
      }
      return;
    }

    // Check if pointer is right of the last chip in this row
    const lastIdx = activeRow.indices[activeRow.indices.length - 1];
    const lastRect = chipRects[lastIdx];
    let newIndex = chipRects.length; // Default: end of list
    if (pointerX > lastRect.left + lastRect.width / 2) {
      newIndex = lastIdx + 1;
    }

    // Main case: halfway logic for chips in this row
    for (const i of activeRow.indices) {
      if (i === this.draggingIndex) continue;
      const rect = chipRects[i];
      if (
        pointerY >= rect.top &&
        pointerY <= rect.bottom &&
        pointerX > rect.left + rect.width / 2
      ) {
        newIndex = i + 1;
      } else if (
        pointerY >= rect.top &&
        pointerY <= rect.bottom &&
        pointerX <= rect.left + rect.width / 2
      ) {
        newIndex = i;
        break;
      }
    }

    if (newIndex !== this.placeholderIndex) {
      this.placeholderIndex = newIndex;
      // For debugging:
      console.log(
        `[PREVIEW] Placeholder index: ${this.placeholderIndex}, Chips:`,
        this.chips.map(c => c.label).join(',')
      );
    }
  };

  onPointerUp = () => {
    if (this.isOverTrash && this.draggingIndex !== null) {
      // Remove the chip
      this.chips.splice(this.draggingIndex, 1);
    } else if (
      this.draggingIndex !== null &&
      this.placeholderIndex !== null &&
      this.draggingIndex !== this.placeholderIndex
    ) {
      // Set the real array to the virtual array
      this.chips = this.virtualChips;
    }
    
    // Reset all drag state
    this.draggingIndex = null;
    this.placeholderIndex = null;
    this.pointerOffset = null;
    this.pointerPosition = null;
    this.draggedChip = null;
    this.dragStartPosition = null;
    this.isOverTrash = false;
    document.removeEventListener('pointermove', this.onPointerMove);
    document.removeEventListener('pointerup', this.onPointerUp);

    setTimeout(() => {
      this.checkTruncation();
      this.checkSourceChipsTruncation();
      this.validateChipList();
    }, 0);
  };

  // ============================================================================
  // CHIP MANAGEMENT METHODS
  // ============================================================================
  
  onChipFromBoxSelected(chip: Chip, sourceArray: Chip[]) {
    // For condition chips, always allow adding (infinite)
    if (chip.type === 'condition') {
      this.chips.push({ ...chip });
      // Don't remove from source box - conditions are infinite
    } 
    // For ID chips, only allow if they exist in the source box
    else if (chip.type === 'id') {
      const index = sourceArray.findIndex(c => c.label === chip.label);
      if (index > -1) {
        this.chips.push({ ...chip });
        sourceArray.splice(index, 1); // Remove from source box
      }
    }

    setTimeout(() => {
      this.checkTruncation();
      this.checkSourceChipsTruncation();
      this.validateChipList();
    }, 0);
  }

  clearAllChips() {
    // Return ID chips to source box
    this.chips.forEach(chip => {
      if (chip.type === 'id') {
        this.idChips.push({ ...chip });
      }
      // Condition chips don't get returned (they're infinite)
    });
    
    // Clear the main chip list
    this.chips = [];
    
    // Update validation and truncation
    setTimeout(() => {
      this.validateChipList();
      this.checkTruncation();
      this.checkSourceChipsTruncation();
    }, 0);
  }

  private removeInitialChipsFromSource() {
    // Get all ID chips that are already in the main list
    const chipsInMainList = this.chips
      .filter(chip => chip.type === 'id')
      .map(chip => chip.label);
    
    // Remove those chips from the source box
    chipsInMainList.forEach(chipLabel => {
      const index = this.idChips.findIndex(chip => chip.label === chipLabel);
      if (index > -1) {
        this.idChips.splice(index, 1);
      }
    });
  }

  // ============================================================================
  // TRASH METHODS
  // ============================================================================
  
  onTrashEnter() {
    this.isOverTrash = true;
  }

  onTrashLeave() {
    this.isOverTrash = false;
  }

  onTrashDrop() {
    if (this.draggingIndex !== null && this.isOverTrash) {
      const removedChip = this.chips[this.draggingIndex];
      
      // Only add back to source box if it's an ID chip
      if (removedChip.type === 'id') {
        this.idChips.push({ ...removedChip });
      }
      // Condition chips don't get added back to source box (they're infinite)
      
      // Remove from main list
      this.chips.splice(this.draggingIndex, 1);
      
      // Reset drag state
      this.draggingIndex = null;
      this.placeholderIndex = null;
      this.pointerOffset = null;
      this.pointerPosition = null;
      this.draggedChip = null;
      this.dragStartPosition = null;
      this.isOverTrash = false;
      
      // Remove event listeners
      document.removeEventListener('pointermove', this.onPointerMove);
      document.removeEventListener('pointerup', this.onPointerUp);
    }

    // if chips is equal to zero
    if (this.chips.length === 0) {
      // Update validation and truncation
      setTimeout(() => {
        this.validateChipList();
        this.checkTruncation();
        this.checkSourceChipsTruncation();
      }, 0);
    }
  }

  // ============================================================================
  // VALIDATION METHODS
  // ============================================================================
  
  validateChipList(): void {
    if (this.chips.length === 0) {
      this.isChipListValid = true;
      this.validationMessage = '';
      return;
    }

    const chipLabels = this.chips.map(chip => chip.label);
    const result = this.validateChipSequence(chipLabels);
    
    this.isChipListValid = result.isValid;
    this.validationMessage = result.message;
  }

  private validateChipSequence(chips: string[]): { isValid: boolean; message: string } {
    // Check for empty sequence
    if (chips.length === 0) {
      return { isValid: true, message: '' };
    }

    // Check for single ID chip (invalid - needs operators)
    if (chips.length === 1 && chips[0] !== '(' && chips[0] !== ')' && 
        chips[0] !== 'AND' && chips[0] !== 'OR') {
      return { 
        isValid: false, 
        message: 'Single ID chips are not allowed. Add operators (AND/OR) or parentheses.' 
      };
    }

    // Check for trailing operators
    const lastChip = chips[chips.length - 1];
    if (lastChip === 'AND' || lastChip === 'OR') {
      return { 
        isValid: false, 
        message: 'Cannot end with an operator. Add another ID chip or close parentheses.' 
      };
    }

    // Check for consecutive operators
    for (let i = 0; i < chips.length - 1; i++) {
      if ((chips[i] === 'AND' || chips[i] === 'OR') && 
          (chips[i + 1] === 'AND' || chips[i + 1] === 'OR')) {
        return { 
          isValid: false, 
          message: 'Cannot have consecutive operators.' 
        };
      }
    }

    // Check for operators at the beginning
    if (chips[0] === 'AND' || chips[0] === 'OR') {
      return { 
        isValid: false, 
        message: 'Cannot start with an operator.' 
      };
    }

    // Check parentheses balance
    let openParens = 0;
    for (let i = 0; i < chips.length; i++) {
      if (chips[i] === '(') {
        openParens++;
      } else if (chips[i] === ')') {
        openParens--;
        if (openParens < 0) {
          return { 
            isValid: false, 
            message: 'Unmatched closing parenthesis.' 
          };
        }
      }
    }
    
    if (openParens > 0) {
      return { 
        isValid: false, 
        message: 'Unclosed parentheses.' 
      };
    }

    // Check for valid ID-operator-ID patterns
    for (let i = 0; i < chips.length; i++) {
      const chip = chips[i];
      
      // If it's an ID chip (not operator or parentheses)
      if (chip !== 'AND' && chip !== 'OR' && chip !== '(' && chip !== ')') {
        // Check if it's followed by a valid operator or closing parenthesis
        if (i < chips.length - 1) {
          const nextChip = chips[i + 1];
          if (nextChip !== 'AND' && nextChip !== 'OR' && nextChip !== ')') {
            return { 
              isValid: false, 
              message: 'ID chips must be followed by operators (AND/OR) or closing parentheses.' 
            };
          }
        }
      }
      
      // If it's an operator, check if it's followed by an ID chip or opening parenthesis
      if (chip === 'AND' || chip === 'OR') {
        if (i < chips.length - 1) {
          const nextChip = chips[i + 1];
          if (nextChip === 'AND' || nextChip === 'OR' || nextChip === ')') {
            return { 
              isValid: false, 
              message: 'Operators must be followed by ID chips or opening parentheses.' 
            };
          }
        } else {
          return { 
            isValid: false, 
            message: 'Cannot end with an operator.' 
          };
        }
      }
    }

    return { isValid: true, message: '' };
  }

  // ============================================================================
  // TRUNCATION METHODS
  // ============================================================================
  
  isTextTruncated(element: HTMLElement): boolean {
    if (!element) return false;
    return element.scrollWidth > element.clientWidth;
  }

  isChipTruncated(index: number): boolean {
    return this.truncatedChips.has(index);
  }

  isSourceChipTruncated(chipLabel: string): boolean {
    return this.truncatedSourceChips.has(chipLabel);
  }

  checkTruncation() {
    this.truncatedChips.clear();
    this.chipElements.forEach((chipElement, index) => {
      const contentElement = chipElement.nativeElement.querySelector('.chip-content');
      if (contentElement && this.isTextTruncated(contentElement)) {
        this.truncatedChips.add(index);
      }
    });
  }

  checkSourceChipsTruncation() {
    this.truncatedSourceChips.clear();
    // Check ID chips
    setTimeout(() => {
      const idChipElements = document.querySelectorAll('.id-box .chip-content');
      idChipElements.forEach((element, index) => {
        if (this.isTextTruncated(element as HTMLElement)) {
          const chip = this.idChips[index];
          if (chip) {
            this.truncatedSourceChips.add(chip.label);
          }
        }
      });
    }, 0);
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================
  
  trackByIndex(index: number) {
    return index;
  }
}