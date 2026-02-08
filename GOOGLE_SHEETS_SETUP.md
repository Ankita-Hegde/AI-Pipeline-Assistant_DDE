# Google Sheets Integration Setup Guide

This guide will help you integrate Google Sheets as a data source in your AI Pipeline Assistant.

## Prerequisites

You mentioned you already have:
- ✅ Google Cloud Console project created
- ✅ Credentials ready

## Step-by-Step Setup

### 1. Enable Google Sheets API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to **APIs & Services** > **Library**
4. Search for "Google Sheets API"
5. Click **Enable**

### 2. Create Service Account (if not already created)

1. Go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **Service Account**
3. Fill in the service account details:
   - **Name**: e.g., "pipeline-sheets-reader"
   - **Description**: "Service account for reading Google Sheets data"
4. Click **Create and Continue**
5. Grant the role: **Viewer** (or custom role with sheets read permission)
6. Click **Done**

### 3. Download Credentials

1. In the **Credentials** page, find your service account
2. Click on the service account email
3. Go to the **Keys** tab
4. Click **Add Key** > **Create New Key**
5. Choose **JSON** format
6. Click **Create** - the JSON file will download automatically

### 4. Add Credentials to Your Project

1. Rename the downloaded JSON file to `credentials.json`
2. Place it in the root of your project:
   ```
   ai-pipeline-assistant/
   ├── credentials.json    <-- Place it here
   ├── src/
   ├── package.json
   └── ...
   ```

3. **IMPORTANT**: Add to `.gitignore` to keep credentials private:
   ```bash
   echo "credentials.json" >> .gitignore
   ```

### 5. Share Your Google Sheet with the Service Account

1. Open your Google Sheet
2. Click the **Share** button (top right)
3. Copy the service account email from your credentials.json file:
   - Look for `"client_email": "your-service-account@project-id.iam.gserviceaccount.com"`
4. Paste this email in the share dialog
5. Set permission to **Viewer**
6. Uncheck "Notify people" (it's a service account, not a person)
7. Click **Share**

### 6. Get Your Spreadsheet ID

From your Google Sheets URL:
```
https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit
                                      ↑_____________SPREADSHEET_ID______________↑
```

The spreadsheet ID is the long string between `/d/` and `/edit`

## Using Google Sheets in Your Pipeline

### Creating a Pipeline with Google Sheets

1. Go to **New Pipeline** page
2. In **Data Source Configuration**:
   - Select **Google Sheets** from the dropdown
   - Fill in the configuration:

```json
{
  "spreadsheetId": "YOUR_SPREADSHEET_ID_HERE",
  "range": "Sheet1!A1:Z1000",
  "credentialsPath": "credentials.json"
}
```

### Configuration Options

- **spreadsheetId** (required): Your Google Sheets ID
- **range** (required): The range to fetch in A1 notation
  - Examples:
    - `Sheet1!A1:Z1000` - All columns A-Z, rows 1-1000
    - `Data!A:E` - Columns A through E, all rows
    - `Sheet1!A1:D` - Columns A-D starting from row 1
- **credentialsPath** (optional): Path to credentials file
  - Default: `credentials.json` in project root
  - Can specify alternate path like: `config/sheets-creds.json`

## Testing the Integration

### Using the API Endpoint

You can test the Google Sheets integration directly:

```bash
# Fetch data from a sheet
curl -X POST http://localhost:3000/api/sheets \
  -H "Content-Type: application/json" \
  -d '{
    "action": "fetch",
    "config": {
      "spreadsheetId": "YOUR_SPREADSHEET_ID",
      "range": "Sheet1!A1:Z100",
      "credentialsPath": "credentials.json"
    }
  }'

# Get sheet metadata
curl -X POST http://localhost:3000/api/sheets \
  -H "Content-Type: application/json" \
  -d '{
    "action": "metadata",
    "config": {
      "spreadsheetId": "YOUR_SPREADSHEET_ID",
      "credentialsPath": "credentials.json"
    }
  }'
```

## Troubleshooting

### Error: "Credentials file not found"
- Make sure `credentials.json` is in the project root
- Check the file name matches exactly
- Verify the path in your configuration

### Error: "The caller does not have permission"
- Make sure you shared the sheet with the service account email
- Verify the service account has at least "Viewer" permission
- Check that Google Sheets API is enabled in your project

### Error: "Unable to parse range"
- Use valid A1 notation: `Sheet1!A1:Z100`
- Sheet name must match exactly (case-sensitive)
- Verify the sheet exists in your spreadsheet

## Security Best Practices

1. ✅ Never commit `credentials.json` to Git
2. ✅ Use environment variables for production:
   - Store credentials in environment variable
   - Use secrets management (AWS Secrets Manager, etc.)
3. ✅ Grant minimum permissions (Viewer only)
4. ✅ Rotate credentials periodically
5. ✅ Use separate service accounts for different environments

## Next Steps

Once you have Google Sheets configured:
1. Create a pipeline with Google Sheets as the source
2. Add transformation steps as needed
3. Configure a destination (database, file, etc.)
4. Run your pipeline to process the data

## Support

For more information:
- [Google Sheets API Documentation](https://developers.google.com/sheets/api)
- [Service Account Authentication](https://cloud.google.com/docs/authentication/production)
- [googleapis npm package](https://www.npmjs.com/package/googleapis)
