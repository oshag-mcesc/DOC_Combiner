/**
 * WEP Document Combiner - Automated Batch Processing
 * 
 * This script combines multiple Google Docs into a single PDF file.
 * It processes documents in batches to avoid execution time limits,
 * tracks progress and errors in the spreadsheet, and fully automates
 * the entire workflow from start to finish.
 * 
 * Required Sheets:
 * - DocIDs: Contains student names and document IDs to process
 * - Config: Contains configuration settings and process status
 * 
 * @author Michael O'Shaughnessy 11/19/2025
 * @version 1.0
 */

// ============================================================================
// CONFIGURATION CONSTANTS
// ============================================================================

/** Default batch size - number of documents to process per execution */
const DEFAULT_BATCH_SIZE = 40;

/** Time buffer before script timeout (in milliseconds) - used for safety margin */
const TIME_BUFFER_MS = 30000; // 30 seconds before 6-minute limit

/** Delay between batches (in milliseconds) */
const BATCH_DELAY_MS = 90000; // 90 seconds between batches

// ============================================================================
// MENU FUNCTIONS
// ============================================================================

/**
 * Creates custom menu when spreadsheet opens
 * This provides easy access to all script functions
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('📄 WEP Combiner')
    .addItem('▶️ Start Batch Process', 'startBatchProcess')
    .addSeparator()
    .addItem('🔄 Process Next Batch (Manual)', 'manualProcessNextBatch')
    .addItem('🔗 Merge PDFs (Manual)', 'manualMergeFinalPDF')
    .addSeparator()
    .addItem('🗑️ Clear All Triggers', 'clearAllTriggers')
    .addItem('🧹 Reset Status', 'resetProcessStatus')
    .addSeparator()
    .addItem('ℹ️ Help', 'showHelp')
    .addToUi();
}

/**
 * Displays help dialog with instructions
 */
function showHelp() {
  const ui = SpreadsheetApp.getUi();
  const helpText = 'WEP DOCUMENT COMBINER - INSTRUCTIONS\n\n' +
    '1. Fill in the DocIDs sheet with student names and document IDs\n' +
    '2. Configure the Config sheet with your folder IDs and PDF name\n' +
    '3. Click "WEP Combiner" → "Start Batch Process"\n' +
    '4. Wait approximately 30-40 minutes for completion\n' +
    '5. Check the Config sheet for "COMPLETE" status\n' +
    '6. Download your combined PDF from the link in Config sheet\n\n' +
    'The process will automatically:\n' +
    '- Process documents in batches\n' +
    '- Track progress in real-time\n' +
    '- Log any errors to the DocIDs sheet\n' +
    '- Merge all PDFs into one final document\n\n' +
    'If errors occur, check the "Status" and "Error Message" columns.';
  
  ui.alert('WEP Combiner Help', helpText, ui.ButtonSet.OK);
}

// ============================================================================
// MAIN WORKFLOW FUNCTIONS
// ============================================================================

/**
 * Initiates the automated batch processing workflow
 * This is the main entry point - user clicks this to start everything
 * 
 * Steps:
 * 1. Validates configuration
 * 2. Resets previous run data
 * 3. Calculates number of batches needed
 * 4. Processes first batch immediately
 * 5. Schedules remaining batches automatically
 * 6. Schedules final PDF merge
 */
