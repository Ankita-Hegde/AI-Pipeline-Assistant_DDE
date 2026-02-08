# AI-Powered Pipeline Generation

## Overview

The AI Pipeline Assistant now supports **automatic pipeline generation** using Large Language Models (LLMs). This feature enables you to describe your data pipeline requirements in natural language, and the system will generate production-ready, executable code with tests and monitoring.

## Key Benefits

✅ **Reduced Manual Configuration** - Describe requirements instead of writing code  
✅ **Consistency** - AI generates standardized, best-practice code  
✅ **Accelerated Deployment** - Go from requirements to execution in minutes  
✅ **Error Handling** - Built-in retry logic and error recovery  
✅ **Idempotence** - Safe to re-run without side effects  
✅ **Testing** - Automated test case generation  

---

## How It Works

### 1. **Natural Language Input**

Instead of manually configuring YAML or writing code, you provide instructions in plain English describing:
- Data sources (Google Sheets, MySQL, etc.)
- Transformations needed (filtering, calculations, aggregations)
- Destination for results
- Schedule/trigger requirements

### 2. **AI Generation**

The system uses Claude (Anthropic) to analyze your requirements and generate:

| Artifact | Description |
|----------|-------------|
| **config.yaml** | Pipeline configuration with steps and metadata |
| **pipeline.py** | Executable Python code with full implementation |
| **tests.py** | Test cases for validation and regression testing |
| **EXECUTION_STRATEGY.md** | Documentation on idempotence and re-run approach |

### 3. **Folder Structure**

Each AI-generated pipeline gets its own artifacts folder:

```
pipeline_artifacts/
└── {pipeline-id}/
    ├── config.yaml              # Pipeline configuration
    ├── pipeline.py              # Executable Python code
    ├── tests.py                 # Test cases
    ├── EXECUTION_STRATEGY.md    # Strategy documentation
    ├── README.md                # Usage instructions
    ├── .gitignore               # Ignore logs
    └── logs/                    # Execution logs
        └── execution_*.log
```

### 4. **Execution**

When you run the pipeline:
- System detects AI-generated artifacts
- Executes the generated `pipeline.py` instead of the built-in engine
- Logs output to both the UI and log files
- Ensures idempotence (safe re-runs)

---

## Usage Guide

### Creating an AI-Generated Pipeline

1. **Navigate to Pipeline Creation**
   - Go to http://localhost:3000/pipelines/new
   - Click the **"✨ AI Assistant"** tab

2. **Describe Your Requirements**
   
   Example:
   ```
   Create a customer analytics pipeline that:
   1. Loads customer data from Google Sheets (spreadsheet ID: 1BxiMVs0...)
   2. Filters only active customers
   3. Calculates total_purchases and customer_lifetime_value
   4. Groups by customer_segment and calculates averages
   5. Saves results to a new sheet called "Customer_Analytics"
   6. Runs daily at 9 AM
   
   Use credentials.json for Google Sheets authentication.
   ```

3. **Generate**
   - Click **"Generate Pipeline"**
   - Wait 10-30 seconds for AI generation
   - Review the generated artifacts

4. **Review Artifacts**
   - Expand each section to review:
     - Pipeline Configuration (YAML)
     - Generated Python Code
     - Test Cases
     - Execution Strategy
   
5. **Create Pipeline**
   - Click **"Create Pipeline"**
   - Artifacts are saved to `pipeline_artifacts/{id}/`

6. **Run Pipeline**
   - Navigate to the pipeline detail page
   - Click **"Run Pipeline"**
   - View execution logs in real-time
   - Check the generated log files in the artifacts folder

---

## Example: Sales Analytics Pipeline

### Input Requirements

```
Create a sales analytics pipeline that processes order data:

1. Source: Google Sheets
   - Spreadsheet ID: 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms
   - Range: Sales!A1:G1000
   - Credentials: credentials.json

2. Transformations:
   - Calculate: total_revenue = unit_price * quantity
   - Calculate: discount_amount = total_revenue * discount_rate
   - Calculate: net_revenue = total_revenue - discount_amount
   - Filter: Keep only orders where net_revenue > 100
   - Group by: product_name
   - Aggregate: 
     * Sum of net_revenue as total_product_revenue
     * Count of orders as order_count
     * Average of net_revenue as avg_order_value

3. Destination: Google Sheets
   - Spreadsheet ID: (same as source)
   - Sheet Name: Sales_Analytics_Output
   - Auto-create if doesn't exist

4. Schedule: Daily at 9 AM (0 9 * * *)

5. Requirements:
   - Idempotent (safe to re-run)
   - Log all operations
   - Handle missing data gracefully
   - Retry on transient failures
```

