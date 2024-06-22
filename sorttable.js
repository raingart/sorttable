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

   insertTheadInTable(tableElement) {
      if (!tableElement.getElementsByTagName('thead').length) {
         const theadElement = document.createElement('thead');
         theadElement.appendChild(tableElement.rows[0]);
         tableElement.insertBefore(theadElement, tableElement.firstChild);
      }
   },

   innerSortFunction(event) {
      if (this.classList.contains(sorttable.classSorted)) {
         // Reverse table if already sorted by this column
         sorttable.reverse(this.sorttable_tbody);
         updateSortClasses(this, false);
         document.getElementById(sorttable.idSorttableSortfwdind)?.remove();

         const sortrevind = document.createElement('span');
         sortrevind.id = sorttable.idSorttableSortfrevind;
         sortrevind.innerHTML = sorttable.iconUp;
         this.appendChild(sortrevind);

         event.preventDefault();
         return;
      }

      if (this.classList.contains(sorttable.classSortedReverse)) {
         // Re-reverse table if already sorted by this column in reverse
         sorttable.reverse(this.sorttable_tbody);
         updateSortClasses(this, true);
         document.getElementById(sorttable.idSorttableSortfwdind)?.remove();

         const sortfwdind = document.createElement('span');
         sortfwdind.id = sorttable.idSorttableSortfwdind;
         sortfwdind.innerHTML = sorttable.iconDown;
         this.appendChild(sortfwdind);

         event.preventDefault();
         return;
      }

      // Remove sorttable_sorted classes
      this.parentNode.querySelectorAll('th').forEach(cell => cell.classList.remove(sorttable.classSortedReverse, sorttable.classSorted));

      document.getElementById(sorttable.idSorttableSortfwdind)?.remove();
      document.getElementById(sorttable.idSorttableSortfrevind)?.remove();

      updateSortClasses(this, true);

      const sortfwdind = document.createElement('span');
      sortfwdind.id = sorttable.idSorttableSortfwdind;
      sortfwdind.innerHTML = sorttable.iconDown;
      this.appendChild(sortfwdind);

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

      const tb = this.sorttable_tbody;
      for (let j = 0; j < rowArray.length; j++) {
         tb.appendChild(rowArray[j][1]);
      }

      event.preventDefault();

      function updateSortClasses(cell, ascending = true) {
         cell.classList.remove(sorttable.classSorted, sorttable.classSortedReverse);
         cell.classList.add(ascending ? sorttable.classSorted : sorttable.classSortedReverse);
      }
   },

   makeSortable(tableElement) {
      sorttable.insertTheadInTable(tableElement);

      // Handle Safari not supporting table.tHead
      if (!tableElement.tHead) {
         tableElement.tHead = tableElement.getElementsByTagName('thead')[0];
      }

      if (tableElement.tHead.rows.length !== 1) return; // Can't cope with two header rows

      // Move rows with "sortbottom" class to tfoot for backwards compatibility
      const sortbottomrows = [];
      for (let i = 0; i < tableElement.rows.length; i++) {
         if (tableElement.rows[i].classList.contains(sorttable.classSortBottom)) {
            sortbottomrows.push(tableElement.rows[i]);
         }
      }

      if (sortbottomrows.length) {
         if (!tableElement.tFoot) {
            // Create tfoot if it doesn't exist
            const tfootElement = document.createElement('tfoot');
            tableElement.appendChild(tfootElement);
         }
         sortbottomrows.forEach(row => tfootElement.appendChild(row));
      }

      // Work through each column and calculate its type
      const headrow = tableElement.tHead.rows[0].cells;
      for (let i = 0; i < headrow.length; i++) {
         // Skip if class "sorttable_nosort" exists
         if (!headrow[i].classList.contains(sorttable.classNoSort)) {
            const sortType = headrow[i].className.match(sorttable.regexAnySorttableClass)?.[1];

            headrow[i].sorttable_sortfunction = sortType ? sorttable[`sort_${sortType}`] : sorttable.guessType(tableElement, i);

            // Make it clickable to sort
            headrow[i].sorttable_columnindex = i;
            headrow[i].sorttable_tbody = tableElement.tBodies[0];
            headrow[i].addEventListener('click', sorttable.innerSortFunction);
         }
      }
   },

   // guessType(table, column) {
   //    // Guess the type of a column based on its first non-blank row
   //    return sorttable.sort_alpha;
   // },

   // Memoization in guessType
   guessedTypes: new WeakMap(),

   guessType(table, column) {
      if (this.guessedTypes.has(table)) {
         return this.guessedTypes.get(table)[column];
      }

      const types = [];
      for (let i = 0; i < table.rows.length; i++) {
         const cell = table.rows[i].cells[column];
         if (cell.textContent?.trim()) {
            types.push(sorttable.sort_alpha); // Assume alpha for non-blank rows
            break;
         }
      }

      this.guessedTypes.set(table, types);
      return types[column];
   },

   getInnerText(node) {
      // Get the text for sorting a cell, stripping leading/trailing whitespace
      // Handles customkey attribute and input fields
      if (!node) return '';

      // Prioritize data-value attribute for custom sort keys
      if (node.dataset && node.dataset.value) return node.dataset.value;

      const hasInputs = typeof node.getElementsByTagName === 'function' && node.getElementsByTagName('input').length;

      // Check for custom sort key attribute
      if (node.getAttribute('sorttable_customkey')) return node.getAttribute('sorttable_customkey');

      const textContent = node.textContent?.trim() || node.innerText?.trim() || node.text?.trim();

      if (textContent && !hasInputs) return textContent;

      switch (node.nodeType) {
         case 3:
            if (node.nodeName.toLowerCase() === 'input') return node.value.trim();
            break;
         case 4:
            return node.nodeValue.trim();
         case 1:
         case 11:
            let innerText = '';
            for (let i = 0; i < node.childNodes.length; i++) {
               innerText += sorttable.getInnerText(node.childNodes[i]);
            }
            return innerText.trim();
         default:
            return '';
      }
   },

   reverse(tbody) {
      // Reverse table body rows efficiently
      const newrows = Array.from(tbody.rows);
      newrows.reverse().forEach(row => tbody.appendChild(row));
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