function startBatchProcess() {
  const ui = SpreadsheetApp.getUi();
  
  try {
    // Clear any existing triggers to prevent duplicates
    clearAllTriggers();
    
    // Reset status from previous run
    resetProcessStatus();
    
    // Load configuration
    const config = loadConfig();
    
    // Validate configuration
    if (!validateConfig(config)) {
      ui.alert('❌ Configuration Error', 
        'Please check the Config sheet and ensure all required fields are filled in.', 
        ui.ButtonSet.OK);
      return;
    }
    
    // Load document IDs
    const docData = loadDocumentData();
    
    if (docData.length === 0) {
      ui.alert('❌ No Documents', 
        'No document IDs found in the DocIDs sheet. Please add documents to process.', 
        ui.ButtonSet.OK);
      return;
    }
    
    // Calculate batches
    const totalBatches = Math.ceil(docData.length / config.batchSize);
    
    // Initialize process status
    updateConfigValue('Process Status', 'RUNNING');
    updateConfigValue('Total Batches', totalBatches);
    updateConfigValue('Current Batch', 0);
    updateConfigValue('Errors Count', 0);
    updateConfigValue('Total Documents', docData.length);
    updateConfigValue('Start Time', new Date().toString());
    
    Logger.log(`Starting batch process: ${docData.length} documents in ${totalBatches} batches`);
    
    // Process first batch immediately
    processSingleBatch(0);
    
    // Schedule remaining batches (if any)
    if (totalBatches > 1) {
      for (let i = 1; i < totalBatches; i++) {
        const delayMs = i * BATCH_DELAY_MS;
        ScriptApp.newTrigger('scheduledBatchProcessor')
          .timeBased()
          .after(delayMs)
          .create();
        
        Logger.log(`Scheduled batch ${i} to run in ${delayMs / 1000} seconds`);
      }
    }
    
    // Schedule final merge (add extra time for safety)
    const mergeDelayMs = (totalBatches * BATCH_DELAY_MS) + 60000; // Extra minute
    ScriptApp.newTrigger('scheduledFinalMerge')
      .timeBased()
      .after(mergeDelayMs)
      .create();
    
    Logger.log(`Scheduled final merge to run in ${mergeDelayMs / 1000} seconds`);
    
    // Show success message
    const estimatedMinutes = Math.ceil(mergeDelayMs / 60000);
    ui.alert('✅ Process Started!', 
      `Processing ${docData.length} documents in ${totalBatches} batches.\n\n` +
      `Estimated completion: ${estimatedMinutes} minutes\n\n` +
      `You can close this spreadsheet. The process will continue automatically.\n` +
      `Check back later and look for "COMPLETE" status in the Config sheet.`,
      ui.ButtonSet.OK);
    
  } catch (error) {
    Logger.log('Error in startBatchProcess: ' + error.toString());
    ui.alert('❌ Error Starting Process', 
      'An error occurred: ' + error.toString(), 
      ui.ButtonSet.OK);
    updateConfigValue('Process Status', 'ERROR');
    updateConfigValue('Error Message', error.toString());
  }
}

/**
 * Triggered function that processes the next scheduled batch
 * This is called automatically by time-based triggers
 */
function scheduledBatchProcessor() {
  try {
    const config = loadConfig();
    const currentBatch = parseInt(config.currentBatch) || 0;
    
    Logger.log(`Scheduled batch processor running for batch ${currentBatch}`);
    
    processSingleBatch(currentBatch);
    
    // Clean up the trigger that called this function
    deleteCurrentTrigger();
    
  } catch (error) {
    Logger.log('Error in scheduledBatchProcessor: ' + error.toString());
    updateConfigValue('Process Status', 'ERROR');
    updateConfigValue('Error Message', 'Batch processor error: ' + error.toString());
  }
}

/**
 * Triggered function that performs the final PDF merge
 * This is called automatically after all batches complete
 */
function scheduledFinalMerge() {
  try {
    Logger.log('Scheduled final merge starting');
    
    mergeFinalPDF();
    
    // Clean up the trigger that called this function
    deleteCurrentTrigger();
    
  } catch (error) {
    Logger.log('Error in scheduledFinalMerge: ' + error.toString());
    updateConfigValue('Process Status', 'ERROR');
    updateConfigValue('Error Message', 'Merge error: ' + error.toString());
  }
}

// ============================================================================
// CORE PROCESSING FUNCTIONS
// ============================================================================

/**
 * Processes a single batch of documents
 * 
 * @param {number} batchNumber - The batch number to process (0-indexed)
 */