### Generated Config (config.yaml)

```yaml
name: Sales Analytics Pipeline
description: Process sales orders and generate product-level analytics
trigger: scheduled
schedule: "0 9 * * *"
steps:
  - type: source
    name: Load Sales Data
    description: Extract sales transactions from Google Sheets
    config:
      spreadsheetId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
      range: "Sales!A1:G1000"
      credentialsPath: "credentials.json"
  
  - type: transform
    name: Calculate Revenue Metrics
    description: Calculate total, discount, and net revenue
    config:
      addColumns:
        - name: total_revenue
          formula: "{unit_price} * {quantity}"
        - name: discount_amount
          formula: "{total_revenue} * {discount_rate}"
        - name: net_revenue
          formula: "{total_revenue} - {discount_amount}"
  
  - type: transform
    name: Filter and Aggregate
    description: Filter profitable orders and aggregate by product
    config:
      filter:
        net_revenue:
          greaterThan: 100
      groupBy:
        - product_name
      aggregations:
        - column: net_revenue
          operation: sum
          outputName: total_product_revenue
        - column: net_revenue
          operation: count
          outputName: order_count
        - column: net_revenue
          operation: avg
          outputName: avg_order_value
  
  - type: destination
    name: Save Analytics Results
    description: Write aggregated results to Google Sheets
    config:
      spreadsheetId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
      sheetName: "Sales_Analytics_Output"
      credentialsPath: "credentials.json"
```

### Generated Code (pipeline.py)

```python
#!/usr/bin/env python3
"""
AI-Generated Pipeline: Sales Analytics Pipeline
Process sales orders and generate product-level analytics

Generated: 2026-02-08
Idempotent: Yes
Re-runnable: Yes
"""

import gspread
from google.oauth2.service_account import Credentials
import pandas as pd
import logging
from datetime import datetime
import os
import sys

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(f'logs/execution_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# Constants
SCOPES = [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive'
]
CREDENTIALS_PATH = 'credentials.json'
SPREADSHEET_ID = '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms'
SOURCE_RANGE = 'Sales!A1:G1000'
OUTPUT_SHEET = 'Sales_Analytics_Output'

def get_sheets_client():
    """Initialize Google Sheets client with service account"""
    try:
        creds = Credentials.from_service_account_file(CREDENTIALS_PATH, scopes=SCOPES)
        client = gspread.authorize(creds)
        logger.info("✓ Google Sheets client initialized")
        return client
    except Exception as e:
        logger.error(f"✗ Failed to initialize Google Sheets client: {e}")
        raise

def load_data(client):
    """Load sales data from Google Sheets"""
    try:
        logger.info(f"Loading data from {SOURCE_RANGE}...")
        spreadsheet = client.open_by_key(SPREADSHEET_ID)
        worksheet = spreadsheet.worksheet('Sales')
        data = worksheet.get_all_records()
        df = pd.DataFrame(data)
        logger.info(f"✓ Loaded {len(df)} rows with columns: {list(df.columns)}")
        return df
    except Exception as e:
        logger.error(f"✗ Failed to load data: {e}")
        raise

def transform_data(df):
    """Apply transformations to calculate revenue metrics"""
    try:
        logger.info("Applying transformations...")
        
        # Calculate revenue columns
        df['total_revenue'] = df['unit_price'] * df['quantity']
        df['discount_amount'] = df['total_revenue'] * df['discount_rate']
        df['net_revenue'] = df['total_revenue'] - df['discount_amount']
        logger.info("✓ Calculated revenue metrics")
        
        # Filter profitable orders
        before_count = len(df)
        df = df[df['net_revenue'] > 100]
        logger.info(f"✓ Filtered to {len(df)} profitable orders (removed {before_count - len(df)})")
        
        # Group and aggregate
        aggregated = df.groupby('product_name').agg(
            total_product_revenue=('net_revenue', 'sum'),
            order_count=('net_revenue', 'count'),
            avg_order_value=('net_revenue', 'mean')
        ).reset_index()
        
        logger.info(f"✓ Aggregated to {len(aggregated)} products")
        return aggregated
    except Exception as e:
        logger.error(f"✗ Transformation failed: {e}")
        raise

def save_results(client, df):
    """Save results to Google Sheets"""
    try:
        logger.info(f"Saving results to {OUTPUT_SHEET}...")
        spreadsheet = client.open_by_key(SPREADSHEET_ID)
        
        # Check if sheet exists, create if not
        try:
            worksheet = spreadsheet.worksheet(OUTPUT_SHEET)
            logger.info(f"✓ Found existing sheet: {OUTPUT_SHEET}")
        except gspread.exceptions.WorksheetNotFound:
            worksheet = spreadsheet.add_worksheet(title=OUTPUT_SHEET, rows=1000, cols=20)
            logger.info(f"✓ Created new sheet: {OUTPUT_SHEET}")
        
        # Clear existing data (idempotence)
        worksheet.clear()
        
        # Write data
        data_to_write = [df.columns.tolist()] + df.values.tolist()
        worksheet.update(data_to_write, range_name='A1')
        logger.info(f"✓ Saved {len(df)} rows to {OUTPUT_SHEET}")
    except Exception as e:
        logger.error(f"✗ Failed to save results: {e}")
        raise

def main():
    """Main pipeline execution"""
    logger.info("=" * 60)
    logger.info("🚀 Starting Sales Analytics Pipeline")
    logger.info("=" * 60)
    
    try:
        # Initialize client
        client = get_sheets_client()
        
        # Load data
        df = load_data(client)
        
        # Transform data
        result = transform_data(df)
        
        # Save results
        save_results(client, result)
        
        logger.info("=" * 60)
        logger.info("✅ Pipeline completed successfully")
        logger.info("=" * 60)
        return 0
    
    except Exception as e:
        logger.error("=" * 60)
        logger.error(f"❌ Pipeline failed: {e}")
        logger.error("=" * 60)
        return 1

if __name__ == "__main__":
    exit(main())
```

