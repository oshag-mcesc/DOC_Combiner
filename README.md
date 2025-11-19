# WEP Document Combiner

**Automated batch processing tool for combining multiple Google Docs into a single PDF**

Designed for educators who need to merge individualized Written Education Plans (WEPs) or similar documents into one consolidated PDF file.

---

## 📋 Overview

This Google Apps Script automates the process of combining multiple Google Docs into a single PDF document. It handles large batches of documents by:
- Processing documents in configurable batches to avoid script timeout limits
- Automatically scheduling and executing batch processing
- Tracking progress and errors in real-time
- Merging all batch PDFs into one final document
- Providing a fully automated, hands-off workflow

**Perfect for:** School districts, gifted coordinators, special education departments, or anyone who needs to combine many similar documents.

---

## ✨ Features

- ✅ **Fully Automated** - Set it and forget it! The entire process runs automatically once started
- ✅ **Batch Processing** - Processes documents in configurable batches (default: 40 per batch)
- ✅ **Progress Tracking** - Real-time status updates in the spreadsheet
- ✅ **Error Handling** - Continues processing even if individual documents fail, logs all errors
- ✅ **Time Management** - Automatically schedules batches to avoid Google's 6-minute execution limit
- ✅ **Easy Configuration** - All settings managed through a simple spreadsheet interface
- ✅ **Clean Up** - Automatically removes temporary files after completion

---

## 🚀 Quick Start

### Prerequisites
- Google Account with access to Google Sheets and Google Drive
- Documents you want to combine must be Google Docs (not PDFs)
- Basic familiarity with Google Sheets

### Installation

1. **Create a new Google Spreadsheet**

2. **Create two folders in Google Drive:**
   - Output folder (where your final PDF will be saved)
   - Temp folder (for temporary processing files)

3. **Set up your spreadsheet with two sheets:**

   **Sheet 1: "DocIDs"**
   | Student Name | Document ID | Status | Error Message | Batch # |
   |--------------|-------------|--------|---------------|---------|
   | John Doe     | 1a2b3c...   |        |               |         |
   | Jane Smith   | 4d5e6f...   |        |               |         |

   **Sheet 2: "Config"**
   | Setting | Value |
   |---------|-------|
   | Output Folder ID | [Your output folder ID] |
   | Temp Folder ID | [Your temp folder ID] |
   | PDF Name | Combined_WEPs_2024 |
   | Batch Size | 40 |

4. **Add the script:**
   - Go to **Extensions** → **Apps Script**
   - Delete any default code
   - Copy and paste the code from `Code.gs`
   - Save the project (name it "WEP Document Combiner")

5. **Authorize the script:**
   - Click the **Run** button (select `onOpen` function)
   - Follow the authorization prompts
   - Grant necessary permissions

---

## 📖 Usage

### Step 1: Prepare Your Data

1. Fill in the **DocIDs** sheet with:
   - Student names (or document identifiers)
   - Google Doc IDs for each document
   - *Tip: Get Doc ID from the URL: `docs.google.com/document/d/`**`[THIS-IS-THE-ID]`**`/edit`*

2. Fill in the **Config** sheet with:
   - **Output Folder ID**: Where final PDF will be saved
   - **Temp Folder ID**: Where temporary files are stored during processing
   - **PDF Name**: Name for your final combined PDF (no extension needed)
   - **Batch Size**: Number of documents per batch (default: 40)

### Step 2: Run the Process

1. Refresh your spreadsheet to see the custom menu: **📄 WEP Combiner**

2. Click **WEP Combiner** → **▶️ Start Batch Process**

3. Confirm the process and wait for confirmation dialog

4. **Close the spreadsheet** - The process will continue running automatically!

### Step 3: Monitor Progress

- Open your spreadsheet periodically to check the **Config** sheet
- Look for **Process Status**:
  - `RUNNING` - Process is actively working
  - `COMPLETE ✓` - All done! Your PDF is ready
  - `ERROR` - Something went wrong (check Error Message field)

- Check the **DocIDs** sheet for individual document status:
  - `✓` (green) - Document processed successfully
  - `ERROR` (red) - Document failed (see Error Message column)

### Step 4: Download Your PDF

When complete:
1. Check the **Config** sheet for **Final PDF URL**
2. Click the link to open your combined PDF
3. Download or share as needed

---

## ⚙️ Configuration Options

| Setting | Description | Default | Notes |
|---------|-------------|---------|-------|
| **Output Folder ID** | Destination for final PDF | *Required* | Get from Drive folder URL |
| **Temp Folder ID** | Temporary processing folder | *Required* | Get from Drive folder URL |
| **PDF Name** | Name of final combined PDF | *Required* | Don't include `.pdf` extension |
| **Batch Size** | Documents per batch | 40 | Adjust based on document complexity |

### How to Get Folder IDs