function processSingleBatch(batchNumber) {
  const startTime = new Date().getTime();
  Logger.log(`Starting batch ${batchNumber} at ${new Date().toString()}`);
  
  try {
    // Load configuration and document data
    const config = loadConfig();
    const docData = loadDocumentData();
    
    // Calculate batch boundaries
    const batchSize = config.batchSize;
    const startIdx = batchNumber * batchSize;
    const endIdx = Math.min(startIdx + batchSize, docData.length);
    
    Logger.log(`Batch ${batchNumber}: Processing documents ${startIdx + 1} to ${endIdx}`);
    
    // Create temporary document for this batch
    const tempDocName = `TempBatch_${batchNumber}_${new Date().getTime()}`;
    const tempDoc = DocumentApp.create(tempDocName);
    const tempDocId = tempDoc.getId();
    const body = tempDoc.getBody();
    
    // Clear any default content
    body.clear();
    
    let successCount = 0;
    let errorCount = 0;
    
    // Process each document in this batch
    for (let i = startIdx; i < endIdx; i++) {
      // Check if we're running out of time
      const elapsedTime = new Date().getTime() - startTime;
      if (elapsedTime > (5.5 * 60 * 1000)) { // 5.5 minutes
        Logger.log(`Approaching time limit at document ${i}. Stopping batch.`);
        break;
      }
      
      const row = docData[i];
      const studentName = row.studentName;
      const docId = row.docId;
      const rowNumber = i + 2; // +2 for header row and 0-indexing
      
      try {
        Logger.log(`Processing ${studentName} (${docId})`);
        
        // Open source document
        const sourceDoc = DocumentApp.openById(docId);
        const sourceBody = sourceDoc.getBody();
        
        // Copy all content from source to temp doc
        copyBodyContent(sourceBody, body);
        
        // Add page break between documents (except after last one)
        if (i < endIdx - 1) {
          body.appendPageBreak();
        }
        
        // Update status in spreadsheet
        updateDocumentStatus(rowNumber, '✓', '', batchNumber);
        successCount++;
        
        Logger.log(`Successfully processed ${studentName}`);
        
      } catch (docError) {
        // Log error but continue processing other documents
        const errorMsg = docError.toString().substring(0, 200); // Limit error message length
        Logger.log(`Error processing ${studentName}: ${errorMsg}`);
        
        updateDocumentStatus(rowNumber, 'ERROR', errorMsg, batchNumber);
        errorCount++;
        
        // Increment error count in config
        const currentErrors = parseInt(config.errorsCount) || 0;
        updateConfigValue('Errors Count', currentErrors + 1);
      }
    }
    
    Logger.log(`Batch ${batchNumber} processing complete: ${successCount} success, ${errorCount} errors`);
    
    // Convert temporary document to PDF
    const pdfBlob = DriveApp.getFileById(tempDocId).getAs('application/pdf');
    const pdfName = `Batch_${String(batchNumber).padStart(3, '0')}.pdf`;
    pdfBlob.setName(pdfName);
    
    // Save PDF to temporary folder
    const tempFolder = DriveApp.getFolderById(config.tempFolderId);
    const batchPdfFile = tempFolder.createFile(pdfBlob);
    
    Logger.log(`Batch PDF created: ${pdfName} (${batchPdfFile.getId()})`);
    
    // Delete temporary document
    DriveApp.getFileById(tempDocId).setTrashed(true);
    
    // Update current batch number for next run
    updateConfigValue('Current Batch', batchNumber + 1);
    updateConfigValue('Last Batch Completed', batchNumber);
    updateConfigValue('Last Updated', new Date().toString());
    
    const elapsedTime = (new Date().getTime() - startTime) / 1000;
    Logger.log(`Batch ${batchNumber} completed in ${elapsedTime} seconds`);
    
  } catch (error) {
    Logger.log(`Critical error in batch ${batchNumber}: ${error.toString()}`);
    updateConfigValue('Process Status', 'ERROR');
    updateConfigValue('Error Message', `Batch ${batchNumber} failed: ${error.toString()}`);
    throw error;
  }
}

/**
 * Merges all batch PDFs into a single final PDF
 * This is the final step in the automated workflow
 */