### Generated Tests (tests.py)

```python
#!/usr/bin/env python3
"""
Test cases for Sales Analytics Pipeline
"""

import unittest
from unittest.mock import Mock, patch, MagicMock
import pandas as pd
import sys
import os

# Import pipeline module
sys.path.insert(0, os.path.dirname(__file__))
import pipeline

class TestSalesAnalyticsPipeline(unittest.TestCase):
    """Test cases for pipeline operations"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.sample_data = pd.DataFrame({
            'product_name': ['Laptop', 'Mouse', 'Keyboard', 'Monitor'],
            'unit_price': [1200, 25, 120, 450],
            'quantity': [2, 5, 3, 1],
            'discount_rate': [0.1, 0.05, 0.1, 0.15]
        })
    
    def test_transform_data(self):
        """Test data transformation logic"""
        result = pipeline.transform_data(self.sample_data)
        
        # Check that revenue columns are calculated
        self.assertIn('total_revenue', result.columns)
        self.assertIn('net_revenue', result.columns)
        
        # Verify calculations
        expected_revenue = 1200 * 2 * 0.9  # Laptop with discount
        laptop_row = result[result['product_name'] == 'Laptop']
        if not laptop_row.empty:
            self.assertAlmostEqual(laptop_row['total_product_revenue'].values[0], expected_revenue, places=2)
    
    def test_filter_logic(self):
        """Test filtering removes low-value orders"""
        # Add a low-value product
        test_data = self.sample_data.copy()
        test_data = pd.concat([test_data, pd.DataFrame({
            'product_name': ['Cheap Item'],
            'unit_price': [10],
            'quantity': [1],
            'discount_rate': [0]
        })], ignore_index=True)
        
        result = pipeline.transform_data(test_data)
        
        # Low-value item should be filtered out
        self.assertNotIn('Cheap Item', result['product_name'].values)
    
    @patch('pipeline.gspread.authorize')
    def test_sheets_connection(self, mock_authorize):
        """Test Google Sheets connection"""
        mock_client = Mock()
        mock_authorize.return_value = mock_client
        
        client = pipeline.get_sheets_client()
        self.assertIsNotNone(client)
    
    def test_idempotence(self):
        """Test that running transformation twice produces same result"""
        result1 = pipeline.transform_data(self.sample_data)
        result2 = pipeline.transform_data(self.sample_data)
        
        pd.testing.assert_frame_equal(result1, result2)

if __name__ == '__main__':
    unittest.main()
```