1. Open the folder in Google Drive
2. Look at the URL: `drive.google.com/drive/folders/`**`[THIS-IS-THE-FOLDER-ID]`**
3. Copy the ID and paste into Config sheet

---

## 🛠️ Advanced Features

### Manual Controls

If you need to manually control the process (for testing or troubleshooting):

- **🔄 Process Next Batch (Manual)** - Manually process the next batch in sequence
- **🔗 Merge PDFs (Manual)** - Manually trigger the final PDF merge
- **🗑️ Clear All Triggers** - Stop all scheduled processing and clear triggers
- **🧹 Reset Status** - Clear all status fields to start fresh

### Error Recovery

If the process fails:

1. Check the **Error Message** in the Config sheet
2. Review the **DocIDs** sheet for which documents failed
3. Fix any problematic documents
4. Use **🧹 Reset Status** to clear previous run data
5. Run **▶️ Start Batch Process** again

The script will skip successfully processed documents and retry failed ones.

---

## 📊 Understanding the Process

### What Happens Behind the Scenes

1. **Batch Creation** (90 seconds per batch)
   - Opens each Google Doc
   - Copies content to a temporary combined document
   - Converts combined document to PDF
   - Saves batch PDF to temp folder

2. **Automatic Scheduling**
   - Calculates total batches needed
   - Schedules each batch 90 seconds apart
   - Processes first batch immediately
   - Remaining batches run automatically

3. **Final Merge** (after all batches complete)
   - Converts each batch PDF back to Google Doc format
   - Combines all batch documents
   - Exports as single final PDF
   - Cleans up all temporary files

### Timeline Example

For 200 documents with batch size of 40:
- **5 batches** total
- **~7-8 minutes** (batches run every 90 seconds)
- **Plus final merge time** (~2-3 minutes)
- **Total: ~10-12 minutes**

---

## 🚨 Troubleshooting

### Common Issues

**"Configuration Error" message**
- ✅ Ensure all required Config fields are filled
- ✅ Verify folder IDs are correct
- ✅ Check that folders exist and you have access

**"No documents" message**
- ✅ Verify DocIDs sheet has data starting in row 2
- ✅ Check that Document IDs are correct and complete
- ✅ Ensure there are no empty rows in the middle of your data

**Process stuck at "RUNNING"**
- ✅ Wait at least 30-40 minutes for large batches
- ✅ Check Google Apps Script dashboard for trigger status
- ✅ Use **Clear All Triggers** and restart if needed

**Individual documents showing "ERROR"**
- ✅ Verify the Document ID is correct
- ✅ Ensure you have access to the document
- ✅ Check that the document isn't corrupted
- ✅ Try opening the document manually to confirm it works

**"Authorization required" errors**
- ✅ Re-run the authorization process
- ✅ Make sure you granted all requested permissions
- ✅ Try using **Extensions → Apps Script → Run → onOpen**

---

## 📝 Best Practices

### Before Running

- ✅ **Test with small batches first** (5-10 documents) to verify everything works
- ✅ **Backup your document IDs** in case you need to re-run
- ✅ **Verify all document IDs** are accessible before starting
- ✅ **Check your Google Drive storage** - ensure you have enough space

### During Processing

- ✅ **Don't edit the spreadsheet** while process is running
- ✅ **Don't delete temp folders** until process completes
- ✅ **Monitor the first few batches** to catch any issues early
- ✅ **Be patient** - large batches take time!

### After Completion

- ✅ **Review the final PDF** to ensure quality
- ✅ **Check for any ERROR statuses** in DocIDs sheet
- ✅ **Clean up temp folder** if desired (script does this automatically)
- ✅ **Download your PDF** promptly (don't rely on Drive links indefinitely)

---

## 🔒 Privacy & Security

- All processing happens within your Google account
- No data is sent to external services
- Documents are only accessible to users with permissions
- Temporary files are automatically deleted after processing
- Script requires standard Google Apps Script permissions

---

## 🤝 Contributing

This script was created for educational purposes. Feel free to:
- Fork and modify for your needs
- Submit issues or suggestions
- Share improvements with the community

---

## 📄 License

This project is provided as-is for educational and professional use. Modify and distribute freely.

---

## 👨‍💻 Author

**Michael O'Shaughnessy**  
Created: November 19, 2025  
Version: 1.0

---

## 🙏 Acknowledgments

Built using Google Apps Script and the Google Drive API. Designed for educators combining Written Education Plans (WEPs) for gifted students.

---

## 📞 Support

For questions or issues:
1. Check the **Troubleshooting** section above
2. Review error messages in the Config sheet
3. Use the **ℹ️ Help** menu item for quick reference
4. Check Google Apps Script documentation for API limits

---

## 🔄 Version History

### Version 1.0 (November 19, 2025)
- Initial release
- Automated batch processing
- Real-time progress tracking
- Error handling and logging
- Automatic scheduling and merging

---

**Happy document combining! 📄➡️📋**