function mergeFinalPDF() {
  const startTime = new Date().getTime();
  Logger.log('Starting final PDF merge');
  
  try {
    const config = loadConfig();
    const tempFolder = DriveApp.getFolderById(config.tempFolderId);
    
    // Find all batch PDF files
    const batchFiles = [];
    const files = tempFolder.getFilesByType(MimeType.PDF);
    
    while (files.hasNext()) {
      const file = files.next();
      if (file.getName().startsWith('Batch_')) {
        batchFiles.push(file);
      }
    }
    
    if (batchFiles.length === 0) {
      throw new Error('No batch PDF files found to merge');
    }
    
    // Sort batch files by name (which includes padded batch number)
    batchFiles.sort((a, b) => a.getName().localeCompare(b.getName()));
    
    Logger.log(`Found ${batchFiles.length} batch PDFs to merge`);
    
    // Create temporary document for merging
    const mergeDocName = `TempMerge_${new Date().getTime()}`;
    const mergeDoc = DocumentApp.create(mergeDocName);
    const mergeDocId = mergeDoc.getId();
    const mergeBody = mergeDoc.getBody();
    mergeBody.clear();
    
    // Process each batch PDF
    for (let i = 0; i < batchFiles.length; i++) {
      const batchFile = batchFiles[i];
      Logger.log(`Merging ${batchFile.getName()}`);
      
      try {
        // Create a copy of the PDF as a Google Doc to extract content
        const docCopy = Drive.Files.copy(
          {},
          batchFile.getId(),
          {
            mimeType: MimeType.GOOGLE_DOCS
          }
        );
        
        // Open the converted document
        const batchDoc = DocumentApp.openById(docCopy.id);
        const batchBody = batchDoc.getBody();
        
        // Copy content to merge document
        copyBodyContent(batchBody, mergeBody);
        
        // Add page break between batches (except after last one)
        if (i < batchFiles.length - 1) {
          mergeBody.appendPageBreak();
        }
        
        // Delete the temporary doc copy
        DriveApp.getFileById(docCopy.id).setTrashed(true);
        
      } catch (mergeError) {
        Logger.log(`Error merging ${batchFile.getName()}: ${mergeError.toString()}`);
        // Continue with other files
      }
    }
    
    Logger.log('All batch PDFs merged into temporary document');
    
    // Convert merged document to final PDF
    const finalPdfBlob = DriveApp.getFileById(mergeDocId).getAs('application/pdf');
    const finalPdfName = config.pdfName + '.pdf';
    finalPdfBlob.setName(finalPdfName);
    
    // Save to output folder
    const outputFolder = DriveApp.getFolderById(config.outputFolderId);
    const finalPdfFile = outputFolder.createFile(finalPdfBlob);
    
    Logger.log(`Final PDF created: ${finalPdfName} (${finalPdfFile.getId()})`);
    
    // Clean up merge document
    DriveApp.getFileById(mergeDocId).setTrashed(true);
    
    // Clean up batch PDFs
    batchFiles.forEach(file => {
      file.setTrashed(true);
      Logger.log(`Deleted batch file: ${file.getName()}`);
    });
    
    // Update final status
    updateConfigValue('Process Status', 'COMPLETE ✓');
    updateConfigValue('Completion Time', new Date().toString());
    updateConfigValue('Final PDF URL', finalPdfFile.getUrl());
    updateConfigValue('Final PDF ID', finalPdfFile.getId());
    
    const totalTime = (new Date().getTime() - startTime) / 1000;
    Logger.log(`Final merge completed in ${totalTime} seconds`);
    Logger.log(`Final PDF URL: ${finalPdfFile.getUrl()}`);
    
  } catch (error) {
    Logger.log(`Critical error in mergeFinalPDF: ${error.toString()}`);
    updateConfigValue('Process Status', 'ERROR');
    updateConfigValue('Error Message', 'Final merge failed: ' + error.toString());
    throw error;
  }
}

// ============================================================================
// CONTENT COPYING FUNCTIONS
// ============================================================================

/**
 * Copies all content from source body to target body
 * Handles different element types (paragraphs, tables, lists, images, etc.)
 * 
 * @param {GoogleAppsScript.Document.Body} sourceBody - Source document body
 * @param {GoogleAppsScript.Document.Body} targetBody - Target document body
 */
function copyBodyContent(sourceBody, targetBody) {
  const numChildren = sourceBody.getNumChildren();
  
  for (let i = 0; i < numChildren; i++) {
    const element = sourceBody.getChild(i);
    const elementType = element.getType();
    
    try {
      switch (elementType) {
        case DocumentApp.ElementType.PARAGRAPH:
          const para = element.asParagraph().copy();
          targetBody.appendParagraph(para);
          break;
          
        case DocumentApp.ElementType.TABLE:
          const table = element.asTable().copy();
          targetBody.appendTable(table);
          break;
          
        case DocumentApp.ElementType.LIST_ITEM:
          const listItem = element.asListItem().copy();
          targetBody.appendListItem(listItem);
          break;
          
        case DocumentApp.ElementType.HORIZONTAL_RULE:
          targetBody.appendHorizontalRule();
          break;
          
        case DocumentApp.ElementType.PAGE_BREAK:
          targetBody.appendPageBreak();
          break;
          
        case DocumentApp.ElementType.INLINE_IMAGE:
          // Images are typically within paragraphs, but handle standalone if needed
          Logger.log('Standalone image encountered (rare case)');
          break;
          
        default:
          Logger.log(`Unhandled element type: ${elementType}`);
      }
    } catch (copyError) {
      Logger.log(`Error copying element type ${elementType}: ${copyError.toString()}`);
      // Continue with next element
    }
  }
}