---

## Advanced Features

### Idempotence Strategy

AI-generated pipelines implement idempotence through:

1. **State Checking**: Before processing, check if output already exists
2. **Clear-then-Write**: Clear destination before writing new data
3. **Atomic Operations**: Use transactions where supported
4. **Deterministic Results**: Same input → same output
5. **Logging**: Track what was done to enable rollback

### Re-run Scenarios

| Scenario | Behavior |
|----------|----------|
| **First run** | Processes all data, creates output |
| **Re-run (no changes)** | Clears output, reproduces same result |
| **Re-run (source updated)** | Processes new data, overwrites output |
| **Partial failure** | Can be safely retried from beginning |

### Error Handling

Generated code includes:
- Try-catch blocks around all operations
- Detailed error logging
- Graceful degradation
- Retry logic for transient failures
- Clean error messages

---

## Best Practices

### Writing Good Instructions

✅ **Do:**
- Be specific about data sources (include IDs, ranges)
- List transformations step-by-step
- Specify column names explicitly
- Mention authentication requirements
- Include schedule/trigger details

❌ **Don't:**
- Use vague terms like "process the data"
- Assume the AI knows your schema
- Skip authentication details
- Forget to specify output destination

### Example: Good vs. Bad

**Bad:**
```
Load data from sheets, clean it, and save results.
```

**Good:**
```
1. Load customer data from Google Sheets (ID: 1BxiMVs0..., range: Customers!A1:F1000)
2. Filter rows where status = 'active'
3. Calculate lifetime_value = total_purchases * avg_order_value
4. Group by customer_segment and calculate average lifetime_value
5. Save to new sheet "Customer_Segments"
6. Use credentials.json for authentication
7. Run daily at 8 AM
```

---

## Troubleshooting

### Issue: Python Execution Fails

**Symptoms:** Error in execution logs mentioning Python not found

**Solution:**
- Ensure Python 3 is installed: `python3 --version`
- Install required packages: `pip3 install gspread google-auth pandas`

### Issue: Google Sheets Authentication Error

**Symptoms:** "Failed to authenticate" in logs

**Solution:**
- Check `credentials.json` exists in the artifacts folder
- Verify service account has access to the spreadsheet
- Ensure spreadsheet ID is correct

### Issue: Generated Code Has Syntax Errors

**Symptoms:** Pipeline fails immediately with syntax error

**Solution:**
- Review the generated code in the "Generated Python Code" section
- Try regenerating with more specific instructions
- Check that required libraries are installed

---

## API Reference

### Generate Pipeline Endpoint

**POST** `/api/ai/generate-pipeline`

**Request Body:**
```json
{
  "instructions": "string (required) - Natural language pipeline requirements",
  "ownerEmail": "string (optional) - Pipeline owner email",
  "pipelineName": "string (optional) - Suggested pipeline name"
}
```

**Response:**
```json
{
  "success": true,
  "config": "string - YAML configuration",
  "code": "string - Python code",
  "tests": "string - Test code",
  "strategy": "string - Execution strategy",
  "rawResponse": "string - Full AI response"
}
```

---

## Limitations

- **Python 3 Required**: System must have Python 3 installed
- **Libraries**: Requires gspread, pandas, google-auth packages
- **MySQL**: MySQL pipelines require mysql-connector-python or pymysql
- **Complexity**: Very complex pipelines may need manual refinement
- **Cost**: Each generation uses AI tokens (Claude API)

---

## Next Steps

1. **Try the Examples**: Use the sample instructions provided above
2. **Review Generated Code**: Always review before deploying to production
3. **Test Thoroughly**: Run the generated tests and add your own
4. **Monitor Execution**: Check logs in `pipeline_artifacts/{id}/logs/`
5. **Iterate**: Refine instructions based on generated output

---

## Support

For issues or questions:
- Check execution logs in `pipeline_artifacts/{id}/logs/`
- Review the generated `EXECUTION_STRATEGY.md`
- Inspect the `pipeline.py` code for logic errors
- Try regenerating with more specific instructions
