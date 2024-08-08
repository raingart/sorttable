/*
  SortTable 2024
  patched by raingart
  manual, http://www.kryogenix.org/code/browser/sorttable/
*/

const sorttable = {
   selectorTables: 'table.sortable',
   classSortBottom: 'sortbottom',
   classNoSort: 'sorttable_nosort',
   classSorted: 'sorttable_sorted',
   classSortedReverse: 'sorttable_sorted_reverse',
   idSorttableSortfwdind: 'sorttable_sortfwdind',
   idSorttableSortfrevind: 'sorttable_sortrevind',
   iconUp: '&nbsp;&#x25B4;',
   iconDown: '&nbsp;&#x25BE;',

   regexNonDecimal: /[^0-9\.\-]/g,
   regexTrim: /^\s+|\s+$/g,
   regexAnySorttableClass: /\bsorttable_([a-z0-9]+)\b/,

   init() {
      // Exit if already initialized
      if (sorttable.init.done) return;
      // Flag initialization to prevent multiple calls
      sorttable.init.done = true;

      document.querySelectorAll(sorttable.selectorTables).forEach(sorttable.makeSortable);
   },

   innerSortFunction(event, tableElement) {
      // Set wait cursor
      setTableCursor('wait');

      const isSortedAscending = this.classList.contains(sorttable.classSorted);
      const isSortedDescending = this.classList.contains(sorttable.classSortedReverse);

      if (isSortedAscending || isSortedDescending) {
         sorttable.reverse(this.sorttable_tbody);

         updateSortIndicators(this, isSortedDescending);

         event.preventDefault();
         return;
      }

      // Build an array to sort. Decorate each row with the actual sort key
      const rowArray = [];
      const col = this.sorttable_columnindex;
      const rows = this.sorttable_tbody.rows;
      for (let j = 0; j < rows.length; j++) {
         rowArray.push([sorttable.getInnerText(rows[j].cells[col]), rows[j]]);
      }

      // Choose between stable or unstable sort based on commented section
      // Uncomment the following line for stable sort
      // sorttable.shakerSort(rowArray, this.sorttable_sortfunction);
      rowArray.sort(this.sorttable_sortfunction);

      updateSortIndicators(this, true);

      const tb = this.sorttable_tbody;
      const fragment = document.createDocumentFragment();
      for (let j = 0; j < rowArray.length; j++) {
         fragment.append(rowArray[j][1]);
      }
      tb.append(fragment);

      event.preventDefault();

      function updateSortIndicators(headerCell, sortAscending) {
         const { id, icon } = sortAscending
            ? { id: sorttable.idSorttableSortfwdind, icon: sorttable.iconDown }
            : { id: sorttable.idSorttableSortfrevind, icon: sorttable.iconUp };

         // Remove existing indicators
         document.getElementById(sorttable.idSorttableSortfwdind)?.remove();
         document.getElementById(sorttable.idSorttableSortfrevind)?.remove();

         // Create and add new indicator based on sort direction
         const sortIndicator = document.createElement('span');
         sortIndicator.id = id;
         sortIndicator.innerHTML = icon;
         headerCell.append(sortIndicator);

         // Update sort classes
         headerCell.classList.remove(sorttable.classSorted, sorttable.classSortedReverse);
         headerCell.classList.add(sortAscending ? sorttable.classSorted : sorttable.classSortedReverse);

         // Reset cursor after sorting
         setTableCursor();
      }

      function setTableCursor(cursorStyle = null) {
         tableElement.style.cursor = cursorStyle;
      }
   },

   makeSortable(tableElement) {
      // Ensure table header
      if (!tableElement.tHead) {
         const thead = document.createElement('thead');
         tableElement.insertBefore(thead, tableElement.firstChild);
      }

      if (tableElement.tHead.rows.length !== 1) return; // Can't cope with two header rows

      // Move rows with "sortbottom" class to tfoot for backwards compatibility
      const sortbottomRows = Array.from(tableElement.rows).filter(row => row.classList.contains(sorttable.classSortBottom));
      if (sortbottomRows.length) {
         let tfoot = tableElement.tFoot;
         if (!tfoot) {
            tfoot = document.createElement('tfoot');
            tableElement.append(tfoot);
         }

         const fragment = document.createDocumentFragment();
         sortbottomRows.forEach(row => fragment.append(row));
         tfoot.append(fragment);
      }

      const headRow = tableElement.tHead.rows[0].cells;
      for (let i = 0; i < headRow.length; i++) {
         const cell = headRow[i];
         if (!cell.classList.contains(sorttable.classNoSort)) {
            const sortType = cell.className.match(sorttable.regexAnySorttableClass)?.[1];
            cell.sorttable_sortfunction = sortType ? sorttable[`sort_${sortType}`] : sorttable.guessType(tableElement, i);
            cell.sorttable_columnindex = i;
            cell.sorttable_tbody = tableElement.tBodies[0];
         }
      }

      tableElement.tHead.addEventListener('click', evt => {
         const target = evt.target;
         if (target.tagName === 'TH' && !target.classList.contains(sorttable.classNoSort)) {
            sorttable.innerSortFunction.call(target, evt, tableElement);
         }
      });
   },

   // guessType(table, column) {
   //    // Guess the type of a column based on its first non-blank row
   //    return sorttable.sort_alpha;
   // },

   // Memoization in guessType
   guessedTypesCache: new WeakMap(),

   guessType(table, column) {
      const tableCache = this.guessedTypesCache.get(table) || new Map();
      if (tableCache.has(column)) {
         return tableCache.get(column);
      }

      const columnTypes = [];
      for (let i = 0; i < table.rows.length; i++) {
         const cell = table.rows[i].cells[column];
         if (cell.textContent?.trim()) {
            columnTypes.push(sorttable.sort_alpha); // Assume alpha for non-blank rows
            break;
         }
      }

      tableCache.set(column, columnType);
      this.guessedTypesCache.set(table, tableCache);
      return columnType;
   },

   // Memoization in innerText
   innerTextCache: new WeakMap(),

   getInnerText(node) {
      if (!node) return '';

      // Prioritize data-value attribute for custom sort keys
      if (node.dataset && node.dataset.value) return node.dataset.value;

      // Check for custom sort key attribute
      if (customkey = node.getAttribute('sorttable_customkey')) return customkey;

      const cachedValue = sorttable.innerTextCache.get(node);
      if (cachedValue !== undefined) return cachedValue;

      const hasInputs = typeof node?.getElementsByTagName === 'function' && node.getElementsByTagName('input').length;
      const textContent = node.textContent?.trim() || node.innerText?.trim() || node.text?.trim();
      if (textContent && !hasInputs) return textContent;

      let innerText = '';
      switch (node.nodeType) {
         case 3: // Node.TEXT_NODE
            if (node.nodeName.toLowerCase() === 'input') innerText = node.value.trim();
            break;
         // case 11: // Node.DOCUMENT_FRAGMENT_NODE (xml)
         case 1: // Node.ELEMENT_NODE
            for (let i = 0; i < node.childNodes.length; i++) {
               innerText += sorttable.getInnerText(node.childNodes[i]);
            }
            break;
      }

      sorttable.innerTextCache.set(node, innerText.trim());
      return innerText.trim();
   },

   reverse(tbody) {
      // Reverse table body rows efficiently
      const newrows = Array.from(tbody.rows).reverse();
      newrows.forEach(row => tbody.append(row));
   },

   // Sort functions (comparison logic goes here)
   sort_numeric(a, b) {
      const aa = parseFloat(a[0].replace(sorttable.regexNonDecimal, ''));
      const bb = parseFloat(b[0].replace(sorttable.regexNonDecimal, ''));
      return aa - bb;
   },

   sort_alpha(a, b) {
      return a[0].localeCompare(b[0]); // Use localeCompare for better sorting
   },

   shakerSort(list, compFunc) {
      // Stable sort function for multi-level sorting (commented out by default)
      let left = 0;
      let right = list.length - 1;

      while (left < right) {
         forwardPass(list, compFunc, left, right);
         right--;

         backwardPass(list, compFunc, left, right);
         left++;
      }

      function forwardPass(list, compFunc, left, right) {
         let swapped = false;
         for (let i = left; i < right; i++) {
            if (compFunc(list[i], list[i + 1]) > 0) {
               [list[i], list[i + 1]] = [list[i + 1], list[i]];
               swapped = true;
            }
         }
         return swapped;
      }

      function backwardPass(list, compFunc, left, right) {
         let swapped = false;
         for (let i = right; i > left; i--) {
            if (compFunc(list[i], list[i - 1]) < 0) {
               [list[i], list[i - 1]] = [list[i - 1], list[i]];
               swapped = true;
            }
         }
         return swapped;
      }
   },

   // ... (you can add more sort functions for different data types)
};

// Initialize sorttable on document load
// window.addEventListener('DOMContentLoaded', sorttable.init);