// ============================================================================
// SPREADSHEET DATA FUNCTIONS
// ============================================================================

/**
 * Loads configuration from the Config sheet
 * 
 * @returns {Object} Configuration object with all settings
 */
function loadConfig() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const configSheet = ss.getSheetByName('Config');
  
  if (!configSheet) {
    throw new Error('Config sheet not found. Please create a sheet named "Config".');
  }
  
  const data = configSheet.getDataRange().getValues();
  const config = {};
  
  // Parse key-value pairs (assumes Setting in col A, Value in col B)
  for (let i = 1; i < data.length; i++) { // Skip header row
    const setting = data[i][0];
    const value = data[i][1];
    
    if (setting && setting !== '') {
      // Convert setting name to camelCase for object property
      const key = setting.replace(/\s+/g, '');
      const camelKey = key.charAt(0).toLowerCase() + key.slice(1);
      config[camelKey] = value;
    }
  }
  
  // Set default batch size if not specified
  if (!config.batchSize) {
    config.batchSize = DEFAULT_BATCH_SIZE;
  }
  
  return config;
}

/**
 * Loads document data from the DocIDs sheet
 * 
 * @returns {Array<Object>} Array of document data objects
 */
function loadDocumentData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const docSheet = ss.getSheetByName('DocIDs');
  
  if (!docSheet) {
    throw new Error('DocIDs sheet not found. Please create a sheet named "DocIDs".');
  }
  
  const data = docSheet.getDataRange().getValues();
  const docData = [];
  
  // Parse document data (assumes headers in row 1)
  for (let i = 1; i < data.length; i++) { // Skip header row
    const studentName = data[i][0];
    const docId = data[i][1];
    
    // Only include rows with both name and ID
    if (studentName && docId && docId !== '') {
      docData.push({
        studentName: studentName,
        docId: docId.trim()
      });
    }
  }
  
  return docData;
}

/**
 * Updates a single value in the Config sheet
 * 
 * @param {string} setting - The setting name to update
 * @param {*} value - The new value
 */
function updateConfigValue(setting, value) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const configSheet = ss.getSheetByName('Config');
  
  if (!configSheet) return;
  
  const data = configSheet.getDataRange().getValues();
  
  // Find the row with this setting
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === setting) {
      configSheet.getRange(i + 1, 2).setValue(value);
      return;
    }
  }
  
  // If setting not found, add it to the end
  const lastRow = configSheet.getLastRow();
  configSheet.getRange(lastRow + 1, 1, 1, 2).setValues([[setting, value]]);
}

/**
 * Updates the status of a document in the DocIDs sheet
 * 
 * @param {number} rowNumber - The row number (1-indexed)
 * @param {string} status - Status text (e.g., '✓', 'ERROR')
 * @param {string} errorMessage - Error message if applicable
 * @param {number} batchNumber - The batch number that processed this doc
 */
function updateDocumentStatus(rowNumber, status, errorMessage, batchNumber) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const docSheet = ss.getSheetByName('DocIDs');
  
  if (!docSheet) return;
  
  // Columns: C = Status, D = Error Message, E = Batch #
  docSheet.getRange(rowNumber, 3).setValue(status);
  docSheet.getRange(rowNumber, 4).setValue(errorMessage);
  docSheet.getRange(rowNumber, 5).setValue(batchNumber);
  
  // Apply color coding
  if (status === '✓') {
    docSheet.getRange(rowNumber, 3).setBackground('#d9ead3'); // Light green
  } else if (status === 'ERROR') {
    docSheet.getRange(rowNumber, 3).setBackground('#f4cccc'); // Light red
  }
}

/**
 * Validates that all required configuration values are present
 * 
 * @param {Object} config - Configuration object
 * @returns {boolean} True if valid, false otherwise
 */
function validateConfig(config) {
  const required = ['outputFolderId', 'tempFolderId', 'pdfName'];
  
  for (const field of required) {
    if (!config[field] || config[field] === '') {
      Logger.log(`Missing required config field: ${field}`);
      return false;
    }
  }
  
  // Validate folder IDs exist
  try {
    DriveApp.getFolderById(config.outputFolderId);
    DriveApp.getFolderById(config.tempFolderId);
  } catch (error) {
    Logger.log('Invalid folder ID: ' + error.toString());
    return false;
  }
  
  return true;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Resets all status fields in preparation for a new run
 */
function resetProcessStatus() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Clear DocIDs sheet status columns
  const docSheet = ss.getSheetByName('DocIDs');
  if (docSheet) {
    const lastRow = docSheet.getLastRow();
    if (lastRow > 1) {
      // Clear Status, Error Message, and Batch # columns
      docSheet.getRange(2, 3, lastRow - 1, 3).clearContent();
      docSheet.getRange(2, 3, lastRow - 1, 3).setBackground(null);
    }
  }
  
  // Reset Config sheet process status fields
  updateConfigValue('Process Status', 'NOT STARTED');
  updateConfigValue('Current Batch', 0);
  updateConfigValue('Total Batches', 0);
  updateConfigValue('Errors Count', 0);
  updateConfigValue('Start Time', '');
  updateConfigValue('Completion Time', '');
  updateConfigValue('Last Updated', '');
  updateConfigValue('Error Message', '');
  updateConfigValue('Final PDF URL', '');
  updateConfigValue('Final PDF ID', '');
  
  Logger.log('Process status reset');
}

/**
 * Clears all time-based triggers created by this script
 * Useful for stopping a running process or cleaning up
 */
function clearAllTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  let count = 0;
  
  triggers.forEach(trigger => {
    // Only delete triggers created by this script (time-based triggers)
    if (trigger.getEventType() === ScriptApp.EventType.CLOCK) {
      ScriptApp.deleteTrigger(trigger);
      count++;
    }
  });
  
  Logger.log(`Cleared ${count} triggers`);
  
  if (count > 0) {
    SpreadsheetApp.getUi().alert('Triggers Cleared', 
      `Removed ${count} scheduled triggers.`, 
      SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * Deletes the trigger that called the current function
 * Used to clean up after scheduled batch processing
 */
function deleteCurrentTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  
  // Delete the first time-based trigger (which should be the one that just fired)
  for (const trigger of triggers) {
    if (trigger.getEventType() === ScriptApp.EventType.CLOCK) {
      ScriptApp.deleteTrigger(trigger);
      Logger.log('Deleted current trigger');
      break;
    }
  }
}

// ============================================================================
// MANUAL CONTROL FUNCTIONS (for troubleshooting)
// ============================================================================

/**
 * Manually process the next batch
 * Useful for testing or if automatic processing fails
 */
function manualProcessNextBatch() {
  const config = loadConfig();
  const currentBatch = parseInt(config.currentBatch) || 0;
  
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    'Process Next Batch', 
    `Process batch ${currentBatch}?`, 
    ui.ButtonSet.YES_NO
  );
  
  if (response === ui.Button.YES) {
    try {
      processSingleBatch(currentBatch);
      ui.alert('Success', `Batch ${currentBatch} processed successfully.`, ui.ButtonSet.OK);
    } catch (error) {
      ui.alert('Error', `Failed to process batch: ${error.toString()}`, ui.ButtonSet.OK);
    }
  }
}

/**
 * Manually trigger the final PDF merge
 * Useful if automatic merge fails or for testing
 */
function manualMergeFinalPDF() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    'Merge PDFs', 
    'Merge all batch PDFs into final document?', 
    ui.ButtonSet.YES_NO
  );
  
  if (response === ui.Button.YES) {
    try {
      mergeFinalPDF();
      ui.alert('Success', 'Final PDF created successfully. Check the Config sheet for the link.', ui.ButtonSet.OK);
    } catch (error) {
      ui.alert('Error', `Failed to merge PDFs: ${error.toString()}`, ui.ButtonSet.OK);
    }
  }
}